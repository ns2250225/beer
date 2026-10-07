// 合并 src/data/styles/*.json → src/data/beer-styles.json，并校验每个风格的参考配方
// 用法：npx tsx scripts/styles.ts [--part=<文件名不含.json>] [--show=<styleId>] [--quiet]
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')
const partsDir = join(root, 'src/data/styles')
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

const FAMILY_ORDER = [
  'lager', 'paleAle', 'ipa', 'wheat', 'porter', 'stout', 'belgian', 'sour', 'wild', 'farmhouse', 'strongAle',
  'scottishIrish', 'german', 'czech', 'british', 'american', 'fruit', 'spice', 'smoke', 'wood', 'historical', 'experimental',
]

const partOf: Record<string, string> = {}
const all: any[] = []
for (const f of readdirSync(partsDir).filter((f) => f.endsWith('.json')).sort()) {
  const list = JSON.parse(readFileSync(join(partsDir, f), 'utf8'))
  for (const s of list) {
    partOf[s.id] = f.replace('.json', '')
    all.push(s)
  }
}
all.sort((a, b) => FAMILY_ORDER.indexOf(a.family) - FAMILY_ORDER.indexOf(b.family))
if (!args.nowrite) {
  const tmp = join(root, `src/data/.beer-styles.${process.pid}.tmp`)
  writeFileSync(tmp, JSON.stringify(all, null, 1))
  renameSync(tmp, join(root, 'src/data/beer-styles.json'))
}

const db = await import('../src/engine/db.ts')
const br = await import('../src/engine/brewing.ts')
const { FLAVOR_DIMS } = await import('../src/types.ts')

const errors: string[] = []
const seen = new Set<string>()
const plan = readFileSync(join(root, 'scripts/style-plan.txt'), 'utf8')
  .split('\n')
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split('|')[0].trim())

for (const s of all) {
  const e = (m: string) => errors.push(`[${s.id}] ${m}`)
  if (seen.has(s.id)) e('重复 id')
  seen.add(s.id)
  if (!FAMILY_ORDER.includes(s.family)) e('family 无效 ' + s.family)
  for (const f of s.alsoIn || []) if (!FAMILY_ORDER.includes(f)) e('alsoIn 无效 ' + f)
  for (const d of FLAVOR_DIMS) if (typeof s[d] !== 'number') e('缺少风味维度 ' + d)
  for (const c of s.country || []) if (!db.countryById[c] && db.COUNTRIES.length) e('country 无效 ' + c)
  for (const a of s.aromas || []) if (!db.aromaById[a]) e('aroma 无效 ' + a)
  if (!db.glassById[s.glass]) e('glass 无效 ' + s.glass)
  for (const i of s.ingredients || []) if (!db.ingredientKind(i)) e('ingredients 中未知原料 ' + i)
  for (const r of s.relatedStyles || []) if (!plan.includes(r) && !all.find((x) => x.id === r)) e('relatedStyles 未知 ' + r)
  const ex = s.example
  if (!ex) {
    e('缺少 example')
    continue
  }
  for (const m of ex.malts) if (!db.maltById[m.id]) e('example 未知麦芽 ' + m.id)
  for (const h of ex.hops) if (!db.hopById[h.id]) e('example 未知酒花 ' + h.id)
  if (!db.yeastById[ex.yeast]) e('example 未知酵母 ' + ex.yeast)
  if (!db.waterById[ex.water]) e('example 未知水 ' + ex.water)
  for (const a of ex.adjuncts) if (!db.adjunctById[a.id]) e('example 未知辅料 ' + a.id)
  if (ex.barrel && !db.barrelById[ex.barrel.id]) e('example 未知木桶 ' + ex.barrel.id)
  for (const req of s.requirements || []) {
    if (req.type === 'yeast') for (const y of req.in) if (!db.yeastById[y]) e('requirement 未知酵母 ' + y)
    if (req.type === 'malt') for (const y of req.in) if (!db.maltById[y]) e('requirement 未知麦芽 ' + y)
    if (req.type === 'adjunct') for (const y of req.in) if (!db.adjunctById[y]) e('requirement 未知辅料 ' + y)
    if (req.type === 'barrel') for (const y of req.in || []) if (!db.barrelById[y]) e('requirement 未知木桶 ' + y)
  }
}
for (const id of plan) if (!seen.has(id)) errors.push(`[plan] 缺少风格 ${id}`)

let bad = 0
const rows: string[] = []
for (const s of all) {
  if (args.part && partOf[s.id] !== args.part) continue
  if (!s.example) continue
  try {
    const recipe = br.exampleToRecipe(s.example, s.name, s.id)
    const a = br.analyzeRecipe(recipe)
    const ms = br.matchAllStyles(a, recipe, all)
    const own = ms.find((m) => m.styleId === s.id)!
    const best = ms[0]
    const ok = own.score >= 80 && own.score >= best.score - 2
    if (!ok) bad++
    const other = ms.find((m) => m.styleId !== s.id)!
    const line = `${ok ? 'OK ' : 'BAD'} ${s.id.padEnd(28)} own=${String(own.score).padStart(3)}  best=${best.styleId}(${best.score})  next=${other.styleId}(${other.score})  ABV ${a.abv} IBU ${a.ibu} SRM ${a.srm}`
    if (!ok || !args.quiet) rows.push(line)
    if (!ok || args.show === s.id) {
      const dev = own.deviations
        .slice(0, 6)
        .map((d) => `${d.key}${d.diff > 0 ? '+' : ''}${d.diff.toFixed(2)}`)
        .join(' ')
      rows.push(`      偏差: ${dev || '-'}  未满足: ${own.unmet.map((u) => u.req.type).join(',') || '-'}`)
    }
    if (args.show === s.id) {
      rows.push('      profile: ' + FLAVOR_DIMS.map((d) => `${d}=${a.profile[d]}(${s[d]})`).join(' '))
      rows.push(`      OG ${a.og} FG ${a.fg} pH ${a.mashPH} processes ${a.processes.join(',')} aromas ${a.aromas.join(',')}`)
      rows.push('      top5: ' + ms.slice(0, 5).map((m) => `${m.styleId}:${m.score}`).join(' '))
    }
  } catch (err) {
    errors.push(`[${s.id}] 分析失败 ${(err as Error).message}`)
  }
}
console.log(rows.join('\n'))
console.log(`\n共 ${all.length} 个风格；参考配方不合格 ${bad} 个；数据错误 ${errors.length} 个`)
if (errors.length) console.log(errors.slice(0, 80).join('\n'))
process.exit(bad || errors.length ? 1 : 0)

// 无界面试玩：用真实的 store 与酒吧模拟跑若干天，输出经营数据
// 用法：npx tsx scripts/playtest.ts [天数]
import { createPinia, setActivePinia } from 'pinia'
;(globalThis as any).window = undefined
const { useGame, OPEN_TIME, SETTLE_TIME } = await import('../src/stores/game.ts')
const { useUi } = await import('../src/stores/ui.ts')
const { BarSim } = await import('../src/engine/sim.ts')
const { STYLES, styleById } = await import('../src/engine/db.ts')
const { exampleToRecipe } = await import('../src/engine/brewing.ts')

setActivePinia(createPinia())
const g = useGame()
const ui = useUi()
g.newGame('测试酒吧')
g.tutorial.done = true
const sim = new BarSim(g)
const days = Number(process.argv[2] || 20)

// 1) 风格鉴定检查：用参考配方在游戏设备条件下酿造
g.money = 1e6
g.xp = 1e6
for (const n of (await import('../src/engine/db.ts')).RESEARCH) g.research.push(n.id)
for (const s of STYLES) g.encyclopedia[s.id].status = 2
g.equipment.mill = 1
let ok = 0
const fails: string[] = []
for (const s of STYLES) {
  const r = exampleToRecipe(s.example, s.name, s.id)
  r.id = 'test_' + s.id
  g.saveRecipe(r)
  const b = { ...g.$state } && null
  void b
  const { analyzeRecipe, matchAllStyles } = await import('../src/engine/brewing.ts')
  const a = analyzeRecipe(r, g.brewCtx)
  const m = matchAllStyles(a, r)
  const own = m.find((x) => x.styleId === s.id)!
  if (own.score >= 70 && own.score >= m[0].score - 2) ok++
  else fails.push(`${s.id} own=${own.score} best=${m[0].styleId}(${m[0].score})`)
}
console.log(`游戏设备条件下参考配方可鉴定：${ok}/${STYLES.length}`)
if (fails.length) console.log(fails.slice(0, 20).join('\n'))

// 2) 经营模拟：重新开局，按简单策略经营
setActivePinia(createPinia())
const g2 = useGame()
const ui2 = useUi()
g2.newGame('经营测试')
g2.tutorial.done = true
const sim2 = new BarSim(g2)
const recipe = exampleToRecipe(styleById['american_pale_ale'].example, 'House APA', 'american_pale_ale')
g2.saveRecipe(recipe)
const amber = exampleToRecipe(styleById['american_amber_ale'].example, 'House Amber', 'american_amber_ale')
g2.saveRecipe(amber)
let dayLog: string[] = []
for (let d = 0; d < days; d++) {
  // 早上：装桶、上酒头、酿酒
  for (const b of g2.batches.filter((x) => x.stage === 'ready')) g2.packageBatch(b.id)
  for (let i = 0; i < g2.taps.length; i++) {
    const t = g2.taps[i]
    if (!t.batchId) {
      const b = g2.batches.find((x) => x.stage === 'packaged' && !g2.taps.some((tt) => tt.batchId === x.id))
      if (b) g2.setTap(i, b.id)
    }
  }
  for (const f of g2.fermenters.filter((x) => !x.batchId)) {
    if (!g2.canBrewToday()) break
    const r = d % 2 ? amber : recipe
    const vol = Math.min(g2.fermenterCapacity(f), g2.maxBatchVolume)
    if (g2.missingCost(r, vol) > 0) g2.buyMissing(r, vol)
    g2.brew(r.id, vol, f.id, 65)
  }
  // 没酒卖就进批发啤酒
  if (!g2.batches.some((b) => b.stage === 'packaged' && b.remaining > 1)) g2.buyWholesale('lager')
  for (let i = 0; i < g2.taps.length; i++) {
    if (!g2.taps[i].batchId) {
      const b = g2.batches.find((x) => x.stage === 'packaged' && !g2.taps.some((tt) => tt.batchId === x.id))
      if (b) g2.setTap(i, b.id)
    }
  }
  // 有钱就升级
  if (g2.money > 1500 && g2.equipment.kettle < 1) g2.buyEquipment('kettle_1')
  if (g2.money > 1200 && g2.equipment.kettle >= 1 && g2.fermenters.filter((f) => f.tier === 1).length < 2) g2.buyFermenter(1)
  if (g2.money > 800 && g2.equipment.keg < 1) g2.buyEquipment('keg_1')
  if (g2.money > 600 && g2.equipment.tap < 1) g2.buyEquipment('tap_1')
  if (g2.money > 900 && g2.equipment.mashTun < 1) g2.buyEquipment('mashTun_1')
  if (g2.money > 2500 && (g2.decorations['wood_table'] || 0) < 3) g2.buyDecoration('wood_table')
  // 营业
  g2.minute = OPEN_TIME - 1
  g2.speed = 1
  let guard = 0
  while (g2.minute < SETTLE_TIME && guard++ < 100000) {
    const dm = g2.advance(0.1)
    sim2.update(dm, 0.1)
    ui2.modals = ui2.modals.filter((m) => m.kind === 'report')
  }
  const rep = g2.reports[0]
  dayLog.push(`D${rep.day} 客人${rep.customers} 流失${rep.lost} 卖${rep.cups}杯 营业额$${rep.revenue} 利润$${rep.profit} 评分${rep.avgRating} 资金$${Math.round(g2.money)} 声望Lv${g2.repLevel}(${Math.round(g2.reputation)}) XP${Math.round(g2.xp)} 库存${Math.round(g2.kegUsed)}L`)
  ui2.modals = []
  g2.bankrupt = false
  g2.nextDay()
}
console.log(dayLog.join('\n'))
const ratings = g2.feed.filter((f) => f.kind === 'rating').slice(0, 6).map((f) => `${f.who}: ${f.beer} ${f.score} 「${f.text}」`)
console.log(ratings.join('\n'))
void sim
void ui
console.log('NPC/委托/发现日志：')
console.log(g2.feed.filter((f) => f.kind === 'npc' || f.kind === 'discovery').slice(0, 10).map((f) => `D${f.day} ${f.who ?? ''} ${f.text}`).join('\n'))
console.log('成就：', g2.achievements.join(', '))
console.log('委托：', JSON.stringify(g2.quests))
console.log('天气/事件样本：', g2.weather, JSON.stringify(g2.events))

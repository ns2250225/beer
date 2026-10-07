// ============================================================
// 酿造引擎：配方 → 理化指标 + 风味轮廓 → 风格匹配 → 品质/缺陷
// 纯函数，无 UI 依赖，可在 Node 中直接运行（scripts/validate-styles.ts）
// ============================================================
import type {
  AdjunctCategory,
  BeerRecipe,
  BeerStyle,
  CustomWater,
  ExampleRecipe,
  FlavorDim,
  FlavorProfile,
  HopAddition,
  HopCharacter,
  MaltCategory,
  ProcessId,
  RegionId,
  StyleRequirement,
} from '../types'
import { FLAVOR_DIMS } from '../types'
import { STYLES, adjunctById, barrelById, hopById, maltById, waterById, yeastById } from './db'

/** 计算时用到的外部条件（设备、研究） */
export interface BrewContext {
  efficiency: number
  hopAromaBonus: number
  /** 清酒罐澄清系数（1 = 无） */
  clarity: number
}
export const DEFAULT_CTX: BrewContext = { efficiency: 0.72, hopAromaBonus: 0, clarity: 1 }

export interface RecipeAnalysis {
  og: number
  fg: number
  abv: number
  ibu: number
  srm: number
  /** 产量系数（冰冻浓缩会减少体积） */
  yieldFactor: number
  profile: FlavorProfile
  aromas: string[]
  hopCharacter: Partial<Record<HopCharacter, number>>
  processes: ProcessId[]
  /** 麦芽类别占比（按重量） */
  maltShares: Partial<Record<MaltCategory, number>>
  maltIdShares: Record<string, number>
  /** 辅料 g/L */
  adjunctGL: Record<string, number>
  adjunctCategoryGL: Partial<Record<AdjunctCategory, number>>
  hopOriginShares: Partial<Record<RegionId, number>>
  mashPH: number
  warnings: string[]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const sat = (x: number, k: number) => 5 * (1 - Math.exp(-Math.max(0, x) / k))

export function emptyProfile(): FlavorProfile {
  const p = {} as FlavorProfile
  for (const d of FLAVOR_DIMS) p[d] = 0
  return p
}

export function waterOf(recipe: Pick<BeerRecipe, 'waterProfile' | 'customWater'>): CustomWater {
  if (recipe.waterProfile === 'custom' && recipe.customWater) return recipe.customWater
  const w = waterById[recipe.waterProfile] || waterById['balanced']
  return w ? { ca: w.ca, mg: w.mg, na: w.na, cl: w.cl, so4: w.so4, hco3: w.hco3 } : { ca: 50, mg: 10, na: 20, cl: 50, so4: 50, hco3: 80 }
}

/** 把参考配方转换成游戏配方 */
export function exampleToRecipe(ex: ExampleRecipe, name: string, targetStyle?: string): BeerRecipe {
  return {
    id: 'ex_' + (targetStyle || name),
    name,
    targetStyle,
    malts: ex.malts.map((m) => ({ id: m.id, amount: m.kg })),
    hops: ex.hops.map((h) => ({ ...h })),
    yeast: ex.yeast,
    waterProfile: ex.water,
    adjuncts: ex.adjuncts.map((a) => ({ id: a.id, amount: a.grams, stage: a.stage })),
    mashTemperature: ex.mashTemp,
    boilTime: ex.boilTime,
    fermentationTemperature: ex.fermentTemp,
    fermentationDays: ex.fermentDays,
    maturationDays: ex.maturationDays,
    carbonation: ex.carbonation,
    processes: [...ex.processes],
    barrel: ex.barrel ? { ...ex.barrel } : undefined,
    isCustom: false,
    createdDay: 0,
    brewCount: 0,
  }
}

function boilUtil(minutes: number, og: number): number {
  // Tinseth
  const bigness = 1.65 * Math.pow(0.000125, og - 1)
  const time = (1 - Math.exp(-0.04 * minutes)) / 4.15
  return bigness * time
}

function hopAromaFactor(h: HopAddition): number {
  if (h.use === 'dryHop') return 0.75
  if (h.use === 'whirlpool') return 0.55
  const t = h.time ?? 60
  if (t >= 60) return 0.02
  if (t >= 30) return 0.06
  if (t >= 15) return 0.2
  if (t >= 5) return 0.35
  return 0.45
}

const BASE_VOLUME = 20

/**
 * 分析配方。所有用量按 20L 计算（游戏中按实际体积等比缩放，不影响结果）。
 * barrelMonths 可覆盖配方中的木桶月数（用于实际陈酿天数）。
 */
export function analyzeRecipe(recipe: BeerRecipe, ctx: BrewContext = DEFAULT_CTX, barrelMonths?: number): RecipeAnalysis {
  const V = BASE_VOLUME
  const warnings: string[] = []
  const processes = new Set<ProcessId>(recipe.processes)
  const yeast = yeastById[recipe.yeast]
  const p = emptyProfile()

  // ---------- 麦芽 ----------
  let totalKg = 0
  for (const m of recipe.malts) if (maltById[m.id]) totalKg += Math.max(0, m.amount)
  const maltShares: Partial<Record<MaltCategory, number>> = {}
  const maltIdShares: Record<string, number> = {}
  let eff = ctx.efficiency + (processes.has('decoction') ? 0.02 : 0)
  let maltPts = 0
  let maltFermentablePts = 0
  let mcu = 0
  for (const m of recipe.malts) {
    const malt = maltById[m.id]
    if (!malt || m.amount <= 0) continue
    const share = totalKg > 0 ? m.amount / totalKg : 0
    maltShares[malt.category] = (maltShares[malt.category] || 0) + share
    maltIdShares[malt.id] = (maltIdShares[malt.id] || 0) + share
    const pts = (m.amount * malt.potential * eff) / V
    maltPts += pts
    maltFermentablePts += pts * malt.fermentability
    mcu += (malt.color * m.amount * 2.20462) / (V * 0.264172)
    if (share > malt.maxShare + 0.05) warnings.push(`${malt.nameZh} 占比过高（${Math.round(share * 100)}%）`)
  }

  // ---------- 辅料（可发酵部分） ----------
  const adjunctGL: Record<string, number> = {}
  const adjunctCategoryGL: Partial<Record<AdjunctCategory, number>> = {}
  let sugarPts = 0
  let sugarFermentPts = 0
  let unfermentPts = 0
  for (const a of recipe.adjuncts) {
    const adj = adjunctById[a.id]
    if (!adj || a.amount <= 0) continue
    const gl = a.amount / V
    adjunctGL[adj.id] = (adjunctGL[adj.id] || 0) + gl
    adjunctCategoryGL[adj.category] = (adjunctCategoryGL[adj.category] || 0) + gl
    const pts = ((a.amount / 1000) * adj.potential) / V
    sugarPts += pts
    sugarFermentPts += pts * adj.fermentability
    unfermentPts += pts * (1 - adj.fermentability)
    mcu += (adj.color * (a.amount / 1000) * 2.20462) / (V * 0.264172)
    const stage = a.stage || adj.stage
    if (adj.category === 'fruit' && (stage === 'secondary' || stage === 'fermentation')) processes.add('fruitSecondary')
  }

  const totalPts = maltPts + sugarPts
  let og = 1 + totalPts / 1000

  // ---------- 发酵 ----------
  const mashT = recipe.mashTemperature
  let mashFactor = clamp(1 - (mashT - 66) * 0.025, 0.85, 1.08)
  let att = yeast ? yeast.attenuation : 0.7
  if (processes.has('enzyme')) {
    mashFactor = 1.12
    att = Math.min(0.98, att + 0.08)
  }
  if (processes.has('noBoil')) mashFactor *= 1.0
  const temp = recipe.fermentationTemperature
  if (yeast) {
    if (temp < yeast.tempMin - 2) att *= 0.86
    const dayRatio = recipe.fermentationDays / Math.max(1, yeast.minDays)
    if (dayRatio < 1) att *= 0.75 + 0.25 * dayRatio
  }
  const maltFermentFrac = maltPts > 0 ? maltFermentablePts / maltPts : 1
  let fermented = maltPts * clamp(att * maltFermentFrac * mashFactor, 0.3, 0.98) + sugarFermentPts * 0.98
  // 酒精耐受
  let abvRaw = (fermented / 1000) * 131.25
  if (yeast && abvRaw > yeast.alcoholTolerance) {
    fermented = (yeast.alcoholTolerance / 131.25) * 1000
    abvRaw = yeast.alcoholTolerance
    warnings.push(`${yeast.nameZh} 无法承受这么高的酒精度`)
  }
  let fgPts = totalPts - fermented
  void unfermentPts
  let abv = abvRaw
  let yieldFactor = 1
  if (processes.has('freeze')) {
    // 冻掉约 22% 的水分
    yieldFactor = 0.78
    abv /= yieldFactor
    og = 1 + totalPts / yieldFactor / 1000
    fgPts /= yieldFactor
  }
  let fg = 1 + fgPts / 1000

  // ---------- 苦度 IBU ----------
  let ibu = 0
  let aromaUnits = 0
  const hopChar: Partial<Record<HopCharacter, number>> = {}
  const hopOriginShares: Partial<Record<RegionId, number>> = {}
  let totalHopG = 0
  let dryHopGL = 0
  const aromaWeights: Record<string, number> = {}
  const addAroma = (id: string, w: number) => {
    if (w > 0) aromaWeights[id] = (aromaWeights[id] || 0) + w
  }
  for (const h of recipe.hops) {
    const hop = hopById[h.id]
    if (!hop || h.grams <= 0) continue
    totalHopG += h.grams
    hopOriginShares[hop.origin] = (hopOriginShares[hop.origin] || 0) + h.grams
    let util = 0
    if (h.use === 'boil') util = boilUtil(Math.min(recipe.boilTime, h.time ?? 60), og)
    else if (h.use === 'whirlpool') util = boilUtil(8, og) * 0.5
    if (processes.has('noBoil') && h.use === 'boil') util *= 0.3
    ibu += ((hop.alpha / 100) * h.grams * 1000 * util) / V
    const units = (h.grams / V) * hopAromaFactor(h) * hop.aromaPower
    aromaUnits += units
    if (h.use === 'dryHop') dryHopGL += h.grams / V
    const charTotal = Object.values(hop.character).reduce((s, v) => s + (v || 0), 0) || 1
    for (const [k, v] of Object.entries(hop.character)) {
      hopChar[k as HopCharacter] = (hopChar[k as HopCharacter] || 0) + (units * (v || 0)) / charTotal
    }
    for (const ar of hop.aromas) addAroma(ar, units * 1.2)
  }
  if (totalHopG > 0) for (const k of Object.keys(hopOriginShares)) hopOriginShares[k as RegionId]! /= totalHopG
  if (dryHopGL > 0.2) processes.add('dryHop')
  ibu = clamp(ibu, 0, 150)
  if (processes.has('kettleSour')) ibu = Math.min(ibu, ibu * 0.9)

  // ---------- 颜色 ----------
  let srm = 1.4922 * Math.pow(Math.max(mcu, 0.5), 0.6859)
  if (processes.has('decoction')) srm *= 1.12
  if (processes.has('hotStone')) srm *= 1.15
  if (processes.has('freeze')) srm /= yieldFactor

  // ---------- 水质 ----------
  const water = waterOf(recipe)
  const darkShare = maltShares.roast || 0
  const crystalShare = maltShares.caramel || 0
  const acidShare = maltIdShares['acidulated_malt'] || 0
  const mashPH =
    5.62 + (water.hco3 - 60) / 700 - (water.ca + water.mg / 2) / 900 - darkShare * 2.2 - crystalShare * 0.6 - acidShare * 3.5

  // ---------- 风味 ----------
  const strength = Math.pow(clamp((og - 1) * 1000, 10, 140) / 48, 0.6)
  for (const m of recipe.malts) {
    const malt = maltById[m.id]
    if (!malt || m.amount <= 0 || totalKg <= 0) continue
    const share = m.amount / totalKg
    for (const [k, v] of Object.entries(malt.flavor)) {
      const dim = k as FlavorDim
      const sc = dim === 'body' || dim === 'haze' ? 1 : strength
      p[dim] += (v || 0) * share * 10 * sc
    }
    const w = share * 10 * strength * (Math.max(...Object.values(malt.flavor).map((x) => Math.abs(x || 0)), 0.1) + 0.1)
    for (const ar of malt.aromas) addAroma(ar, w)
  }
  if (processes.has('decoction')) {
    p.malt += 0.6
    p.caramel += 0.2
  }
  if (processes.has('hotStone')) {
    p.caramel += 1.2
    p.smoke += 0.4
  }

  // 残糖 → 甜度/酒体
  const residual = (fg - 1) * 1000
  p.sweetness += clamp((residual - 5) / 5, 0, 5)
  p.body += residual / 8 + Math.max(0, abv - 4) * 0.08
  p.body -= (recipe.carbonation - 2.4) * 0.35

  // 苦度
  p.bitterness = 5 * (1 - Math.exp(-ibu / 45))
  const so4cl = water.so4 / Math.max(10, water.cl)
  if (so4cl > 2) {
    p.bitterness *= 1.1
    p.body -= 0.15
  } else if (so4cl < 0.7) {
    p.bitterness *= 0.92
    p.malt *= 1.1
    p.body += 0.2
  }

  // 酒花香
  let hopAroma = sat(aromaUnits * (1 + ctx.hopAromaBonus), 2.8)
  if (yeast?.biotransform && processes.has('dryHop')) hopAroma = Math.min(5, hopAroma + 0.3)
  p.hopAroma += hopAroma
  const hcTotal = Object.values(hopChar).reduce((s, v) => s + (v || 0), 0) || 1
  const fruityHop = ((hopChar.tropical || 0) + (hopChar.citrus || 0) + (hopChar.berry || 0) + (hopChar.grape || 0)) / hcTotal
  p.fruity += hopAroma * fruityHop * (yeast?.biotransform ? 0.5 : 0.35)
  p.spicy += hopAroma * ((hopChar.spicy || 0) / hcTotal) * 0.25

  // 酵母
  let lagering = false
  if (yeast) {
    const mid = (yeast.tempMin + yeast.tempMax) / 2
    const tempSens = yeast.type === 'kveik' ? 0.03 : 0.12
    const esterF = clamp(1 + (temp - mid) * tempSens, 0.4, 2)
    p.fruity += yeast.ester * 0.8 * esterF
    p.spicy += yeast.phenol * 0.8 * clamp(1 + (temp - mid) * 0.06, 0.5, 1.5)
    const totalDays = recipe.fermentationDays + recipe.maturationDays
    const timeF = clamp(totalDays / Math.max(1, yeast.minDays), 0.3, 1.2)
    p.acidity += yeast.acid * Math.min(1, timeF)
    p.funk += yeast.funk * clamp(totalDays / Math.max(1, yeast.minDays), 0.2, 1.1)
    p.haze += (1 - yeast.flocculation) * 2
    for (const ar of yeast.aromas) addAroma(ar, yeast.ester * esterF * 0.8 + yeast.phenol * 0.8 + yeast.acid * 0.6 + yeast.funk * 0.6 + 0.3)
    lagering = recipe.maturationDays >= 14 && (yeast.type === 'lager' || yeast.type === 'ale') && temp <= 14
    if (yeast.type === 'lager' && recipe.maturationDays >= 14) lagering = true
  }
  if (lagering) {
    processes.add('lagering')
    p.fruity *= 0.7
    p.haze *= 0.6
  }
  if (processes.has('kettleSour')) {
    p.acidity += 3.2
    addAroma('lactic', 3)
  }
  if (processes.has('coolship')) {
    const d = recipe.fermentationDays + recipe.maturationDays
    const f = clamp(d / 180, 0.2, 1.2)
    p.acidity += 2.6 * f
    p.funk += 3.2 * f
    addAroma('barnyard', 3)
    addAroma('lactic', 2)
  }
  if (processes.has('blend')) {
    p.funk += 0.5
    p.acidity += 0.3
    p.body -= 0.3
  }
  if (processes.has('noBoil')) p.haze += 1

  // 辅料风味
  for (const a of recipe.adjuncts) {
    const adj = adjunctById[a.id]
    if (!adj || a.amount <= 0) continue
    const gl = a.amount / V
    let mag = 0
    for (const [k, v] of Object.entries(adj.effects)) {
      p[k as FlavorDim] += (v || 0) * gl
      mag += Math.abs((v || 0) * gl)
    }
    for (const ar of adj.aromas) addAroma(ar, mag * 1.3 + 0.2)
  }
  p.haze += dryHopGL * 0.12

  // 酒精
  p.alcohol += clamp((abv - 5) * 0.55, 0, 5)

  // ---------- 木桶 ----------
  if (recipe.barrel && barrelById[recipe.barrel.id]) {
    const b = barrelById[recipe.barrel.id]
    const months = barrelMonths ?? recipe.barrel.months
    const mf = 3 * (1 - Math.exp(-months / 6)) // 边际递减（约 6 个月达 1.9 倍）
    for (const [k, v] of Object.entries(b.effectsPerMonth)) p[k as FlavorDim] += (v || 0) * mf * 2
    abv += b.abvPerMonth * months
    p.alcohol += b.abvPerMonth * months * 0.55
    p.hopAroma *= Math.pow(0.85, months)
    for (const ar of b.aromas) addAroma(ar, 2 + months * 0.3)
    processes.add('barrel')
    fg = fg // 不变
  }

  // 清澈
  if (processes.has('filtered')) p.haze *= 0.15
  p.haze *= ctx.clarity

  // 甜度被酸度、苦度削弱；苦度被甜度掩盖
  p.sweetness -= p.acidity * 0.25 + p.bitterness * 0.08
  p.bitterness *= 1 - 0.05 * Math.max(0, p.sweetness - 2)

  for (const d of FLAVOR_DIMS) p[d] = Math.round(clamp(p[d], 0, 5) * 100) / 100

  // 酒精、焦糖等派生香气
  if (p.alcohol > 2) addAroma('warming', p.alcohol)
  const aromas = Object.entries(aromaWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .filter((x) => x[1] > 0.25)
    .map((x) => x[0])

  return {
    og: Math.round(og * 1000) / 1000,
    fg: Math.round(fg * 1000) / 1000,
    abv: Math.round(abv * 10) / 10,
    ibu: Math.round(ibu),
    srm: Math.round(srm * 10) / 10,
    yieldFactor,
    profile: p,
    aromas,
    hopCharacter: hopChar,
    processes: [...processes],
    maltShares,
    maltIdShares,
    adjunctGL,
    adjunctCategoryGL,
    hopOriginShares,
    mashPH: Math.round(mashPH * 100) / 100,
    warnings,
  }
}

// ============================================================
// 风格匹配
// ============================================================

export interface RequirementResult {
  req: StyleRequirement
  ok: boolean
}

export interface StyleMatch {
  styleId: string
  score: number
  /** 排序用：满足的特征性要求越多越优先 */
  rank: number
  unmet: RequirementResult[]
  /** 逐项偏差（正 = 实际偏高） */
  deviations: { key: string; diff: number }[]
}

function rangePenalty(v: number, min: number, max: number, minScale: number, k: number, cap: number) {
  if (v >= min && v <= max) return { pen: 0, diff: 0 }
  const scale = Math.max(minScale, (max - min) / 2)
  const d = v < min ? v - min : v - max
  return { pen: Math.min(cap, (k * Math.abs(d)) / scale), diff: d }
}

export function checkRequirement(req: StyleRequirement, a: RecipeAnalysis, recipe: BeerRecipe): boolean {
  const yeast = yeastById[recipe.yeast]
  switch (req.type) {
    case 'yeastType':
      return !!yeast && req.in.includes(yeast.type)
    case 'yeast':
      return req.in.includes(recipe.yeast)
    case 'maltShare': {
      const s = a.maltShares[req.category] || 0
      return s >= (req.min ?? 0) - 1e-6 && s <= (req.max ?? 1) + 1e-6
    }
    case 'malt': {
      const s = req.in.reduce((t, id) => t + (a.maltIdShares[id] || 0), 0)
      return s > 0 && s >= (req.minShare ?? 0) - 1e-6
    }
    case 'adjunct':
      return req.in.some((id) => (a.adjunctGL[id] || 0) > 0)
    case 'hop':
      return recipe.hops.some((h) => req.in.includes(h.id) && h.grams > 0)
    case 'adjunctCategory': {
      const gl = req.in.reduce((t, c) => t + (a.adjunctCategoryGL[c] || 0), 0)
      return gl > 0 && gl >= (req.min ?? 0)
    }
    case 'noAdjunctCategory':
      return req.in.every((c) => !(a.adjunctCategoryGL[c] || 0))
    case 'process':
      return req.in.every((pid) => a.processes.includes(pid))
    case 'noProcess':
      return req.in.every((pid) => !a.processes.includes(pid))
    case 'hopOrigin': {
      const s = req.in.reduce((t, r) => t + (a.hopOriginShares[r] || 0), 0)
      return s >= req.minShare - 1e-6
    }
    case 'carbonation':
      return recipe.carbonation >= (req.min ?? 0) - 1e-6 && recipe.carbonation <= (req.max ?? 99) + 1e-6
    case 'barrel':
      return !!recipe.barrel && (!req.in || req.in.includes(recipe.barrel.id)) && recipe.barrel.months >= (req.minMonths ?? 0)
    case 'fermentTemp':
      return recipe.fermentationTemperature >= (req.min ?? -99) && recipe.fermentationTemperature <= (req.max ?? 99)
  }
  return true
}

const PROFILE_TOL = 0.75
const PROFILE_K = 7

export function matchStyle(style: BeerStyle, a: RecipeAnalysis, recipe: BeerRecipe): StyleMatch {
  let pen = 0
  const deviations: { key: string; diff: number }[] = []
  const abvR = rangePenalty(a.abv, style.abv.min, style.abv.max, 0.8, 10, 35)
  const ibuR = rangePenalty(a.ibu, style.ibu.min, style.ibu.max, 6, 8, 25)
  // 颜色用对数尺度
  const srmR = rangePenalty(Math.log(a.srm + 1), Math.log(style.color.min + 1), Math.log(style.color.max + 1), 0.2, 6, 30)
  pen += abvR.pen + ibuR.pen + srmR.pen
  if (abvR.diff) deviations.push({ key: 'abv', diff: abvR.diff })
  if (ibuR.diff) deviations.push({ key: 'ibu', diff: ibuR.diff })
  if (srmR.diff) deviations.push({ key: 'srm', diff: srmR.diff })
  let profilePen = 0
  for (const d of FLAVOR_DIMS) {
    const target = (style as any)[d] as number
    if (typeof target !== 'number') continue
    const diff = a.profile[d] - target
    const w = style.weights?.[d] ?? 1
    const over = Math.max(0, Math.abs(diff) - PROFILE_TOL)
    if (over > 0) {
      profilePen += w * over * PROFILE_K
      deviations.push({ key: d, diff })
    }
  }
  pen += Math.min(60, profilePen)
  const unmet: RequirementResult[] = []
  let satisfied = 0
  for (const req of style.requirements || []) {
    const ok = checkRequirement(req, a, recipe)
    if (!ok) {
      unmet.push({ req, ok })
      pen += req.soft ? 8 : 25
    } else satisfied++
  }
  const score = Math.round(clamp(100 - pen, 0, 100))
  deviations.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
  return { styleId: style.id, score, rank: score + satisfied * 1.5, unmet, deviations }
}

export function matchAllStyles(a: RecipeAnalysis, recipe: BeerRecipe, styles: BeerStyle[] = STYLES): StyleMatch[] {
  return styles.map((s) => matchStyle(s, a, recipe)).sort((x, y) => y.rank - x.rank)
}

/** 鉴定门槛 */
export const IDENTIFY_SCORE = 70
export const NEAR_SCORE = 55

// ============================================================
// 品质与缺陷
// ============================================================

export interface QualityContext {
  /** 设备、研究带来的固定品质加成 */
  qualityBonus: number
  /** 卫生水平 0~1 */
  sanitation: number
  /** 双乙酰风险降低比例 0~1 */
  diacetylReduce: number
  /** 是否有发酵温控 */
  tempControl: boolean
  /** 煮锅 DMS 风险系数 */
  dmsFactor: number
  /** 随机数 0~1 */
  rng: () => number
}

export interface QualityResult {
  quality: number
  defects: string[]
  notes: string[]
}

const SOUR_YEASTS = ['lacto', 'pedio', 'mixed', 'brett']

/** mashScore 0~100：糖化温控小游戏（或标准流程）得分 */
export function brewQuality(recipe: BeerRecipe, a: RecipeAnalysis, mashScore: number, q: QualityContext): QualityResult {
  const yeast = yeastById[recipe.yeast]
  const defects: string[] = []
  const notes: string[] = []
  let quality = 72 + (mashScore - 50) * 0.3 + q.qualityBonus
  const roll = (prob: number) => q.rng() < prob

  // 糖化 pH
  if (a.mashPH < 5.2 || a.mashPH > 5.65) {
    const d = a.mashPH < 5.2 ? 5.2 - a.mashPH : a.mashPH - 5.65
    quality -= Math.min(12, d * 40)
    notes.push(`糖化 pH ${a.mashPH} 偏离 5.2~5.65`)
    if (a.mashPH > 5.85) defects.push('astringent')
  }
  // 原料比例
  for (const m of recipe.malts) {
    const malt = maltById[m.id]
    const share = a.maltIdShares[m.id] || 0
    if (malt && share > malt.maxShare + 0.05) {
      quality -= Math.min(15, (share - malt.maxShare) * 60)
      if (malt.category === 'roast' && share > malt.maxShare * 1.4 && !defects.includes('astringent')) defects.push('astringent')
    }
  }
  const dryGL = recipe.hops.filter((h) => h.use === 'dryHop').reduce((s, h) => s + h.grams, 0) / BASE_VOLUME
  if (dryGL > 22) {
    quality -= (dryGL - 22) * 0.8
    notes.push('干投过量，出现青草涩感')
    if (dryGL > 32 && !defects.includes('astringent')) defects.push('astringent')
  }

  if (yeast) {
    const temp = recipe.fermentationTemperature + (q.tempControl ? 0 : (q.rng() - 0.5) * 3)
    const intentionalSour =
      SOUR_YEASTS.includes(yeast.type) || recipe.processes.includes('kettleSour') || recipe.processes.includes('coolship')
    // 高温 → 杂醇
    const over = temp - yeast.tempMax
    if (yeast.type !== 'kveik') {
      if (over > 3 || (over > 1 && roll(0.5))) defects.push('fusel')
    } else if (over > 8) defects.push('fusel')
    // 低温 → 发酵不足
    if (temp < yeast.tempMin - 3) defects.push('underattenuated')
    if (a.warnings.some((w) => w.includes('无法承受'))) defects.includes('underattenuated') || defects.push('underattenuated')
    // 时间不足 → 乙醛 / 双乙酰
    const ratio = recipe.fermentationDays / Math.max(1, yeast.minDays)
    if (ratio < 0.7 || (ratio < 1 && roll(0.5))) defects.push('acetaldehyde')
    const totalRatio = (recipe.fermentationDays + recipe.maturationDays) / Math.max(1, yeast.minDays * 1.4)
    const diaRisk = yeast.diacetylRisk * clamp(1.3 - totalRatio, 0, 1) * (1 - q.diacetylReduce) * (a.processes.includes('lagering') ? 0.4 : 1)
    if (diaRisk > 0.35 || roll(diaRisk)) defects.push('diacetyl')
    // 感染
    if (!intentionalSour) {
      const infRisk = 0.05 * (1 - q.sanitation) + (recipe.processes.includes('noBoil') ? 0.08 : 0)
      if (roll(infRisk)) defects.push('infection')
    }
  }
  // DMS
  const pilsShare = a.maltIdShares['pilsner_malt'] || 0
  if (!recipe.processes.includes('noBoil') && pilsShare > 0.35) {
    if (recipe.boilTime < 45) defects.push('dms')
    else if (recipe.boilTime < 75 && roll(0.25 * q.dmsFactor * (recipe.boilTime < 60 ? 2 : 0.4))) defects.push('dms')
  }
  if (recipe.processes.includes('noBoil') && pilsShare > 0.35 && roll(0.4)) defects.push('dms')

  for (const d of defects) quality -= DEFECT_PENALTY[d] ?? 10
  return { quality: Math.round(clamp(quality, 5, 100)), defects: [...new Set(defects)], notes }
}

export const DEFECT_PENALTY: Record<string, number> = {
  oxidation: 15,
  diacetyl: 15,
  acetaldehyde: 12,
  dms: 12,
  infection: 28,
  fusel: 15,
  astringent: 10,
  underattenuated: 12,
}

/** 缺陷对风味的影响 */
export function applyDefectFlavor(p: FlavorProfile, defects: string[]) {
  for (const d of defects) {
    if (d === 'diacetyl') {
      p.sweetness = Math.min(5, p.sweetness + 0.3)
      p.body = Math.min(5, p.body + 0.2)
    } else if (d === 'infection') {
      p.acidity = Math.min(5, p.acidity + 1.5)
      p.funk = Math.min(5, p.funk + 1)
    } else if (d === 'underattenuated') {
      p.sweetness = Math.min(5, p.sweetness + 0.8)
    } else if (d === 'fusel') {
      p.alcohol = Math.min(5, p.alcohol + 1)
    } else if (d === 'oxidation') {
      p.hopAroma = Math.max(0, p.hopAroma - 1.2)
    }
  }
}

/** 新鲜度曲线（days 已乘以冷库系数） */
export function freshnessAt(type: 'fresh' | 'normal' | 'aging', days: number): number {
  const pts: [number, number][] =
    type === 'fresh'
      ? [[0, 100], [7, 95], [30, 75], [90, 40], [200, 15]]
      : type === 'normal'
        ? [[0, 100], [30, 92], [90, 72], [180, 50], [365, 25]]
        : [[0, 100], [365, 100], [900, 70]]
  for (let i = 1; i < pts.length; i++) {
    if (days <= pts[i][0]) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      return y0 + ((days - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return pts[pts.length - 1][1]
}

/** 熟成型啤酒随陈放提升的品质 */
export function agingBonus(type: 'fresh' | 'normal' | 'aging', days: number): number {
  return type === 'aging' ? Math.min(10, days / 18) : 0
}

export function overallScore(accuracy: number, quality: number) {
  return Math.round(accuracy * 0.5 + quality * 0.5)
}

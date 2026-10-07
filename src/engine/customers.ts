// 客人：生成、点单决策、评分、对话
import type {
  BeerBatch,
  BeerStyle,
  CustomerArchetype,
  FamilyId,
  FlavorDim,
  Personality,
  SpecialNpc,
  TasteModel,
} from '../types'
import { FLAVOR_DIMS } from '../types'
import {
  APPEARANCE,
  ARCHETYPES,
  DIALOGUE,
  NAMES,
  PERSONALITIES,
  TASTE_MODELS,
  aromaById,
  defectById,
  hopById,
  styleById,
  tasteModelById,
} from './db'

export interface Look {
  skin: string
  hair: string
  hairStyle: string
  shirt: string
  pants: string
  accessory: string
  hat?: string
}

export interface CustomerProfile {
  name: string
  archetype: CustomerArchetype
  personality: Personality
  taste: TasteModel
  look: Look
  npc?: SpecialNpc
}

export const rand = Math.random
export const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

export function weightedPick<T>(items: T[], weight: (t: T) => number): T | undefined {
  let total = 0
  for (const it of items) total += Math.max(0, weight(it))
  if (total <= 0) return undefined
  let r = rand() * total
  for (const it of items) {
    r -= Math.max(0, weight(it))
    if (r <= 0) return it
  }
  return items[items.length - 1]
}

export function randomLook(): Look {
  return {
    skin: pick(APPEARANCE.skin),
    hair: pick(APPEARANCE.hair),
    hairStyle: pick(APPEARANCE.hairStyle),
    shirt: pick(APPEARANCE.shirt),
    pants: pick(APPEARANCE.pants),
    accessory: rand() < 0.5 ? 'none' : pick(APPEARANCE.accessory),
  }
}

export function generateCustomer(repLevel: number, archetypeBonus: Record<string, number>): CustomerProfile {
  const archetype =
    weightedPick(
      ARCHETYPES.filter((a) => a.minRep <= repLevel),
      (a) => a.weight * (1 + (archetypeBonus[a.id] || 0)),
    ) || ARCHETYPES[0]
  const personality = pick(PERSONALITIES)
  const taste = tasteModelById[pick(archetype.tasteModels)] || pick(TASTE_MODELS)
  const title = archetype.titles.length && rand() < 0.75 ? pick(archetype.titles) : ''
  return { name: title + pick(NAMES.given), archetype, personality, taste, look: randomLook() }
}

export function npcCustomer(npc: SpecialNpc): CustomerProfile {
  const archetype = ARCHETYPES.find((a) => a.id === 'veteran') || ARCHETYPES[0]
  return {
    name: npc.nameZh,
    archetype,
    personality: PERSONALITIES.find((p) => p.id === 'connoisseur') || PERSONALITIES[0],
    taste: TASTE_MODELS.find((t) => t.id === 'balanced') || TASTE_MODELS[0],
    look: { ...randomLook(), ...npc.appearance, hairStyle: 'short', accessory: 'none', pants: '#3a3a4a' },
    npc,
  }
}

// ---------------- 酒头上的酒 ----------------

export interface TapOffer {
  tapIndex: number
  batch: BeerBatch
  style?: BeerStyle
  family?: FamilyId
  families: FamilyId[]
  price: number
  temp: number
  mystery: boolean
  glassOk: boolean
  freshness: number
  /** 熟成加成后的品质 */
  quality: number
}

/** 风味偏好吻合度 -1 ~ 1 */
export function tasteFit(c: CustomerProfile, profile: Record<FlavorDim, number>): number {
  let sum = 0
  let n = 0
  for (const [k, v] of Object.entries(c.taste.prefs)) {
    const d = Math.abs(profile[k as FlavorDim] - (v as number))
    sum += 1 - d / 2.5
    n++
  }
  // 苦度偏好
  sum += 1 - Math.abs(profile.bitterness - c.archetype.bitterPref) / 3
  n++
  return Math.max(-1, Math.min(1, sum / n))
}

export function familyAffinity(c: CustomerProfile, families: FamilyId[], styleId?: string): number {
  let v = 0
  if (families.some((f) => c.archetype.likes.includes(f))) v += 0.5
  if (families.some((f) => c.archetype.dislikes.includes(f))) v -= 0.6
  if (styleId && c.archetype.likeStyles?.includes(styleId)) v += 0.5
  if (styleId && c.archetype.dislikeStyles?.includes(styleId)) v -= 0.7
  return v
}

/** 点单：返回选中的酒头，或 null（没有想喝的） */
export function chooseTap(
  c: CustomerProfile,
  offers: TapOffer[],
  familyDemand: Partial<Record<FamilyId, number>>,
  priceTolerance: number,
  triedStyles: Set<string>,
): TapOffer | null {
  const scored = offers.map((o) => {
    let u = 1
    u += familyAffinity(c, o.families, o.style?.id) * 1.2
    u += tasteFit(c, o.batch.flavorProfile) * 0.8
    // 酒精接受
    const abvLimit = 3 + c.archetype.abvTolerance * 2
    if (o.batch.abv > abvLimit) u -= (o.batch.abv - abvLimit) * 0.25
    // 价格
    const budget = c.archetype.budget * priceTolerance
    if (o.price > budget) u -= (o.price - budget) * 0.35
    // 天气 / 事件带来的家族需求
    let demand = 1
    for (const f of o.families) demand = Math.max(demand, familyDemand[f] || 1)
    u *= demand
    // 尝新
    if (o.mystery) u += c.archetype.adventurous * 0.8 - 0.2
    if (!triedStyles.has(o.batch.id)) u += c.archetype.adventurous * 0.3
    return { o, u: Math.max(0, u + (rand() - 0.5) * 0.6) }
  })
  scored.sort((a, b) => b.u - a.u)
  if (!scored.length || scored[0].u < 0.35) return null
  // 前两名按权重随机
  const top = scored.slice(0, 2)
  return weightedPick(top, (x) => x.u * x.u)?.o || null
}

export function suggestedPrice(batch: Pick<BeerBatch, 'abv' | 'quality'>, glassVolume = 0.4): number {
  const base = 3 + batch.abv * 0.75 + (batch.quality - 60) / 12
  return Math.max(2, Math.round(base * (glassVolume / 0.4) * 2) / 2)
}

// ---------------- 评分 ----------------

export interface RatingDetail {
  accuracy: number
  quality: number
  freshness: number
  temperature: number
  glass: number
  preference: number
  pricePenalty: number
  score: number
  comment: string
  comments: string[]
}

export function rateBeer(c: CustomerProfile, o: TapOffer, priceTolerance: number): RatingDetail {
  const b = o.batch
  const accuracy = b.styleId ? b.styleAccuracy : b.isCustom ? Math.max(65, b.styleAccuracy) : Math.max(45, b.styleAccuracy)
  const servingTemp = o.style?.servingTemp ?? 6
  const temperature = Math.max(0, 100 - Math.abs(o.temp - servingTemp) * 6)
  const glass = o.glassOk ? 100 : 72
  const base = accuracy * 0.2 + o.quality * 0.45 + o.freshness * 0.15 + temperature * 0.08 + glass * 0.12
  let pref = tasteFit(c, b.flavorProfile) * 0.07 + familyAffinity(c, o.families, o.style?.id) * 0.07
  const abvLimit = 3 + c.archetype.abvTolerance * 2
  if (b.abv > abvLimit + 2) pref -= 0.05
  const fair = suggestedPrice({ abv: b.abv, quality: o.quality }) * priceTolerance
  let pricePenalty = 0
  if (o.price > fair * 1.15) pricePenalty = Math.min(30, ((o.price - fair * 1.15) / fair) * 45)
  else if (o.price < fair * 0.8) pricePenalty = -4
  let score = base * (1 + pref) - 6 + c.personality.leniency * 0.4 - pricePenalty
  score = 100 - (100 - score) * c.archetype.strictness
  score = Math.round(Math.max(0, Math.min(100, score)))
  const comments = buildComments(c, o, { temperature, pricePenalty, score, servingTemp })
  return {
    accuracy: Math.round(accuracy),
    quality: Math.round(o.quality),
    freshness: Math.round(o.freshness),
    temperature: Math.round(temperature),
    glass,
    preference: Math.round(pref * 100),
    pricePenalty: Math.round(pricePenalty),
    score,
    comment: comments[0] || '',
    comments,
  }
}

const lines = (k: string) => DIALOGUE[k] || []
const say = (k: string) => {
  const l = lines(k)
  return l.length ? pick(l) : ''
}

const HIGH_KEYS: Partial<Record<FlavorDim, string>> = {
  bitterness: 'highBitterness',
  hopAroma: 'highHopAroma',
  sweetness: 'highSweetness',
  body: 'highBody',
  malt: 'highMalt',
  caramel: 'highCaramel',
  roast: 'highRoast',
  fruity: 'highFruity',
  spicy: 'highSpicy',
  acidity: 'highAcidity',
  funk: 'highFunk',
  smoke: 'highSmoke',
  wood: 'highWood',
  alcohol: 'highAlcohol',
  haze: 'hazy',
}

/**
 * 生成一组反馈（第一句最重要，会显示在头顶气泡里）。
 * 优先级：缺陷 > 偏离风格 > 温度/价格 > 风味亮点 > 整体评价
 */
function buildComments(
  _c: CustomerProfile,
  o: TapOffer,
  r: { temperature: number; pricePenalty: number; score: number; servingTemp: number },
): string[] {
  const out: string[] = []
  const b = o.batch
  for (const d of b.defects) {
    const def = defectById[d]
    const l = lines(d).length ? say(d) : def ? pick(def.lines) : ''
    if (l) out.push(l)
  }
  if (o.freshness < 60 && !b.defects.includes('oxidation')) out.push(say('notFresh'))
  // 风格偏离（只有知道这杯“应该是什么”的时候）
  const target = b.styleId ? styleById[b.styleId] : undefined
  if (target) {
    const devs = FLAVOR_DIMS.map((d) => ({ d, diff: b.flavorProfile[d] - (target as any)[d] })).filter((x) => Math.abs(x.diff) > 0.9)
    devs.sort((a, b2) => Math.abs(b2.diff) - Math.abs(a.diff))
    for (const dv of devs.slice(0, 2)) {
      if (dv.diff > 0 && HIGH_KEYS[dv.d]) out.push(say(HIGH_KEYS[dv.d]!))
      else if (dv.d === 'bitterness') out.push(say('lowBitterness'))
      else if (dv.d === 'body') out.push(say('thin'))
      else if (dv.d === 'sweetness') out.push(say('dry'))
    }
  }
  if (r.temperature < 70) out.push(o.temp > r.servingTemp ? say('tooWarm') : say('tooCold'))
  if (!o.glassOk && rand() < 0.3) out.push(say('wrongGlass'))
  if (r.pricePenalty > 8) out.push(say('tooExpensive'))
  else if (r.pricePenalty < 0 && rand() < 0.4) out.push(say('cheap'))
  // 风味亮点
  const p = b.flavorProfile
  const highs = FLAVOR_DIMS.filter((d) => p[d] >= 3.3 && HIGH_KEYS[d])
  if (highs.length && rand() < 0.7) out.push(say(HIGH_KEYS[pick(highs)]!))
  if (b.aromas.length && rand() < 0.5) {
    const ar = aromaById[pick(b.aromas)]
    if (ar) out.push(say('aroma').replace('{aroma}', ar.zh))
  }
  if (p.hopAroma > 3 && rand() < 0.2) {
    const hopId = b.aromas.find((a) => hopById[a])
    out.push(say('askHop').replace('{hop}', hopId ? hopById[hopId].name : 'Citra'))
  }
  if (target && r.score >= 85 && rand() < 0.4) out.push(say('stylePraise').replace('{style}', target.nameZh || target.name))
  // 整体
  const overall =
    r.score >= 90 ? 'excellent' : r.score >= 75 ? 'good' : r.score >= 60 ? 'ok' : r.score >= 40 ? 'bad' : 'terrible'
  out.push(say(overall))
  return out.filter(Boolean)
}

export function firstFamilyLine(f: FamilyId): string {
  const k: Partial<Record<FamilyId, string>> = {
    sour: 'firstSour',
    stout: 'firstStout',
    smoke: 'firstSmoke',
    wild: 'firstWild',
    belgian: 'firstBelgian',
    ipa: 'firstIPA',
  }
  return k[f] ? say(k[f]!) : ''
}

export { say }

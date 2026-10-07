// 数据库：把 /data 下的所有 JSON 汇总成按 id 索引的只读表
import type {
  Achievement,
  Adjunct,
  Aroma,
  Barrel,
  BeerStyle,
  Country,
  CustomerArchetype,
  Decoration,
  DefectDef,
  EquipmentTier,
  GameEvent,
  Glass,
  Hop,
  Malt,
  Personality,
  Quest,
  ResearchNode,
  SpecialNpc,
  TasteModel,
  WaterProfile,
  WeatherDef,
  Yeast,
} from '../types'
import stylesJson from '../data/beer-styles.json'
import maltsJson from '../data/malts.json'
import hopsJson from '../data/hops.json'
import yeastsJson from '../data/yeasts.json'
import adjunctsJson from '../data/adjuncts.json'
import barrelsJson from '../data/barrels.json'
import waterJson from '../data/water.json'
import aromasJson from '../data/aromas.json'
import glassesJson from '../data/glasses.json'
import researchJson from '../data/research.json'
import equipmentJson from '../data/equipment.json'
import customersJson from '../data/customers.json'
import dialogueJson from '../data/dialogue.json'
import eventsJson from '../data/events.json'
import weatherJson from '../data/weather.json'
import achievementsJson from '../data/achievements.json'
import countriesJson from '../data/countries.json'
import npcsJson from '../data/npcs.json'
import questsJson from '../data/quests.json'
import decorationsJson from '../data/decorations.json'
import defectsJson from '../data/defects.json'
import metaJson from '../data/meta.json'

function index<T extends { id: string }>(list: T[]): Record<string, T> {
  const m: Record<string, T> = {}
  for (const x of list) m[x.id] = x
  return m
}

export const STYLES = stylesJson as unknown as BeerStyle[]
export const MALTS = maltsJson as unknown as Malt[]
export const HOPS = hopsJson as unknown as Hop[]
export const YEASTS = yeastsJson as unknown as Yeast[]
export const ADJUNCTS = adjunctsJson as unknown as Adjunct[]
export const BARRELS = barrelsJson as unknown as Barrel[]
export const WATERS = waterJson as unknown as WaterProfile[]
export const AROMAS = aromasJson as unknown as Aroma[]
export const GLASSES = glassesJson as unknown as Glass[]
export const RESEARCH = researchJson as unknown as ResearchNode[]
export const EQUIPMENT = equipmentJson as unknown as EquipmentTier[]
export const ARCHETYPES = (customersJson as any).archetypes as CustomerArchetype[]
export const PERSONALITIES = (customersJson as any).personalities as Personality[]
export const TASTE_MODELS = (customersJson as any).tasteModels as TasteModel[]
export const APPEARANCE = (customersJson as any).appearance as {
  skin: string[]
  hair: string[]
  hairStyle: string[]
  shirt: string[]
  pants: string[]
  accessory: string[]
}
export const NAMES = (customersJson as any).names as { given: string[] }
export const DIALOGUE = dialogueJson as unknown as Record<string, string[]>
export const EVENTS = eventsJson as unknown as GameEvent[]
export const WEATHERS = weatherJson as unknown as WeatherDef[]
export const ACHIEVEMENTS = achievementsJson as unknown as Achievement[]
export const COUNTRIES = countriesJson as unknown as Country[]
export const NPCS = npcsJson as unknown as SpecialNpc[]
export const QUESTS = questsJson as unknown as Quest[]
export const DECORATIONS = decorationsJson as unknown as Decoration[]
export const DEFECTS = defectsJson as unknown as DefectDef[]
export const DB_VERSION: string = (metaJson as any).beerDatabaseVersion

export const styleById = index(STYLES)
export const maltById = index(MALTS)
export const hopById = index(HOPS)
export const yeastById = index(YEASTS)
export const adjunctById = index(ADJUNCTS)
export const barrelById = index(BARRELS)
export const waterById = index(WATERS)
export const aromaById = index(AROMAS)
export const glassById = index(GLASSES)
export const researchById = index(RESEARCH)
export const equipmentById = index(EQUIPMENT)
export const archetypeById = index(ARCHETYPES)
export const personalityById = index(PERSONALITIES)
export const tasteModelById = index(TASTE_MODELS)
export const eventById = index(EVENTS)
export const weatherById = index(WEATHERS)
export const achievementById = index(ACHIEVEMENTS)
export const countryById = index(COUNTRIES)
export const npcById = index(NPCS)
export const questById = index(QUESTS)
export const decorationById = index(DECORATIONS)
export const defectById = index(DEFECTS)

/** 任意原料（麦芽/酒花/酵母/辅料/木桶）的中文名 */
export function ingredientName(id: string): string {
  const x = maltById[id] || hopById[id] || yeastById[id] || adjunctById[id] || barrelById[id]
  return x ? x.nameZh || x.name : id
}

export function ingredientKind(id: string): 'malt' | 'hop' | 'yeast' | 'adjunct' | 'barrel' | null {
  if (maltById[id]) return 'malt'
  if (hopById[id]) return 'hop'
  if (yeastById[id]) return 'yeast'
  if (adjunctById[id]) return 'adjunct'
  if (barrelById[id]) return 'barrel'
  return null
}

export const FAMILIES: { id: import('../types').FamilyId; nameZh: string; name: string; icon: string }[] = [
  { id: 'lager', name: 'Lager', nameZh: '拉格', icon: '🍺' },
  { id: 'paleAle', name: 'Pale Ale', nameZh: '淡色艾尔', icon: '🍻' },
  { id: 'ipa', name: 'IPA', nameZh: '印度淡色艾尔', icon: '🌿' },
  { id: 'wheat', name: 'Wheat Beer', nameZh: '小麦啤酒', icon: '🌾' },
  { id: 'porter', name: 'Porter', nameZh: '波特', icon: '🟤' },
  { id: 'stout', name: 'Stout', nameZh: '世涛', icon: '⚫' },
  { id: 'belgian', name: 'Belgian', nameZh: '比利时系', icon: '⛪' },
  { id: 'sour', name: 'Sour', nameZh: '酸啤', icon: '🍋' },
  { id: 'wild', name: 'Wild', nameZh: '野生发酵', icon: '🦠' },
  { id: 'farmhouse', name: 'Farmhouse', nameZh: '农舍艾尔', icon: '🏡' },
  { id: 'strongAle', name: 'Strong Ale', nameZh: '强艾尔', icon: '💪' },
  { id: 'scottishIrish', name: 'Scottish / Irish', nameZh: '苏格兰/爱尔兰', icon: '☘️' },
  { id: 'german', name: 'German', nameZh: '德式', icon: '🥨' },
  { id: 'czech', name: 'Czech', nameZh: '捷克系', icon: '🏰' },
  { id: 'british', name: 'British', nameZh: '英式', icon: '💂' },
  { id: 'american', name: 'American', nameZh: '美式', icon: '🦅' },
  { id: 'fruit', name: 'Fruit', nameZh: '水果啤酒', icon: '🍒' },
  { id: 'spice', name: 'Spice', nameZh: '香料啤酒', icon: '🌶️' },
  { id: 'smoke', name: 'Smoke', nameZh: '烟熏啤酒', icon: '💨' },
  { id: 'wood', name: 'Wood / Barrel', nameZh: '木桶陈酿', icon: '🪵' },
  { id: 'historical', name: 'Historical', nameZh: '历史啤酒', icon: '📜' },
  { id: 'experimental', name: 'Experimental', nameZh: '实验精酿', icon: '🧪' },
]

export function stylesInFamily(f: string): BeerStyle[] {
  return STYLES.filter((s) => s.family === f || (s.alsoIn || []).includes(f as any))
}

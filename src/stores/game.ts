// ============================================================
// 游戏主状态：经营、库存、酿造、酒窖、图鉴、研究、存档
// ============================================================
import { defineStore } from 'pinia'
import type {
  BeerBatch,
  BeerRecipe,
  BeerStyle,
  CustomWater,
  EquipmentKind,
  FamilyId,
  FlavorProfile,
  RecipeProcess,
  RegionId,
  WeatherId,
} from '../types'
import {
  ACHIEVEMENTS,
  ADJUNCTS,
  BARRELS,
  COUNTRIES,
  DB_VERSION,
  DECORATIONS,
  EQUIPMENT,
  EVENTS,
  GLASSES,
  HOPS,
  MALTS,
  NPCS,
  RESEARCH,
  STYLES,
  WEATHERS,
  YEASTS,
  adjunctById,
  barrelById,
  countryById,
  decorationById,
  equipmentById,
  eventById,
  glassById,
  hopById,
  ingredientKind,
  ingredientName,
  maltById,
  npcById,
  questById,
  researchById,
  styleById,
  weatherById,
  yeastById,
} from '../engine/db'
import {
  IDENTIFY_SCORE,
  NEAR_SCORE,
  agingBonus,
  DEFAULT_CTX,
  analyzeRecipe,
  applyDefectFlavor,
  exampleToRecipe,
  brewQuality,
  freshnessAt,
  matchAllStyles,
  overallScore,
  type BrewContext,
  type RecipeAnalysis,
} from '../engine/brewing'
import { suggestedPrice } from '../engine/customers'
import { idbDelete, idbGet, idbSet } from '../engine/idb'
import { sfx } from '../engine/audio'
import { useUi } from './ui'

// ---------------- 常量 ----------------
export const DAY_START = 14 * 60
export const OPEN_TIME = 16 * 60
export const CLOSE_TIME = 26 * 60
export const SETTLE_TIME = 26 * 60 + 10
/** 现实 1 秒 = 游戏 10 分钟 */
export const GAME_MIN_PER_SEC = 10

export const REP_LEVELS = [0, 80, 300, 800, 1800, 3500, 6500, 12000]
export const REP_NAMES = ['无名小酒馆', '街角精酿', '社区名店', '城市热门酒吧', '精酿圣地', '全国知名', '世界级酒吧', '传奇精酿酒吧']
export const STATUS_NAMES = ['？？？', '听说过', '获得线索', '成功酿造', '优秀', '大师级']
export const SEASONS = ['春', '夏', '秋', '冬']
export const WAGES = { bartender: 60, brewer: 90 }
export const MAX_STAFF = { bartender: 4, brewer: 3 }
export const BARREL_LITERS = 225
export const BOOK_PRICE = 150
/** 外购批发啤酒：维持早期现金流，但口碑一般 */
export const WHOLESALE = [
  { id: 'lager', name: '批发拉格', styleRef: 'american_lager', price: 70, liters: 20 },
  { id: 'wheat', name: '批发小麦啤', styleRef: 'american_wheat', price: 80, liters: 20 },
  { id: 'stout', name: '批发黑啤', styleRef: 'irish_stout', price: 85, liters: 20 },
]

// ---------------- 类型 ----------------
export interface Fermenter {
  id: string
  tier: number
  batchId?: string
}
export interface BarrelSlot {
  id: string
  barrelId: string
  batchId?: string
  uses: number
}
export interface Tap {
  batchId?: string
  price: number
  temp: number
  mystery: boolean
}
export interface EncEntry {
  status: number
  brewed: number
  best: number
  bestBatch?: number
  /** 已知线索条数 */
  clues: number
  firstDay?: number
}
export interface FeedItem {
  id: number
  day: number
  time: number
  kind: 'rating' | 'npc' | 'system' | 'discovery' | 'chat'
  who?: string
  beer?: string
  score?: number
  text: string
  detail?: string
}
export interface DayReport {
  day: number
  revenue: number
  tips: number
  ingredientCost: number
  wages: number
  rent: number
  profit: number
  cups: number
  customers: number
  lost: number
  avgRating: number
  top: { name: string; cups: number }[]
  discoveries: string[]
  repLevel: number
  repGain: number
  weather: WeatherId
  events: string[]
}
export interface ActiveQuest {
  id: string
  startDay: number
  deadline: number
  status: 'active' | 'done' | 'failed'
}
export interface CustomBeer {
  recipeId: string
  name: string
  styleId?: string
  best: number
  firstDay: number
  batches: number
}
export interface Variant {
  name: string
  styleId: string
  best: number
  count: number
}

export interface GameState {
  saveVersion: number
  dbVersion: string
  started: boolean
  barName: string
  day: number
  minute: number
  speed: number
  paused: boolean
  money: number
  xp: number
  reputation: number
  weather: WeatherId
  events: { id: string; daysLeft: number }[]
  inventory: { malts: Record<string, number>; hops: Record<string, number>; yeasts: Record<string, number>; adjuncts: Record<string, number> }
  research: string[]
  regions: RegionId[]
  extraUnlocks: string[]
  equipment: Record<Exclude<EquipmentKind, 'fermenter'>, number>
  fermenters: Fermenter[]
  barrels: BarrelSlot[]
  glasses: string[]
  decorations: Record<string, number>
  staff: { bartender: number; brewer: number }
  recipes: BeerRecipe[]
  autoBrew: string[]
  batches: BeerBatch[]
  batchCounter: number
  taps: Tap[]
  encyclopedia: Record<string, EncEntry>
  variants: Record<string, Variant>
  customBeers: CustomBeer[]
  achievements: string[]
  quests: ActiveQuest[]
  npcGiftsGiven: string[]
  stats: {
    cupsSold: number
    revenue: number
    batches: number
    customers: number
    ratingSum: number
    ratingCount: number
    bestRating: number
    defectsSeen: string[]
    barrelAged: number
    familyMaxAbv: Record<string, number>
    familiesTasted: string[]
    booksRead: number
  }
  today: {
    revenue: number
    tips: number
    ingredientCost: number
    cups: number
    customers: number
    lost: number
    ratings: number[]
    sales: Record<string, number>
    discoveries: string[]
    repStart: number
    brews: number
    npcVisited: boolean
  }
  reports: DayReport[]
  feed: FeedItem[]
  feedCounter: number
  tutorial: { step: number; done: boolean }
  lastBailoutDay: number
  bankrupt: boolean
  settings: { sfx: number; music: number; autoPause: boolean; showBubbles: boolean; godMode: boolean }
}

function freshState(): GameState {
  const enc: Record<string, EncEntry> = {}
  for (const s of STYLES) enc[s.id] = { status: 0, brewed: 0, best: 0, clues: 0 }
  const startRegions = COUNTRIES.filter((c) => c.start).map((c) => c.id)
  for (const s of STYLES) {
    if (s.discovery !== 'hidden' && s.country.some((c) => startRegions.includes(c)) && s.country[0] && startRegions.includes(s.country[0]))
      enc[s.id].status = 1
  }
  return {
    saveVersion: 1,
    dbVersion: DB_VERSION,
    started: false,
    barName: '像素精酿酒吧',
    day: 1,
    minute: DAY_START,
    speed: 1,
    paused: false,
    money: 800,
    xp: 0,
    reputation: 0,
    weather: 'sunny',
    events: [],
    inventory: {
      malts: { pale_malt: 10, pilsner_malt: 5, crystal_40: 1 },
      hops: { cascade: 150, hallertau_mittelfruh: 50 },
      yeasts: { american_ale: 2 },
      adjuncts: {},
    },
    research: [],
    regions: startRegions,
    extraUnlocks: [],
    equipment: { mill: 0, mashTun: 0, kettle: 0, brightTank: 0, keg: 0, coldStorage: 0, barrelRack: 0, tap: 0 },
    fermenters: [
      { id: 'f1', tier: 0 },
      { id: 'f2', tier: 0 },
    ],
    barrels: [],
    glasses: ['shaker'],
    decorations: {},
    staff: { bartender: 0, brewer: 0 },
    recipes: [],
    autoBrew: [],
    batches: [],
    batchCounter: 0,
    taps: [
      { price: 5, temp: 4, mystery: false },
      { price: 5, temp: 4, mystery: false },
    ],
    encyclopedia: enc,
    variants: {},
    customBeers: [],
    achievements: [],
    quests: [],
    npcGiftsGiven: [],
    stats: {
      cupsSold: 0,
      revenue: 0,
      batches: 0,
      customers: 0,
      ratingSum: 0,
      ratingCount: 0,
      bestRating: 0,
      defectsSeen: [],
      barrelAged: 0,
      familyMaxAbv: {},
      familiesTasted: [],
      booksRead: 0,
    },
    today: emptyToday(0),
    reports: [],
    feed: [],
    feedCounter: 0,
    tutorial: { step: 0, done: false },
    lastBailoutDay: -99,
    bankrupt: false,
    settings: { sfx: 0.6, music: 0.25, autoPause: true, showBubbles: true, godMode: false },
  }
}

function emptyToday(rep: number): GameState['today'] {
  return {
    revenue: 0,
    tips: 0,
    ingredientCost: 0,
    cups: 0,
    customers: 0,
    lost: 0,
    ratings: [],
    sales: {},
    discoveries: [],
    repStart: rep,
    brews: 0,
    npcVisited: false,
  }
}

const uid = () => Math.random().toString(36).slice(2, 10)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function fmtMoney(v: number) {
  return (v < 0 ? '-$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US')
}
export function fmtTime(minute: number) {
  const h = Math.floor(minute / 60) % 24
  const m = Math.floor(minute % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function familiesOf(style?: BeerStyle): FamilyId[] {
  return style ? [style.family, ...(style.alsoIn || [])] : ['experimental']
}

// ============================================================
export const useGame = defineStore('game', {
  state: (): GameState => freshState(),

  getters: {
    repLevel(s): number {
      let lv = 1
      for (let i = 0; i < REP_LEVELS.length; i++) if (s.reputation >= REP_LEVELS[i]) lv = i + 1
      return lv
    },
    repName(): string {
      return REP_NAMES[this.repLevel - 1]
    },
    repProgress(s): number {
      const lv = this.repLevel
      if (lv >= REP_LEVELS.length) return 1
      return (s.reputation - REP_LEVELS[lv - 1]) / (REP_LEVELS[lv] - REP_LEVELS[lv - 1])
    },
    season(s): number {
      return Math.floor(((s.day - 1) % 112) / 28)
    },
    isOpen(s): boolean {
      return s.minute >= OPEN_TIME && s.minute < CLOSE_TIME
    },
    equipTier: (s) => (kind: EquipmentKind) => (kind === 'fermenter' ? 0 : s.equipment[kind]),
    equipStats(s) {
      const get = (kind: Exclude<EquipmentKind, 'fermenter'>) => EQUIPMENT.find((e) => e.kind === kind && e.tier === s.equipment[kind])
      return {
        mill: get('mill'),
        mashTun: get('mashTun'),
        kettle: get('kettle'),
        brightTank: get('brightTank'),
        keg: get('keg'),
        coldStorage: get('coldStorage'),
        barrelRack: get('barrelRack'),
        tap: get('tap'),
      }
    },
    researchEffects(s) {
      const fx = {
        efficiency: 0,
        hopAroma: 0,
        quality: 0,
        sanitation: 0,
        diacetyl: 0,
        agingSpeed: 1,
        fermTemp: false,
        waterPresets: false,
        waterAdvanced: false,
        carbonation: false,
        barrel: false,
        processes: [] as RecipeProcess[],
      }
      for (const id of s.settings.godMode ? RESEARCH.map((n) => n.id) : s.research) {
        const n = researchById[id]
        if (!n) continue
        for (const e of n.effects) {
          const [k, v] = e.split(':')
          if (k === 'efficiency') fx.efficiency += Number(v) / 100
          else if (k === 'hopAroma') fx.hopAroma += Number(v)
          else if (k === 'quality') fx.quality += Number(v)
          else if (k === 'sanitation') fx.sanitation += Number(v)
          else if (k === 'diacetyl') fx.diacetyl += Number(v)
          else if (k === 'agingSpeed') fx.agingSpeed *= Number(v)
          else if (k === 'fermTemp') fx.fermTemp = true
          else if (k === 'water' && v === 'presets') fx.waterPresets = true
          else if (k === 'water' && v === 'advanced') fx.waterAdvanced = true
          else if (k === 'carbonation') fx.carbonation = true
          else if (k === 'barrel') fx.barrel = true
          else if (k === 'process') fx.processes.push(v as RecipeProcess)
        }
      }
      return fx
    },
    brewCtx(): BrewContext {
      const eq = this.equipStats
      return {
        efficiency: (eq.mill?.stats.efficiency ?? 0.7) + this.researchEffects.efficiency + (this.equipment.mashTun >= 2 ? 0.02 : 0),
        hopAromaBonus: this.researchEffects.hopAroma,
        clarity: eq.brightTank?.stats.clarity ?? 1,
      }
    },
    tapCount(): number {
      return this.equipStats.tap?.stats.taps ?? 2
    },
    kegCapacity(): number {
      return this.equipStats.keg?.stats.liters ?? 120
    },
    kegUsed(s): number {
      return s.batches.filter((b) => b.stage === 'packaged').reduce((t, b) => t + b.remaining, 0)
    },
    maxBatchVolume(): number {
      return this.equipStats.kettle?.stats.maxVolume ?? 20
    },
    brewsPerDay(): number {
      return this.equipStats.mashTun?.stats.brewsPerDay ?? 1
    },
    barrelSlots(): number {
      return this.equipStats.barrelRack?.stats.slots ?? 0
    },
    tapTempControl(): boolean {
      return !!this.equipStats.coldStorage?.stats.tempControl
    },
    styleStatus: (s) => (id: string) => s.encyclopedia[id]?.status ?? 0,
    /** 上帝模式下所有研究视为完成 */
    hasResearch: (s) => (id: string) => s.settings.godMode || s.research.includes(id),
    /** 上帝模式下所有地区视为开通 */
    hasRegion: (s) => (id: string) => s.settings.godMode || s.regions.includes(id as RegionId),
    /** 玩家对某风格的“知识”等级：上帝模式下全部可见（不影响图鉴收集进度） */
    styleKnowledge: (s) => (id: string) => (s.settings.godMode ? Math.max(3, s.encyclopedia[id]?.status ?? 0) : (s.encyclopedia[id]?.status ?? 0)),
    discoveredCount(s): number {
      return Object.values(s.encyclopedia).filter((e) => e.status >= 3).length
    },
    avgRating(s): number {
      return s.stats.ratingCount ? s.stats.ratingSum / s.stats.ratingCount : 0
    },
    seatCount(s): number {
      let n = 4 + 3
      for (const [id, c] of Object.entries(s.decorations)) {
        const d = decorationById[id]
        if (d?.seats) n += d.seats.count * c
      }
      return n
    },
    ambience(s): number {
      let a = 0
      for (const [id, c] of Object.entries(s.decorations)) a += (decorationById[id]?.ambience ?? 0) * c
      return a
    },
    archetypeBonus(s): Record<string, number> {
      const b: Record<string, number> = {}
      for (const [id, c] of Object.entries(s.decorations)) {
        const d = decorationById[id]
        for (const [k, v] of Object.entries(d?.attract || {})) b[k] = (b[k] || 0) + v * c
      }
      for (const e of s.events) {
        const ev = eventById[e.id]
        for (const [k, v] of Object.entries(ev?.archetype || {})) b[k] = (b[k] || 0) + v
      }
      return b
    },
    familyDemand(s): Partial<Record<FamilyId, number>> {
      const d: Partial<Record<FamilyId, number>> = {}
      const w = weatherById[s.weather]
      for (const [k, v] of Object.entries(w?.family || {})) d[k as FamilyId] = (d[k as FamilyId] || 1) * (v as number)
      for (const e of s.events) {
        const ev = eventById[e.id]
        for (const [k, v] of Object.entries(ev?.family || {})) d[k as FamilyId] = (d[k as FamilyId] || 1) * (v as number)
      }
      return d
    },
    trafficMult(s): number {
      let t = weatherById[s.weather]?.traffic ?? 1
      for (const e of s.events) t *= eventById[e.id]?.traffic ?? 1
      return t
    },
    priceTolerance(s): number {
      let t = 1 + (this.repLevel - 1) * 0.06
      for (const e of s.events) t *= eventById[e.id]?.priceTolerance ?? 1
      return t
    },
    dailyRent(): number {
      return 30 + 15 * this.repLevel
    },
    dailyWages(s): number {
      return s.staff.bartender * WAGES.bartender + s.staff.brewer * WAGES.brewer
    },
  },

  actions: {
    // ---------------- 通用 ----------------
    log(item: Omit<FeedItem, 'id' | 'day' | 'time'>) {
      this.feed.unshift({ ...item, id: ++this.feedCounter, day: this.day, time: this.minute })
      if (this.feed.length > 250) this.feed.length = 250
    },
    spend(amount: number, what = '资金'): boolean {
      // 上帝模式：金钱无限
      if (this.settings.godMode) return true
      if (amount > 0 && this.money < amount) {
        useUi().toast(`${what}不足：需要 ${fmtMoney(amount)}`, '💸', 'bad')
        sfx('error')
        return false
      }
      this.money -= amount
      return true
    },
    isUnlocked(rule: string, id?: string): boolean {
      if (id && this.extraUnlocks.includes(id)) return true
      if (!rule || rule === 'start' || this.settings.godMode) return true
      const [k, v] = rule.split(':')
      if (k === 'research') return this.research.includes(v)
      if (k === 'region') return this.regions.includes(v as RegionId)
      if (k === 'rep') return this.repLevel >= Number(v)
      if (k === 'npc') return this.npcGiftsGiven.some((g) => g.startsWith(v))
      return false
    },
    unlockText(rule: string): string {
      const [k, v] = rule.split(':')
      if (k === 'research') return `研究「${researchById[v]?.nameZh ?? v}」`
      if (k === 'region') return `开通地区「${countryById[v]?.nameZh ?? v}」`
      if (k === 'rep') return `声望达到 Lv.${v}`
      if (k === 'npc') return `特殊客人赠予`
      return ''
    },
    ingredientUnlocked(id: string): boolean {
      if (this.settings.godMode) return !!(maltById[id] || hopById[id] || yeastById[id] || adjunctById[id] || barrelById[id])
      const x = maltById[id] || hopById[id] || yeastById[id] || adjunctById[id] || barrelById[id]
      return !!x && this.isUnlocked(x.unlock, id)
    },
    addRep(v: number) {
      const before = this.repLevel
      this.reputation = Math.max(0, this.reputation + v)
      const after = this.repLevel
      if (after > before) {
        sfx('levelup')
        useUi().push({ kind: 'levelup', level: after })
        this.log({ kind: 'system', text: `酒吧声望提升到 Lv.${after}「${REP_NAMES[after - 1]}」` })
      }
    },

    // ---------------- 新游戏 / 存档 ----------------
    newGame(barName?: string) {
      this.$patch(freshState())
      this.$state.encyclopedia = freshState().encyclopedia
      this.started = true
      if (barName) this.barName = barName
      this.rollWeather()
      this.log({ kind: 'system', text: '你接手了一家即将倒闭的小酒吧。老酿酒师在吧台后面等着你。' })
    },
    serialize(): string {
      return JSON.stringify(this.$state)
    },
    async save(slot = 'auto') {
      await idbSet('slot:' + slot, JSON.parse(this.serialize()))
      await idbSet('meta:' + slot, { day: this.day, money: this.money, barName: this.barName, discovered: this.discoveredCount, savedAt: Date.now() })
    },
    async load(slot = 'auto'): Promise<boolean> {
      const data = await idbGet<GameState>('slot:' + slot)
      if (!data) return false
      this.loadState(data)
      return true
    },
    loadState(data: GameState) {
      const base = freshState()
      const merged: GameState = { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) }, stats: { ...base.stats, ...(data.stats || {}) } }
      this.$patch((s) => Object.assign(s, merged))
      this.started = true
      this.paused = false
      // 数据库更新：补齐新增风格
      let added = 0
      for (const st of STYLES) {
        if (!this.encyclopedia[st.id]) {
          this.encyclopedia[st.id] = { status: 0, brewed: 0, best: 0, clues: 0 }
          if (st.discovery !== 'hidden' && this.regions.includes(st.country[0])) this.encyclopedia[st.id].status = 1
          added++
        }
      }
      if (this.dbVersion !== DB_VERSION || added > 0) {
        const old = this.dbVersion
        this.dbVersion = DB_VERSION
        if (added > 0 || old !== DB_VERSION) useUi().push({ kind: 'dbupdate', added, version: DB_VERSION })
      }
      // 酒头数量与设备一致
      this.syncTaps()
    },
    async listSaves() {
      const out: { slot: string; meta: any }[] = []
      for (const slot of ['auto', '1', '2', '3']) {
        const meta = await idbGet<any>('meta:' + slot)
        out.push({ slot, meta })
      }
      return out
    },
    async deleteSave(slot: string) {
      await idbDelete('slot:' + slot)
      await idbDelete('meta:' + slot)
    },

    // ---------------- 时间 ----------------
    /** 推进游戏时间；返回本帧推进的游戏分钟数 */
    advance(dtSec: number): number {
      if (this.paused || !this.started || this.bankrupt) return 0
      const before = this.minute
      const dMin = dtSec * GAME_MIN_PER_SEC * this.speed
      this.minute = Math.min(SETTLE_TIME, this.minute + dMin)
      const ui = useUi()
      if (before < OPEN_TIME && this.minute >= OPEN_TIME) {
        ui.toast('16:00 开门营业！', '🔔', 'good')
        sfx('door')
      }
      if (before < CLOSE_TIME && this.minute >= CLOSE_TIME) ui.toast('02:00 打烊', '🌙')
      if (before < SETTLE_TIME && this.minute >= SETTLE_TIME) this.settleDay()
      return this.minute - before
    },
    skipToOpen() {
      if (this.minute < OPEN_TIME) {
        this.minute = OPEN_TIME - 0.01
        this.paused = false
      }
    },
    rollWeather() {
      const season = this.season
      const w = WEATHERS.slice()
      let total = 0
      for (const x of w) total += x.season[season]
      let r = Math.random() * total
      for (const x of w) {
        r -= x.season[season]
        if (r <= 0) {
          this.weather = x.id
          break
        }
      }
    },
    settleDay() {
      const rent = this.dailyRent
      const wages = this.dailyWages
      if (!this.settings.godMode) this.money -= rent + wages
      const t = this.today
      const ranking = Object.entries(t.sales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, cups]) => ({ name, cups }))
      const rep: DayReport = {
        day: this.day,
        revenue: Math.round(t.revenue),
        tips: Math.round(t.tips),
        ingredientCost: Math.round(t.ingredientCost),
        wages,
        rent,
        profit: Math.round(t.revenue + t.tips - t.ingredientCost - wages - rent),
        cups: t.cups,
        customers: t.customers,
        lost: t.lost,
        avgRating: t.ratings.length ? Math.round(t.ratings.reduce((a, b) => a + b, 0) / t.ratings.length) : 0,
        top: ranking,
        discoveries: [...t.discoveries],
        repLevel: this.repLevel,
        repGain: Math.round(this.reputation - t.repStart),
        weather: this.weather,
        events: this.events.map((e) => e.id),
      }
      this.reports.unshift(rep)
      if (this.reports.length > 60) this.reports.length = 60
      this.paused = true
      useUi().push({ kind: 'report', day: this.day })
      if (this.money < 0 && !this.settings.godMode) {
        this.bankrupt = true
        useUi().push({ kind: 'bankrupt' })
      }
    },
    /** 结算后进入下一天（14:00） */
    nextDay() {
      this.day++
      this.minute = DAY_START
      this.today = emptyToday(this.reputation)
      this.paused = false
      // 事件
      this.events = this.events.map((e) => ({ ...e, daysLeft: e.daysLeft - 1 })).filter((e) => e.daysLeft > 0)
      if (this.events.length < 2) {
        for (const ev of EVENTS) {
          if (this.events.some((e) => e.id === ev.id)) continue
          if (ev.minRep > this.repLevel) continue
          if (ev.season && !ev.season.includes(this.season)) continue
          if (Math.random() < ev.chance) {
            this.events.push({ id: ev.id, daysLeft: ev.days })
            useUi().toast(`${ev.nameZh}：${ev.desc}`, ev.icon, 'gold')
            this.log({ kind: 'system', text: `${ev.icon} 事件「${ev.nameZh}」开始：${ev.desc}` })
            break
          }
        }
      }
      this.rollWeather()
      this.progressBatches()
      // 任务过期
      for (const q of this.quests) {
        if (q.status === 'active' && this.day > q.deadline) {
          q.status = 'failed'
          this.log({ kind: 'system', text: `任务「${questById[q.id]?.nameZh}」已过期。` })
        }
      }
      this.autoProduce()
      this.checkAchievements()
      void this.save('auto')
    },

    // ---------------- 采购 ----------------
    priceOf(id: string): number {
      const k = ingredientKind(id)
      if (k === 'malt') return maltById[id].price
      if (k === 'hop') return hopById[id].price
      if (k === 'yeast') return yeastById[id].price
      if (k === 'adjunct') return adjunctById[id].price / 1000
      return 0
    },
    buyIngredient(id: string, qty: number): boolean {
      const k = ingredientKind(id)
      if (!k || k === 'barrel' || !this.ingredientUnlocked(id)) return false
      const cost = Math.round(this.priceOf(id) * qty * 100) / 100
      if (!this.spend(cost, '资金')) return false
      this.today.ingredientCost += cost
      const inv = k === 'malt' ? this.inventory.malts : k === 'hop' ? this.inventory.hops : k === 'yeast' ? this.inventory.yeasts : this.inventory.adjuncts
      inv[id] = Math.round(((inv[id] || 0) + qty) * 1000) / 1000
      sfx('coin')
      return true
    },
    /** 酿造指定体积所需原料 */
    requirements(recipe: BeerRecipe, volume: number) {
      const f = volume / 20
      const need: { id: string; kind: 'malt' | 'hop' | 'yeast' | 'adjunct'; qty: number; have: number; unit: string }[] = []
      const add = (id: string, kind: 'malt' | 'hop' | 'yeast' | 'adjunct', qty: number, unit: string) => {
        const ex = need.find((n) => n.id === id)
        if (ex) ex.qty += qty
        else {
          const inv = kind === 'malt' ? this.inventory.malts : kind === 'hop' ? this.inventory.hops : kind === 'yeast' ? this.inventory.yeasts : this.inventory.adjuncts
          need.push({ id, kind, qty, have: this.settings.godMode ? Infinity : inv[id] || 0, unit })
        }
      }
      for (const m of recipe.malts) add(m.id, 'malt', Math.round(m.amount * f * 100) / 100, 'kg')
      for (const h of recipe.hops) add(h.id, 'hop', Math.round(h.grams * f), 'g')
      if (recipe.yeast) add(recipe.yeast, 'yeast', Math.max(1, Math.ceil(volume / 25)), '包')
      for (const a of recipe.adjuncts) add(a.id, 'adjunct', Math.round(a.amount * f), 'g')
      return need
    },
    missingCost(recipe: BeerRecipe, volume: number): number {
      return this.requirements(recipe, volume).reduce((t, n) => t + Math.max(0, n.qty - n.have) * this.priceOf(n.id), 0)
    },
    buyMissing(recipe: BeerRecipe, volume: number): boolean {
      const need = this.requirements(recipe, volume).filter((n) => n.qty > n.have + 1e-6)
      for (const n of need) if (!this.ingredientUnlocked(n.id)) {
        useUi().toast(`${ingredientName(n.id)} 尚未解锁`, '🔒', 'bad')
        return false
      }
      const cost = this.missingCost(recipe, volume)
      if (!this.spend(Math.round(cost * 100) / 100, '资金')) return false
      this.today.ingredientCost += cost
      for (const n of need) {
        const inv = n.kind === 'malt' ? this.inventory.malts : n.kind === 'hop' ? this.inventory.hops : n.kind === 'yeast' ? this.inventory.yeasts : this.inventory.adjuncts
        inv[n.id] = Math.round(((inv[n.id] || 0) + (n.qty - n.have)) * 1000) / 1000
      }
      sfx('coin')
      return true
    },
    buyWholesale(id: string): boolean {
      const w = WHOLESALE.find((x) => x.id === id)
      const ref = w ? styleById[w.styleRef] : undefined
      if (!w || !ref) return false
      if (this.kegCapacity - this.kegUsed < w.liters) {
        useUi().toast('酒桶空间不足', '🛢️', 'bad')
        return false
      }
      if (!this.spend(w.price, '资金')) return false
      this.today.ingredientCost += w.price
      const recipe = exampleToRecipe(ref.example, w.name)
      const a = analyzeRecipe(recipe, DEFAULT_CTX)
      const p = { ...a.profile, hopAroma: a.profile.hopAroma * 0.6, malt: a.profile.malt * 0.8 }
      this.batchCounter++
      this.batches.push({
        id: 'b' + uid(), number: this.batchCounter, recipeId: 'wholesale_' + w.id, recipeName: w.name, brewDate: this.day,
        volume: w.liters, remaining: w.liters, og: a.og, fg: a.fg, abv: a.abv, ibu: a.ibu, color: a.srm, freshness: 90,
        quality: 52, styleAccuracy: 45, overall: 48, displayName: w.name, defects: [], flavorProfile: p, aromas: a.aromas.slice(0, 2),
        stage: 'packaged', stageDays: 0, fermentDays: 0, maturationDays: 0, mashScore: 50, ageDays: 10, isCustom: false,
        sold: 0, tasted: true, recipe, ctx: DEFAULT_CTX, wholesale: true, packagedDay: this.day,
      })
      sfx('coin')
      useUi().toast(`购入 ${w.name} ${w.liters}L`, '🛢️')
      return true
    },
    /** 今日歇业：直接结算（没有酒可卖时跳过等待） */
    closeToday() {
      if (this.isOpen && this.today.cups > 0) return
      this.minute = SETTLE_TIME
      this.settleDay()
    },
    buyBook(): boolean {
      // 古籍：随机获得一条未知风格的线索
      const pool = STYLES.filter((s) => (this.encyclopedia[s.id]?.status ?? 0) < 2)
      if (!pool.length) {
        useUi().toast('书架上已经没有新东西了', '📚')
        return false
      }
      if (!this.spend(BOOK_PRICE, '资金')) return false
      const hidden = pool.filter((s) => s.discovery === 'hidden')
      const s = hidden.length && Math.random() < 0.5 ? hidden[Math.floor(Math.random() * hidden.length)] : pool[Math.floor(Math.random() * pool.length)]
      this.giveClue(s.id, '古籍')
      this.stats.booksRead++
      return true
    },

    // ---------------- 设备 ----------------
    buyEquipment(id: string): boolean {
      const e = equipmentById[id]
      if (!e || e.kind === 'fermenter') return false
      if (!this.isUnlocked(e.unlock)) return false
      const cur = this.equipment[e.kind as Exclude<EquipmentKind, 'fermenter'>]
      if (e.tier <= cur) return false
      const curItem = EQUIPMENT.find((x) => x.kind === e.kind && x.tier === cur)
      const tradeIn = Math.round((curItem?.price ?? 0) * 0.3)
      if (!this.spend(e.price - tradeIn, '资金')) return false
      this.equipment[e.kind as Exclude<EquipmentKind, 'fermenter'>] = e.tier
      if (e.kind === 'tap') this.syncTaps()
      sfx('coin')
      useUi().toast(`已安装：${e.nameZh}`, '🔧', 'good')
      this.checkAchievements()
      return true
    },
    sellEquipment(kind: Exclude<EquipmentKind, 'fermenter'>): boolean {
      const cur = this.equipment[kind]
      const minTier = kind === 'brightTank' || kind === 'barrelRack' ? 0 : 0
      if (cur <= minTier && !(kind === 'brightTank' || kind === 'barrelRack')) return false
      const item = EQUIPMENT.find((x) => x.kind === kind && x.tier === cur)
      if (!item) return false
      if (kind === 'barrelRack' && this.barrels.some((b) => b.batchId)) {
        useUi().toast('木桶里还有酒，不能出售酒窖', '🪵', 'bad')
        return false
      }
      const lower = EQUIPMENT.filter((x) => x.kind === kind && x.tier < cur).sort((a, b) => b.tier - a.tier)[0]
      this.money += Math.round(item.price * 0.5)
      this.equipment[kind] = lower ? lower.tier : 0
      if (kind === 'tap') this.syncTaps()
      if (kind === 'barrelRack') this.barrels = this.barrels.slice(0, this.barrelSlots)
      useUi().toast(`已出售 ${item.nameZh}，回收 ${fmtMoney(item.price * 0.5)}`, '💰')
      return true
    },
    buyFermenter(tier: number): boolean {
      const e = EQUIPMENT.find((x) => x.kind === 'fermenter' && x.tier === tier)
      if (!e || !this.isUnlocked(e.unlock)) return false
      if (this.fermenters.length >= 12) {
        useUi().toast('后场放不下更多发酵罐了（最多 12 个）', '🛢️', 'bad')
        return false
      }
      if (!this.spend(e.price, '资金')) return false
      this.fermenters.push({ id: 'f' + uid(), tier })
      sfx('coin')
      return true
    },
    sellFermenter(id: string): boolean {
      const f = this.fermenters.find((x) => x.id === id)
      if (!f || f.batchId) return false
      if (this.fermenters.length <= 1) {
        useUi().toast('至少要保留一个发酵罐', '🛢️', 'bad')
        return false
      }
      const e = EQUIPMENT.find((x) => x.kind === 'fermenter' && x.tier === f.tier)
      this.money += Math.round((e?.price ?? 0) * 0.5)
      this.fermenters = this.fermenters.filter((x) => x.id !== id)
      return true
    },
    fermenterCapacity(f: Fermenter): number {
      return EQUIPMENT.find((x) => x.kind === 'fermenter' && x.tier === f.tier)?.stats.capacity ?? 20
    },
    buyBarrel(barrelId: string): boolean {
      const b = barrelById[barrelId]
      if (!b || !this.ingredientUnlocked(barrelId)) return false
      if (this.barrels.length >= this.barrelSlots) {
        useUi().toast('酒窖没有空位了，升级木桶架', '🪵', 'bad')
        return false
      }
      if (!this.spend(b.price, '资金')) return false
      this.barrels.push({ id: 'b' + uid(), barrelId, uses: 0 })
      sfx('coin')
      return true
    },
    sellBarrel(slotId: string) {
      const b = this.barrels.find((x) => x.id === slotId)
      if (!b || b.batchId) return
      this.money += Math.round((barrelById[b.barrelId]?.price ?? 0) * 0.4)
      this.barrels = this.barrels.filter((x) => x.id !== slotId)
    },
    syncTaps() {
      const n = this.tapCount
      while (this.taps.length < n) this.taps.push({ price: 5, temp: 4, mystery: false })
      if (this.taps.length > n) this.taps.length = n
    },
    buyGlass(id: string): boolean {
      const g = glassById[id]
      if (!g || this.glasses.includes(id) || !this.isUnlocked(g.unlock)) return false
      if (!this.spend(g.price, '资金')) return false
      this.glasses.push(id)
      sfx('coin')
      return true
    },
    buyDecoration(id: string): boolean {
      const d = decorationById[id]
      if (!d || !this.isUnlocked(d.unlock)) return false
      if ((this.decorations[id] || 0) >= d.maxCount) return false
      if (!this.spend(d.price, '资金')) return false
      this.decorations[id] = (this.decorations[id] || 0) + 1
      sfx('coin')
      this.checkAchievements()
      return true
    },
    sellDecoration(id: string) {
      const d = decorationById[id]
      if (!d || !this.decorations[id]) return
      this.decorations[id]--
      if (!this.decorations[id]) delete this.decorations[id]
      this.money += Math.round(d.price * 0.4)
    },
    hire(role: 'bartender' | 'brewer') {
      if (this.staff[role] >= MAX_STAFF[role]) return
      this.staff[role]++
      sfx('click')
    },
    fire(role: 'bartender' | 'brewer') {
      if (this.staff[role] > 0) this.staff[role]--
    },

    // ---------------- 研究 / 地区 ----------------
    canResearch(id: string): boolean {
      const n = researchById[id]
      if (this.settings.godMode) return false
      return !!n && !this.research.includes(id) && n.requires.every((r) => this.research.includes(r)) && this.xp >= n.cost
    },
    doResearch(id: string): boolean {
      if (!this.canResearch(id)) return false
      const n = researchById[id]
      this.xp -= n.cost
      this.research.push(id)
      for (const e of n.effects) {
        if (e.startsWith('clue:')) {
          const fam = e.slice(5)
          const pool = STYLES.filter((s) => (s.family === fam || s.alsoIn?.includes(fam as FamilyId)) && (this.encyclopedia[s.id]?.status ?? 0) < 2)
          for (let i = 0; i < 3 && pool.length; i++) {
            const s = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
            this.giveClue(s.id, '研究')
          }
        }
      }
      sfx('levelup')
      useUi().toast(`研究完成：${n.nameZh}`, '🔬', 'good')
      this.log({ kind: 'system', text: `🔬 研究完成「${n.nameZh}」：${n.desc}` })
      this.checkAchievements()
      return true
    },
    canUnlockRegion(id: RegionId): boolean {
      const c = countryById[id]
      return !!c && !this.regions.includes(id) && this.repLevel >= c.minRep && this.money >= c.cost
    },
    unlockRegion(id: RegionId): boolean {
      const c = countryById[id]
      if (!c || this.regions.includes(id)) return false
      if (this.repLevel < c.minRep) {
        useUi().toast(`需要声望 Lv.${c.minRep}`, '🌍', 'bad')
        return false
      }
      if (!this.spend(c.cost, '资金')) return false
      this.regions.push(id)
      let heard = 0
      for (const s of STYLES) {
        if (s.discovery !== 'hidden' && s.country[0] === id && (this.encyclopedia[s.id]?.status ?? 0) < 1) {
          this.encyclopedia[s.id].status = 1
          heard++
        }
      }
      sfx('discover')
      useUi().toast(`开通贸易路线：${c.flag} ${c.nameZh}（${heard} 种新风格进入视野）`, '🌍', 'gold')
      this.log({ kind: 'system', text: `${c.flag} 开通「${c.nameZh}」：${c.desc}` })
      this.checkAchievements()
      return true
    },

    // ---------------- 图鉴 ----------------
    giveHeard(styleId: string) {
      const e = this.encyclopedia[styleId]
      if (e && e.status < 1) {
        e.status = 1
        const s = styleById[styleId]
        useUi().toast(`听说了一种啤酒：${s?.name}`, '👂')
      }
    },
    giveClue(styleId: string, source = '线索') {
      const e = this.encyclopedia[styleId]
      const s = styleById[styleId]
      if (!e || !s) return
      if (e.status < 2) e.status = 2
      const before = e.clues
      e.clues = Math.min(s.clues.length, Math.max(e.clues + 2, 2))
      if (e.clues > before || before === 0) {
        useUi().toast(`${source}：获得「${s.name}」的线索`, '📜', 'gold')
        this.log({ kind: 'discovery', text: `📜 ${source}带来了「${s.name}」的线索：${s.clues.slice(0, e.clues).join(' ')}` })
      }
    },
    applyGift(gift: string, from: string) {
      if (this.npcGiftsGiven.includes(gift)) return
      this.npcGiftsGiven.push(gift)
      const [k, v] = gift.split(':')
      if (k === 'clue') this.giveClue(v, from)
      else if (k === 'heard') this.giveHeard(v)
      else if (k === 'ingredient') {
        if (!this.extraUnlocks.includes(v)) this.extraUnlocks.push(v)
        const kind = ingredientKind(v)
        const inv = kind === 'malt' ? this.inventory.malts : kind === 'hop' ? this.inventory.hops : kind === 'yeast' ? this.inventory.yeasts : this.inventory.adjuncts
        const amount = kind === 'malt' ? 3 : kind === 'hop' ? 100 : kind === 'yeast' ? 2 : 500
        inv[v] = (inv[v] || 0) + amount
        useUi().toast(`${from} 送来了 ${ingredientName(v)}（已解锁）`, '🎁', 'gold')
      } else if (k === 'quest') {
        const q = questById[v]
        if (q && !this.quests.some((x) => x.id === v)) {
          this.quests.push({ id: v, startDay: this.day, deadline: this.day + q.days, status: 'active' })
          useUi().toast(`新任务：${q.nameZh}`, '📋', 'gold')
          this.log({ kind: 'npc', who: from, text: `📋 委托「${q.nameZh}」：${q.desc}` })
        }
      }
    },
    /** NPC 到访：返回选中的礼物 */
    npcVisit(npcId: string): string | undefined {
      const npc = npcById[npcId]
      if (!npc) return
      this.today.npcVisited = true
      const remaining = npc.gifts.filter((g) => !this.npcGiftsGiven.includes(g))
      const gift = remaining.length ? remaining[Math.floor(Math.random() * remaining.length)] : undefined
      const line = npc.greeting[Math.floor(Math.random() * npc.greeting.length)]
      this.log({ kind: 'npc', who: npc.nameZh, text: line })
      useUi().push({ kind: 'npc', npcId, lines: [line], gift })
      if (gift) this.applyGift(gift, npc.nameZh)
      return gift
    },
    eligibleNpcs() {
      return NPCS.filter((n) => (this.settings.godMode || n.minRep <= this.repLevel) && (!n.region || this.hasRegion(n.region)) && n.id !== 'old_brewer')
    },

    // ---------------- 配方 ----------------
    newRecipeTemplate(): BeerRecipe {
      return {
        id: 'r' + uid(),
        name: '新配方',
        malts: [{ id: 'pale_malt', amount: 4.5 }],
        hops: [{ id: 'cascade', grams: 20, use: 'boil', time: 60 }],
        yeast: 'american_ale',
        waterProfile: 'balanced',
        adjuncts: [],
        mashTemperature: 66,
        boilTime: 60,
        fermentationTemperature: 19,
        fermentationDays: 10,
        maturationDays: 3,
        carbonation: 2.4,
        processes: [],
        isCustom: false,
        createdDay: this.day,
        brewCount: 0,
      }
    },
    saveRecipe(r: BeerRecipe) {
      const copy: BeerRecipe = JSON.parse(JSON.stringify(r))
      const i = this.recipes.findIndex((x) => x.id === copy.id)
      if (i >= 0) this.recipes[i] = copy
      else this.recipes.push(copy)
    },
    deleteRecipe(id: string) {
      this.recipes = this.recipes.filter((r) => r.id !== id)
      this.autoBrew = this.autoBrew.filter((x) => x !== id)
    },
    toggleAutoBrew(id: string) {
      if (this.autoBrew.includes(id)) this.autoBrew = this.autoBrew.filter((x) => x !== id)
      else this.autoBrew.push(id)
    },
    setCustomWater(r: BeerRecipe, w: CustomWater) {
      r.customWater = w
      r.waterProfile = 'custom'
    },

    // ---------------- 酿造 ----------------
    qualityCtx() {
      const fx = this.researchEffects
      const eq = this.equipStats
      return {
        qualityBonus: (eq.mashTun?.stats.quality ?? 0) + (eq.brightTank?.stats.quality ?? 0) + fx.quality,
        sanitation: clamp(0.25 + fx.sanitation, 0, 0.95),
        diacetylReduce: fx.diacetyl,
        tempControl: fx.fermTemp,
        dmsFactor: eq.kettle?.stats.dms ?? 1,
        rng: Math.random,
      }
    },
    canBrewToday(): boolean {
      if (this.settings.godMode) return true
      return this.today.brews < this.brewsPerDay
    },
    /**
     * 酿造：消耗原料，生成批次进入发酵罐。
     * mashScore：糖化小游戏得分（0~100）
     */
    brew(recipeId: string, volume: number, fermenterId: string, mashScore: number, auto = false): BeerBatch | null {
      const recipe = this.recipes.find((r) => r.id === recipeId)
      const f = this.fermenters.find((x) => x.id === fermenterId)
      const ui = useUi()
      if (!recipe || !f || f.batchId) return null
      if (!this.canBrewToday()) {
        ui.toast(`糖化锅今天已经满负荷了（每天 ${this.brewsPerDay} 批）`, '♨️', 'bad')
        return null
      }
      volume = Math.min(volume, this.fermenterCapacity(f), this.maxBatchVolume)
      const need = this.requirements(recipe, volume)
      if (need.some((n) => n.have + 1e-6 < n.qty)) {
        ui.toast('原料不足', '🌾', 'bad')
        return null
      }
      for (const n of this.settings.godMode ? [] : need) {
        const inv = n.kind === 'malt' ? this.inventory.malts : n.kind === 'hop' ? this.inventory.hops : n.kind === 'yeast' ? this.inventory.yeasts : this.inventory.adjuncts
        inv[n.id] = Math.round((inv[n.id] - n.qty) * 1000) / 1000
        if (inv[n.id] <= 0.0001) delete inv[n.id]
      }
      const ctx = this.brewCtx
      const snapshot: BeerRecipe = JSON.parse(JSON.stringify(recipe))
      const a = analyzeRecipe(snapshot, ctx)
      const q = brewQuality(snapshot, a, mashScore, this.qualityCtx())
      const profile: FlavorProfile = { ...a.profile }
      applyDefectFlavor(profile, q.defects)
      this.batchCounter++
      const tutorialFast = !this.tutorial.done
      const batch: BeerBatch = {
        id: 'b' + uid(),
        number: this.batchCounter,
        recipeId: recipe.id,
        recipeName: recipe.name,
        brewDate: this.day,
        volume: Math.round(volume * a.yieldFactor),
        remaining: Math.round(volume * a.yieldFactor),
        og: a.og,
        fg: a.fg,
        abv: a.abv,
        ibu: a.ibu,
        color: a.srm,
        freshness: 100,
        quality: q.quality,
        styleAccuracy: 0,
        overall: 0,
        displayName: recipe.name,
        defects: q.defects,
        flavorProfile: profile,
        aromas: a.aromas,
        stage: 'fermenting',
        fermenterId: f.id,
        stageDays: 0,
        fermentDays: tutorialFast ? 0 : recipe.fermentationDays,
        maturationDays: tutorialFast ? 0 : recipe.maturationDays,
        mashScore,
        ageDays: 0,
        isCustom: recipe.isCustom,
        label: recipe.label ? { ...recipe.label } : undefined,
        sold: 0,
        tasted: false,
        recipe: snapshot,
        ctx,
        auto,
      }
      this.batches.push(batch)
      f.batchId = batch.id
      recipe.brewCount++
      this.today.brews++
      this.stats.batches++
      this.xp += 15
      sfx('brew')
      this.log({ kind: 'system', text: `${auto ? '👷 员工' : '🍺 '}酿造了第 ${batch.number} 批「${recipe.name}」${batch.volume}L，预计 ${recipe.fermentationDays + recipe.maturationDays} 天后完成。` })
      if (tutorialFast) this.finishFermentation(batch)
      this.checkAchievements()
      return batch
    },
    saveStandard(recipeId: string, mashScore: number) {
      const r = this.recipes.find((x) => x.id === recipeId)
      if (r) r.standard = { mashScore: Math.max(r.standard?.mashScore ?? 0, mashScore) }
    },
    /** 每天推进批次 */
    progressBatches() {
      const decay = this.equipStats.coldStorage?.stats.decay ?? 1
      for (const b of this.batches) {
        if (b.stage === 'fermenting' || b.stage === 'maturing') {
          b.stageDays++
          if (b.stage === 'fermenting' && b.stageDays >= b.fermentDays) {
            if (b.maturationDays > 0) {
              b.stage = 'maturing'
              b.stageDays = 0
            } else this.finishFermentation(b)
          } else if (b.stage === 'maturing' && b.stageDays >= b.maturationDays) this.finishFermentation(b)
        } else if (b.stage === 'barrel' && b.barrel) {
          b.barrel.daysAged += this.researchEffects.agingSpeed
          if (b.barrel.daysAged >= b.barrel.months * 30) this.pullFromBarrel(b.id)
        } else if (b.stage === 'packaged' || b.stage === 'ready') {
          b.ageDays++
          const type = this.freshnessType(b)
          b.freshness = Math.round(freshnessAt(type, b.ageDays * decay))
          if (type === 'fresh' && b.freshness < 55 && !b.defects.includes('oxidation')) {
            b.defects.push('oxidation')
            b.flavorProfile.hopAroma = Math.max(0, b.flavorProfile.hopAroma - 1.2)
          }
        }
      }
    },
    freshnessType(b: BeerBatch): 'fresh' | 'normal' | 'aging' {
      const s = b.styleId ? styleById[b.styleId] : undefined
      if (s) return s.freshness
      if (b.abv >= 9 || b.barrel) return 'aging'
      if (b.flavorProfile.hopAroma >= 3) return 'fresh'
      return 'normal'
    },
    effectiveQuality(b: BeerBatch): number {
      return Math.min(100, b.quality + agingBonus(this.freshnessType(b), b.ageDays))
    },
    /** 上帝模式：立即完成发酵/熟成/木桶陈酿 */
    godFinish(batchId: string) {
      if (!this.settings.godMode) return
      const b = this.batches.find((x) => x.id === batchId)
      if (!b) return
      if (b.stage === 'fermenting' || b.stage === 'maturing') this.finishFermentation(b)
      else if (b.stage === 'barrel' && b.barrel) {
        b.barrel.daysAged = b.barrel.months * 30
        this.pullFromBarrel(b.id)
      }
    },
    godFinishAll() {
      const ids = this.batches.filter((b) => ['fermenting', 'maturing', 'barrel'].includes(b.stage)).map((b) => b.id)
      for (const id of ids) this.godFinish(id)
      if (ids.length) useUi().toast(`⚡ ${ids.length} 批啤酒已瞬间完成`, '👑', 'gold')
      return ids.length
    },
    finishFermentation(b: BeerBatch) {
      b.stage = 'ready'
      b.stageDays = 0
      this.tasteBatch(b)
    },
    /** 品鉴：鉴定风格、更新图鉴 */
    tasteBatch(b: BeerBatch, barrelMonths?: number) {
      const recipe = b.recipe
      const a: RecipeAnalysis = analyzeRecipe(recipe, b.ctx, barrelMonths)
      if (barrelMonths !== undefined) {
        const profile = { ...a.profile }
        applyDefectFlavor(profile, b.defects)
        b.flavorProfile = profile
        b.abv = a.abv
        b.aromas = a.aromas
      }
      a.profile = { ...b.flavorProfile }
      const matches = matchAllStyles(a, recipe)
      const identifiable = (id: string) => {
        const s = styleById[id]
        const st = this.encyclopedia[id]?.status ?? 0
        if (!s) return false
        if (s.discovery === 'open' || this.settings.godMode) return true
        if (s.discovery === 'clue') return st >= 1
        return st >= 2
      }
      const ok = matches.filter((m) => m.score >= IDENTIFY_SCORE && identifiable(m.styleId))
      let chosen = ok[0]
      if (ok.length > 1) {
        // 并列时优先未酿造过的风格，鼓励收集
        const top = ok[0].score
        const fresh = ok.find((m) => m.score >= top - 2 && (this.encyclopedia[m.styleId]?.status ?? 0) < 3)
        if (fresh) chosen = fresh
      }
      const best = matches[0]
      const ui = useUi()
      b.tasted = true
      if (chosen) {
        b.styleId = chosen.styleId
        b.styleAccuracy = chosen.score
      } else {
        b.styleId = undefined
        b.styleAccuracy = best ? best.score : 40
        b.closeStyle = best?.styleId
      }
      b.overall = overallScore(b.styleAccuracy, b.quality)
      b.displayName = this.batchDisplayName(b)
      const style = b.styleId ? styleById[b.styleId] : undefined
      // 未能鉴定，但非常接近某种未知风格
      if (best && best.styleId !== chosen?.styleId && !identifiable(best.styleId) && best.score >= NEAR_SCORE) {
        const e = this.encyclopedia[best.styleId]
        if (e && e.status < 2) {
          e.status++
          if (e.status === 2) e.clues = Math.max(e.clues, 1)
          this.log({ kind: 'discovery', text: `🤔 第 ${b.number} 批「${b.recipeName}」非常接近一种未知风格……${e.status >= 2 ? '图鉴中出现了新线索。' : '你隐约听说过它。'}` })
          ui.toast('非常接近一种未知风格！', '❓', 'gold')
        }
      }
      if (style) {
        const e = this.encyclopedia[style.id]
        const isNew = e.status < 3
        e.brewed++
        if (b.overall > e.best) {
          e.best = b.overall
          e.bestBatch = b.number
        }
        const newStatus = b.overall >= 92 ? 5 : b.overall >= 80 ? 4 : 3
        const upgraded = newStatus > e.status
        if (upgraded) e.status = newStatus
        e.clues = style.clues.length
        if (isNew) {
          e.firstDay = this.day
          this.xp += 60
          this.addRep(10)
          this.today.discoveries.push(style.name)
          ui.push({ kind: 'discovery', styleId: style.id, batchId: b.id, name: style.name })
          sfx('discover')
          this.log({ kind: 'discovery', text: `🎉 新风格发现！${style.name}（${style.nameZh}）—— 世界精酿图鉴 +1` })
        } else if (upgraded) {
          ui.toast(`${style.name} 图鉴升级为「${STATUS_NAMES[newStatus]}」`, newStatus === 5 ? '🥇' : '🥈', 'gold')
          this.addRep(newStatus === 5 ? 15 : 5)
        }
        for (const f of familiesOf(style)) {
          this.stats.familyMaxAbv[f] = Math.max(this.stats.familyMaxAbv[f] || 0, b.abv)
        }
      }
      // 变体（水果 / 木桶 / 特殊原料）
      if (style && b.displayName !== style.name) {
        const v = this.variants[b.displayName] || { name: b.displayName, styleId: style.id, best: 0, count: 0 }
        v.best = Math.max(v.best, b.overall)
        v.count++
        this.variants[b.displayName] = v
      }
      if (b.isCustom) {
        const cb = this.customBeers.find((c) => c.recipeId === b.recipeId)
        if (cb) {
          cb.best = Math.max(cb.best, b.overall)
          cb.batches++
          cb.styleId = b.styleId || cb.styleId
          cb.name = b.recipeName
        } else this.customBeers.push({ recipeId: b.recipeId, name: b.recipeName, styleId: b.styleId, best: b.overall, firstDay: this.day, batches: 1 })
      }
      for (const d of b.defects) if (!this.stats.defectsSeen.includes(d)) this.stats.defectsSeen.push(d)
      if (b.barrel) this.stats.barrelAged++
      if (b.auto && !(style && this.encyclopedia[style.id].firstDay === this.day)) ui.toast(`员工生产的第 ${b.number} 批「${b.displayName}」已完成（综合 ${b.overall}）`, '🍺')
      else if (!ui.modals.some((m) => m.kind === 'tasting' && m.batchId === b.id)) ui.push({ kind: 'tasting', batchId: b.id })
      this.checkAchievements()
    },
    batchDisplayName(b: BeerBatch): string {
      if (b.isCustom) return b.recipeName
      const style = b.styleId ? styleById[b.styleId] : undefined
      if (!style) return b.recipeName
      const r = b.recipe
      const prefixes: string[] = []
      const requiresFruit = (style.requirements || []).some(
        (q) => (q.type === 'adjunctCategory' && q.in.includes('fruit')) || q.type === 'adjunct',
      )
      // 用量最大的水果
      let fruit: { id: string; gl: number } | null = null
      for (const ad of r.adjuncts) {
        const def = adjunctById[ad.id]
        if (def?.category === 'fruit' && ad.amount / 20 >= 5 && (!fruit || ad.amount / 20 > fruit.gl)) fruit = { id: ad.id, gl: ad.amount / 20 }
      }
      if (fruit && (!requiresFruit || style.family === 'fruit' || style.alsoIn?.includes('fruit'))) prefixes.push(adjunctById[fruit.id].name.replace(/\s*\b(Puree|Purée|Juice|Concentrate|Must|Pulp)\b/gi, '').trim())
      for (const ad of r.adjuncts) {
        const def = adjunctById[ad.id]
        if (def && ['coffee', 'vanilla', 'tea'].includes(def.category) && !style.ingredients.includes(ad.id) && !(style.requirements || []).some((q) => q.type === 'adjunct' && q.in.includes(ad.id)))
          prefixes.push(def.name)
      }
      if (r.barrel && style.family !== 'wood' && !style.alsoIn?.includes('wood')) {
        prefixes.push(`${barrelById[r.barrel.id]?.name ?? 'Barrel'} Aged`)
      }
      if (!prefixes.length) return style.name
      // 去掉水果啤酒风格名里的通用词
      const base = style.id === 'fruit_beer' ? 'Beer' : style.id === 'fruited_sour' ? 'Sour' : style.name
      return `${prefixes.slice(0, 2).join(' ')} ${base}`
    },
    packageBatch(batchId: string): boolean {
      const b = this.batches.find((x) => x.id === batchId)
      if (!b || b.stage !== 'ready') return false
      const free = this.kegCapacity - this.kegUsed
      if (free < b.remaining) {
        useUi().toast(`酒桶空间不足：需要 ${b.remaining}L，剩余 ${Math.round(free)}L`, '🛢️', 'bad')
        return false
      }
      b.stage = 'packaged'
      b.packagedDay = this.day
      const f = this.fermenters.find((x) => x.batchId === b.id)
      if (f) f.batchId = undefined
      b.fermenterId = undefined
      sfx('pour')
      return true
    },
    moveToBarrel(batchId: string, slotId: string, months: number): boolean {
      const b = this.batches.find((x) => x.id === batchId)
      const slot = this.barrels.find((x) => x.id === slotId)
      if (!b || !slot || slot.batchId || b.stage !== 'ready') return false
      if (b.remaining > BARREL_LITERS) {
        useUi().toast(`一只木桶最多装 ${BARREL_LITERS}L`, '🪵', 'bad')
        return false
      }
      slot.batchId = b.id
      b.recipe = { ...b.recipe, barrel: { id: slot.barrelId, months } }
      b.barrel = { id: slot.barrelId, months, slot: slot.id, daysAged: 0 }
      b.stage = 'barrel'
      const f = this.fermenters.find((x) => x.batchId === b.id)
      if (f) f.batchId = undefined
      b.fermenterId = undefined
      this.log({ kind: 'system', text: `🪵 第 ${b.number} 批「${b.recipeName}」进入 ${barrelById[slot.barrelId]?.nameZh} 陈酿 ${months} 个月。` })
      return true
    },
    pullFromBarrel(batchId: string) {
      const b = this.batches.find((x) => x.id === batchId)
      if (!b || !b.barrel) return
      const slot = this.barrels.find((x) => x.id === b.barrel!.slot)
      const months = Math.max(0.1, Math.round((b.barrel.daysAged / 30) * 10) / 10)
      const effMonths = months * Math.pow(0.8, slot?.uses ?? 0)
      if (slot) {
        slot.batchId = undefined
        slot.uses++
      }
      b.recipe = { ...b.recipe, barrel: { id: b.barrel.id, months } }
      b.barrel.months = months
      b.stage = 'ready'
      b.ageDays = Math.max(b.ageDays, Math.round(b.barrel.daysAged))
      this.tasteBatch(b, effMonths)
    },
    dumpBatch(batchId: string) {
      const b = this.batches.find((x) => x.id === batchId)
      if (!b) return
      for (const f of this.fermenters) if (f.batchId === b.id) f.batchId = undefined
      for (const s of this.barrels) if (s.batchId === b.id) s.batchId = undefined
      for (const t of this.taps) if (t.batchId === b.id) t.batchId = undefined
      b.stage = 'empty'
      b.remaining = 0
    },
    setTap(i: number, batchId?: string) {
      const t = this.taps[i]
      if (!t) return
      t.batchId = batchId
      const b = batchId ? this.batches.find((x) => x.id === batchId) : undefined
      if (b) {
        const style = b.styleId ? styleById[b.styleId] : undefined
        t.price = suggestedPrice({ abv: b.abv, quality: this.effectiveQuality(b) }, this.glassFor(b).volume)
        if (this.tapTempControl) t.temp = style?.servingTemp ?? 6
        else t.temp = 4
        sfx('pour')
      }
    },
    glassFor(b: BeerBatch) {
      const style = b.styleId ? styleById[b.styleId] : undefined
      const want = style?.glass || 'shaker'
      const g = this.glasses.includes(want) ? glassById[want] : glassById['shaker']
      return { id: g?.id ?? 'shaker', volume: g?.volume ?? 0.45, ok: this.glasses.includes(want) }
    },

    // ---------------- 销售 ----------------
    recordSale(tapIndex: number, score: number, price: number, tip: number) {
      const t = this.taps[tapIndex]
      const b = t?.batchId ? this.batches.find((x) => x.id === t.batchId) : undefined
      if (!b) return
      const g = this.glassFor(b)
      b.remaining = Math.max(0, Math.round((b.remaining - g.volume) * 100) / 100)
      b.sold++
      if (b.remaining < g.volume) {
        b.stage = 'empty'
        t.batchId = undefined
        useUi().toast(`酒头 ${tapIndex + 1}「${b.displayName}」卖完了！`, '🍺')
      }
      this.money += price + tip
      this.today.revenue += price
      this.today.tips += tip
      this.today.cups++
      this.today.ratings.push(score)
      this.today.sales[b.displayName] = (this.today.sales[b.displayName] || 0) + 1
      this.stats.cupsSold++
      this.stats.revenue += price + tip
      this.stats.ratingSum += score
      this.stats.ratingCount++
      this.stats.bestRating = Math.max(this.stats.bestRating, score)
      this.addRep((score - 60) / 22)
      if (score >= 80) this.xp += 2
      else this.xp += 1
      if (this.stats.cupsSold % 10 === 0) this.checkAchievements()
    },

    // ---------------- 任务 ----------------
    questCandidates(questId: string) {
      const q = questById[questId]
      if (!q) return []
      return this.batches.filter((b) => {
        if (!(b.stage === 'packaged' || b.stage === 'ready') || b.remaining < (q.goal.liters ?? 0) || b.overall < q.goal.minOverall) return false
        const s = b.styleId ? styleById[b.styleId] : undefined
        if (q.goal.style && b.styleId !== q.goal.style) return false
        if (q.goal.family && !(s && familiesOf(s).includes(q.goal.family))) return false
        return true
      })
    },
    deliverQuest(questId: string, batchId: string): boolean {
      const aq = this.quests.find((x) => x.id === questId && x.status === 'active')
      const q = questById[questId]
      if (!aq || !q || !this.questCandidates(questId).some((b) => b.id === batchId)) return false
      const b = this.batches.find((x) => x.id === batchId)!
      b.remaining -= q.goal.liters ?? 0
      if (b.remaining <= 0.3) this.dumpBatch(b.id)
      aq.status = 'done'
      if (q.reward.money) this.money += q.reward.money
      if (q.reward.xp) this.xp += q.reward.xp
      if (q.reward.rep) this.addRep(q.reward.rep)
      for (const u of q.reward.unlock || []) this.applyGift(u, q.nameZh)
      sfx('achievement')
      useUi().toast(`任务完成：${q.nameZh}`, '✅', 'gold')
      this.log({ kind: 'system', text: `✅ 完成委托「${q.nameZh}」` })
      return true
    },

    // ---------------- 员工自动生产 ----------------
    autoProduce() {
      if (!this.staff.brewer) return
      let brewers = this.staff.brewer
      for (const rid of this.autoBrew) {
        if (brewers <= 0 || !this.canBrewToday()) break
        const r = this.recipes.find((x) => x.id === rid)
        if (!r?.standard) continue
        const f = this.fermenters
          .filter((x) => !x.batchId)
          .sort((a, b) => this.fermenterCapacity(b) - this.fermenterCapacity(a))[0]
        if (!f) break
        const vol = Math.min(this.fermenterCapacity(f), this.maxBatchVolume)
        const cost = this.missingCost(r, vol)
        if (cost > 0 && !this.buyMissing(r, vol)) continue
        if (this.brew(r.id, vol, f.id, Math.max(30, r.standard.mashScore - 5), true)) brewers--
      }
    },

    // ---------------- 破产 ----------------
    bailout(): boolean {
      if (this.day - this.lastBailoutDay < 7) return false
      this.lastBailoutDay = this.day
      this.money = Math.max(this.money, 0) + 300
      this.bankrupt = false
      this.log({ kind: 'npc', who: '老酿酒师', text: '看来我们得从小规模重新开始了。这点钱你先拿着。' })
      return true
    },
    resolveBankrupt() {
      if (this.money >= 0) this.bankrupt = false
    },

    // ---------------- 成就 ----------------
    checkAchievements() {
      const ui = useUi()
      const discovered = Object.entries(this.encyclopedia).filter(([, e]) => e.status >= 3)
      const familyCount = (fam: string) =>
        discovered.filter(([id]) => {
          const s = styleById[id]
          return s && (s.family === fam || s.alsoIn?.includes(fam as FamilyId))
        }).length
      const hopsUnlocked = HOPS.filter((h) => this.ingredientUnlocked(h.id)).length
      for (const a of ACHIEVEMENTS) {
        if (this.achievements.includes(a.id)) continue
        const c = a.cond
        let ok = false
        switch (c.type) {
          case 'batches':
            ok = this.stats.batches >= c.count
            break
          case 'stylesDiscovered':
            ok = discovered.length >= c.count
            break
          case 'familyStyles':
            ok = familyCount(c.family) >= Math.min(c.count, STYLES.filter((s) => s.family === c.family || s.alsoIn?.includes(c.family)).length)
            break
          case 'hopsUnlocked':
            ok = hopsUnlocked >= c.count
            break
          case 'familyAbv':
            ok = (this.stats.familyMaxAbv[c.family] || 0) > c.minAbv
            break
          case 'encyclopediaComplete':
            ok = discovered.length >= STYLES.length
            break
          case 'cupsSold':
            ok = this.stats.cupsSold >= c.count
            break
          case 'money':
            ok = this.money >= c.amount
            break
          case 'reputationLevel':
            ok = this.repLevel >= c.level
            break
          case 'masterStyles':
            ok = discovered.filter(([, e]) => e.status >= 5).length >= c.count
            break
          case 'customBeers':
            ok = this.customBeers.length >= c.count
            break
          case 'regions':
            ok = this.regions.length >= c.count
            break
          case 'rating':
            ok = this.stats.bestRating >= c.min
            break
          case 'days':
            ok = this.day >= c.count
            break
          case 'research':
            ok = this.research.length >= Math.min(c.count, RESEARCH.length)
            break
          case 'decorations':
            ok = Object.values(this.decorations).reduce((s, v) => s + v, 0) >= c.count
            break
          case 'defect':
            ok = this.stats.defectsSeen.includes(c.defect)
            break
          case 'barrelAged':
            ok = this.stats.barrelAged >= c.count
            break
        }
        if (ok) {
          this.achievements.push(a.id)
          if (a.reward?.money) this.money += a.reward.money
          if (a.reward?.xp) this.xp += a.reward.xp
          if (a.reward?.rep) this.reputation += a.reward.rep
          sfx('achievement')
          ui.toast(`成就解锁：${a.nameZh}`, a.icon, 'gold')
          this.log({ kind: 'system', text: `${a.icon} 成就「${a.nameZh}」：${a.desc}` })
        }
      }
    },
  },
})

export type GameStore = ReturnType<typeof useGame>

// 便于界面使用的原料列表
export const INGREDIENT_LISTS = { MALTS, HOPS, YEASTS, ADJUNCTS, BARRELS, GLASSES, DECORATIONS, EQUIPMENT, COUNTRIES }

// ============================================================
// 《像素精酿酒吧》核心数据类型
// 所有游戏内容（风格、原料、客人、事件……）均来自 /src/data/*.json，
// 代码只依赖这里定义的结构，新增数据无需修改核心逻辑。
// ============================================================

/** 风味维度，取值 0~5（浮点） */
export const FLAVOR_DIMS = [
  'bitterness', // 苦度
  'sweetness', // 甜度
  'body', // 酒体
  'malt', // 麦芽香（面包/饼干/谷物）
  'caramel', // 焦糖/太妃
  'roast', // 烘烤/巧克力/咖啡
  'hopAroma', // 酒花香
  'fruity', // 果香（酯类 + 水果原料）
  'spicy', // 辛香（酚类丁香/胡椒 + 香料）
  'acidity', // 酸度
  'funk', // 野菌/谷仓/皮革
  'smoke', // 烟熏
  'wood', // 木桶/橡木/香草
  'alcohol', // 酒精温热感
  'haze', // 浑浊度
] as const
export type FlavorDim = (typeof FLAVOR_DIMS)[number]
export type FlavorProfile = Record<FlavorDim, number>

export const FLAVOR_DIM_ZH: Record<FlavorDim, string> = {
  bitterness: '苦度',
  sweetness: '甜度',
  body: '酒体',
  malt: '麦芽香',
  caramel: '焦糖',
  roast: '烘烤',
  hopAroma: '酒花香',
  fruity: '果香',
  spicy: '辛香',
  acidity: '酸度',
  funk: '野趣',
  smoke: '烟熏',
  wood: '木桶',
  alcohol: '酒精感',
  haze: '浑浊',
}

/** 啤酒家族（一级分类） */
export type FamilyId =
  | 'lager'
  | 'paleAle'
  | 'ipa'
  | 'wheat'
  | 'porter'
  | 'stout'
  | 'belgian'
  | 'sour'
  | 'wild'
  | 'farmhouse'
  | 'strongAle'
  | 'scottishIrish'
  | 'german'
  | 'czech'
  | 'british'
  | 'american'
  | 'fruit'
  | 'spice'
  | 'smoke'
  | 'wood'
  | 'historical'
  | 'experimental'

export type RegionId =
  | 'usa'
  | 'canada'
  | 'mexico'
  | 'caribbean'
  | 'uk'
  | 'scotland'
  | 'ireland'
  | 'germany'
  | 'austria'
  | 'czech'
  | 'poland'
  | 'belgium'
  | 'france'
  | 'italy'
  | 'nordic'
  | 'baltic'
  | 'australia'
  | 'nz'
  | 'japan'
  | 'china'

/**
 * 解锁条件字符串：
 *  'start'              开局即有
 *  'research:<nodeId>'  研究树节点
 *  'region:<regionId>'  世界地图地区
 *  'npc:<npcId>'        特殊 NPC 赠予
 *  'rep:<level>'        酒吧声望等级
 */
export type UnlockRule = string

// ---------------- 原料 ----------------

export type MaltCategory =
  | 'base'
  | 'wheat'
  | 'rye'
  | 'oat'
  | 'caramel'
  | 'roast'
  | 'smoked'
  | 'specialty'
  | 'rice'
  | 'corn'

export interface Malt {
  id: string
  name: string
  nameZh: string
  category: MaltCategory
  origin: RegionId
  /** 颜色 °Lovibond */
  color: number
  /** 浸出潜力：每公斤在 1 升中贡献的比重点数（基础麦芽约 300） */
  potential: number
  /** 可发酵比例 0~1（焦糖麦芽约 0.5，基础麦芽 1） */
  fermentability: number
  /** 推荐最大占比 0~1，超过时品质下降 */
  maxShare: number
  /** $/kg */
  price: number
  /** 风味贡献：该麦芽占麦芽总量 10% 时带来的风味值（引擎按占比×10 缩放） */
  flavor: Partial<Record<'malt' | 'caramel' | 'roast' | 'smoke' | 'sweetness' | 'body' | 'haze' | 'acidity', number>>
  /** 香气标签（见 AROMAS） */
  aromas: string[]
  unlock: UnlockRule
  desc: string
}

export type HopCharacter = 'citrus' | 'tropical' | 'pine' | 'floral' | 'herbal' | 'grape' | 'berry' | 'spicy'
export const HOP_CHARACTER_ZH: Record<HopCharacter, string> = {
  citrus: '柑橘',
  tropical: '热带水果',
  pine: '松针',
  floral: '花香',
  herbal: '草本',
  grape: '葡萄',
  berry: '莓果',
  spicy: '辛香',
}

export interface Hop {
  id: string
  name: string
  nameZh: string
  origin: RegionId
  /** α 酸 % */
  alpha: number
  /** 香气强度系数 0.5~1.5 */
  aromaPower: number
  /** 各香型强度 0~5 */
  character: Partial<Record<HopCharacter, number>>
  /** 贵族酒花 */
  noble?: boolean
  /** $/g */
  price: number
  aromas: string[]
  unlock: UnlockRule
  desc: string
}

export type YeastType = 'ale' | 'lager' | 'belgian' | 'weizen' | 'kveik' | 'brett' | 'lacto' | 'pedio' | 'mixed'

export interface Yeast {
  id: string
  name: string
  nameZh: string
  type: YeastType
  /** 表观发酵度 0~1 */
  attenuation: number
  /** 最佳发酵温度 ℃ */
  tempMin: number
  tempMax: number
  /** 酯香 0~5（香蕉/梨/核果等） */
  ester: number
  /** 酚类 0~5（丁香/胡椒） */
  phenol: number
  /** 产酸 0~5 */
  acid: number
  /** 野趣 0~5 */
  funk: number
  /** 絮凝性 0~1，低 → 浑浊 */
  flocculation: number
  /** 酒精耐受 % */
  alcoholTolerance: number
  /** 主发酵最少天数 */
  minDays: number
  /** 双乙酰风险 0~1 */
  diacetylRisk: number
  /** 是否与酒花发生生物转化（浑浊 IPA 酵母） */
  biotransform?: boolean
  /** $ / 每 20L 一包 */
  price: number
  aromas: string[]
  unlock: UnlockRule
  desc: string
}

export type AdjunctCategory =
  | 'fruit'
  | 'spice'
  | 'sugar'
  | 'coffee'
  | 'cacao'
  | 'dairy'
  | 'herb'
  | 'salt'
  | 'tea'
  | 'vanilla'
  | 'nut'
  | 'other'

export type AdjunctStage = 'mash' | 'boil' | 'fermentation' | 'secondary'

export interface Adjunct {
  id: string
  name: string
  nameZh: string
  category: AdjunctCategory
  /** 默认加入阶段 */
  stage: AdjunctStage
  /** 浸出潜力（糖类/水果有，香料为 0） pts·L/kg */
  potential: number
  /** 可发酵比例 0~1（乳糖 0） */
  fermentability: number
  /** 颜色 °L */
  color: number
  /** $/kg */
  price: number
  /** 每 1 g/L 用量带来的风味变化（可为负） */
  effects: Partial<FlavorProfile>
  /** 典型用量 g / 20L，用于界面默认值 */
  typical: number
  aromas: string[]
  unlock: UnlockRule
  desc: string
}

export interface Barrel {
  id: string
  name: string
  nameZh: string
  /** $ 一只（可重复使用） */
  price: number
  /** 每陈酿 1 个月的风味变化 */
  effectsPerMonth: Partial<FlavorProfile>
  /** 每月酒精度增加（吸收烈酒） */
  abvPerMonth: number
  aromas: string[]
  unlock: UnlockRule
  desc: string
}

export interface WaterProfile {
  id: string
  nameZh: string
  ca: number
  mg: number
  na: number
  cl: number
  so4: number
  hco3: number
  desc: string
}

// ---------------- 工艺 ----------------

/**
 * 工艺 ID。前半部分可在配方中勾选（需解锁），后半部分由配方自动推导。
 */
export const RECIPE_PROCESSES = [
  'decoction', // 煮出糖化
  'kettleSour', // 壶内酸化
  'filtered', // 过滤（清亮）
  'freeze', // 冰冻浓缩（Eisbock）
  'hotStone', // 热石煮沸（Steinbier）
  'enzyme', // 外加酶（Brut IPA）
  'coolship', // 冷却池自然接种（Lambic）
  'blend', // 多年份勾兑（Gueuze）
  'noBoil', // 不煮沸（Sahti/Berliner 传统）
] as const
export type RecipeProcess = (typeof RECIPE_PROCESSES)[number]
export type DerivedProcess = 'dryHop' | 'lagering' | 'barrel' | 'fruitSecondary'
export type ProcessId = RecipeProcess | DerivedProcess

// ---------------- 风格 ----------------

export type StyleRequirement = (
  | { type: 'yeastType'; in: YeastType[] }
  | { type: 'yeast'; in: string[] }
  | { type: 'maltShare'; category: MaltCategory; min?: number; max?: number }
  | { type: 'malt'; in: string[]; minShare?: number }
  | { type: 'adjunct'; in: string[] }
  | { type: 'hop'; in: string[] }
  | { type: 'adjunctCategory'; in: AdjunctCategory[]; min?: number }
  | { type: 'noAdjunctCategory'; in: AdjunctCategory[] }
  | { type: 'process'; in: ProcessId[] }
  | { type: 'noProcess'; in: ProcessId[] }
  | { type: 'hopOrigin'; in: RegionId[]; minShare: number }
  | { type: 'carbonation'; min?: number; max?: number }
  | { type: 'barrel'; in?: string[]; minMonths?: number }
  | { type: 'fermentTemp'; min?: number; max?: number }
) & {
  /** 软性要求：未满足时扣分较少 */
  soft?: boolean
  /** 给玩家看的提示文本 */
  hint?: string
}

export interface BeerStyle {
  id: string
  name: string
  nameZh: string
  family: FamilyId
  /** 同时出现在哪些家族页 */
  alsoIn?: FamilyId[]
  /** 家族内分组（如 Lager → German / Bock） */
  group?: string
  country: RegionId[]
  region?: string
  fermentation: 'ale' | 'lager' | 'wild' | 'mixed'
  abv: { min: number; max: number }
  ibu: { min: number; max: number }
  /** SRM */
  color: { min: number; max: number }
  // 风味目标（0~5）
  body: number
  sweetness: number
  bitterness: number
  acidity: number
  roast: number
  hopAroma: number
  malt: number
  caramel: number
  fruity: number
  spicy: number
  funk: number
  smoke: number
  wood: number
  alcohol: number
  haze: number
  /** 可选的维度权重（默认 1） */
  weights?: Partial<Record<FlavorDim, number>>
  tags: string[]
  /** 推荐原料 id */
  ingredients: string[]
  relatedStyles: string[]
  requirements?: StyleRequirement[]
  aromas: string[]
  glass: string
  servingTemp: number
  /** fresh=越新鲜越好，normal=缓慢衰减，aging=随熟成提升 */
  freshness: 'fresh' | 'normal' | 'aging'
  /** open=可自由实验发现；clue=需先获得线索才能鉴定；hidden=名字也隐藏，需线索 */
  discovery: 'open' | 'clue' | 'hidden'
  clues: string[]
  description: string
  /** 参考配方（用于校验、员工生产与 NPC 提示），按 20L */
  example: ExampleRecipe
  dbVersion: string
}

export interface ExampleRecipe {
  malts: { id: string; kg: number }[]
  hops: HopAddition[]
  yeast: string
  water: string
  adjuncts: { id: string; grams: number; stage?: AdjunctStage }[]
  mashTemp: number
  boilTime: number
  fermentTemp: number
  fermentDays: number
  maturationDays: number
  carbonation: number
  processes: RecipeProcess[]
  barrel?: { id: string; months: number }
}

// ---------------- 配方 / 批次 ----------------

export interface RecipeIngredient {
  id: string
  /** 麦芽：kg / 20L；辅料：g / 20L */
  amount: number
  stage?: AdjunctStage
}

export interface HopAddition {
  id: string
  grams: number
  use: 'boil' | 'whirlpool' | 'dryHop'
  /** 煮沸剩余分钟（use=boil 时） */
  time?: number
}

export interface CustomWater {
  ca: number
  mg: number
  na: number
  cl: number
  so4: number
  hco3: number
}

export interface LabelConfig {
  bg: string
  fg: string
  pattern: 'none' | 'stripes' | 'dots' | 'checker' | 'waves' | 'stars' | 'diagonal' | 'grid'
  logo: string
  font: 'pixel' | 'serif' | 'bold' | 'round'
  border: 'none' | 'single' | 'double' | 'dashed' | 'ornate'
  icon: string
}

export interface BeerRecipe {
  id: string
  name: string
  targetStyle?: string
  malts: RecipeIngredient[]
  hops: HopAddition[]
  yeast: string
  waterProfile: string
  customWater?: CustomWater
  adjuncts: RecipeIngredient[]
  mashTemperature: number
  boilTime: number
  fermentationTemperature: number
  fermentationDays: number
  maturationDays: number
  carbonation: number
  processes: RecipeProcess[]
  barrel?: { id: string; months: number }
  /** 自创精酿（会进入“我的精酿图鉴”） */
  isCustom: boolean
  label?: LabelConfig
  /** 已保存为标准流程：员工自动生产时使用的糖化得分 */
  standard?: { mashScore: number }
  createdDay: number
  brewCount: number
  notes?: string
}

export type BatchStage = 'fermenting' | 'maturing' | 'ready' | 'barrel' | 'packaged' | 'empty'

export interface BeerBatch {
  id: string
  /** 第 N 批 */
  number: number
  recipeId: string
  recipeName: string
  brewDate: number
  volume: number
  /** 剩余升数（装桶后） */
  remaining: number
  og: number
  fg: number
  abv: number
  ibu: number
  color: number
  freshness: number
  quality: number
  styleAccuracy: number
  /** 综合评分 = 风格准确 + 品质 */
  overall: number
  styleId?: string
  /** 带水果/木桶前缀的展示名 */
  displayName: string
  defects: string[]
  flavorProfile: FlavorProfile
  aromas: string[]
  stage: BatchStage
  fermenterId?: string
  /** 当前阶段已经过的天数 */
  stageDays: number
  fermentDays: number
  maturationDays: number
  mashScore: number
  barrel?: { id: string; months: number; slot: string; daysAged: number }
  packagedDay?: number
  /** 熟成型啤酒的陈放天数 */
  ageDays: number
  isCustom: boolean
  label?: LabelConfig
  /** 已售杯数 */
  sold: number
  tasted: boolean
  /** 酿造时的配方快照（用于品鉴鉴定） */
  recipe: BeerRecipe
  /** 酿造时的设备条件 */
  ctx: { efficiency: number; hopAromaBonus: number; clarity: number }
  /** 最接近但未能鉴定的风格 */
  closeStyle?: string
  /** 是否由员工按标准流程生产 */
  auto?: boolean
  /** 外购的商业批发啤酒 */
  wholesale?: boolean
}

// ---------------- 设备 / 装修 / 研究 ----------------

export type EquipmentKind =
  | 'mill'
  | 'mashTun'
  | 'kettle'
  | 'fermenter'
  | 'brightTank'
  | 'keg'
  | 'coldStorage'
  | 'barrelRack'
  | 'tap'

export interface EquipmentTier {
  id: string
  kind: EquipmentKind
  tier: number
  name: string
  nameZh: string
  price: number
  /** 各类设备的数值（容量、效率等） */
  stats: Record<string, number>
  unlock: UnlockRule
  desc: string
}

export interface Decoration {
  id: string
  name: string
  nameZh: string
  price: number
  /** 增加座位 */
  seats?: { kind: 'table' | 'bar' | 'sofa'; count: number }
  /** 客人类型权重加成：archetypeId → 比例（0.1 = +10%） */
  attract?: Record<string, number>
  /** 酒吧氛围（增加整体客流与满意度） */
  ambience: number
  /** 场景中的绘制位置槽 */
  slot: 'wall' | 'floor' | 'bar' | 'window' | 'ceiling'
  maxCount: number
  unlock: UnlockRule
  desc: string
  /** 像素绘制用主色 */
  colors: string[]
  sprite: string
}

export interface ResearchNode {
  id: string
  branch: string
  nameZh: string
  cost: number
  requires: string[]
  /** 效果：'process:<id>' | 'water:advanced' | 'efficiency:<+n>' | 'sanitation:<+n>' | 'tapTemp' | 'agingSpeed:<x>' | 'freshness:<x>' | 'brewsPerDay:+1' | 'quality:<+n>' | 'clue:<family>' */
  effects: string[]
  desc: string
}

// ---------------- 客人 ----------------

export interface CustomerArchetype {
  id: string
  nameZh: string
  /** 基础出现权重 */
  weight: number
  /** 需要的声望等级 */
  minRep: number
  likes: FamilyId[]
  likeStyles?: string[]
  dislikes: FamilyId[]
  dislikeStyles?: string[]
  /** 偏好 1~5 */
  bitterPref: number
  abvTolerance: number
  budget: number
  /** 尝新意愿 0~1 */
  adventurous: number
  /** 品鉴严格程度 0.5~1.5 */
  strictness: number
  /** 可能的称号前缀，如 “程序员” */
  titles: string[]
  /** 推荐的口味模型 */
  tasteModels: string[]
  desc: string
}

export interface Personality {
  id: string
  nameZh: string
  /** 等待耐心（游戏分钟） */
  patience: number
  /** 小费倾向 0~1 */
  tip: number
  /** 说话频率 0~1 */
  chatty: number
  /** 复购倾向 0~1 */
  repeat: number
  /** 评分宽容度：正数更宽容 */
  leniency: number
  lines: string[]
}

export interface TasteModel {
  id: string
  nameZh: string
  /** 对各风味的偏好中心（0~5），未写的维度不在意 */
  prefs: Partial<FlavorProfile>
}

export interface SpecialNpc {
  id: string
  nameZh: string
  role: 'mentor' | 'brewer' | 'collector' | 'traveler' | 'judge' | 'supplier' | 'mystery'
  minRep: number
  region?: RegionId
  /** 每晚 23:00 后出现概率 */
  chance: number
  greeting: string[]
  /** 可以带来的东西：'clue:<styleId>' | 'ingredient:<id>' | 'quest:<questId>' | 'heard:<styleId>' | 'recipe:<styleId>' */
  gifts: string[]
  appearance: { hair: string; skin: string; shirt: string; hat?: string }
}

export interface Quest {
  id: string
  nameZh: string
  giver: string
  desc: string
  /** 目标：酿出某风格（或某家族）达到评分 */
  goal: { style?: string; family?: FamilyId; minOverall: number; liters?: number }
  reward: { money?: number; xp?: number; rep?: number; unlock?: string[] }
  days: number
}

// ---------------- 世界 ----------------

export interface Country {
  id: RegionId
  nameZh: string
  flag: string
  /** 世界地图像素坐标（0~100） */
  x: number
  y: number
  minRep: number
  /** 开通贸易路线费用 */
  cost: number
  desc: string
  /** 地区 NPC */
  npc?: string
  start?: boolean
}

export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'hot' | 'cold'

export interface WeatherDef {
  id: WeatherId
  nameZh: string
  icon: string
  /** 客流倍率 */
  traffic: number
  /** 家族点单倍率 */
  family: Partial<Record<FamilyId, number>>
  /** 各季节出现权重 [春,夏,秋,冬] */
  season: [number, number, number, number]
}

export interface GameEvent {
  id: string
  nameZh: string
  icon: string
  desc: string
  /** 持续天数 */
  days: number
  /** 每天触发概率 */
  chance: number
  minRep: number
  traffic?: number
  family?: Partial<Record<FamilyId, number>>
  archetype?: Record<string, number>
  /** 价格容忍度倍率 */
  priceTolerance?: number
  season?: number[]
}

export type AchievementCond =
  | { type: 'batches'; count: number }
  | { type: 'stylesDiscovered'; count: number }
  | { type: 'familyStyles'; family: FamilyId; count: number }
  | { type: 'hopsUnlocked'; count: number }
  | { type: 'familyAbv'; family: FamilyId; minAbv: number }
  | { type: 'encyclopediaComplete' }
  | { type: 'cupsSold'; count: number }
  | { type: 'money'; amount: number }
  | { type: 'reputationLevel'; level: number }
  | { type: 'masterStyles'; count: number }
  | { type: 'customBeers'; count: number }
  | { type: 'regions'; count: number }
  | { type: 'rating'; min: number }
  | { type: 'days'; count: number }
  | { type: 'research'; count: number }
  | { type: 'decorations'; count: number }
  | { type: 'defect'; defect: string }
  | { type: 'barrelAged'; count: number }

export interface Achievement {
  id: string
  nameZh: string
  desc: string
  icon: string
  cond: AchievementCond
  reward?: { money?: number; xp?: number; rep?: number }
}

export interface Glass {
  id: string
  nameZh: string
  price: number
  /** 一杯容量 L */
  volume: number
  unlock: UnlockRule
}

export interface Aroma {
  id: string
  zh: string
  emoji: string
}

export interface DefectDef {
  id: string
  nameZh: string
  taste: string
  /** 品质扣分 */
  penalty: number
  cause: string
  fix: string
  lines: string[]
}

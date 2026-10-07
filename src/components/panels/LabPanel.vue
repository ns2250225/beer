<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useGame, fmtMoney } from '../../stores/game'
import { useUi } from '../../stores/ui'
import { ADJUNCTS, HOPS, MALTS, STYLES, WATERS, YEASTS, aromaById, hopById, maltById, styleById, yeastById, adjunctById } from '../../engine/db'
import { analyzeRecipe, checkRequirement, exampleToRecipe, matchStyle } from '../../engine/brewing'
import { RECIPE_PROCESSES, type AdjunctStage, type BeerRecipe, type RecipeProcess } from '../../types'
import Win from '../Win.vue'
import FlavorBars from '../FlavorBars.vue'
import Glass from '../Glass.vue'
import BeerLabel from '../BeerLabel.vue'
import LabelEditor from '../LabelEditor.vue'
import { randomLabel } from '../../ui/format'
import { sfx } from '../../engine/audio'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const ui = useUi()

const PROCESS_ZH: Record<RecipeProcess, string> = {
  decoction: '煮出糖化',
  kettleSour: '壶内酸化',
  filtered: '过滤',
  freeze: '冰冻浓缩',
  hotStone: '热石煮沸',
  enzyme: '外加酶',
  coolship: '冷却池接种',
  blend: '多年份勾兑',
  noBoil: '不煮沸',
}
const STAGE_ZH: Record<AdjunctStage, string> = { mash: '糖化', boil: '煮沸', fermentation: '主发酵', secondary: '二次发酵' }

const initial = g.recipes.find((r) => r.id === ui.labRecipeId) || g.recipes[0]
const draft = reactive<BeerRecipe>(initial ? JSON.parse(JSON.stringify(initial)) : g.newRecipeTemplate())
const showLabel = ref(false)
const dirty = ref(false)
watch(draft, () => (dirty.value = true), { deep: true })

function select(r: BeerRecipe) {
  Object.assign(draft, JSON.parse(JSON.stringify(r)))
  if (!r.label) delete draft.label
  if (!r.targetStyle) delete draft.targetStyle
  if (!r.barrel) delete draft.barrel
  setTimeout(() => (dirty.value = false))
}
function newRecipe() {
  select(g.newRecipeTemplate())
}
function duplicate() {
  const c = JSON.parse(JSON.stringify(draft)) as BeerRecipe
  c.id = 'r' + Math.random().toString(36).slice(2, 10)
  c.name = draft.name + ' (副本)'
  c.brewCount = 0
  delete c.standard
  select(c)
}
function save() {
  if (!draft.malts.length) return ui.toast('至少需要一种麦芽', '🌾', 'bad')
  if (!draft.yeast) return ui.toast('需要选择酵母', '🦠', 'bad')
  // 修改配方后，标准流程失效
  const old = g.recipes.find((r) => r.id === draft.id)
  if (old?.standard && JSON.stringify({ ...old, standard: 0, brewCount: 0, label: 0 }) !== JSON.stringify({ ...draft, standard: 0, brewCount: 0, label: 0 })) delete draft.standard
  g.saveRecipe(draft)
  dirty.value = false
  sfx('coin')
  ui.toast(`配方「${draft.name}」已保存`, '📝', 'good')
}
function remove() {
  ui.push({
    kind: 'confirm',
    text: `删除配方「${draft.name}」？`,
    onYes: () => {
      g.deleteRecipe(draft.id)
      newRecipe()
    },
  })
}
function mentorRecipe() {
  select({
    ...g.newRecipeTemplate(),
    name: '第一杯 Pale Ale',
    targetStyle: 'american_pale_ale',
    malts: [{ id: 'pale_malt', amount: 4.5 }],
    hops: [
      { id: 'cascade', grams: 20, use: 'boil', time: 60 },
      { id: 'cascade', grams: 30, use: 'boil', time: 5 },
      { id: 'cascade', grams: 30, use: 'dryHop' },
    ],
    yeast: 'american_ale',
  })
  dirty.value = true
}
function loadExample() {
  const s = draft.targetStyle ? styleById[draft.targetStyle] : undefined
  if (!s) return
  const r = exampleToRecipe(s.example, `${s.name} 参考配方`, s.id)
  select({ ...r, id: 'r' + Math.random().toString(36).slice(2, 10), createdDay: g.day })
  dirty.value = true
}

// ---------- 可用原料 ----------
const malts = computed(() => MALTS.filter((m) => g.ingredientUnlocked(m.id)))
const hops = computed(() => HOPS.filter((m) => g.ingredientUnlocked(m.id)))
const yeasts = computed(() => YEASTS.filter((m) => g.ingredientUnlocked(m.id)))
const adjuncts = computed(() => ADJUNCTS.filter((m) => g.ingredientUnlocked(m.id)))
const waters = computed(() => (g.researchEffects.waterPresets ? WATERS : WATERS.filter((w) => w.id === 'balanced')))
const processes = computed(() => RECIPE_PROCESSES.filter((p) => g.researchEffects.processes.includes(p)))
const knownStyles = computed(() => STYLES.filter((s) => g.styleKnowledge(s.id) >= 1).sort((a, b) => a.name.localeCompare(b.name)))
const carbRange = computed(() => (g.researchEffects.carbonation ? [1.2, 4.5] : [2.0, 2.8]))

const addMalt = () => draft.malts.push({ id: malts.value[0]?.id ?? 'pale_malt', amount: 0.5 })
const addHop = () => draft.hops.push({ id: hops.value[0]?.id ?? 'cascade', grams: 20, use: 'boil', time: 15 })
const addAdjunct = () => {
  const a = adjuncts.value[0]
  if (a) draft.adjuncts.push({ id: a.id, amount: a.typical, stage: a.stage })
}
function onAdjunctChange(i: number) {
  const a = adjunctById[draft.adjuncts[i].id]
  if (a) {
    draft.adjuncts[i].amount = a.typical
    draft.adjuncts[i].stage = a.stage
  }
}
function toggleProcess(p: RecipeProcess) {
  const i = draft.processes.indexOf(p)
  if (i >= 0) draft.processes.splice(i, 1)
  else draft.processes.push(p)
}
function useCustomWater(on: boolean) {
  if (on) {
    draft.waterProfile = 'custom'
    draft.customWater = draft.customWater || { ca: 60, mg: 10, na: 20, cl: 60, so4: 80, hco3: 60 }
  } else {
    draft.waterProfile = 'balanced'
  }
}
function toggleCustom() {
  draft.isCustom = !draft.isCustom
  if (draft.isCustom && !draft.label) draft.label = randomLabel()
}

// ---------- 预测 ----------
const analysis = computed(() => {
  try {
    return analyzeRecipe(draft as BeerRecipe, g.brewCtx)
  } catch {
    return null
  }
})
const totalKg = computed(() => draft.malts.reduce((s, m) => s + (m.amount || 0), 0))
const cost20 = computed(() => {
  let c = 0
  for (const m of draft.malts) c += (maltById[m.id]?.price ?? 0) * m.amount
  for (const h of draft.hops) c += (hopById[h.id]?.price ?? 0) * h.grams
  c += yeastById[draft.yeast]?.price ?? 0
  for (const a of draft.adjuncts) c += ((adjunctById[a.id]?.price ?? 0) * a.amount) / 1000
  return c
})
const target = computed(() => (draft.targetStyle ? styleById[draft.targetStyle] : undefined))
const targetStatus = computed(() => (target.value ? g.styleKnowledge(target.value.id) : 0))
const targetMatch = computed(() => (target.value && analysis.value && targetStatus.value >= 3 ? matchStyle(target.value, analysis.value, draft as BeerRecipe) : null))
const reqHints = computed(() => {
  if (!target.value || !analysis.value || targetStatus.value < 2) return []
  return (target.value.requirements || [])
    .filter((r) => r.hint)
    .map((r) => ({ hint: r.hint!, ok: checkRequirement(r, analysis.value!, draft as BeerRecipe), soft: r.soft }))
})
const inRange = (v: number, r: { min: number; max: number }) => v >= r.min && v <= r.max
const yeastInfo = computed(() => yeastById[draft.yeast])
</script>

<template>
  <Win title="酿酒实验室" icon="🧪" wide @close="emit('close')">
    <div class="lab">
      <!-- 配方列表 -->
      <div class="list col">
        <button class="primary small" @click="newRecipe">＋ 新配方</button>
        <button v-if="!g.tutorial.done" class="small" style="background: var(--gold)" @click="mentorRecipe">👴 老酿酒师的配方</button>
        <div class="muted tiny">我的配方（{{ g.recipes.length }}）</div>
        <div class="scroll recipes">
          <div v-for="r in g.recipes" :key="r.id" class="recipe-item" :class="{ active: r.id === draft.id }" @click="select(r)">
            <div>{{ r.isCustom ? '⭐ ' : '' }}{{ r.name }}</div>
            <div class="tiny muted">
              {{ r.targetStyle ? styleById[r.targetStyle]?.name : '自由实验' }} · 酿过 {{ r.brewCount }} 次
              <span v-if="r.standard" class="good">· 标准流程</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 编辑器 -->
      <div class="editor col">
        <div class="row">
          <input v-model="draft.name" maxlength="24" style="flex: 1; font-size: 15px" />
          <label class="small"><input type="checkbox" :checked="draft.isCustom" @change="toggleCustom" /> 自创精酿</label>
          <button v-if="draft.isCustom" class="small" @click="showLabel = !showLabel">🏷️ 酒标</button>
        </div>
        <LabelEditor v-if="showLabel && draft.isCustom && draft.label" v-model="draft.label" :name="draft.name" />
        <div class="row small">
          【基础风格】
          <select v-model="draft.targetStyle" style="max-width: 260px">
            <option :value="undefined">— 自由实验 —</option>
            <option v-for="s in knownStyles" :key="s.id" :value="s.id">{{ s.name }}{{ g.styleStatus(s.id) >= 3 ? ' ✔' : g.styleStatus(s.id) >= 2 ? ' 📜' : '' }}</option>
          </select>
          <button v-if="target && targetStatus >= 3" class="small" @click="loadExample">载入参考配方</button>
        </div>

        <h4>【麦芽】 <span class="tiny muted">kg / 20L · 合计 {{ totalKg.toFixed(1) }}kg</span></h4>
        <div v-for="(m, i) in draft.malts" :key="'m' + i" class="row ing">
          <select v-model="m.id">
            <option v-for="x in malts" :key="x.id" :value="x.id">{{ x.name }}（{{ x.nameZh }}）</option>
          </select>
          <input v-model.number="m.amount" type="number" step="0.1" min="0" />
          <span class="tiny muted">{{ totalKg ? Math.round((m.amount / totalKg) * 100) : 0 }}% · {{ maltById[m.id]?.color }}°L</span>
          <button class="small ghost" @click="draft.malts.splice(i, 1)">✕</button>
        </div>
        <button class="small ghost" @click="addMalt">＋ 麦芽</button>

        <h4>【酒花】 <span class="tiny muted">g / 20L</span></h4>
        <div v-for="(h, i) in draft.hops" :key="'h' + i" class="row ing">
          <select v-model="h.id">
            <option v-for="x in hops" :key="x.id" :value="x.id">{{ x.name }} · {{ x.alpha }}%α</option>
          </select>
          <input v-model.number="h.grams" type="number" step="5" min="0" />
          <select v-model="h.use">
            <option value="boil">煮沸</option>
            <option value="whirlpool">回旋</option>
            <option value="dryHop">干投 Dry Hop</option>
          </select>
          <template v-if="h.use === 'boil'"><input v-model.number="h.time" type="number" step="5" min="0" :max="draft.boilTime" style="width: 50px" /><span class="tiny">分钟</span></template>
          <button class="small ghost" @click="draft.hops.splice(i, 1)">✕</button>
        </div>
        <button class="small ghost" @click="addHop">＋ 酒花</button>

        <h4>【酵母】</h4>
        <div class="row ing">
          <select v-model="draft.yeast">
            <option v-for="x in yeasts" :key="x.id" :value="x.id">{{ x.name }}（{{ x.nameZh }}）</option>
          </select>
          <span v-if="yeastInfo" class="tiny muted">{{ yeastInfo.tempMin }}~{{ yeastInfo.tempMax }}℃ · 发酵度 {{ Math.round(yeastInfo.attenuation * 100) }}% · 至少 {{ yeastInfo.minDays }} 天 · 耐受 {{ yeastInfo.alcoholTolerance }}%</span>
        </div>

        <h4>【特殊原料】 <span class="tiny muted">g / 20L</span></h4>
        <div v-for="(a, i) in draft.adjuncts" :key="'a' + i" class="row ing">
          <select v-model="a.id" @change="onAdjunctChange(i)">
            <option v-for="x in adjuncts" :key="x.id" :value="x.id">{{ x.nameZh }}（{{ x.name }}）</option>
          </select>
          <input v-model.number="a.amount" type="number" step="10" min="0" />
          <select v-model="a.stage">
            <option v-for="(z, k) in STAGE_ZH" :key="k" :value="k">{{ z }}</option>
          </select>
          <button class="small ghost" @click="draft.adjuncts.splice(i, 1)">✕</button>
        </div>
        <button class="small ghost" :disabled="!adjuncts.length" @click="addAdjunct">＋ 辅料</button>

        <h4>【水质】</h4>
        <div class="row small">
          <select :value="draft.waterProfile === 'custom' ? 'balanced' : draft.waterProfile" :disabled="draft.waterProfile === 'custom'" @change="draft.waterProfile = ($event.target as HTMLSelectElement).value">
            <option v-for="w in waters" :key="w.id" :value="w.id">{{ w.nameZh }}</option>
          </select>
          <label v-if="g.researchEffects.waterAdvanced"><input type="checkbox" :checked="draft.waterProfile === 'custom'" @change="useCustomWater(($event.target as HTMLInputElement).checked)" /> 高级：自定义矿物质</label>
          <span v-if="!g.researchEffects.waterPresets" class="tiny muted">（研究「水质入门」解锁更多水质）</span>
          <span v-if="analysis" class="tiny" :class="analysis.mashPH >= 5.2 && analysis.mashPH <= 5.65 ? 'good' : 'bad'">糖化 pH ≈ {{ analysis.mashPH }}</span>
        </div>
        <div v-if="draft.waterProfile === 'custom' && draft.customWater" class="row small water">
          <label v-for="k in ['ca', 'mg', 'na', 'cl', 'so4', 'hco3'] as const" :key="k">{{ k.toUpperCase() }} <input v-model.number="draft.customWater[k]" type="number" min="0" max="500" step="5" /></label>
        </div>

        <h4>【工艺】</h4>
        <div class="params small">
          <label>糖化温度 {{ draft.mashTemperature }}℃<input v-model.number="draft.mashTemperature" type="range" min="60" max="72" step="0.5" /></label>
          <label>煮沸时间 {{ draft.boilTime }} 分<input v-model.number="draft.boilTime" type="range" min="30" max="120" step="5" /></label>
          <label>发酵温度 {{ draft.fermentationTemperature }}℃<input v-model.number="draft.fermentationTemperature" type="range" min="4" max="40" step="0.5" /></label>
          <label>主发酵 {{ draft.fermentationDays }} 天<input v-model.number="draft.fermentationDays" type="range" min="2" max="120" step="1" /></label>
          <label>熟成 {{ draft.maturationDays }} 天<input v-model.number="draft.maturationDays" type="range" min="0" max="365" step="1" /></label>
          <label>碳酸化 {{ draft.carbonation }} vol<input v-model.number="draft.carbonation" type="range" :min="carbRange[0]" :max="carbRange[1]" step="0.1" /></label>
        </div>
        <div class="row small">
          <label v-for="p in processes" :key="p"><input type="checkbox" :checked="draft.processes.includes(p)" @change="toggleProcess(p)" /> {{ PROCESS_ZH[p] }}</label>
          <span v-if="!processes.length" class="tiny muted">更多特殊工艺（煮出糖化、壶内酸化、冷却池……）需要研究解锁</span>
        </div>
        <div class="tiny muted">木桶陈酿：发酵完成后在 🛢️酒窖 中把批次转入木桶。</div>

        <div class="row" style="margin-top: 6px">
          <button class="primary" @click="save">💾 保存配方{{ dirty ? ' *' : '' }}</button>
          <button class="small" @click="duplicate">复制</button>
          <button class="small" :disabled="!g.recipes.some((r) => r.id === draft.id)" @click="save(); ui.brewRecipeId = draft.id; ui.open('brew')">♨️ 去酿造</button>
          <button v-if="g.recipes.some((r) => r.id === draft.id)" class="small danger" @click="remove">删除</button>
        </div>
      </div>

      <!-- 预测 -->
      <div v-if="analysis" class="predict col">
        <h4>预计（20L）</h4>
        <div class="row" style="align-items: flex-start">
          <Glass :srm="analysis.srm" :size="48" :haze="analysis.profile.haze" />
          <div class="stats">
            <div>
              ABV <b :class="target && targetStatus >= 2 ? (inRange(analysis.abv, target.abv) ? 'good' : 'bad') : ''">{{ analysis.abv }}%</b>
              <span v-if="target && targetStatus >= 2" class="tiny muted">（{{ target.abv.min }}~{{ target.abv.max }}）</span>
            </div>
            <div>
              IBU <b :class="target && targetStatus >= 2 ? (inRange(analysis.ibu, target.ibu) ? 'good' : 'bad') : ''">{{ analysis.ibu }}</b>
              <span v-if="target && targetStatus >= 2" class="tiny muted">（{{ target.ibu.min }}~{{ target.ibu.max }}）</span>
            </div>
            <div>
              SRM <b :class="target && targetStatus >= 2 ? (inRange(analysis.srm, target.color) ? 'good' : 'bad') : ''">{{ analysis.srm }}</b>
              <span v-if="target && targetStatus >= 2" class="tiny muted">（{{ target.color.min }}~{{ target.color.max }}）</span>
            </div>
            <div class="tiny muted">OG {{ analysis.og.toFixed(3) }} · FG {{ analysis.fg.toFixed(3) }}</div>
          </div>
        </div>
        <FlavorBars :profile="analysis.profile" :target="targetStatus >= 3 ? (target as any) : undefined" style="grid-template-columns: 1fr" />
        <div class="small">
          <span v-for="a in analysis.aromas" :key="a" class="chip">{{ aromaById[a]?.emoji }} {{ aromaById[a]?.zh }}</span>
        </div>
        <div v-if="targetMatch" class="small">与 {{ target?.name }} 匹配度：<b :class="targetMatch.score >= 70 ? 'good' : 'bad'">{{ targetMatch.score }}</b></div>
        <div v-else-if="target && targetStatus < 3" class="tiny muted">尚未成功酿造 {{ target.name }}，只能靠线索与实验摸索。</div>
        <div v-if="reqHints.length" class="small">
          <div v-for="h in reqHints" :key="h.hint" :class="h.ok ? 'good' : h.soft ? 'muted' : 'bad'">{{ h.ok ? '✔' : '✘' }} {{ h.hint }}</div>
        </div>
        <div v-for="w in analysis.warnings" :key="w" class="tiny bad">⚠ {{ w }}</div>
        <div class="tiny muted">工艺：{{ analysis.processes.join(', ') || '—' }}</div>
        <div class="small">原料成本 ≈ {{ fmtMoney(cost20) }} / 20L</div>
        <div v-if="draft.isCustom && draft.label" style="margin-top: 6px"><BeerLabel :label="draft.label" :name="draft.name" :sub="target?.name" :size="90" /></div>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.lab {
  display: grid;
  grid-template-columns: 190px 1fr 290px;
  gap: 12px;
  min-height: 60vh;
}
@media (max-width: 1000px) {
  .lab {
    grid-template-columns: 1fr;
  }
}
.recipes {
  max-height: 60vh;
}
.recipe-item {
  padding: 5px 6px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
}
.recipe-item.active {
  background: var(--wood);
  color: var(--gold);
}
.recipe-item:hover {
  background: var(--panel-2);
}
.ing select {
  max-width: 240px;
}
.params {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 14px;
}
.params label {
  display: flex;
  flex-direction: column;
}
.water input {
  width: 54px;
}
.predict {
  background: var(--panel-2);
  padding: 8px;
  box-shadow: 0 0 0 2px var(--line);
  align-self: start;
  position: sticky;
  top: 0;
}
.stats {
  font-size: 14px;
}
h4 {
  margin: 6px 0 2px;
}
</style>

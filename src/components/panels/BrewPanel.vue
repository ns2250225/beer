<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useGame, fmtMoney } from '../../stores/game'
import { useUi } from '../../stores/ui'
import { ingredientName, styleById, yeastById } from '../../engine/db'
import { sfx } from '../../engine/audio'
import type { BeerBatch } from '../../types'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const ui = useUi()

const recipeId = ref<string | null>(ui.brewRecipeId || g.recipes[g.recipes.length - 1]?.id || null)
const recipe = computed(() => g.recipes.find((r) => r.id === recipeId.value))
const freeFermenters = computed(() => g.fermenters.filter((f) => !f.batchId))
const fermenterId = ref<string | null>(null)
watch(
  freeFermenters,
  (fs) => {
    if (!fs.find((f) => f.id === fermenterId.value)) fermenterId.value = fs.sort((a, b) => g.fermenterCapacity(b) - g.fermenterCapacity(a))[0]?.id ?? null
  },
  { immediate: true },
)
const fermenter = computed(() => g.fermenters.find((f) => f.id === fermenterId.value))
const maxVol = computed(() => Math.min(fermenter.value ? g.fermenterCapacity(fermenter.value) : 20, g.maxBatchVolume))
const volume = ref(20)
watch(maxVol, (v) => (volume.value = v), { immediate: true })
const need = computed(() => (recipe.value ? g.requirements(recipe.value, volume.value) : []))
const missing = computed(() => need.value.filter((n) => n.have + 1e-6 < n.qty))
const missingCost = computed(() => (recipe.value ? g.missingCost(recipe.value, volume.value) : 0))
const lockedMissing = computed(() => missing.value.filter((n) => !g.ingredientUnlocked(n.id)))

type Phase = 'setup' | 'process' | 'done'
const phase = ref<Phase>('setup')
const STEPS = ['研磨', '糖化', '过滤', '煮沸', '加入酒花', '冷却', '加入酵母', '入罐发酵']
const stepIndex = ref(0)
const stepProgress = ref(0)
const result = ref<BeerBatch | null>(null)
let timer: number | null = null

// ---- 糖化小游戏 ----
const temp = ref(60)
const flame = ref(50)
const mashTime = ref(0)
const inRange = ref(0)
const MASH_DURATION = 14
const mashTarget = computed(() => recipe.value?.mashTemperature ?? 66)
const mashScore = ref(50)
const mashHistory = ref<number[]>([])
// ---- 冷却 ----
const coolTemp = ref(100)
const coolBonus = ref(0)
const coolDone = ref(false)

function startBrew(auto: boolean) {
  if (!recipe.value || !fermenter.value) return
  if (!g.canBrewToday()) return ui.toast(`今天的糖化锅已经满负荷（${g.brewsPerDay} 批/天）`, '♨️', 'bad')
  if (missing.value.length) return ui.toast('原料不足，请先补齐', '🌾', 'bad')
  if (auto && recipe.value.standard) {
    mashScore.value = recipe.value.standard.mashScore
    finish(true)
    return
  }
  phase.value = 'process'
  stepIndex.value = 0
  stepProgress.value = 0
  temp.value = mashTarget.value - 6
  flame.value = 60
  mashTime.value = 0
  inRange.value = 0
  mashHistory.value = []
  coolTemp.value = 100
  coolDone.value = false
  coolBonus.value = 0
  sfx('brew')
  run()
}

function run() {
  stop()
  let last = performance.now()
  timer = window.setInterval(() => {
    const now = performance.now()
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    const step = STEPS[stepIndex.value]
    if (step === '糖化') {
      const stability = g.equipStats.mashTun?.stats.stability ?? 0
      const heat = (flame.value / 100) * 3.2
      const loss = 1.2 + (temp.value - 55) * 0.05
      const noise = (Math.random() - 0.5) * 6 * (1 - stability)
      temp.value += (heat - loss + noise) * dt * 1.4
      mashTime.value += dt
      const d = Math.abs(temp.value - mashTarget.value)
      if (d <= 2) inRange.value += dt
      if (Math.random() < 0.3) mashHistory.value = [...mashHistory.value.slice(-80), temp.value]
      stepProgress.value = mashTime.value / MASH_DURATION
      if (mashTime.value >= MASH_DURATION) {
        mashScore.value = Math.round(Math.min(100, (inRange.value / MASH_DURATION) * 100))
        nextStep()
      }
    } else if (step === '冷却') {
      if (!coolDone.value) {
        coolTemp.value = Math.max(2, coolTemp.value - dt * 22)
        stepProgress.value = (100 - coolTemp.value) / 98
        if (coolTemp.value <= 2) pitch()
      }
    } else {
      stepProgress.value += dt * (step === '煮沸' ? 0.7 : 1.4)
      if (step === '煮沸' && Math.random() < 0.2) sfx('bubble')
      if (stepProgress.value >= 1) nextStep()
    }
  }, 50)
}
function nextStep() {
  stepIndex.value++
  stepProgress.value = 0
  if (stepIndex.value >= STEPS.length) {
    stop()
    finish(false)
  }
}
function pitch() {
  if (coolDone.value) return
  const target = recipe.value?.fermentationTemperature ?? 19
  const d = Math.abs(coolTemp.value - target)
  coolBonus.value = d <= 3 ? 6 : d <= 8 ? 2 : -8
  coolDone.value = true
  ui.toast(d <= 3 ? '完美的投种温度！' : coolTemp.value > target ? '太热了，酵母受了点惊吓' : '有点凉，酵母启动慢了', '🦠', d <= 3 ? 'good' : 'bad')
  setTimeout(nextStep, 400)
}
function skipMash() {
  mashScore.value = 50
  mashTime.value = MASH_DURATION
  nextStep()
}
function finish(auto: boolean) {
  if (!recipe.value || !fermenter.value) return
  const score = Math.max(0, Math.min(100, mashScore.value + coolBonus.value))
  const b = g.brew(recipe.value.id, volume.value, fermenter.value.id, score, false)
  if (b) {
    result.value = b
    phase.value = 'done'
    if (auto) ui.toast('按标准流程完成酿造', '📋', 'good')
  } else phase.value = 'setup'
}
function stop() {
  if (timer !== null) clearInterval(timer)
  timer = null
}
onBeforeUnmount(stop)

/** 上帝模式：跳过所有步骤，满分糖化，立即发酵完成并品鉴 */
function godBrew() {
  if (!recipe.value || !fermenter.value) return
  const b = g.brew(recipe.value.id, volume.value, fermenter.value.id, 100)
  if (!b) return
  g.godFinish(b.id)
  result.value = b
  phase.value = 'done'
  sfx('discover')
}
function saveStandard() {
  if (!result.value) return
  g.saveStandard(result.value.recipeId, result.value.mashScore)
  ui.toast('已保存为标准流程：员工可以自动生产', '📋', 'good')
}
function close() {
  if (phase.value === 'process') return
  emit('close')
}
const thermoPos = computed(() => Math.max(0, Math.min(100, ((temp.value - 55) / 20) * 100)))
const yeast = computed(() => (recipe.value ? yeastById[recipe.value.yeast] : undefined))
</script>

<template>
  <Win title="酿造" icon="♨️" @close="close">
    <!-- 准备 -->
    <div v-if="phase === 'setup'" class="col">
      <div v-if="!g.recipes.length" class="muted">还没有配方。先去 🧪实验室 写一张吧。</div>
      <template v-else>
        <div class="row">
          配方
          <select v-model="recipeId">
            <option v-for="r in g.recipes" :key="r.id" :value="r.id">{{ r.name }}{{ r.standard ? '（标准流程）' : '' }}</option>
          </select>
          <span v-if="recipe?.targetStyle" class="muted small">目标：{{ styleById[recipe.targetStyle]?.name }}</span>
        </div>
        <div class="row">
          发酵罐
          <select v-model="fermenterId">
            <option v-for="f in freeFermenters" :key="f.id" :value="f.id">{{ g.fermenterCapacity(f) }}L 发酵罐</option>
          </select>
          <span v-if="!freeFermenters.length" class="bad small">所有发酵罐都在使用中——去酒窖装桶，或在设备里购买新的发酵罐</span>
        </div>
        <div class="row">
          批量 {{ volume }}L
          <input v-model.number="volume" type="range" :min="Math.min(10, maxVol)" :max="maxVol" :step="maxVol > 100 ? 10 : 5" style="width: 220px" />
          <span class="tiny muted">上限 {{ maxVol }}L（煮锅 {{ g.maxBatchVolume }}L）· 约 {{ Math.floor(volume / 0.45) }} 杯</span>
        </div>
        <div class="small">今日已酿 {{ g.today.brews }}/{{ g.brewsPerDay }} 批</div>
        <table v-if="recipe">
          <tr><th>原料</th><th>需要</th><th>库存</th></tr>
          <tr v-for="n in need" :key="n.id" :class="{ bad: n.have + 1e-6 < n.qty }">
            <td>{{ ingredientName(n.id) }}</td>
            <td>{{ n.qty }} {{ n.unit }}</td>
            <td>{{ n.have === Infinity ? '∞' : Math.round(n.have * 100) / 100 }} {{ n.unit }}</td>
          </tr>
        </table>
        <div v-if="missing.length" class="row">
          <span class="bad small">缺少 {{ missing.length }} 种原料</span>
          <button class="small" :disabled="lockedMissing.length > 0" @click="recipe && g.buyMissing(recipe, volume)">🛒 一键补齐（{{ fmtMoney(missingCost) }}）</button>
          <span v-if="lockedMissing.length" class="tiny bad">含未解锁原料：{{ lockedMissing.map((n) => ingredientName(n.id)).join('、') }}</span>
        </div>
        <div class="row" style="margin-top: 8px">
          <button class="primary" :disabled="!recipe || !fermenter || missing.length > 0 || !g.canBrewToday()" @click="startBrew(false)">🔥 开始酿造（亲自操作）</button>
          <button v-if="g.settings.godMode" class="primary" :disabled="!recipe || !fermenter" @click="godBrew">⚡ 一键酿造完成</button>
          <button v-if="recipe?.standard" :disabled="!fermenter || missing.length > 0 || !g.canBrewToday()" @click="startBrew(true)">📋 按标准流程（糖化 {{ recipe.standard.mashScore }} 分）</button>
        </div>
      </template>
    </div>

    <!-- 流程 -->
    <div v-else-if="phase === 'process'" class="col">
      <div class="steps">
        <span v-for="(s, i) in STEPS" :key="s" class="step" :class="{ done: i < stepIndex, now: i === stepIndex }">{{ s }}</span>
      </div>
      <div class="prog"><span :style="{ width: Math.min(1, stepProgress) * 100 + '%' }" /></div>

      <div v-if="STEPS[stepIndex] === '糖化'" class="mash">
        <div class="col grow">
          <div>保持温度在 <b class="gold">{{ mashTarget - 2 }}℃ ～ {{ mashTarget + 2 }}℃</b>。调整火力！</div>
          <div class="thermo">
            <div class="zone" :style="{ left: ((mashTarget - 2 - 55) / 20) * 100 + '%', width: (4 / 20) * 100 + '%' }" />
            <div class="needle" :style="{ left: thermoPos + '%' }" />
          </div>
          <div class="row">
            <span class="pixel-title" :class="Math.abs(temp - mashTarget) <= 2 ? 'good' : 'bad'" style="font-size: 16px">{{ temp.toFixed(1) }}℃</span>
            <span class="small muted">稳定时长 {{ inRange.toFixed(1) }}s / {{ MASH_DURATION }}s</span>
          </div>
          <div class="row">
            🔥 火力
            <button class="small" @click="flame = Math.max(0, flame - 15)">－</button>
            <input v-model.number="flame" type="range" min="0" max="100" style="width: 200px" />
            <button class="small" @click="flame = Math.min(100, flame + 15)">＋</button>
            <span>{{ flame }}%</span>
          </div>
          <svg class="chart" viewBox="0 0 80 30" preserveAspectRatio="none">
            <rect x="0" :y="30 - ((mashTarget + 2 - 55) / 20) * 30" width="80" :height="(4 / 20) * 30" fill="#7dff9a33" />
            <polyline :points="mashHistory.map((t, i) => `${i},${30 - ((t - 55) / 20) * 30}`).join(' ')" fill="none" stroke="#ffd36e" stroke-width="0.6" />
          </svg>
          <button class="small ghost" @click="skipMash">跳过（交给运气，50 分）</button>
        </div>
      </div>
      <div v-else-if="STEPS[stepIndex] === '冷却'" class="col">
        <div>麦汁正在冷却。在温度接近 <b class="gold">{{ recipe?.fermentationTemperature }}℃</b> 时投入酵母（{{ yeast?.nameZh }}）！</div>
        <div class="pixel-title" style="font-size: 18px">{{ coolTemp.toFixed(0) }}℃</div>
        <button class="primary" :disabled="coolDone" @click="pitch">🦠 加入酵母！</button>
      </div>
      <div v-else class="muted">{{ STEPS[stepIndex] }}中……</div>
    </div>

    <!-- 完成 -->
    <div v-else-if="phase === 'done' && result" class="col">
      <h3>🍺 第 {{ result.number }} 批「{{ result.recipeName }}」已入罐</h3>
      <div>{{ result.volume }}L · OG {{ result.og.toFixed(3) }} · 糖化得分 {{ result.mashScore }}</div>
      <div class="small muted">预计 {{ result.fermentDays + result.maturationDays }} 天后完成发酵与熟成，到时会自动品鉴。</div>
      <div class="row">
        <button v-if="result.mashScore >= 60" class="primary" @click="saveStandard">📋 保存为标准流程</button>
        <span v-else class="tiny muted">糖化得分 ≥ 60 才能保存为标准流程</span>
        <button @click="phase = 'setup'">再酿一批</button>
        <button @click="emit('close')">完成</button>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.step {
  font-size: 13.5px;
  padding: 3px 6px;
  background: #1a1210;
  box-shadow: 0 0 0 1px var(--line);
  color: var(--muted);
}
.step.done {
  color: var(--green);
}
.step.now {
  background: var(--gold);
  color: var(--ink);
}
.prog {
  height: 8px;
  background: #1a1210;
  box-shadow: 0 0 0 1px var(--line);
}
.prog span {
  display: block;
  height: 100%;
  background: var(--amber);
}
.thermo {
  position: relative;
  height: 22px;
  background: linear-gradient(90deg, #3b6ea5, #e8a73a, #d9534f);
  box-shadow: 0 0 0 2px var(--ink);
}
.zone {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(125, 255, 154, 0.45);
  box-shadow: inset 0 0 0 2px var(--green);
}
.needle {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 30px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--ink);
  transition: left 0.05s linear;
}
.chart {
  width: 100%;
  height: 70px;
  background: #1a1210;
  box-shadow: 0 0 0 1px var(--line);
}
</style>

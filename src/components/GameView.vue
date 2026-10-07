<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGame, fmtMoney, fmtTime, REP_NAMES, SEASONS, OPEN_TIME } from '../stores/game'
import { useUi, type PanelId } from '../stores/ui'
import { BarSim, type Customer } from '../engine/sim'
import { BarScene } from '../scene/BarScene'
import { STYLES, eventById, weatherById } from '../engine/db'
import { sfx } from '../engine/audio'
import ModalHost from './ModalHost.vue'
import Tutorial from './Tutorial.vue'
import LabPanel from './panels/LabPanel.vue'
import BrewPanel from './panels/BrewPanel.vue'
import CellarPanel from './panels/CellarPanel.vue'
import TapsPanel from './panels/TapsPanel.vue'
import ShopPanel from './panels/ShopPanel.vue'
import EncyclopediaPanel from './panels/EncyclopediaPanel.vue'
import ResearchPanel from './panels/ResearchPanel.vue'
import EquipmentPanel from './panels/EquipmentPanel.vue'
import DecorPanel from './panels/DecorPanel.vue'
import StaffPanel from './panels/StaffPanel.vue'
import MapPanel from './panels/MapPanel.vue'
import QuestsPanel from './panels/QuestsPanel.vue'
import AchievementsPanel from './panels/AchievementsPanel.vue'
import StatsPanel from './panels/StatsPanel.vue'
import FeedPanel from './panels/FeedPanel.vue'
import SettingsPanel from './panels/SettingsPanel.vue'

const g = useGame()
const ui = useUi()
const host = ref<HTMLDivElement>()
const sim = new BarSim(g)
const scene = new BarScene(g, sim)
let raf = 0
let last = performance.now()
let ro: ResizeObserver | null = null
const inspect = ref<Customer | null>(null)

const panels: Record<PanelId, any> = {
  lab: LabPanel,
  brew: BrewPanel,
  cellar: CellarPanel,
  taps: TapsPanel,
  shop: ShopPanel,
  encyclopedia: EncyclopediaPanel,
  research: ResearchPanel,
  equipment: EquipmentPanel,
  decor: DecorPanel,
  staff: StaffPanel,
  map: MapPanel,
  quests: QuestsPanel,
  achievements: AchievementsPanel,
  stats: StatsPanel,
  feed: FeedPanel,
  settings: SettingsPanel,
}

const nav: { id: PanelId; icon: string; name: string }[] = [
  { id: 'lab', icon: '🧪', name: '实验室' },
  { id: 'brew', icon: '♨️', name: '酿造' },
  { id: 'cellar', icon: '🛢️', name: '酒窖' },
  { id: 'taps', icon: '🚰', name: '酒头' },
  { id: 'shop', icon: '🛒', name: '采购' },
  { id: 'encyclopedia', icon: '📖', name: '图鉴' },
  { id: 'research', icon: '🔬', name: '研究' },
  { id: 'equipment', icon: '🔧', name: '设备' },
  { id: 'decor', icon: '🪑', name: '装修' },
  { id: 'staff', icon: '👷', name: '员工' },
  { id: 'map', icon: '🌍', name: '世界' },
  { id: 'quests', icon: '📋', name: '委托' },
  { id: 'achievements', icon: '🏆', name: '成就' },
  { id: 'stats', icon: '📊', name: '经营' },
  { id: 'settings', icon: '⚙️', name: '设置' },
]

const badge = (id: PanelId) => {
  if (id === 'cellar') return g.batches.filter((b) => b.stage === 'ready').length || ''
  if (id === 'quests') return g.quests.filter((q) => q.status === 'active').length || ''
  if (id === 'research') return g.xp >= 40 && g.research.length < 3 ? '!' : ''
  if (id === 'taps') return g.taps.some((t) => !t.batchId) && g.batches.some((b) => b.stage === 'packaged' && !g.taps.some((t) => t.batchId === b.id)) ? '!' : ''
  return ''
}

const blocking = computed(() => ui.modals.some((m) => ['report', 'bankrupt', 'npc', 'discovery', 'tasting', 'levelup', 'dbupdate', 'confirm'].includes(m.kind)))

function loop(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  const pausedByUi = (g.settings.autoPause && ui.panel && ui.panel !== 'feed') || blocking.value
  let dMin = 0
  if (!pausedByUi) dMin = g.advance(dt)
  sim.update(dMin, dt)
  scene.render(dt)
  raf = requestAnimationFrame(loop)
}

onMounted(async () => {
  await document.fonts.ready.catch(() => undefined)
  await scene.init(host.value!)
  ro = new ResizeObserver(() => scene.resize(host.value!.clientWidth, host.value!.clientHeight))
  ro.observe(host.value!)
  last = performance.now()
  raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  scene.destroy()
})

watch(
  () => g.day,
  () => sim.reset(),
)

function onCanvasClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).querySelector('canvas')!.getBoundingClientRect()
  const sx = ((e.clientX - rect.left) / rect.width) * 480 * scene.scale
  const sy = ((e.clientY - rect.top) / rect.height) * 270 * scene.scale
  inspect.value = scene.customerAt(sx, sy) || null
}

function setSpeed(s: number) {
  g.speed = s
  g.paused = false
  sfx('click')
}
function openPanel(id: PanelId) {
  sfx('click')
  ui.open(id)
}
const weather = computed(() => weatherById[g.weather])
const stars = computed(() => '★'.repeat(Math.ceil(g.repLevel / 2)) + '☆'.repeat(4 - Math.ceil(g.repLevel / 2)))
</script>

<template>
  <div class="game">
    <!-- HUD -->
    <div class="hud">
      <div class="hud-group">
        <span class="bar-name">{{ g.barName }}</span>
        <span class="chip">DAY {{ g.day }} · {{ SEASONS[g.season] }}</span>
        <span class="clock pixel-title">{{ fmtTime(g.minute) }}</span>
        <span :title="weather?.nameZh">{{ weather?.icon }} {{ weather?.nameZh }}</span>
        <span v-for="e in g.events" :key="e.id" class="chip gold" :title="eventById[e.id]?.desc">{{ eventById[e.id]?.icon }} {{ eventById[e.id]?.nameZh }}·{{ e.daysLeft }}天</span>
      </div>
      <div class="hud-group">
        <span class="money" :class="{ bad: g.money < 0 }">💰 {{ g.settings.godMode ? '∞' : fmtMoney(g.money) }}</span>
        <span v-if="g.settings.godMode" class="chip gold" title="上帝模式：金钱与原料无限">👑 上帝模式</span>
        <span title="Brewing XP：用于研究">🧪 {{ g.settings.godMode ? '∞' : Math.floor(g.xp) }} XP</span>
        <span class="rep" :title="`声望 ${Math.floor(g.reputation)}`">
          <span class="gold">{{ stars }}</span> Lv.{{ g.repLevel }} {{ REP_NAMES[g.repLevel - 1] }}
          <span class="rep-bar"><span :style="{ width: g.repProgress * 100 + '%' }" /></span>
        </span>
        <span title="世界精酿图鉴">📖 {{ g.discoveredCount }}/{{ STYLES.length }}</span>
      </div>
      <div class="hud-group">
        <button class="small" :class="{ primary: g.paused }" @click="g.paused = !g.paused">{{ g.paused ? '▶' : '⏸' }}</button>
        <button v-for="s in [1, 2, 4, 8]" :key="s" class="small" :class="{ primary: g.speed === s && !g.paused }" @click="setSpeed(s)">{{ s }}x</button>
        <button v-if="g.minute < OPEN_TIME" class="small primary" :class="{ hl: ui.highlight === 'open' }" data-tut="open" @click="g.skipToOpen()">🔔 开门营业</button>
        <button v-if="g.tutorial.done && (g.minute < OPEN_TIME || (g.isOpen && g.today.cups === 0 && !g.taps.some((t) => t.batchId)))" class="small" title="没有酒可卖时，直接结束今天" @click="g.closeToday()">💤 今日歇业</button>
        <span v-if="g.isOpen" class="good small">● 营业中</span>
        <span v-else-if="g.minute >= OPEN_TIME" class="muted small">● 已打烊</span>
      </div>
    </div>

    <div class="main">
      <div ref="host" class="scene" @click="onCanvasClick">
        <div v-if="inspect" class="inspect card" @click.stop="inspect = null">
          <div class="gold">{{ inspect.profile.npc ? '⭐ ' : '' }}{{ inspect.profile.name }}</div>
          <div class="small">{{ inspect.profile.archetype.nameZh }} · {{ inspect.profile.personality.nameZh }}</div>
          <div class="tiny muted">{{ inspect.profile.archetype.desc }}</div>
          <div v-if="inspect.offer" class="small">正在喝：{{ inspect.offer.batch.displayName }} <span v-if="inspect.rating !== undefined">❤️ {{ inspect.rating }}</span></div>
          <div class="tiny muted">已喝 {{ inspect.cups }} 杯 · 消费 {{ fmtMoney(inspect.spent) }}</div>
        </div>
        <div class="toasts">
          <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.kind">{{ t.icon }} {{ t.text }}</div>
        </div>
      </div>
      <FeedPanel class="side" mini />
    </div>

    <div class="nav">
      <button v-for="n in nav" :key="n.id" class="nav-btn" :class="{ hl: ui.highlight === n.id }" :data-tut="n.id" @click="openPanel(n.id)">
        <span class="nav-icon">{{ n.icon }}</span>
        <span>{{ n.name }}</span>
        <span v-if="badge(n.id)" class="badge">{{ badge(n.id) }}</span>
      </button>
    </div>

    <component :is="panels[ui.panel]" v-if="ui.panel" @close="ui.close()" />
    <ModalHost />
    <Tutorial v-if="!g.tutorial.done" />
  </div>
</template>

<style scoped>
.game {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding: 5px 10px;
  background: var(--wood-d);
  border-bottom: 3px solid var(--ink);
  box-shadow: inset 0 -2px 0 var(--wood-l);
  font-size: 14px;
}
.hud-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.bar-name {
  color: var(--gold);
  font-size: 15px;
}
.clock {
  font-size: 14px;
  color: var(--gold);
}
.money {
  color: var(--gold);
}
.rep-bar {
  display: inline-block;
  width: 60px;
  height: 6px;
  background: #1a1210;
  box-shadow: 0 0 0 1px var(--line);
  vertical-align: middle;
}
.rep-bar span {
  display: block;
  height: 100%;
  background: var(--gold);
}
.main {
  flex: 1;
  display: flex;
  min-height: 0;
}
.scene {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0a0c;
  overflow: hidden;
  min-width: 0;
}
.scene :deep(canvas) {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
.side {
  width: 290px;
  border-left: 3px solid var(--ink);
}
@media (max-width: 1100px) {
  .side {
    display: none;
  }
}
.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px;
  padding: 5px;
  background: var(--wood-d);
  border-top: 3px solid var(--ink);
}
.nav-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 62px;
  font-size: 13.5px;
  padding: 4px 6px;
}
.nav-icon {
  font-size: 18px;
}
.hl {
  animation: glow 0.7s infinite alternate;
}
@keyframes glow {
  to {
    box-shadow:
      0 0 0 2px var(--ink),
      0 0 0 5px var(--gold),
      0 0 14px var(--gold);
  }
}
.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: var(--red);
  color: #fff;
  font-size: 13.5px;
  padding: 1px 4px;
  box-shadow: 0 0 0 2px var(--ink);
}
.toasts {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  pointer-events: none;
  z-index: 5;
}
.toast {
  background: var(--panel);
  padding: 5px 12px;
  box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px var(--line);
  font-size: 14px;
  animation: pop 0.25s ease-out;
}
.toast.good {
  color: var(--green);
}
.toast.bad {
  color: var(--red);
}
.toast.gold {
  color: var(--gold);
  box-shadow: 0 0 0 2px var(--ink), 0 0 0 4px var(--gold);
}
@keyframes pop {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
}
.inspect {
  position: absolute;
  left: 10px;
  bottom: 10px;
  max-width: 280px;
  z-index: 4;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useGame, fmtMoney, REP_NAMES, STATUS_NAMES, OPEN_TIME } from '../stores/game'
import { useUi } from '../stores/ui'
import { FAMILIES, aromaById, defectById, ingredientName, npcById, styleById, weatherById, EQUIPMENT } from '../engine/db'
import { FLAVOR_DIM_ZH } from '../types'
import FlavorBars from './FlavorBars.vue'
import Glass from './Glass.vue'
import BeerLabel from './BeerLabel.vue'
import { dots } from '../ui/format'

const g = useGame()
const ui = useUi()
const m = computed(() => ui.modals[0])

const batch = computed(() => {
  const x = m.value
  if (x && (x.kind === 'tasting' || x.kind === 'discovery') && x.batchId) return g.batches.find((b) => b.id === x.batchId)
  return undefined
})
const style = computed(() => {
  const x = m.value
  if (x?.kind === 'discovery') return styleById[x.styleId]
  return batch.value?.styleId ? styleById[batch.value.styleId] : undefined
})
const report = computed(() => (m.value?.kind === 'report' ? g.reports.find((r) => r.day === (m.value as any).day) : undefined))

function next() {
  const cur = m.value
  ui.pop()
  if (cur?.kind === 'report') {
    if (!g.bankrupt) g.nextDay()
  }
}
function confirmYes() {
  const cur = m.value
  if (cur?.kind === 'confirm') cur.onYes()
  ui.pop()
}
const devText = computed(() => {
  const b = batch.value
  const s = style.value
  if (!b || !s) return []
  const out: string[] = []
  for (const d of Object.keys(FLAVOR_DIM_ZH) as (keyof typeof FLAVOR_DIM_ZH)[]) {
    const diff = b.flavorProfile[d] - (s as any)[d]
    if (Math.abs(diff) > 0.75) out.push(`${FLAVOR_DIM_ZH[d]}${diff > 0 ? '偏高' : '偏低'}`)
  }
  if (b.abv < s.abv.min || b.abv > s.abv.max) out.push(`ABV ${b.abv < s.abv.min ? '偏低' : '偏高'}`)
  if (b.ibu < s.ibu.min || b.ibu > s.ibu.max) out.push(`IBU ${b.ibu < s.ibu.min ? '偏低' : '偏高'}`)
  return out
})
const npc = computed(() => (m.value?.kind === 'npc' ? npcById[m.value.npcId] : undefined))
const giftText = (gift?: string) => {
  if (!gift) return ''
  const [k, v] = gift.split(':')
  if (k === 'clue') return `📜 关于「${styleById[v]?.name ?? v}」的线索`
  if (k === 'heard') return `👂 听说了「${styleById[v]?.name ?? v}」`
  if (k === 'ingredient') return `🎁 原料：${ingredientName(v)}`
  if (k === 'quest') return `📋 一份委托（见委托面板）`
  return gift
}
const sellables = computed(() =>
  (['tap', 'kettle', 'mashTun', 'mill', 'brightTank', 'keg', 'coldStorage', 'barrelRack'] as const)
    .map((k) => ({ k, item: EQUIPMENT.find((e) => e.kind === k && e.tier === g.equipment[k]) }))
    .filter((x) => x.item && x.item.price > 0),
)
function sell(k: (typeof sellables.value)[number]['k']) {
  g.sellEquipment(k)
  if (g.money >= 0) g.bankrupt = false
}
function bailout() {
  g.bailout()
}
function continueAfterBankrupt() {
  g.bankrupt = false
  ui.pop()
  g.nextDay()
}
void OPEN_TIME
</script>

<template>
  <div v-if="m" class="modal-backdrop">
    <!-- 品鉴 -->
    <div v-if="m.kind === 'tasting' && batch" class="modal">
      <h3>🍺 品鉴：第 {{ batch.number }} 批「{{ batch.recipeName }}」</h3>
      <div class="row" style="align-items: flex-start; gap: 14px">
        <div class="col" style="align-items: center">
          <Glass :srm="batch.color" :size="64" :haze="batch.flavorProfile.haze" />
          <BeerLabel v-if="batch.isCustom" :label="batch.label" :name="batch.recipeName" :size="80" />
        </div>
        <div class="grow col">
          <div v-if="style" class="big">
            鉴定为：<span class="gold">{{ batch.displayName }}</span>
            <span class="muted small">（{{ style.nameZh }}）</span>
          </div>
          <div v-else class="big">
            风格：<span class="muted">无法归类</span>
            <span v-if="batch.closeStyle && batch.styleAccuracy >= 55" class="small"> —— 非常接近一种{{ g.styleStatus(batch.closeStyle) >= 1 ? `叫「${styleById[batch.closeStyle]?.name}」的` : '未知的' }}风格……</span>
          </div>
          <div class="row small">
            <span>ABV {{ batch.abv }}%</span><span>IBU {{ batch.ibu }}</span><span>SRM {{ batch.color }}</span><span>OG {{ batch.og.toFixed(3) }}</span><span>FG {{ batch.fg.toFixed(3) }}</span><span>{{ batch.volume }}L</span>
          </div>
          <div class="row">
            <span class="chip">风格准确 {{ batch.styleAccuracy }}</span>
            <span class="chip">酿造品质 {{ batch.quality }}</span>
            <span class="chip gold">综合 {{ batch.overall }}</span>
            <span class="chip">糖化 {{ Math.round(batch.mashScore) }}</span>
          </div>
          <div class="row small">
            <span class="muted">香气：</span>
            <span v-for="a in batch.aromas" :key="a">{{ aromaById[a]?.emoji }} {{ aromaById[a]?.zh }}</span>
          </div>
          <div v-if="batch.defects.length" class="small bad">
            缺陷：<span v-for="d in batch.defects" :key="d">{{ defectById[d]?.nameZh }}（{{ defectById[d]?.taste }}） </span>
            <div class="tiny muted" v-for="d in batch.defects" :key="'f' + d">💡 {{ defectById[d]?.fix }}</div>
          </div>
          <div v-if="devText.length" class="small">与标准 {{ style?.name }} 相比：<span class="bad">{{ devText.join('、') }}</span></div>
        </div>
      </div>
      <FlavorBars :profile="batch.flavorProfile" :target="g.styleStatus(style?.id || '') >= 3 ? (style as any) : undefined" hide-zero />
      <div class="row" style="justify-content: flex-end; margin-top: 8px">
        <button class="primary" @click="next">好的</button>
      </div>
    </div>

    <!-- 新风格发现 -->
    <div v-else-if="m.kind === 'discovery'" class="modal discovery">
      <div class="burst pixel-title">NEW STYLE!</div>
      <h2 class="gold">🎉 新风格发现！</h2>
      <div class="disc-name">{{ m.name }}</div>
      <div v-if="style" class="muted">{{ style.nameZh }} · {{ FAMILIES.find((f) => f.id === style!.family)?.nameZh }} · {{ style.country.join(' / ') }}</div>
      <p v-if="style" class="small">{{ style.description }}</p>
      <div class="gold">《世界精酿图鉴》 +1　（{{ g.discoveredCount }} 种）</div>
      <button class="primary" @click="next">收入图鉴</button>
    </div>

    <!-- NPC -->
    <div v-else-if="m.kind === 'npc' && npc" class="modal">
      <h3>⭐ {{ npc.nameZh }} 来到了酒吧</h3>
      <p v-for="(l, i) in m.lines" :key="i" class="speech">“{{ l }}”</p>
      <p v-if="m.gift" class="gold">{{ giftText(m.gift) }}</p>
      <p v-else class="muted small">（今天只是来喝一杯。）</p>
      <div class="row" style="justify-content: flex-end"><button class="primary" @click="next">招待</button></div>
    </div>

    <!-- 每日结算 -->
    <div v-else-if="m.kind === 'report' && report" class="modal report">
      <div class="pixel-title gold" style="font-size: 18px">DAY {{ report.day }}</div>
      <div class="muted small">{{ weatherById[report.weather]?.icon }} {{ weatherById[report.weather]?.nameZh }}</div>
      <table>
        <tr><td>营业额</td><td class="gold">{{ fmtMoney(report.revenue) }}</td></tr>
        <tr><td>小费</td><td>{{ fmtMoney(report.tips) }}</td></tr>
        <tr><td>原料</td><td class="bad">-{{ fmtMoney(report.ingredientCost) }}</td></tr>
        <tr><td>工资</td><td class="bad">-{{ fmtMoney(report.wages) }}</td></tr>
        <tr><td>房租水电</td><td class="bad">-{{ fmtMoney(report.rent) }}</td></tr>
        <tr><td>利润</td><td :class="report.profit >= 0 ? 'good' : 'bad'">{{ fmtMoney(report.profit) }}</td></tr>
        <tr><td>卖出</td><td>{{ report.cups }} 杯 · 接待 {{ report.customers }} 人 · 未能接待 {{ report.lost }} 人</td></tr>
        <tr><td>平均评分</td><td>❤️ {{ report.avgRating || '-' }}</td></tr>
      </table>
      <div v-if="report.top.length">
        <h4>最畅销</h4>
        <div v-for="(t, i) in report.top" :key="t.name">{{ ['🥇', '🥈', '🥉'][i] }} {{ t.name }} × {{ t.cups }}</div>
      </div>
      <div v-if="report.discoveries.length">
        <h4>新增图鉴</h4>
        <div v-for="d in report.discoveries" :key="d">🍺 {{ d }}</div>
      </div>
      <div>
        <h4>酒吧声望</h4>
        <span class="gold">{{ '★'.repeat(Math.ceil(report.repLevel / 2)) }}{{ '☆'.repeat(4 - Math.ceil(report.repLevel / 2)) }}</span>
        Lv.{{ report.repLevel }} {{ REP_NAMES[report.repLevel - 1] }}（{{ report.repGain >= 0 ? '+' : '' }}{{ report.repGain }}）
      </div>
      <div class="row" style="justify-content: flex-end"><button class="primary" @click="next">{{ g.bankrupt ? '继续' : '睡觉，迎接新的一天 →' }}</button></div>
    </div>

    <!-- 破产 -->
    <div v-else-if="m.kind === 'bankrupt'" class="modal">
      <h3>💸 资金告急</h3>
      <p class="speech">老酿酒师：“看来我们得从小规模重新开始了。”</p>
      <p class="small">当前资金 <span class="bad">{{ fmtMoney(g.money) }}</span>。游戏不会结束——你可以出售设备、减少酒头、改用便宜原料，重新经营。</p>
      <div class="col">
        <div v-for="s in sellables" :key="s.k" class="row small">
          <span class="grow">{{ s.item!.nameZh }}</span>
          <button class="small" @click="sell(s.k)">出售（+{{ fmtMoney(s.item!.price * 0.5) }}）</button>
        </div>
        <div class="row small">
          <span class="grow">解雇所有员工（明天起不再支付工资）</span>
          <button class="small" @click="g.staff.bartender = 0; g.staff.brewer = 0">解雇</button>
        </div>
        <div class="row small">
          <span class="grow">向老酿酒师借 $300（每 7 天一次）</span>
          <button class="small" :disabled="g.day - g.lastBailoutDay < 7" @click="bailout">借钱</button>
        </div>
      </div>
      <div class="row" style="justify-content: flex-end">
        <button class="primary" @click="continueAfterBankrupt">重新开始经营 →</button>
      </div>
    </div>

    <div v-else-if="m.kind === 'levelup'" class="modal discovery">
      <div class="burst pixel-title">LEVEL UP</div>
      <h2 class="gold">酒吧声望 Lv.{{ m.level }}</h2>
      <div class="disc-name">{{ REP_NAMES[m.level - 1] }}</div>
      <p class="small muted">更多客人慕名而来，新的设备、地区和特殊客人已解锁。</p>
      <button class="primary" @click="next">太好了</button>
    </div>

    <div v-else-if="m.kind === 'dbupdate'" class="modal">
      <h3>📦 啤酒数据库已更新</h3>
      <p>Beer DB Version <span class="gold">{{ m.version }}</span>，新增 {{ m.added }} 种风格。新的风格已加入《世界精酿图鉴》。</p>
      <div class="row" style="justify-content: flex-end"><button class="primary" @click="next">好的</button></div>
    </div>

    <div v-else-if="m.kind === 'confirm'" class="modal">
      <p>{{ m.text }}</p>
      <div class="row" style="justify-content: flex-end">
        <button class="ghost" @click="ui.pop()">取消</button>
        <button class="danger" @click="confirmYes">确定</button>
      </div>
    </div>
    <div v-else class="modal">
      <button @click="next">关闭</button>
    </div>
  </div>
  <span v-else style="display: none">{{ dots(0) }}{{ STATUS_NAMES[0] }}</span>
</template>

<style scoped>
.modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 6, 8, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}
.modal {
  width: min(620px, 94%);
  max-height: 92%;
  overflow-y: auto;
  background: var(--panel);
  padding: 16px 18px;
  box-shadow:
    0 0 0 2px var(--ink),
    0 0 0 4px var(--gold),
    0 0 0 6px var(--ink),
    8px 8px 0 6px rgba(0, 0, 0, 0.4);
  animation: pop 0.2s ease-out;
}
.big {
  font-size: 16px;
}
.discovery {
  text-align: center;
}
.burst {
  font-size: 22px;
  color: var(--gold);
  text-shadow: 3px 3px 0 #8b3a1a;
  animation: shine 1s infinite alternate;
}
.disc-name {
  font-size: 26px;
  margin: 8px 0;
  color: #fff;
}
.speech {
  background: var(--paper);
  color: var(--ink);
  padding: 8px 10px;
  box-shadow: 0 0 0 2px var(--ink);
}
.report table td:first-child {
  color: var(--muted);
  width: 90px;
}
@keyframes shine {
  to {
    transform: scale(1.08);
  }
}
@keyframes pop {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
}
</style>

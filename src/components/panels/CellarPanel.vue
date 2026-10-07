<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame, BARREL_LITERS } from '../../stores/game'
import { useUi } from '../../stores/ui'
import { barrelById, defectById, styleById } from '../../engine/db'
import type { BeerBatch } from '../../types'
import Win from '../Win.vue'
import Glass from '../Glass.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const ui = useUi()

const fermenting = computed(() => g.batches.filter((b) => b.stage === 'fermenting' || b.stage === 'maturing'))
const ready = computed(() => g.batches.filter((b) => b.stage === 'ready'))
const aging = computed(() => g.batches.filter((b) => b.stage === 'barrel'))
const packaged = computed(() => g.batches.filter((b) => b.stage === 'packaged'))
const freeBarrels = computed(() => g.barrels.filter((b) => !b.batchId))
const barrelChoice = ref<Record<string, string>>({})
const monthsChoice = ref<Record<string, number>>({})

function eta(b: BeerBatch) {
  if (b.stage === 'fermenting') return b.fermentDays - b.stageDays + b.maturationDays
  return b.maturationDays - b.stageDays
}
function dump(b: BeerBatch) {
  ui.push({ kind: 'confirm', text: `倒掉第 ${b.number} 批「${b.displayName}」（${Math.round(b.remaining)}L）？`, onYes: () => g.dumpBatch(b.id) })
}
function toBarrel(b: BeerBatch) {
  const slot = barrelChoice.value[b.id] || freeBarrels.value[0]?.id
  if (!slot) return
  g.moveToBarrel(b.id, slot, monthsChoice.value[b.id] || 6)
}
function toTap(b: BeerBatch) {
  const i = g.taps.findIndex((t) => !t.batchId)
  if (i < 0) return ui.toast('没有空闲的酒头', '🚰', 'bad')
  g.setTap(i, b.id)
  ui.toast(`已接到酒头 ${i + 1}`, '🚰', 'good')
}
const onTap = (b: BeerBatch) => g.taps.findIndex((t) => t.batchId === b.id)
</script>

<template>
  <Win title="酒窖" icon="🛢️" wide @close="emit('close')">
    <div class="row small" style="margin-bottom: 6px">
      <span>酒桶容量 {{ Math.round(g.kegUsed) }} / {{ g.kegCapacity }} L</span>
      <span class="muted">· 发酵罐 {{ g.fermenters.filter((f) => f.batchId).length }}/{{ g.fermenters.length }} 使用中</span>
      <span v-if="g.barrelSlots" class="muted">· 木桶 {{ g.barrels.filter((b) => b.batchId).length }}/{{ g.barrels.length }}（架位 {{ g.barrelSlots }}）</span>
    </div>

    <h3>✅ 发酵完成 · 待处理（{{ ready.length }}）</h3>
    <div v-if="!ready.length" class="muted small">暂无</div>
    <div v-for="b in ready" :key="b.id" class="card batch">
      <Glass :srm="b.color" :size="34" />
      <div class="grow">
        <div>
          第 {{ b.number }} 批 <b class="gold">{{ b.displayName }}</b>
          <span class="muted small">（{{ b.recipeName }}）{{ b.volume }}L</span>
        </div>
        <div class="small">ABV {{ b.abv }}% · IBU {{ b.ibu }} · 风格 {{ b.styleAccuracy }} · 品质 {{ b.quality }} · <span class="gold">综合 {{ b.overall }}</span></div>
        <div v-if="b.defects.length" class="tiny bad">缺陷：{{ b.defects.map((d) => defectById[d]?.nameZh).join('、') }}</div>
      </div>
      <div class="col" style="align-items: flex-end">
        <div class="row">
          <button class="small" @click="ui.push({ kind: 'tasting', batchId: b.id })">🍺 品鉴卡</button>
          <button class="primary small" @click="g.packageBatch(b.id)">🛢️ 装桶</button>
          <button class="small danger" @click="dump(b)">倒掉</button>
        </div>
        <div v-if="g.researchEffects.barrel" class="row tiny">
          <template v-if="freeBarrels.length && b.remaining <= BARREL_LITERS">
            <select v-model="barrelChoice[b.id]">
              <option v-for="s in freeBarrels" :key="s.id" :value="s.id">{{ barrelById[s.barrelId]?.nameZh }}（用过 {{ s.uses }} 次）</option>
            </select>
            <select v-model.number="monthsChoice[b.id]">
              <option v-for="mth in [1, 2, 3, 6, 9, 12, 18, 24]" :key="mth" :value="mth">{{ mth }} 个月</option>
            </select>
            <button class="small" @click="toBarrel(b)">🪵 转入木桶</button>
          </template>
          <span v-else-if="!g.barrels.length" class="muted">在设备面板购买木桶架和木桶后可陈酿</span>
          <span v-else-if="b.remaining > BARREL_LITERS" class="muted">超过单桶 {{ BARREL_LITERS }}L</span>
          <span v-else class="muted">没有空木桶</span>
        </div>
      </div>
    </div>

    <h3>
      🫧 发酵中（{{ fermenting.length }}）
      <button v-if="g.settings.godMode && (fermenting.length || aging.length)" class="small primary" @click="g.godFinishAll()">⚡ 全部立即完成</button>
    </h3>
    <div v-if="!fermenting.length" class="muted small">暂无</div>
    <div v-for="b in fermenting" :key="b.id" class="card batch">
      <Glass :srm="b.color" :size="28" />
      <div class="grow">
        第 {{ b.number }} 批「{{ b.recipeName }}」{{ b.volume }}L
        <span class="small muted">· {{ b.stage === 'fermenting' ? '主发酵' : '熟成' }}第 {{ b.stageDays }} 天 · 约 {{ eta(b) }} 天后完成 · {{ b.auto ? '员工生产' : '' }}</span>
        <div class="prog">
          <span :style="{ width: ((b.stage === 'fermenting' ? b.stageDays : b.fermentDays + b.stageDays) / Math.max(1, b.fermentDays + b.maturationDays)) * 100 + '%' }" />
        </div>
      </div>
      <button v-if="g.settings.godMode" class="small primary" @click="g.godFinish(b.id)">⚡ 立即完成</button>
      <button class="small danger" @click="dump(b)">倒掉</button>
    </div>

    <template v-if="aging.length">
      <h3>🪵 木桶陈酿（{{ aging.length }}）</h3>
      <div v-for="b in aging" :key="b.id" class="card batch">
        <Glass :srm="b.color" :size="28" />
        <div class="grow">
          第 {{ b.number }} 批「{{ b.displayName }}」→ {{ barrelById[b.barrel!.id]?.nameZh }}
          <span class="small muted">· 已陈酿 {{ Math.floor(b.barrel!.daysAged) }} / {{ b.barrel!.months * 30 }} 天</span>
          <div class="prog"><span :style="{ width: (b.barrel!.daysAged / (b.barrel!.months * 30)) * 100 + '%' }" /></div>
        </div>
        <button v-if="g.settings.godMode" class="small primary" @click="g.godFinish(b.id)">⚡ 陈酿完成</button>
        <button class="small" @click="g.pullFromBarrel(b.id)">提前出桶</button>
      </div>
    </template>

    <h3>🍻 成品库存（{{ packaged.length }}）</h3>
    <div v-if="!packaged.length" class="muted small">暂无</div>
    <table v-else>
      <tr><th></th><th>啤酒</th><th>剩余</th><th>ABV</th><th>综合</th><th>品质</th><th>新鲜度</th><th>已售</th><th>酒头</th><th></th></tr>
      <tr v-for="b in packaged" :key="b.id">
        <td><Glass :srm="b.color" :size="18" /></td>
        <td>
          {{ b.displayName }} <span class="tiny muted">#{{ b.number }}</span>
          <div v-if="b.styleId" class="tiny muted">{{ styleById[b.styleId]?.nameZh }}</div>
        </td>
        <td>{{ Math.round(b.remaining * 10) / 10 }}L</td>
        <td>{{ b.abv }}%</td>
        <td class="gold">{{ b.overall }}</td>
        <td>{{ Math.round(g.effectiveQuality(b)) }}</td>
        <td :class="b.freshness < 60 ? 'bad' : b.freshness < 85 ? '' : 'good'">{{ b.freshness }}</td>
        <td>{{ b.sold }}</td>
        <td>{{ onTap(b) >= 0 ? `#${onTap(b) + 1}` : '—' }}</td>
        <td>
          <button v-if="onTap(b) < 0" class="small" @click="toTap(b)">接酒头</button>
          <button class="small danger" @click="dump(b)">倒掉</button>
        </td>
      </tr>
    </table>
  </Win>
</template>

<style scoped>
.batch {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.prog {
  height: 6px;
  background: #1a1210;
  box-shadow: 0 0 0 1px var(--line);
  margin-top: 3px;
}
.prog span {
  display: block;
  height: 100%;
  background: var(--amber);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../../stores/game'
import { useUi } from '../../stores/ui'
import { glassById, styleById } from '../../engine/db'
import { suggestedPrice } from '../../engine/customers'
import Win from '../Win.vue'
import Glass from '../Glass.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const ui = useUi()
const available = computed(() => g.batches.filter((b) => b.stage === 'packaged'))
const batchOf = (id?: string) => (id ? g.batches.find((b) => b.id === id) : undefined)
function onSelect(i: number, e: Event) {
  const v = (e.target as HTMLSelectElement).value
  g.setTap(i, v || undefined)
}
const suggest = (i: number) => {
  const b = batchOf(g.taps[i].batchId)
  return b ? suggestedPrice({ abv: b.abv, quality: g.effectiveQuality(b) }, g.glassFor(b).volume) : 0
}
</script>

<template>
  <Win title="酒头 · TODAY'S TAP" icon="🚰" @close="emit('close')">
    <div class="small muted" style="margin-bottom: 6px">
      酒头 {{ g.taps.length }} 个（设备中升级可增加）。价格影响客人满意度：高于建议价太多会被嫌贵。
      <span v-if="!g.tapTempControl">升级冷藏设备后可为每个酒头单独设置出酒温度（当前统一 4℃）。</span>
    </div>
    <div v-for="(t, i) in g.taps" :key="i" class="card tap">
      <div class="num pixel-title">{{ i + 1 }}</div>
      <div class="grow col">
        <select :value="t.batchId || ''" @change="onSelect(i, $event)">
          <option value="">— 空 —</option>
          <option v-if="batchOf(t.batchId)" :value="t.batchId">{{ batchOf(t.batchId)!.displayName }}（剩 {{ Math.round(batchOf(t.batchId)!.remaining) }}L）</option>
          <option v-for="b in available.filter((b) => b.id !== t.batchId)" :key="b.id" :value="b.id">
            {{ b.displayName }} #{{ b.number }}（{{ Math.round(b.remaining) }}L · 综合 {{ b.overall }}）{{ g.taps.some((x) => x.batchId === b.id) ? ' [已在其他酒头]' : '' }}
          </option>
        </select>
        <div v-if="batchOf(t.batchId)" class="row small">
          <Glass :srm="batchOf(t.batchId)!.color" :size="22" />
          <span>{{ batchOf(t.batchId)!.styleId ? styleById[batchOf(t.batchId)!.styleId!]?.nameZh : '未归类' }}</span>
          <span>ABV {{ batchOf(t.batchId)!.abv }}%</span>
          <span>新鲜度 {{ batchOf(t.batchId)!.freshness }}</span>
          <span :class="g.glassFor(batchOf(t.batchId)!).ok ? 'good' : 'bad'">
            {{ glassById[g.glassFor(batchOf(t.batchId)!).id]?.nameZh }}{{ g.glassFor(batchOf(t.batchId)!).ok ? '' : `（缺少${glassById[styleById[batchOf(t.batchId)!.styleId || '']?.glass || 'shaker']?.nameZh}）` }}
          </span>
        </div>
      </div>
      <div class="col small">
        <label>价格 $<input v-model.number="t.price" type="number" min="1" max="60" step="0.5" style="width: 56px" /></label>
        <span v-if="t.batchId" class="tiny muted">建议 ${{ suggest(i) }} <button class="small" @click="t.price = suggest(i)">用</button></span>
      </div>
      <div class="col small">
        <label :class="{ muted: !g.tapTempControl }">温度 <input v-model.number="t.temp" type="number" min="1" max="16" :disabled="!g.tapTempControl" style="width: 44px" />℃</label>
        <span v-if="batchOf(t.batchId)?.styleId" class="tiny muted">推荐 {{ styleById[batchOf(t.batchId)!.styleId!]?.servingTemp }}℃</span>
      </div>
      <label class="small" title="隐藏酒名，吸引爱尝鲜的客人"><input v-model="t.mystery" type="checkbox" /> 神秘酒头</label>
    </div>
    <div class="row" style="justify-content: flex-end">
      <button class="small" @click="ui.open('cellar')">🛢️ 去酒窖</button>
      <button class="small" @click="ui.open('equipment')">🔧 增加酒头</button>
    </div>
  </Win>
</template>

<style scoped>
.tap {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.num {
  font-size: 16px;
  color: var(--gold);
  width: 30px;
  text-align: center;
}
</style>

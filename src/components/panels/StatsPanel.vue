<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame, fmtMoney } from '../../stores/game'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const days = computed(() => g.reports.slice(0, 30).reverse())
const C_REV = '#c4861f'
const C_PROFIT = '#3d8fc6'
const W = 600
const H = 160
const PAD = 34
const maxV = computed(() => Math.max(50, ...days.value.map((d) => Math.max(d.revenue + d.tips, Math.abs(d.profit)))))
const minV = computed(() => Math.min(0, ...days.value.map((d) => d.profit)))
const y = (v: number) => PAD / 2 + ((maxV.value - v) / (maxV.value - minV.value)) * (H - PAD)
const bw = computed(() => Math.max(4, (W - PAD) / Math.max(1, days.value.length) / 2 - 2))
const x = (i: number) => PAD + (i * (W - PAD)) / Math.max(1, days.value.length)
const maxCups = computed(() => Math.max(5, ...days.value.map((d) => d.cups)))
const hover = ref<number | null>(null)
const showTable = ref(false)
const ticks = computed(() => [minV.value, 0, maxV.value / 2, maxV.value].filter((v, i, a) => a.indexOf(v) === i))
</script>

<template>
  <Win title="经营统计" icon="📊" wide @close="emit('close')">
    <div class="row small" style="margin-bottom: 8px">
      <span class="chip">累计卖出 {{ g.stats.cupsSold }} 杯</span>
      <span class="chip">累计收入 {{ fmtMoney(g.stats.revenue) }}</span>
      <span class="chip">接待客人 {{ g.stats.customers }}</span>
      <span class="chip">平均评分 ❤️ {{ g.avgRating.toFixed(1) }}</span>
      <span class="chip">最高评分 {{ g.stats.bestRating }}</span>
      <span class="chip">酿造 {{ g.stats.batches }} 批</span>
    </div>
    <div v-if="!days.length" class="muted">第一天打烊后就会有数据。</div>
    <template v-else>
      <h4>每日营业额与利润（$，近 30 天）</h4>
      <div class="legend small">
        <span><i :style="{ background: C_REV }" /> 营业额（含小费）</span>
        <span><i :style="{ background: C_PROFIT }" /> 利润</span>
        <button class="small ghost" style="margin-left: auto" @click="showTable = !showTable">{{ showTable ? '图表' : '表格' }}</button>
      </div>
      <svg v-if="!showTable" :viewBox="`0 0 ${W} ${H}`" class="chart" @mouseleave="hover = null">
        <line v-for="t in ticks" :key="t" :x1="PAD" :x2="W" :y1="y(t)" :y2="y(t)" stroke="#5c3a2a" stroke-width="0.5" />
        <text v-for="t in ticks" :key="'l' + t" :x="PAD - 4" :y="y(t) + 3" text-anchor="end" class="axis">{{ Math.round(t) }}</text>
        <g v-for="(d, i) in days" :key="d.day" @mouseenter="hover = i">
          <rect :x="x(i)" :y="0" :width="(W - PAD) / days.length" :height="H" fill="transparent" />
          <rect :x="x(i) + 1" :y="y(d.revenue + d.tips)" :width="bw" :height="Math.max(0, y(0) - y(d.revenue + d.tips))" :fill="C_REV" rx="2" />
          <rect :x="x(i) + bw + 3" :y="Math.min(y(d.profit), y(0))" :width="bw" :height="Math.abs(y(0) - y(d.profit))" :fill="C_PROFIT" rx="2" />
          <text v-if="days.length <= 15 || i % 5 === 0" :x="x(i) + bw" :y="H - 2" text-anchor="middle" class="axis">D{{ d.day }}</text>
        </g>
        <line :x1="PAD" :x2="W" :y1="y(0)" :y2="y(0)" stroke="#a89880" stroke-width="0.8" />
      </svg>
      <div v-if="hover !== null && days[hover] && !showTable" class="tip small">
        第 {{ days[hover].day }} 天：营业额 {{ fmtMoney(days[hover].revenue + days[hover].tips) }} · 利润 {{ fmtMoney(days[hover].profit) }} · {{ days[hover].cups }} 杯 · ❤️ {{ days[hover].avgRating }}
      </div>
      <template v-if="!showTable">
        <h4>每日卖出杯数</h4>
        <svg :viewBox="`0 0 ${W} 70`" class="chart">
          <polyline :points="days.map((d, i) => `${x(i) + bw},${64 - (d.cups / maxCups) * 56}`).join(' ')" fill="none" :stroke="C_REV" stroke-width="2" />
          <circle v-for="(d, i) in days" :key="d.day" :cx="x(i) + bw" :cy="64 - (d.cups / maxCups) * 56" r="3" :fill="C_REV"><title>第 {{ d.day }} 天 {{ d.cups }} 杯</title></circle>
          <text :x="PAD - 4" y="12" text-anchor="end" class="axis">{{ maxCups }}</text>
        </svg>
      </template>
      <table v-else>
        <tr><th>天</th><th>营业额</th><th>小费</th><th>原料</th><th>工资</th><th>房租</th><th>利润</th><th>杯数</th><th>评分</th></tr>
        <tr v-for="d in [...days].reverse()" :key="d.day">
          <td>{{ d.day }}</td><td>{{ fmtMoney(d.revenue) }}</td><td>{{ fmtMoney(d.tips) }}</td><td>{{ fmtMoney(d.ingredientCost) }}</td><td>{{ fmtMoney(d.wages) }}</td><td>{{ fmtMoney(d.rent) }}</td>
          <td :class="d.profit >= 0 ? 'good' : 'bad'">{{ fmtMoney(d.profit) }}</td><td>{{ d.cups }}</td><td>{{ d.avgRating }}</td>
        </tr>
      </table>
    </template>
  </Win>
</template>

<style scoped>
.chart {
  width: 100%;
  background: #22171a;
  box-shadow: 0 0 0 2px var(--line);
}
.axis {
  font-size: 9px;
  fill: var(--muted);
}
.legend {
  display: flex;
  gap: 14px;
  align-items: center;
}
.legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 4px;
}
.tip {
  margin-top: 4px;
  color: var(--paper);
}
</style>

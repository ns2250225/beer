<script setup lang="ts">
import { useGame, fmtMoney, WAGES, MAX_STAFF } from '../../stores/game'
import { styleById } from '../../engine/db'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
</script>

<template>
  <Win title="员工" icon="👷" @close="emit('close')">
    <div class="card">
      <h4>🍺 调酒师（{{ g.staff.bartender }}/{{ MAX_STAFF.bartender }}）</h4>
      <p class="small">你本人就是第一位调酒师。高峰期一个人接不过来，客人等太久会生气离开。每位 {{ fmtMoney(WAGES.bartender) }}/天。</p>
      <button @click="g.hire('bartender')" :disabled="g.staff.bartender >= MAX_STAFF.bartender">雇佣</button>
      <button class="danger" @click="g.fire('bartender')" :disabled="!g.staff.bartender">解雇</button>
    </div>
    <div class="card">
      <h4>👷 酿酒师（{{ g.staff.brewer }}/{{ MAX_STAFF.brewer }}）</h4>
      <p class="small">每天早上按「标准流程」自动生产下面勾选的配方（使用最大的空闲发酵罐，缺料自动采购）。每位 {{ fmtMoney(WAGES.brewer) }}/天，每人每天一批（受糖化锅产能限制）。</p>
      <button @click="g.hire('brewer')" :disabled="g.staff.brewer >= MAX_STAFF.brewer">雇佣</button>
      <button class="danger" @click="g.fire('brewer')" :disabled="!g.staff.brewer">解雇</button>
      <h4>自动生产清单</h4>
      <div v-if="!g.recipes.some((r) => r.standard)" class="small muted">还没有标准流程。亲自酿造一次（糖化 ≥ 60 分），在完成页点「保存为标准流程」。</div>
      <div v-for="r in g.recipes.filter((r) => r.standard)" :key="r.id" class="row small">
        <label class="grow"><input type="checkbox" :checked="g.autoBrew.includes(r.id)" @change="g.toggleAutoBrew(r.id)" /> {{ r.name }}</label>
        <span class="muted">{{ r.targetStyle ? styleById[r.targetStyle]?.name : '' }} · 糖化 {{ r.standard!.mashScore }}</span>
      </div>
    </div>
    <p class="small muted">每日工资合计：{{ fmtMoney(g.dailyWages) }} · 房租水电：{{ fmtMoney(g.dailyRent) }}</p>
  </Win>
</template>

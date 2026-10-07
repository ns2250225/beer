<script setup lang="ts">
import { computed } from 'vue'
import { useGame, fmtMoney } from '../../stores/game'
import { FAMILIES, npcById, questById, styleById } from '../../engine/db'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const active = computed(() => g.quests.filter((q) => q.status === 'active'))
const finished = computed(() => g.quests.filter((q) => q.status !== 'active'))
const goalText = (id: string) => {
  const q = questById[id]
  if (!q) return ''
  const target = q.goal.style ? styleById[q.goal.style]?.name : FAMILIES.find((f) => f.id === q.goal.family)?.name + ' 家族任意风格'
  return `${target} · 综合评分 ≥ ${q.goal.minOverall}${q.goal.liters ? ` · ${q.goal.liters}L` : ''}`
}
const rewardText = (id: string) => {
  const r = questById[id]?.reward
  if (!r) return ''
  return [r.money ? fmtMoney(r.money) : '', r.xp ? `${r.xp} XP` : '', r.rep ? `声望 +${r.rep}` : '', r.unlock?.length ? '神秘奖励' : ''].filter(Boolean).join(' · ')
}
</script>

<template>
  <Win title="委托 / 特殊挑战" icon="📋" @close="emit('close')">
    <p class="small muted">特殊客人会在深夜来访，带来线索、原料与委托。完成委托需要从酒窖交付符合要求的成品。</p>
    <div v-if="!active.length" class="muted">暂无进行中的委托。</div>
    <div v-for="q in active" :key="q.id" class="card col">
      <div class="row">
        <b class="gold grow">{{ questById[q.id]?.nameZh }}</b>
        <span class="small">委托人：{{ npcById[questById[q.id]?.giver]?.nameZh }}</span>
        <span class="small" :class="q.deadline - g.day <= 3 ? 'bad' : ''">剩 {{ q.deadline - g.day }} 天</span>
      </div>
      <div class="small">{{ questById[q.id]?.desc }}</div>
      <div class="small">🎯 {{ goalText(q.id) }}</div>
      <div class="small">🎁 {{ rewardText(q.id) }}</div>
      <div class="row small">
        <span class="muted">可交付：</span>
        <span v-if="!g.questCandidates(q.id).length" class="muted">（暂无符合要求的批次）</span>
        <button v-for="b in g.questCandidates(q.id)" :key="b.id" class="small primary" @click="g.deliverQuest(q.id, b.id)">交付 {{ b.displayName }} #{{ b.number }}（{{ b.overall }}）</button>
      </div>
    </div>
    <h4 v-if="finished.length">历史</h4>
    <div v-for="q in finished" :key="q.id" class="small">{{ q.status === 'done' ? '✅' : '❌' }} {{ questById[q.id]?.nameZh }}</div>
  </Win>
</template>

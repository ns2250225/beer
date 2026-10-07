<script setup lang="ts">
import { useGame, fmtMoney } from '../../stores/game'
import { DECORATIONS, archetypeById } from '../../engine/db'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const SLOT: Record<string, string> = { wall: '墙面', floor: '地面', bar: '吧台', window: '窗边', ceiling: '天花板' }
</script>

<template>
  <Win title="酒吧装修" icon="🪑" wide @close="emit('close')">
    <div class="row small" style="margin-bottom: 6px">
      <span>座位 {{ g.seatCount }}</span><span>氛围 {{ g.ambience }}</span>
      <span class="muted">部分装饰会吸引特定类型的客人。氛围提升客流。出售回收 40%。</span>
    </div>
    <div class="grid">
      <div v-for="d in DECORATIONS" :key="d.id" class="card col">
        <div class="row">
          <span class="sw" v-for="c in d.colors.slice(0, 3)" :key="c" :style="{ background: c }" />
          <b class="grow">{{ d.nameZh }}</b>
          <span class="tiny muted">{{ SLOT[d.slot] }}</span>
        </div>
        <div class="tiny">{{ d.desc }}</div>
        <div class="tiny" style="color: var(--blue)">
          <span v-if="d.seats">座位 +{{ d.seats.count }} · </span>氛围 +{{ d.ambience }}
          <span v-for="(v, k) in d.attract" :key="k"> · {{ archetypeById[k]?.nameZh ?? k }} +{{ Math.round(v * 100) }}%</span>
        </div>
        <div class="row">
          <span class="small">已有 {{ g.decorations[d.id] || 0 }}/{{ d.maxCount }}</span>
          <span class="grow" />
          <button v-if="g.decorations[d.id]" class="small danger" @click="g.sellDecoration(d.id)">出售</button>
          <button v-if="g.isUnlocked(d.unlock)" class="small" :disabled="(g.decorations[d.id] || 0) >= d.maxCount" @click="g.buyDecoration(d.id)">{{ fmtMoney(d.price) }}</button>
          <span v-else class="tiny muted">🔒 {{ g.unlockText(d.unlock) }}</span>
        </div>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.sw {
  width: 10px;
  height: 10px;
  display: inline-block;
  box-shadow: 0 0 0 1px var(--ink);
}
</style>

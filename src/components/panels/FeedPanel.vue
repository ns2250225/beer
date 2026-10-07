<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame, fmtTime } from '../../stores/game'
import Win from '../Win.vue'

const props = defineProps<{ mini?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const g = useGame()
const filter = ref<'all' | 'rating' | 'npc' | 'discovery' | 'system'>('all')
const items = computed(() => g.feed.filter((f) => filter.value === 'all' || f.kind === filter.value).slice(0, props.mini ? 60 : 250))
const heart = (s?: number) => (s === undefined ? '' : s >= 85 ? '😍' : s >= 70 ? '🙂' : s >= 50 ? '😐' : '😖')
</script>

<template>
  <div v-if="mini" class="feed scroll">
    <div class="feed-title">💬 客人反馈</div>
    <div v-for="f in items" :key="f.id" class="item" :class="f.kind">
      <template v-if="f.kind === 'rating'">
        <div><b>{{ f.who }}</b> · {{ f.beer }} <span class="score">❤️{{ f.score }}{{ heart(f.score) }}</span></div>
        <div class="said">「{{ f.text }}」</div>
        <div class="tiny muted">{{ f.detail }}</div>
      </template>
      <template v-else>
        <div><b v-if="f.who">{{ f.who }}：</b>{{ f.text }}</div>
      </template>
      <div class="tiny muted">D{{ f.day }} {{ fmtTime(f.time) }}</div>
    </div>
  </div>
  <Win v-else title="客人反馈与日志" icon="💬" @close="emit('close')">
    <div class="tabs">
      <button v-for="k in ['all', 'rating', 'npc', 'discovery', 'system'] as const" :key="k" :class="{ active: filter === k }" @click="filter = k">{{ { all: '全部', rating: '评价', npc: '特殊客人', discovery: '发现', system: '系统' }[k] }}</button>
    </div>
    <div v-for="f in items" :key="f.id" class="item">
      <span class="tiny muted">D{{ f.day }} {{ fmtTime(f.time) }}</span>
      <template v-if="f.kind === 'rating'"> <b>{{ f.who }}</b> · {{ f.beer }} ❤️{{ f.score }} 「{{ f.text }}」 <span class="tiny muted">{{ f.detail }}</span></template>
      <template v-else> <b v-if="f.who">{{ f.who }}：</b>{{ f.text }}</template>
    </div>
  </Win>
</template>

<style scoped>
.feed {
  background: var(--panel);
  padding: 6px;
  font-size: 13.5px;
  height: 100%;
}
.feed-title {
  color: var(--gold);
  margin-bottom: 4px;
}
.item {
  padding: 4px 2px;
  border-bottom: 1px solid var(--line);
  font-size: 13.5px;
}
.item.discovery {
  color: var(--gold);
}
.item.npc {
  color: var(--blue);
}
.item.system {
  color: var(--muted);
}
.said {
  color: var(--paper);
}
.score {
  color: var(--gold);
}
</style>

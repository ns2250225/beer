<script setup lang="ts">
import { useGame } from '../../stores/game'
import { ACHIEVEMENTS } from '../../engine/db'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
</script>

<template>
  <Win title="成就" icon="🏆" @close="emit('close')">
    <div class="small" style="margin-bottom: 6px">已解锁 {{ g.achievements.length }} / {{ ACHIEVEMENTS.length }}</div>
    <div class="grid">
      <div v-for="a in ACHIEVEMENTS" :key="a.id" class="card ach" :class="{ on: g.achievements.includes(a.id) }">
        <span class="icon">{{ g.achievements.includes(a.id) ? a.icon : '🔒' }}</span>
        <div>
          <div :class="{ gold: g.achievements.includes(a.id) }">{{ a.nameZh }}</div>
          <div class="tiny muted">{{ a.desc }}</div>
        </div>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 6px;
}
.ach {
  display: flex;
  gap: 8px;
  align-items: center;
  opacity: 0.55;
}
.ach.on {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--gold);
}
.icon {
  font-size: 22px;
}
</style>

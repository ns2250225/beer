<script setup lang="ts">
defineProps<{ title: string; wide?: boolean; icon?: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="win-backdrop" @mousedown.self="emit('close')">
    <div class="win" :class="{ wide }">
      <div class="win-title">
        <span>{{ icon }} {{ title }}</span>
        <div class="win-actions"><slot name="actions" /></div>
        <button class="small" @click="emit('close')">✕</button>
      </div>
      <div class="win-body scroll"><slot /></div>
    </div>
  </div>
</template>

<style scoped>
.win-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(10, 6, 8, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}
.win {
  width: min(880px, 96%);
  max-height: 94%;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  box-shadow:
    0 0 0 2px var(--ink),
    0 0 0 4px var(--wood-l),
    0 0 0 6px var(--ink),
    8px 8px 0 6px rgba(0, 0, 0, 0.4);
}
.win.wide {
  width: min(1180px, 97%);
}
.win-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--wood);
  color: var(--gold);
  font-size: 15px;
  border-bottom: 2px solid var(--ink);
}
.win-title > span {
  flex: 1;
}
.win-actions {
  display: flex;
  gap: 4px;
}
.win-body {
  padding: 10px;
  flex: 1;
  min-height: 0;
}
</style>

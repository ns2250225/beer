<script setup lang="ts">
import { FLAVOR_DIMS, FLAVOR_DIM_ZH, type FlavorDim, type FlavorProfile } from '../types'
const props = defineProps<{ profile: FlavorProfile; target?: Partial<Record<FlavorDim, number>>; dims?: FlavorDim[]; hideZero?: boolean }>()
const list = () =>
  (props.dims || [...FLAVOR_DIMS]).filter((d) => !props.hideZero || props.profile[d] > 0.05 || (props.target?.[d] ?? 0) > 0.05)
</script>

<template>
  <div class="bars">
    <div v-for="d in list()" :key="d" class="bar-row">
      <span class="name">{{ FLAVOR_DIM_ZH[d] }}</span>
      <div class="track">
        <div class="fill" :style="{ width: (profile[d] / 5) * 100 + '%' }" />
        <div
          v-if="target && target[d] !== undefined"
          class="target"
          :style="{ left: `calc(${((target[d] as number) / 5) * 100}% - 1px)` }"
          :class="{ off: Math.abs(profile[d] - (target[d] as number)) > 0.75 }"
        />
      </div>
      <span class="val">{{ profile[d].toFixed(1) }}</span>
    </div>
  </div>
</template>

<style scoped>
.bars {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 14px;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
}
.name {
  width: 44px;
  color: var(--muted);
}
.track {
  flex: 1;
  height: 8px;
  background: #1a1210;
  box-shadow: 0 0 0 1px var(--line);
  position: relative;
}
.fill {
  height: 100%;
  background: repeating-linear-gradient(90deg, var(--amber) 0 6px, #c88a2a 6px 8px);
}
.target {
  position: absolute;
  top: -3px;
  width: 3px;
  height: 14px;
  background: var(--green);
}
.target.off {
  background: var(--red);
}
.val {
  width: 26px;
  text-align: right;
}
</style>

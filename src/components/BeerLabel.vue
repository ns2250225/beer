<script setup lang="ts">
import { computed } from 'vue'
import type { LabelConfig } from '../types'
const props = defineProps<{ label?: LabelConfig; name: string; sub?: string; size?: number }>()
const L = computed<LabelConfig>(
  () => props.label || { bg: '#3a2416', fg: '#ffd36e', pattern: 'none', logo: 'hop', font: 'pixel', border: 'single', icon: '🍺' },
)
const font = computed(() => ({ pixel: "'Press Start 2P', 'DotGothic16'", serif: 'Georgia, serif', bold: 'Impact, sans-serif', round: "'PingFang SC', 'Microsoft YaHei', sans-serif" })[L.value.font])
const logoPixels: Record<string, string[]> = {
  hop: ['..XX..', '.XXXX.', 'XXXXXX', '.XXXX.', '..XX..', '..X...'],
  cat: ['X....X', 'XX..XX', 'XXXXXX', 'X.XX.X', 'XXXXXX', '.XXXX.'],
  star: ['..X...', '..X...', 'XXXXX.', '.XXX..', '.X.X..', 'X...X.'],
  moon: ['.XXX..', 'XX....', 'X.....', 'X.....', 'XX....', '.XXX..'],
  skull: ['.XXXX.', 'XXXXXX', 'X.XX.X', 'XXXXXX', '.X.X..', '.XXXX.'],
  wheat: ['..X...', '.XXX..', '..X...', '.XXX..', '..X...', '..X...'],
  barrel: ['.XXXX.', 'XXXXXX', 'X....X', 'XXXXXX', 'X....X', '.XXXX.'],
  planet: ['..XX..', '.XXXX.', 'XXXXXX', 'XXXXXX', '.XXXX.', '..XX..'],
  crown: ['X.X.X.', 'XXXXX.', 'XXXXX.', 'X.X.X.', 'XXXXX.', '......'],
  wave: ['......', '.XX...', 'X..X.X', '....X.', '.XX...', 'X..XXX'],
  mountain: ['......', '..X...', '.XXX..', 'XXXXX.', 'XXXXXX', 'XXXXXX'],
  rocket: ['..X...', '.XXX..', '.XXX..', '.XXX..', 'XXXXX.', 'X.X.X.'],
}
const pix = computed(() => logoPixels[L.value.logo] || logoPixels.hop)
const s = computed(() => props.size || 120)
</script>

<template>
  <svg :width="s" :height="s * 1.3" viewBox="0 0 100 130" class="label" shape-rendering="crispEdges">
    <defs>
      <pattern id="p-stripes" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" :fill="L.fg" opacity="0.15" /></pattern>
      <pattern id="p-dots" width="10" height="10" patternUnits="userSpaceOnUse"><rect x="4" y="4" width="2" height="2" :fill="L.fg" opacity="0.3" /></pattern>
      <pattern id="p-checker" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" :fill="L.fg" opacity="0.12" /><rect x="6" y="6" width="6" height="6" :fill="L.fg" opacity="0.12" /></pattern>
      <pattern id="p-waves" width="20" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 Q5 0 10 4 T20 4" :stroke="L.fg" stroke-opacity="0.25" fill="none" /></pattern>
      <pattern id="p-stars" width="16" height="16" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="2" height="2" :fill="L.fg" opacity="0.5" /><rect x="11" y="10" width="1" height="1" :fill="L.fg" opacity="0.6" /></pattern>
      <pattern id="p-diagonal" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 L8 0" :stroke="L.fg" stroke-opacity="0.2" /></pattern>
      <pattern id="p-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0 L0 0 0 10" :stroke="L.fg" stroke-opacity="0.15" fill="none" /></pattern>
    </defs>
    <rect width="100" height="130" :fill="L.bg" />
    <rect v-if="L.pattern !== 'none'" width="100" height="130" :fill="`url(#p-${L.pattern})`" />
    <rect v-if="L.border !== 'none'" x="4" y="4" width="92" height="122" fill="none" :stroke="L.fg" stroke-width="2" :stroke-dasharray="L.border === 'dashed' ? '4 3' : undefined" />
    <rect v-if="L.border === 'double' || L.border === 'ornate'" x="8" y="8" width="84" height="114" fill="none" :stroke="L.fg" stroke-width="1" />
    <template v-if="L.border === 'ornate'">
      <rect v-for="c in [[2, 2], [92, 2], [2, 122], [92, 122]]" :key="c.join()" :x="c[0]" :y="c[1]" width="6" height="6" :fill="L.fg" />
    </template>
    <g transform="translate(32 16)">
      <template v-for="(row, y) in pix" :key="y">
        <rect v-for="(ch, x) in row.split('')" v-show="ch === 'X'" :key="x" :x="x * 6" :y="y * 6" width="6" height="6" :fill="L.fg" />
      </template>
    </g>
    <text x="50" y="74" text-anchor="middle" :fill="L.fg" :font-family="font" font-size="9" style="font-weight: bold">{{ name.length > 14 ? name.slice(0, 14) + '…' : name }}</text>
    <text v-if="sub" x="50" y="88" text-anchor="middle" :fill="L.fg" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="7" opacity="0.85">{{ sub }}</text>
    <text x="50" y="114" text-anchor="middle" font-size="16">{{ L.icon }}</text>
  </svg>
</template>

<style scoped>
.label {
  box-shadow: 0 0 0 2px var(--ink);
  image-rendering: pixelated;
}
</style>

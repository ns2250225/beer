<script setup lang="ts">
import { srmCss } from '../ui/format'
defineProps<{ srm: number; size?: number; haze?: number }>()
</script>
<template>
  <svg :width="(size || 20) * 0.8" :height="size || 20" viewBox="0 0 8 10" shape-rendering="crispEdges" style="vertical-align: middle">
    <rect x="1" y="2" width="6" height="8" fill="#ffffff22" />
    <rect x="1" y="3" width="6" height="7" :fill="srmCss(srm)" :opacity="haze && haze > 2 ? 0.85 : 1" />
    <rect x="1" y="1" width="6" height="2" fill="#fff8e8" />
    <rect x="0" y="1" width="1" height="9" fill="#2a1810" />
    <rect x="7" y="1" width="1" height="9" fill="#2a1810" />
    <rect x="0" y="9" width="8" height="1" fill="#2a1810" />
  </svg>
</template>

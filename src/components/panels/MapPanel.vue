<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame, fmtMoney } from '../../stores/game'
import { ADJUNCTS, COUNTRIES, HOPS, MALTS, STYLES, YEASTS, countryById, npcById } from '../../engine/db'
import type { RegionId } from '../../types'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const sel = ref<RegionId>('usa')

// 粗略的陆地轮廓：每 5° 纬度一行，给出经度区间（等距圆柱投影 75°N ~ 55°S）
const LAND: [number, number[][]][] = [
  [72.5, [[-120, -75], [-55, -20], [55, 140]]],
  [67.5, [[-165, -60], [-52, -25], [15, 180]]],
  [62.5, [[-165, -65], [-50, -40], [5, 175]]],
  [57.5, [[-160, -60], [-6, -2], [6, 18], [25, 160]]],
  [52.5, [[-130, -57], [-10, 0], [0, 140]]],
  [47.5, [[-125, -53], [-5, 140]]],
  [42.5, [[-124, -70], [-9, 3], [5, 45], [50, 132], [140, 145]]],
  [37.5, [[-122, -76], [-9, 0], [12, 16], [20, 28], [26, 128], [133, 141]]],
  [32.5, [[-117, -80], [-8, 32], [35, 122], [130, 135]]],
  [27.5, [[-112, -97], [-82, -80], [-13, 34], [36, 120]]],
  [22.5, [[-105, -97], [-84, -75], [-16, 38], [40, 58], [68, 120]]],
  [17.5, [[-100, -88], [-77, -65], [-16, 40], [42, 55], [73, 85], [95, 110]]],
  [12.5, [[-90, -83], [-17, 45], [75, 80], [98, 108]]],
  [7.5, [[-77, -60], [-12, 48], [100, 103], [118, 126]]],
  [2.5, [[-80, -50], [9, 42], [100, 118]]],
  [-2.5, [[-80, -40], [9, 40], [102, 140]]],
  [-7.5, [[-79, -35], [12, 40], [105, 150]]],
  [-12.5, [[-77, -38], [13, 40], [44, 50], [130, 136]]],
  [-17.5, [[-72, -39], [12, 38], [44, 50], [122, 146]]],
  [-22.5, [[-70, -41], [14, 35], [114, 150]]],
  [-27.5, [[-71, -48], [15, 32], [114, 153]]],
  [-32.5, [[-71, -53], [18, 28], [116, 152]]],
  [-37.5, [[-73, -57], [140, 150], [174, 178]]],
  [-42.5, [[-74, -63], [145, 148], [170, 174]]],
  [-47.5, [[-75, -66], [167, 170]]],
  [-52.5, [[-74, -68]]],
]
const cells = computed(() => {
  const out: { x: number; y: number }[] = []
  for (const [lat, ranges] of LAND) {
    const y = ((75 - lat - 2.5) / 130) * 100
    for (const [a, b] of ranges) for (let lon = Math.ceil(a / 3) * 3; lon <= b; lon += 3) out.push({ x: ((lon + 180) / 360) * 200, y: y * 0.65 })
  }
  return out
})
const c = computed(() => countryById[sel.value])
const unlocked = (id: RegionId) => g.hasRegion(id)
const stylesOf = (id: RegionId) => STYLES.filter((s) => s.country[0] === id)
const ingredientsOf = (id: RegionId) => [...MALTS, ...HOPS, ...YEASTS, ...ADJUNCTS].filter((x) => x.unlock === `region:${id}`)
</script>

<template>
  <Win title="世界地图" icon="🌍" wide @close="emit('close')">
    <div class="map-wrap">
      <svg viewBox="0 0 200 65" class="map" shape-rendering="crispEdges">
        <rect width="200" height="65" fill="#1b3a5a" />
        <rect v-for="(p, i) in cells" :key="i" :x="p.x" :y="p.y" width="1.7" height="2.6" fill="#4f7a3a" />
        <g v-for="ct in COUNTRIES" :key="ct.id" class="marker" @click="sel = ct.id">
          <rect :x="ct.x * 2 - 2" :y="ct.y * 0.65 - 2" width="4" height="4" :fill="unlocked(ct.id) ? '#ffd36e' : g.repLevel >= ct.minRep ? '#ff9a3a' : '#666'" stroke="#2a1810" stroke-width="0.6" :class="{ pulse: !unlocked(ct.id) && g.repLevel >= ct.minRep }" />
          <rect v-if="sel === ct.id" :x="ct.x * 2 - 3.5" :y="ct.y * 0.65 - 3.5" width="7" height="7" fill="none" stroke="#fff" stroke-width="0.6" />
        </g>
      </svg>
      <div v-if="c" class="card detail">
        <h3>{{ c.flag }} {{ c.nameZh }}</h3>
        <p class="small">{{ c.desc }}</p>
        <div class="small">
          <div>风格：{{ stylesOf(c.id).length }} 种（{{ stylesOf(c.id).filter((s) => g.styleStatus(s.id) >= 3).length }} 已酿造）</div>
          <div v-if="ingredientsOf(c.id).length">原料：{{ ingredientsOf(c.id).map((x) => x.name).join('、') }}</div>
          <div v-if="c.npc && npcById[c.npc]">NPC：⭐ {{ npcById[c.npc].nameZh }}</div>
        </div>
        <div v-if="unlocked(c.id)" class="good">✔ 已开通贸易路线{{ g.settings.godMode && !g.regions.includes(c.id) ? '（上帝模式）' : '' }}</div>
        <div v-else class="col">
          <div class="small">需要声望 Lv.{{ c.minRep }} · 费用 {{ fmtMoney(c.cost) }}</div>
          <button class="primary" :disabled="!g.canUnlockRegion(c.id)" @click="g.unlockRegion(c.id)">开通贸易路线</button>
        </div>
      </div>
    </div>
    <div class="row small" style="margin-top: 6px">
      <span v-for="ct in COUNTRIES" :key="ct.id" class="chip" :class="{ gold: unlocked(ct.id) }" style="cursor: pointer" @click="sel = ct.id">{{ ct.flag }} {{ ct.nameZh }}</span>
    </div>
    <p class="tiny muted">地区不是让你离开酒吧旅行，而是解锁当地的原料、风格知识与 NPC。</p>
  </Win>
</template>

<style scoped>
.map-wrap {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.map {
  flex: 1;
  width: 100%;
  box-shadow: 0 0 0 2px var(--ink);
  image-rendering: pixelated;
}
.marker {
  cursor: pointer;
}
.pulse {
  animation: pulse 1s infinite alternate;
}
@keyframes pulse {
  to {
    opacity: 0.4;
  }
}
.detail {
  width: 280px;
}
@media (max-width: 900px) {
  .map-wrap {
    flex-direction: column;
  }
  .detail {
    width: 100%;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../../stores/game'
import { ADJUNCTS, HOPS, MALTS, RESEARCH, YEASTS, BARRELS, researchById } from '../../engine/db'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const BRANCH_ZH: Record<string, string> = {
  malt: '🌾 麦芽',
  hop: '🌿 酒花',
  yeast: '🦠 酵母',
  water: '💧 水质',
  fermentation: '🫧 发酵',
  lager: '🍺 拉格',
  ipa: '🌲 IPA',
  belgian: '⛪ 比利时',
  sour: '🍋 酸啤',
  wild: '🦠 野生发酵',
  barrel: '🪵 木桶陈酿',
  history: '📜 古法',
}
const branches = computed(() => {
  const m = new Map<string, typeof RESEARCH>()
  for (const n of RESEARCH) {
    if (!m.has(n.branch)) m.set(n.branch, [])
    m.get(n.branch)!.push(n)
  }
  return [...m.entries()]
})
const unlocksOf = (id: string) =>
  [...MALTS, ...HOPS, ...YEASTS, ...ADJUNCTS, ...BARRELS].filter((x) => x.unlock === `research:${id}`).map((x) => x.nameZh || x.name)
</script>

<template>
  <Win title="BREWING TECH TREE · 研究" icon="🔬" wide @close="emit('close')">
    <div class="row" style="margin-bottom: 8px">
      <span>可用 Brewing XP：<b class="gold">{{ g.settings.godMode ? '∞（上帝模式：全部研究已解锁）' : Math.floor(g.xp) }}</b></span>
      <span class="small muted">酿造、发现新风格、卖出好评啤酒都会获得 XP。已完成 {{ g.research.length }}/{{ RESEARCH.length }}</span>
    </div>
    <div class="tree">
      <div v-for="[b, nodes] in branches" :key="b" class="branch">
        <h4>{{ BRANCH_ZH[b] ?? b }}</h4>
        <div v-for="n in nodes" :key="n.id" class="node" :class="{ done: g.hasResearch(n.id), avail: g.canResearch(n.id) }">
          <div class="row">
            <b class="grow">{{ n.nameZh }}</b>
            <span v-if="g.hasResearch(n.id)" class="good">✔</span>
            <button v-else class="small" :disabled="!g.canResearch(n.id)" @click="g.doResearch(n.id)">{{ n.cost }} XP</button>
          </div>
          <div class="tiny">{{ n.desc }}</div>
          <div v-if="n.requires.length" class="tiny muted">前置：{{ n.requires.map((r) => researchById[r]?.nameZh).join('、') }}</div>
          <div v-if="unlocksOf(n.id).length" class="tiny" style="color: var(--blue)">解锁：{{ unlocksOf(n.id).join('、') }}</div>
        </div>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.tree {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 10px;
}
.branch {
  background: var(--panel-2);
  padding: 6px;
  box-shadow: 0 0 0 2px var(--line);
}
.node {
  padding: 5px;
  margin: 4px 0;
  background: #1e1616;
  box-shadow: 0 0 0 1px var(--line);
  opacity: 0.65;
}
.node.avail {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--gold);
}
.node.done {
  opacity: 1;
  box-shadow: 0 0 0 2px var(--green);
}
</style>

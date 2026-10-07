<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGame } from './stores/game'
import GameView from './components/GameView.vue'
import { STYLES, DB_VERSION } from './engine/db'
import { startMusic, setVolumes } from './engine/audio'

const g = useGame()
const saves = ref<{ slot: string; meta: any }[]>([])
const barName = ref('像素精酿酒吧')
const showNew = ref(false)

onMounted(async () => {
  saves.value = await g.listSaves()
})

function begin() {
  setVolumes(g.settings.sfx, g.settings.music)
  startMusic()
}
function newGame() {
  g.newGame(barName.value.trim() || '像素精酿酒吧')
  begin()
}
async function load(slot: string) {
  if (await g.load(slot)) begin()
}
const fmtDate = (t: number) => new Date(t).toLocaleString()
</script>

<template>
  <GameView v-if="g.started" />
  <div v-else class="title">
    <div class="title-box">
      <div class="logo pixel-title">PIXEL CRAFT<br />BREWERY</div>
      <div class="sub">像 素 精 酿 酒 吧</div>
      <p class="muted small">“世界上的啤酒远比你想象得复杂。” —— 《世界精酿图鉴》第一页</p>
      <div v-if="!showNew" class="col" style="align-items: center">
        <button class="primary" @click="showNew = true">▶ 新的酒吧</button>
        <template v-for="s in saves" :key="s.slot">
          <button v-if="s.meta" @click="load(s.slot)">
            {{ s.slot === 'auto' ? '继续（自动存档）' : `读取存档 ${s.slot}` }} · {{ s.meta.barName }} · 第 {{ s.meta.day }} 天 · 图鉴 {{ s.meta.discovered }}
            <span class="tiny muted">{{ fmtDate(s.meta.savedAt) }}</span>
          </button>
        </template>
      </div>
      <div v-else class="col" style="align-items: center">
        <label>给你的酒吧起个名字：<input v-model="barName" maxlength="18" /></label>
        <div class="row">
          <button class="primary" @click="newGame">开张！</button>
          <button class="ghost" @click="showNew = false">返回</button>
        </div>
      </div>
      <p class="tiny muted">Beer DB Version {{ DB_VERSION }} · {{ STYLES.length }} 种风格 · 单机离线游戏，存档保存在浏览器 IndexedDB</p>
    </div>
  </div>
</template>

<style scoped>
.title {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    repeating-linear-gradient(0deg, #3a2218 0 6px, #331d15 6px 7px),
    #3a2218;
}
.title-box {
  text-align: center;
  padding: 28px 40px;
  background: var(--panel);
  box-shadow:
    0 0 0 3px var(--ink),
    0 0 0 6px var(--wood-l),
    0 0 0 9px var(--ink);
  max-width: 640px;
}
.logo {
  font-size: 30px;
  line-height: 1.4;
  color: var(--gold);
  text-shadow:
    4px 4px 0 #8b3a1a,
    0 0 20px rgba(255, 200, 80, 0.3);
}
.sub {
  margin: 8px 0 14px;
  font-size: 20px;
  letter-spacing: 6px;
  color: var(--amber);
}
</style>

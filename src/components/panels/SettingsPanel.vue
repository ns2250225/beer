<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useGame } from '../../stores/game'
import { useUi } from '../../stores/ui'
import { setVolumes, startMusic } from '../../engine/audio'
import { DB_VERSION, STYLES } from '../../engine/db'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const ui = useUi()
const saves = ref<{ slot: string; meta: any }[]>([])
const refresh = async () => (saves.value = await g.listSaves())
onMounted(refresh)
watch(
  () => [g.settings.sfx, g.settings.music],
  () => {
    setVolumes(g.settings.sfx, g.settings.music)
    if (g.settings.music > 0) startMusic()
  },
)
async function save(slot: string) {
  await g.save(slot)
  ui.toast(`已保存到${slot === 'auto' ? '自动存档' : '存档 ' + slot}`, '💾', 'good')
  refresh()
}
async function load(slot: string) {
  if (await g.load(slot)) {
    ui.toast('读档成功', '📂', 'good')
    emit('close')
  }
}
function exportSave() {
  const blob = new Blob([g.serialize()], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `pixel-brewery-day${g.day}.json`
  a.click()
}
function importSave(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  f.text().then((t) => {
    try {
      g.loadState(JSON.parse(t))
      ui.toast('导入成功', '📂', 'good')
      emit('close')
    } catch {
      ui.toast('存档文件无效', '⚠️', 'bad')
    }
  })
}
function quit() {
  ui.push({
    kind: 'confirm',
    text: '回到标题画面？未保存的进度会丢失（每天开始时会自动存档）。',
    onYes: () => {
      ui.close()
      g.started = false
    },
  })
}
</script>

<template>
  <Win title="设置与存档" icon="⚙️" @close="emit('close')">
    <h4>声音</h4>
    <div class="row small">音效 <input v-model.number="g.settings.sfx" type="range" min="0" max="1" step="0.05" /> 音乐 <input v-model.number="g.settings.music" type="range" min="0" max="1" step="0.05" /></div>
    <h4>游戏</h4>
    <label class="small"><input v-model="g.settings.autoPause" type="checkbox" /> 打开面板时自动暂停时间</label><br />
    <label class="small"><input v-model="g.settings.showBubbles" type="checkbox" /> 显示客人对话气泡</label><br />
    <label class="small god"><input v-model="g.settings.godMode" type="checkbox" /> 👑 上帝模式：金钱、原料、XP 无限，所有内容全部解锁</label>
    <div v-if="g.settings.godMode" class="tiny muted" style="margin-left: 22px">开启期间：购买不花钱、酿造不消耗原料、不扣房租工资、不会破产；全部研究与特殊工艺生效；所有地区开通；所有设备、装修、酒杯不受声望限制；所有特殊客人可来访；所有风格可直接鉴定；酿造面板「⚡ 一键酿造完成」、酒窖「⚡ 立即完成」可瞬间完成发酵与木桶陈酿，且不限每日酿造批数；图鉴与实验室可查看全部风格资料。图鉴收集进度仍需亲手酿造获得。关闭后恢复为真实进度。</div>
    <label class="small">酒吧名称 <input v-model="g.barName" maxlength="18" /></label>
    <h4>存档（IndexedDB）</h4>
    <div v-for="s in saves" :key="s.slot" class="row small">
      <span class="grow">{{ s.slot === 'auto' ? '自动存档' : '存档 ' + s.slot }}：{{ s.meta ? `第 ${s.meta.day} 天 · 图鉴 ${s.meta.discovered} · ${new Date(s.meta.savedAt).toLocaleString()}` : '空' }}</span>
      <button v-if="s.slot !== 'auto'" class="small" @click="save(s.slot)">保存</button>
      <button class="small" :disabled="!s.meta" @click="load(s.slot)">读取</button>
    </div>
    <div class="row small">
      <button class="small" @click="exportSave">导出存档文件</button>
      <label class="small">导入 <input type="file" accept=".json" @change="importSave" /></label>
    </div>
    <h4>关于</h4>
    <p class="tiny muted">《像素精酿酒吧 / Pixel Craft Brewery》 · Beer DB Version {{ DB_VERSION }}（{{ STYLES.length }} 种风格）· 游戏时间：现实 1 秒 = 游戏 10 分钟。</p>
    <button class="danger small" @click="quit">回到标题画面</button>
  </Win>
</template>

<style scoped>
.god {
  color: var(--gold);
}
</style>

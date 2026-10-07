<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useGame } from '../stores/game'
import { useUi } from '../stores/ui'

const g = useGame()
const ui = useUi()

const STEPS: { lines: string[]; hint?: string; target?: string }[] = [
  {
    lines: ['老酿酒师：', '“先别想着什么帝国世涛。”', '“我们先做一杯 Pale Ale。”'],
  },
  {
    lines: ['“去实验室写一张配方：', 'Pale Malt 做骨架，Cascade 给香气，再来一包 Ale Yeast。”'],
    hint: '打开 🧪实验室 → 点「老酿酒师的配方」→ 保存',
    target: 'lab',
  },
  {
    lines: ['“配方有了，开火！糖化温度要稳在 64~68℃ 之间。”'],
    hint: '打开 ♨️酿造 → 选择配方 → 开始酿造，完成糖化小游戏',
    target: 'brew',
  },
  {
    lines: ['“发酵通常要 10 天。这次……我用了点老手艺，已经好了。”', '“尝尝看，然后把它装进酒桶。”'],
    hint: '打开 🛢️酒窖 → 对完成的批次点「装桶」',
    target: 'cellar',
  },
  {
    lines: ['“接上酒头，定个价。别太贵，咱们还是无名小店。”'],
    hint: '打开 🚰酒头 → 选择刚装桶的啤酒',
    target: 'taps',
  },
  {
    lines: ['“开门吧！16:00 是下午的第一波客人。”'],
    hint: '点击顶部的 🔔开门营业',
    target: 'open',
  },
  { lines: ['“有人进来了……”'], hint: '等待客人点单' },
  { lines: ['“看，他点了我们的酒。”'], hint: '调酒师正在接酒……' },
  {
    lines: ['客人：“还不错。” ★★★★☆', '老酿酒师：“看到了吗？这就是开始。”', '“世界上的啤酒远比你想象得复杂。去把它们都酿出来吧。”'],
  },
]

const step = computed(() => STEPS[Math.min(g.tutorial.step, STEPS.length - 1)])

watchEffect(() => {
  // 每次都读取全部条件，保证依赖完整
  const conds = [
    true,
    g.recipes.length > 0,
    g.batches.length > 0,
    g.batches.some((b) => b.stage === 'packaged'),
    g.taps.some((t) => t.batchId),
    g.isOpen,
    true,
  ]
  if (g.tutorial.done) return
  let s = g.tutorial.step
  while (s >= 1 && s <= 6 && conds[s]) s++
  if (s !== g.tutorial.step) g.tutorial.step = s
  ui.highlight = STEPS[Math.min(s, STEPS.length - 1)].target ?? null
})

function nextStep() {
  if (g.tutorial.step === 0) g.tutorial.step = 1
  else if (g.tutorial.step >= 8) finish()
}
function finish() {
  g.tutorial.done = true
  ui.highlight = null
  ui.toast('教程完成！正式开始自由经营', '🎉', 'gold')
  g.log({ kind: 'system', text: '🎉 教程完成。去研究、酿造、收集全世界的啤酒吧！' })
}
</script>

<template>
  <div class="tut" :class="{ center: g.tutorial.step === 0 || g.tutorial.step >= 8 }">
    <div class="portrait">
      <svg viewBox="0 0 12 14" width="54" height="63" shape-rendering="crispEdges">
        <rect x="2" y="1" width="8" height="2" fill="#5c351c" />
        <rect x="1" y="3" width="10" height="1" fill="#5c351c" />
        <rect x="3" y="4" width="6" height="5" fill="#eac39b" />
        <rect x="4" y="6" width="1" height="1" fill="#1a1010" />
        <rect x="7" y="6" width="1" height="1" fill="#1a1010" />
        <rect x="3" y="8" width="6" height="2" fill="#e8e0d0" />
        <rect x="2" y="10" width="8" height="4" fill="#6b4f3a" />
        <rect x="5" y="10" width="2" height="4" fill="#3a2416" />
      </svg>
    </div>
    <div class="col grow">
      <div v-for="(l, i) in step.lines" :key="i">{{ l }}</div>
      <div v-if="step.hint" class="hint">👉 {{ step.hint }}</div>
      <div class="row" style="justify-content: flex-end">
        <button v-if="g.tutorial.step === 0 || g.tutorial.step >= 8" class="primary small" @click="nextStep">{{ g.tutorial.step >= 8 ? '开始自由经营' : '好的' }}</button>
        <button class="ghost small" @click="finish">跳过教程</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tut {
  position: absolute;
  left: 12px;
  bottom: 86px;
  width: min(440px, 90%);
  display: flex;
  gap: 10px;
  background: var(--paper);
  color: var(--ink);
  padding: 10px;
  box-shadow:
    0 0 0 2px var(--ink),
    0 0 0 4px var(--gold),
    0 0 0 6px var(--ink);
  z-index: 30;
  font-size: 14px;
}
.tut.center {
  left: 50%;
  top: 50%;
  bottom: auto;
  transform: translate(-50%, -50%);
  z-index: 45;
}
.portrait {
  background: #3a2416;
  padding: 4px;
  height: fit-content;
  box-shadow: 0 0 0 2px var(--ink);
}
.tut :deep(button.ghost) {
  color: var(--ink);
  box-shadow: 0 0 0 2px var(--ink);
}
.hint {
  margin-top: 4px;
  color: #8b3a1a;
  font-size: 14px;
}
</style>

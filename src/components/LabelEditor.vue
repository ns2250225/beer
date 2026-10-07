<script setup lang="ts">
import type { LabelConfig } from '../types'
import BeerLabel from './BeerLabel.vue'
import { ICONS, LOGOS, randomLabel } from '../ui/format'

const model = defineModel<LabelConfig>({ required: true })
defineProps<{ name: string }>()
const COLORS = ['#1f3a5f', '#7a2e3a', '#2f6b3a', '#3a2416', '#5a2a6a', '#e8a73a', '#0f1a2a', '#d9534f', '#20b2aa', '#f3e2c0', '#ffd36e', '#ffffff', '#1a1210', '#ff7fb0', '#7dff9a', '#6fc3ff']
const set = <K extends keyof LabelConfig>(k: K, v: LabelConfig[K]) => (model.value = { ...model.value, [k]: v })
</script>

<template>
  <div class="label-editor card row" style="align-items: flex-start">
    <BeerLabel :label="model" :name="name" :size="100" />
    <div class="col grow small">
      <div class="row">背景 <span v-for="c in COLORS" :key="c" class="sw" :class="{ on: model.bg === c }" :style="{ background: c }" @click="set('bg', c)" /></div>
      <div class="row">文字 <span v-for="c in COLORS" :key="c" class="sw" :class="{ on: model.fg === c }" :style="{ background: c }" @click="set('fg', c)" /></div>
      <div class="row">
        图案
        <select :value="model.pattern" @change="set('pattern', ($event.target as any).value)">
          <option v-for="p in ['none', 'stripes', 'dots', 'checker', 'waves', 'stars', 'diagonal', 'grid']" :key="p">{{ p }}</option>
        </select>
        Logo
        <select :value="model.logo" @change="set('logo', ($event.target as any).value)">
          <option v-for="p in LOGOS" :key="p">{{ p }}</option>
        </select>
        字体
        <select :value="model.font" @change="set('font', ($event.target as any).value)">
          <option v-for="p in ['pixel', 'serif', 'bold', 'round']" :key="p">{{ p }}</option>
        </select>
        边框
        <select :value="model.border" @change="set('border', ($event.target as any).value)">
          <option v-for="p in ['none', 'single', 'double', 'dashed', 'ornate']" :key="p">{{ p }}</option>
        </select>
      </div>
      <div class="row">图标 <span v-for="i in ICONS" :key="i" class="ic" :class="{ on: model.icon === i }" @click="set('icon', i)">{{ i }}</span></div>
      <div><button class="small" @click="model = randomLabel()">🎲 随机生成</button></div>
    </div>
  </div>
</template>

<style scoped>
.sw {
  width: 14px;
  height: 14px;
  display: inline-block;
  box-shadow: 0 0 0 1px var(--ink);
  cursor: pointer;
}
.sw.on,
.ic.on {
  box-shadow: 0 0 0 2px var(--gold);
}
.ic {
  cursor: pointer;
  padding: 1px;
}
</style>

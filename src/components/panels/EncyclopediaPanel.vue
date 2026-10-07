<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame, STATUS_NAMES } from '../../stores/game'
import { useUi } from '../../stores/ui'
import { DB_VERSION, FAMILIES, STYLES, aromaById, countryById, glassById, hopById, ingredientName, stylesInFamily, styleById } from '../../engine/db'
import type { BeerStyle, FamilyId } from '../../types'
import Win from '../Win.vue'
import BeerLabel from '../BeerLabel.vue'
import { STATUS_COLORS, dots, srmCss } from '../../ui/format'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const ui = useUi()
type Tab = 'home' | 'family' | 'mine'
const tab = ref<Tab>(ui.encyclopediaStyle ? 'family' : 'home')
const family = ref<FamilyId>(ui.encyclopediaStyle ? styleById[ui.encyclopediaStyle]?.family ?? 'lager' : 'lager')
const selected = ref<string | null>(ui.encyclopediaStyle)
ui.encyclopediaStyle = null

const st = (id: string) => g.encyclopedia[id] ?? { status: 0, brewed: 0, best: 0, clues: 0 }
const famProgress = (f: FamilyId) => {
  const list = stylesInFamily(f)
  const done = list.filter((s) => st(s.id).status >= 3).length
  return { done, total: list.length, pct: list.length ? done / list.length : 0 }
}
const groups = computed(() => {
  const map = new Map<string, BeerStyle[]>()
  for (const s of stylesInFamily(family.value)) {
    const k = s.family === family.value ? s.group || '' : `${FAMILIES.find((f) => f.id === s.family)?.nameZh ?? ''}（交叉收录）`
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(s)
  }
  return [...map.entries()]
})
const cur = computed(() => (selected.value ? styleById[selected.value] : undefined))
const curE = computed(() => (cur.value ? { ...st(cur.value.id), status: g.styleKnowledge(cur.value.id) } : undefined))
const visibleName = (s: BeerStyle) => (st(s.id).status >= 1 || g.settings.godMode ? s.name : '？？？')
const bar = (p: number) => '█'.repeat(Math.round(p * 10)) + '░'.repeat(10 - Math.round(p * 10))
const recHops = computed(() => (cur.value ? cur.value.ingredients.filter((i) => hopById[i]).map((i) => hopById[i].name) : []))
const recOther = computed(() => (cur.value ? cur.value.ingredients.filter((i) => !hopById[i]).map(ingredientName) : []))
const masterCount = computed(() => Object.values(g.encyclopedia).filter((e) => e.status >= 5).length)
const silverCount = computed(() => Object.values(g.encyclopedia).filter((e) => e.status === 4).length)
const recipeName = (id: string) => g.recipes.find((r) => r.id === id)
const familyText = computed(() => (cur.value ? [cur.value.family, ...(cur.value.alsoIn || [])].map((id) => FAMILIES.find((f) => f.id === id)?.name).join(' / ') : ''))
function openStyle(s: BeerStyle) {
  selected.value = s.id
}
</script>

<template>
  <Win title="世界精酿图鉴" icon="📖" wide @close="emit('close')">
    <div class="tabs">
      <button :class="{ active: tab === 'home' }" @click="tab = 'home'">🌍 总览</button>
      <button :class="{ active: tab === 'family' }" @click="tab = 'family'">📚 风格家族</button>
      <button :class="{ active: tab === 'mine' }" @click="tab = 'mine'">⭐ 我的精酿图鉴</button>
      <span class="tiny muted" style="margin-left: auto">Beer DB Version {{ DB_VERSION }}</span>
    </div>

    <!-- 总览 -->
    <div v-if="tab === 'home'" class="home">
      <div class="pixel-title gold" style="font-size: 16px">WORLD BEER COLLECTION</div>
      <div class="big">发现：<b class="gold">{{ g.discoveredCount }}</b> / {{ STYLES.length }}+</div>
      <div class="small muted">🥈 优秀 {{ silverCount }} · 🥇 大师 {{ masterCount }} · 变体 {{ Object.keys(g.variants).length }} · 自创 {{ g.customBeers.length }}</div>
      <div class="fam-grid">
        <div v-for="f in FAMILIES" :key="f.id" class="fam-row" @click="family = f.id; tab = 'family'; selected = null">
          <span class="fam-name">{{ f.icon }} {{ f.name }}</span>
          <span class="mono">{{ bar(famProgress(f.id).pct) }}</span>
          <span class="small">{{ Math.round(famProgress(f.id).pct * 100) }}%</span>
          <span class="tiny muted">{{ famProgress(f.id).done }}/{{ famProgress(f.id).total }}</span>
        </div>
      </div>
      <p class="tiny muted">数据库会随版本更新持续增加新风格，图鉴没有永久上限。</p>
    </div>

    <!-- 家族 -->
    <div v-else-if="tab === 'family'" class="fam-view">
      <div class="fam-list scroll">
        <div v-for="f in FAMILIES" :key="f.id" class="fam-item" :class="{ active: family === f.id }" @click="family = f.id; selected = null">
          {{ f.icon }} {{ f.nameZh }} <span class="tiny muted">{{ famProgress(f.id).done }}/{{ famProgress(f.id).total }}</span>
        </div>
      </div>
      <div class="grow scroll" style="max-height: 70vh">
        <div v-if="!cur">
          <div v-for="[gname, list] in groups" :key="gname">
            <h4 v-if="gname">{{ gname }}</h4>
            <div class="cards">
              <div
                v-for="s in list"
                :key="s.id"
                class="scard"
                :class="'s' + st(s.id).status"
                :style="{ '--c': STATUS_COLORS[st(s.id).status] }"
                @click="(st(s.id).status >= 1 || g.settings.godMode) && openStyle(s)"
              >
                <div class="swatch" :style="{ background: st(s.id).status >= 3 ? srmCss((s.color.min + s.color.max) / 2) : '#2a2a2a' }" />
                <div class="sname">{{ visibleName(s) }}</div>
                <div class="tiny">{{ st(s.id).status >= 1 ? s.nameZh : '' }}</div>
                <div class="tiny muted">{{ STATUS_NAMES[st(s.id).status] }}<span v-if="st(s.id).best"> · {{ st(s.id).best }}</span></div>
              </div>
            </div>
          </div>
        </div>
        <!-- 详情页 -->
        <div v-else-if="curE" class="detail">
          <button class="small ghost" @click="selected = null">← 返回</button>
          <div class="page" :class="'s' + curE.status">
            <div class="row" style="align-items: flex-start">
              <div class="grow">
                <div class="pname">🍺 {{ cur.name }}</div>
                <div class="muted">{{ cur.nameZh }} · {{ STATUS_NAMES[curE.status] }}</div>
              </div>
              <div v-if="curE.status >= 3" class="srm" :style="{ background: `linear-gradient(90deg, ${srmCss(cur.color.min)}, ${srmCss(cur.color.max)})` }" />
            </div>
            <table class="info">
              <tr><td>国家/地区</td><td>{{ cur.country.map((c) => `${countryById[c]?.flag ?? ''} ${countryById[c]?.nameZh ?? c}`).join('、') }}{{ cur.region ? ` · ${cur.region}` : '' }}</td></tr>
              <tr><td>类型</td><td>{{ familyText }}</td></tr>
              <template v-if="curE.status >= 3">
                <tr><td>颜色</td><td>SRM {{ cur.color.min }} → {{ cur.color.max }}</td></tr>
                <tr><td>ABV</td><td>{{ cur.abv.min }}% ～ {{ cur.abv.max }}%</td></tr>
                <tr><td>IBU</td><td>{{ cur.ibu.min }} ～ {{ cur.ibu.max }}</td></tr>
                <tr><td>苦度</td><td class="gold">{{ dots(cur.bitterness) }}</td></tr>
                <tr><td>酒体</td><td class="gold">{{ dots(cur.body) }}</td></tr>
                <tr><td>麦芽</td><td class="gold">{{ dots(cur.malt) }}</td></tr>
                <tr><td>酒花</td><td class="gold">{{ dots(cur.hopAroma) }}</td></tr>
                <tr><td>水果香</td><td class="gold">{{ dots(cur.fruity) }}</td></tr>
                <tr v-if="cur.roast > 0.5"><td>烘烤</td><td class="gold">{{ dots(cur.roast) }}</td></tr>
                <tr v-if="cur.acidity > 0.5"><td>酸度</td><td class="gold">{{ dots(cur.acidity) }}</td></tr>
                <tr v-if="cur.smoke > 0.5"><td>烟熏</td><td class="gold">{{ dots(cur.smoke) }}</td></tr>
                <tr v-if="cur.spicy > 0.5"><td>辛香</td><td class="gold">{{ dots(cur.spicy) }}</td></tr>
                <tr><td>常见香气</td><td><span v-for="a in cur.aromas" :key="a" class="chip">{{ aromaById[a]?.emoji }} {{ aromaById[a]?.zh }}</span></td></tr>
                <tr v-if="recHops.length"><td>推荐酒花</td><td>{{ recHops.join('、') }}</td></tr>
                <tr v-if="recOther.length"><td>推荐原料</td><td>{{ recOther.join('、') }}</td></tr>
                <tr><td>推荐温度</td><td>{{ cur.servingTemp }}℃ · {{ glassById[cur.glass]?.nameZh }}</td></tr>
              </template>
              <tr><td>已酿造</td><td>{{ curE.status >= 3 ? '✔' : '✘' }}</td></tr>
              <template v-if="curE.status >= 3">
                <tr><td>最高评分</td><td class="gold">{{ curE.best }}</td></tr>
                <tr><td>最佳批次</td><td>第 {{ curE.bestBatch }} 批</td></tr>
                <tr><td>酿造次数</td><td>{{ curE.brewed }}</td></tr>
              </template>
            </table>
            <p v-if="curE.status >= 3" class="small">{{ cur.description }}</p>
            <div v-if="curE.status >= 2 || curE.clues > 0">
              <h4>📜 线索</h4>
              <div v-for="(c, i) in cur.clues" :key="i" class="small">{{ i < curE.clues || curE.status >= 3 ? '“' + c + '”' : '？？？？？？' }}</div>
              <div v-if="curE.status >= 2 && cur.requirements?.some((r) => r.hint)" class="small" style="margin-top: 4px">
                <span class="muted">关键工艺：</span>
                <span v-for="r in cur.requirements!.filter((r) => r.hint)" :key="r.hint" class="chip">{{ r.hint }}</span>
              </div>
            </div>
            <div v-else class="small muted">只听说过这个名字。去实验、找客人打听、或者翻翻古籍吧。</div>
            <div v-if="curE.status >= 3" class="tiny muted">相关风格：{{ cur.relatedStyles.map((r) => (st(r).status >= 1 ? styleById[r]?.name : '？？？')).join('、') }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的精酿 -->
    <div v-else class="col">
      <h3>⭐ 自创精酿</h3>
      <div v-if="!g.customBeers.length" class="muted small">在实验室勾选「自创精酿」，给你的酒起名、设计酒标，酿出后就会收录在这里。</div>
      <div class="mine">
        <div v-for="c in g.customBeers" :key="c.recipeId" class="card col" style="align-items: center">
          <BeerLabel :label="recipeName(c.recipeId)?.label" :name="c.name" :sub="c.styleId ? styleById[c.styleId]?.name : '自由风格'" :size="100" />
          <div class="small">{{ c.name }}</div>
          <div class="tiny muted">基础：{{ c.styleId ? styleById[c.styleId]?.name : '未归类' }} · 最高 {{ c.best }} · {{ c.batches }} 批</div>
        </div>
      </div>
      <h3>🍹 风格变体</h3>
      <div v-if="!Object.keys(g.variants).length" class="muted small">在基础风格上加入水果、咖啡、木桶陈酿……就会诞生变体，比如 Mango Hazy IPA、Cherry Lambic。</div>
      <div class="row">
        <span v-for="v in Object.values(g.variants)" :key="v.name" class="chip">{{ v.name }} · {{ v.best }}（×{{ v.count }}）</span>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.big {
  font-size: 18px;
  margin: 6px 0;
}
.fam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 2px 20px;
  margin-top: 10px;
}
.fam-row {
  display: flex;
  gap: 10px;
  align-items: center;
  cursor: pointer;
  padding: 2px 4px;
}
.fam-row:hover {
  background: var(--panel-2);
}
.fam-name {
  width: 150px;
}
.mono {
  font-family: monospace;
  color: var(--amber);
  letter-spacing: -1px;
}
.fam-view {
  display: flex;
  gap: 10px;
}
.fam-list {
  width: 170px;
  max-height: 70vh;
}
.fam-item {
  padding: 4px 6px;
  cursor: pointer;
  font-size: 14px;
}
.fam-item.active {
  background: var(--wood);
  color: var(--gold);
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.scard {
  background: #1e1616;
  padding: 6px;
  cursor: pointer;
  box-shadow: 0 0 0 2px var(--c);
  min-height: 74px;
}
.scard.s0 {
  cursor: default;
  opacity: 0.5;
}
.scard.s1,
.scard.s2 {
  filter: grayscale(0.7);
}
.scard.s4 {
  box-shadow: 0 0 0 3px #c8d0d8;
}
.scard.s5 {
  box-shadow:
    0 0 0 3px var(--gold),
    0 0 10px var(--gold);
}
.swatch {
  height: 8px;
  margin-bottom: 4px;
}
.sname {
  font-size: 14px;
}
.page {
  background: var(--paper);
  color: var(--ink);
  padding: 14px;
  margin-top: 6px;
  box-shadow: 0 0 0 3px var(--c, var(--ink));
}
.page.s4 {
  box-shadow: 0 0 0 4px #c8d0d8;
}
.page.s5 {
  box-shadow: 0 0 0 4px var(--gold);
}
.page .muted {
  color: #7a6a58;
}
.page .gold {
  color: #b8860b;
}
.page h4 {
  color: #8b3a1a;
}
.page .chip {
  background: #fff6de;
  box-shadow: 0 0 0 1px #c8b48a;
}
.pname {
  font-size: 22px;
}
.srm {
  width: 120px;
  height: 22px;
  box-shadow: 0 0 0 2px var(--ink);
}
.info td {
  border-bottom: 1px dashed #c8b48a;
  font-size: 14px;
}
.info td:first-child {
  width: 90px;
  color: #7a6a58;
}
.mine {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame, fmtMoney, BOOK_PRICE, WHOLESALE } from '../../stores/game'
import { ADJUNCTS, GLASSES, HOPS, MALTS, YEASTS, HOP_CHAR, aromaById, countryById } from './shopData'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
type Tab = 'malt' | 'hop' | 'yeast' | 'adjunct' | 'glass' | 'book' | 'wholesale'
const tab = ref<Tab>('malt')
const showLocked = ref(false)
const tabs: { id: Tab; name: string }[] = [
  { id: 'malt', name: '🌾 麦芽' },
  { id: 'hop', name: '🌿 酒花' },
  { id: 'yeast', name: '🦠 酵母' },
  { id: 'adjunct', name: '🍒 辅料' },
  { id: 'glass', name: '🍷 酒杯' },
  { id: 'book', name: '📚 古籍' },
  { id: 'wholesale', name: '🛢️ 批发啤酒' },
]
const items = computed<any[]>(() => {
  const list = tab.value === 'malt' ? MALTS : tab.value === 'hop' ? HOPS : tab.value === 'yeast' ? YEASTS : tab.value === 'adjunct' ? ADJUNCTS : []
  return list.filter((x: any) => showLocked.value || g.ingredientUnlocked(x.id))
})
const inv = (id: string) => {
  if (g.settings.godMode) return '∞'
  const v = g.inventory.malts[id] ?? g.inventory.hops[id] ?? g.inventory.yeasts[id] ?? g.inventory.adjuncts[id] ?? 0
  return Math.round(v * 100) / 100
}
const packs = computed(() =>
  tab.value === 'malt' ? [1, 5, 25] : tab.value === 'hop' ? [50, 100, 500] : tab.value === 'yeast' ? [1, 5] : [100, 500, 2000],
)
const unit = computed(() => (tab.value === 'malt' ? 'kg' : tab.value === 'yeast' ? '包' : 'g'))
const priceText = (x: any) =>
  tab.value === 'malt' ? `$${x.price}/kg` : tab.value === 'hop' ? `$${x.price}/g` : tab.value === 'yeast' ? `$${x.price}/包` : `$${x.price}/kg`
</script>

<template>
  <Win title="原料商店" icon="🛒" wide @close="emit('close')">
    <div class="tabs">
      <button v-for="t in tabs" :key="t.id" :class="{ active: tab === t.id }" @click="tab = t.id">{{ t.name }}</button>
      <label class="small" style="margin-left: auto"><input v-model="showLocked" type="checkbox" /> 显示未解锁</label>
    </div>
    <div v-if="tab === 'glass'">
      <p class="small muted">每种风格都有推荐酒杯。用对酒杯，客人的满意度更高。</p>
      <div v-for="gl in GLASSES" :key="gl.id" class="card row">
        <span class="grow">{{ gl.nameZh }} <span class="tiny muted">{{ gl.volume }}L / 杯</span></span>
        <span v-if="g.glasses.includes(gl.id)" class="good small">已拥有</span>
        <template v-else-if="g.isUnlocked(gl.unlock)">
          <button class="small" @click="g.buyGlass(gl.id)">购买 {{ fmtMoney(gl.price) }}</button>
        </template>
        <span v-else class="tiny muted">🔒 {{ g.unlockText(gl.unlock) }}</span>
      </div>
    </div>
    <div v-else-if="tab === 'wholesale'" class="col">
      <p class="small">自酿的酒还在发酵？可以先从批发商进几桶商业啤酒撑场面。利润薄、口碑一般，也不会进入图鉴。</p>
      <div v-for="w in WHOLESALE" :key="w.id" class="card row">
        <span class="grow">{{ w.name }} · {{ w.liters }}L</span>
        <button class="small" @click="g.buyWholesale(w.id)">进货 {{ fmtMoney(w.price) }}</button>
      </div>
      <p class="tiny muted">酒桶空间：{{ Math.round(g.kegUsed) }} / {{ g.kegCapacity }} L</p>
    </div>
    <div v-else-if="tab === 'book'" class="col">
      <p>📚 旧书摊上偶尔能淘到《古籍》：残缺的酿酒笔记、修道院手稿、殖民时代的航海日志……</p>
      <p class="small muted">每本随机获得一种未知风格的线索（历史啤酒的概率更高）。已读 {{ g.stats.booksRead }} 本。</p>
      <button class="primary" style="width: fit-content" @click="g.buyBook()">购买一本古籍（{{ fmtMoney(BOOK_PRICE) }}）</button>
    </div>
    <table v-else>
      <tr><th>名称</th><th>产地</th><th>属性</th><th>价格</th><th>库存</th><th>购买</th></tr>
      <tr v-for="x in items" :key="x.id" :class="{ locked: !g.ingredientUnlocked(x.id) }">
        <td>
          <div>{{ x.name }}</div>
          <div class="tiny muted">{{ x.nameZh }} · {{ x.desc }}</div>
        </td>
        <td class="small">{{ countryById[x.origin]?.flag ?? '' }} {{ countryById[x.origin]?.nameZh ?? '' }}</td>
        <td class="tiny">
          <template v-if="tab === 'malt'">{{ x.color }}°L · {{ x.category }}</template>
          <template v-else-if="tab === 'hop'">α {{ x.alpha }}% · <span v-for="(v, k) in x.character" :key="k">{{ HOP_CHAR[k] }}{{ v }} </span></template>
          <template v-else-if="tab === 'yeast'">{{ x.type }} · {{ x.tempMin }}~{{ x.tempMax }}℃ · {{ Math.round(x.attenuation * 100) }}%</template>
          <template v-else>{{ x.category }} · 推荐 {{ x.typical }}g/20L</template>
          <div><span v-for="a in x.aromas" :key="a">{{ aromaById[a]?.emoji }}</span></div>
        </td>
        <td class="small">{{ priceText(x) }}</td>
        <td class="small">{{ inv(x.id) }} {{ unit }}</td>
        <td>
          <template v-if="g.ingredientUnlocked(x.id)">
            <button v-for="p in packs" :key="p" class="small" @click="g.buyIngredient(x.id, p)">{{ p }}{{ unit }}（{{ fmtMoney(g.priceOf(x.id) * p) }}）</button>
          </template>
          <span v-else class="tiny muted">🔒 {{ g.unlockText(x.unlock) }}</span>
        </td>
      </tr>
    </table>
  </Win>
</template>

<style scoped>
.locked {
  opacity: 0.5;
}
</style>

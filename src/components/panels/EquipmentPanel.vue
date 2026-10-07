<script setup lang="ts">
import { computed } from 'vue'
import { useGame, fmtMoney } from '../../stores/game'
import { BARRELS, EQUIPMENT } from '../../engine/db'
import type { EquipmentKind } from '../../types'
import Win from '../Win.vue'

const emit = defineEmits<{ close: [] }>()
const g = useGame()
const KINDS: { kind: Exclude<EquipmentKind, 'fermenter'>; name: string; icon: string }[] = [
  { kind: 'mill', name: 'Mill 麦芽研磨机', icon: '⚙️' },
  { kind: 'mashTun', name: 'Mash Tun 糖化锅', icon: '♨️' },
  { kind: 'kettle', name: 'Brew Kettle 煮沸锅', icon: '🍲' },
  { kind: 'brightTank', name: 'Bright Tank 清酒罐', icon: '🧴' },
  { kind: 'keg', name: 'Keg 酒桶', icon: '🛢️' },
  { kind: 'coldStorage', name: 'Cold Storage 冷库', icon: '❄️' },
  { kind: 'barrelRack', name: 'Barrel 木桶架', icon: '🪵' },
  { kind: 'tap', name: 'Taps 酒头', icon: '🚰' },
]
const TIER = ['家庭级', '小型精酿', '专业级', '工业级', '传奇', '传奇+']
const tiers = (k: string) => EQUIPMENT.filter((e) => e.kind === k).sort((a, b) => a.tier - b.tier)
const fermenterTypes = computed(() => tiers('fermenter'))
const statText = (s: Record<string, number>) =>
  Object.entries(s)
    .map(([k, v]) => {
      const zh: Record<string, string> = { efficiency: '效率', stability: '控温', brewsPerDay: '批/天', quality: '品质+', maxVolume: '容量L', dms: 'DMS风险', capacity: '容量L', tempControl: '温控', clarity: '澄清', liters: '储量L', decay: '衰减', slots: '桶位', taps: '酒头' }
      return `${zh[k] ?? k} ${k === 'efficiency' ? Math.round(v * 100) + '%' : v}`
    })
    .join(' · ')
</script>

<template>
  <Win title="设备升级" icon="🔧" wide @close="emit('close')">
    <p class="small muted">升级：家庭级 → 小型精酿 → 专业级 → 工业级。升级时旧设备折价 30%；出售回收 50%。</p>
    <div class="grid">
      <div v-for="k in KINDS" :key="k.kind" class="card">
        <h4>{{ k.icon }} {{ k.name }}</h4>
        <div v-for="e in tiers(k.kind)" :key="e.id" class="tier" :class="{ cur: g.equipment[k.kind] === e.tier && (e.tier > 0 || !['brightTank', 'barrelRack'].includes(k.kind)), own: g.equipment[k.kind] > e.tier }">
          <div class="row">
            <span class="grow">{{ e.nameZh }} <span class="tiny muted">{{ TIER[e.tier] }}</span></span>
            <span v-if="g.equipment[k.kind] === e.tier" class="good small">使用中</span>
            <template v-else-if="e.tier > g.equipment[k.kind]">
              <button v-if="g.isUnlocked(e.unlock)" class="small" @click="g.buyEquipment(e.id)">{{ fmtMoney(e.price) }}</button>
              <span v-else class="tiny muted">🔒 {{ g.unlockText(e.unlock) }}</span>
            </template>
          </div>
          <div class="tiny muted">{{ statText(e.stats) }}</div>
          <div class="tiny">{{ e.desc }}</div>
        </div>
        <button v-if="g.equipment[k.kind] > 0" class="small danger" @click="g.sellEquipment(k.kind)">出售当前（降一级）</button>
      </div>

      <div class="card">
        <h4>🛢️ Fermenter 发酵罐（{{ g.fermenters.length }}/12）</h4>
        <div v-for="f in g.fermenters" :key="f.id" class="row small">
          <span class="grow">{{ g.fermenterCapacity(f) }}L {{ fermenterTypes[f.tier]?.nameZh }}</span>
          <span v-if="f.batchId" class="muted">使用中</span>
          <button v-else class="small danger" @click="g.sellFermenter(f.id)">出售</button>
        </div>
        <h4>购买</h4>
        <div v-for="e in fermenterTypes" :key="e.id" class="row small">
          <span class="grow">{{ e.nameZh }} {{ e.stats.capacity }}L{{ e.stats.tempControl ? ' · 温控' : '' }}</span>
          <button v-if="g.isUnlocked(e.unlock)" class="small" @click="g.buyFermenter(e.tier)">{{ fmtMoney(e.price) }}</button>
          <span v-else class="tiny muted">🔒 {{ g.unlockText(e.unlock) }}</span>
        </div>
        <div class="tiny muted">要不要用唯一的大罐生产最畅销的 IPA？</div>
      </div>

      <div v-if="g.equipment.barrelRack > 0" class="card">
        <h4>🪵 木桶（{{ g.barrels.length }}/{{ g.barrelSlots }}）</h4>
        <div v-for="b in g.barrels" :key="b.id" class="row small">
          <span class="grow">{{ BARRELS.find((x) => x.id === b.barrelId)?.nameZh }} · 用过 {{ b.uses }} 次</span>
          <span v-if="b.batchId" class="muted">陈酿中</span>
          <button v-else class="small danger" @click="g.sellBarrel(b.id)">出售</button>
        </div>
        <h4>购买木桶</h4>
        <div v-for="b in BARRELS" :key="b.id" class="row small">
          <span class="grow">{{ b.nameZh }}</span>
          <button v-if="g.ingredientUnlocked(b.id)" class="small" :disabled="g.barrels.length >= g.barrelSlots" @click="g.buyBarrel(b.id)">{{ fmtMoney(b.price) }}</button>
          <span v-else class="tiny muted">🔒 {{ g.unlockText(b.unlock) }}</span>
        </div>
      </div>
    </div>
  </Win>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 10px;
}
.tier {
  padding: 4px;
  margin: 3px 0;
  border-left: 3px solid transparent;
}
.tier.cur {
  border-left-color: var(--green);
  background: #1e1616;
}
.tier.own {
  opacity: 0.5;
}
</style>

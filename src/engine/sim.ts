// 酒吧实时模拟：客人与员工的状态机（不存档，打烊即清空）
import { reactive } from 'vue'
import type { GameStore } from '../stores/game'
import { CLOSE_TIME, OPEN_TIME, SETTLE_TIME, familiesOf } from '../stores/game'
import { useUi } from '../stores/ui'
import { NPCS, styleById } from './db'
import {
  chooseTap,
  firstFamilyLine,
  generateCustomer,
  npcCustomer,
  rateBeer,
  say,
  type CustomerProfile,
  type TapOffer,
} from './customers'
import { BAR_X0, BAR_X1, DOOR_X, FLOOR_Y, computeLayout, tapX, type Seat } from '../scene/layout'
import { sfx } from './audio'

export type CustomerState = 'entering' | 'browsing' | 'waiting' | 'drinking' | 'leaving' | 'gone'

export interface Customer {
  id: number
  profile: CustomerProfile
  x: number
  y: number
  targetX: number
  state: CustomerState
  seat?: Seat
  timer: number
  patience: number
  tapIndex?: number
  offer?: TapOffer
  cups: number
  spent: number
  bubble?: { text: string; ttl: number; kind: 'say' | 'think' | 'love' | 'angry' }
  rating?: number
  facing: 1 | -1
  hasBeer: boolean
  beerColor: number
  walkPhase: number
  tried: Set<string>
  npcDone?: boolean
  served: boolean
}

export interface Bartender {
  id: number
  x: number
  targetX: number
  task?: { customerId: number; tapIndex: number; phase: 'toTap' | 'pour' | 'deliver'; timer: number }
  walkPhase: number
}

const WALK_SPEED = 7 // 像素 / 游戏分钟
const HOUR_CURVE: Record<number, number> = { 16: 0.5, 17: 0.75, 18: 1.05, 19: 1.3, 20: 1.6, 21: 1.5, 22: 1.25, 23: 1.0, 0: 0.7, 1: 0.4 }

let cid = 1

export function srmToHex(srm: number): number {
  const stops: [number, number][] = [
    [2, 0xf8e27a],
    [4, 0xf2c94c],
    [6, 0xe8a73a],
    [9, 0xd9822b],
    [13, 0xbb5f22],
    [18, 0x93451a],
    [25, 0x6b2f14],
    [35, 0x3d1a0b],
    [50, 0x1e0d06],
  ]
  for (const [s, c] of stops) if (srm <= s) return c
  return 0x140804
}

export class BarSim {
  customers = reactive<Customer[]>([])
  bartenders = reactive<Bartender[]>([])
  queue: number[] = []
  spawnAcc = 0
  npcCheckedDay = -1
  tutorialSpawned = false
  layout = computeLayout({ decorations: {} } as any)
  layoutKey = ''

  constructor(public g: GameStore) {}

  reset() {
    this.customers.splice(0)
    this.queue = []
    this.bartenders.forEach((b) => {
      b.task = undefined
    })
  }

  ensureLayout() {
    const key = JSON.stringify(this.g.decorations)
    if (key !== this.layoutKey) {
      this.layoutKey = key
      this.layout = computeLayout(this.g)
    }
    const n = 1 + this.g.staff.bartender
    while (this.bartenders.length < n) this.bartenders.push({ id: this.bartenders.length, x: 330, targetX: 330, walkPhase: 0 })
    if (this.bartenders.length > n) this.bartenders.splice(n)
  }

  freeSeats(): Seat[] {
    const taken = new Set(this.customers.filter((c) => c.state !== 'gone' && c.seat).map((c) => c.seat!.id))
    return this.layout.seats.filter((s) => !taken.has(s.id))
  }

  offers(): TapOffer[] {
    const g = this.g
    const out: TapOffer[] = []
    g.taps.forEach((t, i) => {
      if (!t.batchId) return
      const b = g.batches.find((x) => x.id === t.batchId)
      if (!b || b.remaining <= 0) return
      const style = b.styleId ? styleById[b.styleId] : undefined
      const glass = g.glassFor(b)
      out.push({
        tapIndex: i,
        batch: b,
        style,
        family: style?.family,
        families: familiesOf(style),
        price: t.price,
        temp: g.tapTempControl ? t.temp : 4,
        mystery: t.mystery,
        glassOk: glass.ok,
        freshness: b.freshness,
        quality: g.effectiveQuality(b),
      })
    })
    return out
  }

  speak(c: Customer, text: string, kind: 'say' | 'think' | 'love' | 'angry' = 'say', ttl = 2.6) {
    if (!text) return
    c.bubble = { text, ttl, kind }
  }

  spawn(profile?: CustomerProfile) {
    const seats = this.freeSeats()
    const p = profile || generateCustomer(this.g.repLevel, this.g.archetypeBonus)
    if (!seats.length && !p.npc) {
      this.g.today.lost++
      return
    }
    // 特殊客人总能进门：没有座位就站在吧台边
    const seat = seats.length ? seats[Math.floor(Math.random() * seats.length)] : { id: 'npc_stand_' + cid, x: 250, y: FLOOR_Y, kind: 'bar' as const, group: -1 }
    const c: Customer = {
      id: cid++,
      profile: p,
      x: DOOR_X,
      y: FLOOR_Y,
      targetX: seat.x,
      state: 'entering',
      seat,
      timer: 0,
      patience: p.personality.patience,
      cups: 0,
      spent: 0,
      facing: 1,
      hasBeer: false,
      beerColor: 0xe8a73a,
      walkPhase: 0,
      tried: new Set(),
      served: false,
    }
    this.customers.push(c)
    this.g.today.customers++
    this.g.stats.customers++
    if (Math.random() < 0.3) this.speak(c, say('entering'))
    sfx('door')
  }

  /** dtMin：游戏分钟；dtReal：现实秒 */
  update(dtMin: number, dtReal: number) {
    const g = this.g
    this.ensureLayout()
    // 气泡计时用现实时间
    for (const c of this.customers) {
      if (c.bubble) {
        c.bubble.ttl -= dtReal
        if (c.bubble.ttl <= 0) c.bubble = undefined
      }
    }
    if (dtMin <= 0) return
    const minute = g.minute
    const open = minute >= OPEN_TIME && minute < CLOSE_TIME

    // ---- 生成客人 ----
    if (open) {
      if (!g.tutorial.done && g.tutorial.step >= 7 && !this.tutorialSpawned) {
        this.tutorialSpawned = true
        this.spawn()
      }
      const hour = Math.floor(minute / 60) % 24
      const curve = HOUR_CURVE[hour] ?? 0.5
      const ambience = 1 + Math.min(0.6, g.ambience * 0.012)
      const perHour = (2.2 + g.repLevel * 2.6) * curve * g.trafficMult * ambience * (g.tutorial.done ? 1 : 0.4)
      this.spawnAcc += (perHour / 60) * dtMin
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1
        this.spawn()
      }
      // 23:00 特殊客人
      if (hour === 23 && this.npcCheckedDay !== g.day && g.tutorial.done) {
        this.npcCheckedDay = g.day
        const pool = g.eligibleNpcs()
        // 老酿酒师早期常来
        const mentor = NPCS.find((n) => n.id === 'old_brewer')
        const candidates = g.day <= 20 && mentor ? [mentor, ...pool] : pool
        for (const npc of candidates.sort(() => Math.random() - 0.5)) {
          const fresh = npc.gifts.some((x) => !g.npcGiftsGiven.includes(x))
          if (fresh && Math.random() < npc.chance * (g.day <= 3 && npc.id === 'old_brewer' ? 3 : 1)) {
            this.spawn(npcCustomer(npc))
            break
          }
        }
      }
    }

    // ---- 客人状态机 ----
    for (const c of this.customers) {
      c.timer -= dtMin
      const walk = (target: number) => {
        const d = target - c.x
        const step = WALK_SPEED * dtMin
        if (Math.abs(d) <= step) {
          c.x = target
          return true
        }
        c.x += Math.sign(d) * step
        c.facing = d > 0 ? 1 : -1
        c.walkPhase += dtMin
        return false
      }
      switch (c.state) {
        case 'entering':
          if (walk(c.targetX)) {
            c.y = c.seat!.y
            c.state = 'browsing'
            c.timer = 4 + Math.random() * 6
            c.facing = c.seat!.kind === 'bar' ? 1 : c.x < (c.seat!.x + 0) ? 1 : -1
            if (c.profile.npc && !c.npcDone) {
              c.npcDone = true
              this.speak(c, c.profile.npc.greeting[0], 'say', 4)
              g.npcVisit(c.profile.npc.id)
            }
          }
          break
        case 'browsing':
          if (c.timer <= 0) this.order(c)
          break
        case 'waiting':
          c.patience -= dtMin
          if (c.patience <= 0) {
            this.queue = this.queue.filter((x) => x !== c.id)
            for (const b of this.bartenders) if (b.task?.customerId === c.id) b.task = undefined
            this.speak(c, say('waiting'), 'angry')
            g.addRep(-1.5)
            this.leave(c)
          }
          break
        case 'drinking':
          if (c.timer <= 0) this.afterDrink(c)
          else if (Math.random() < dtMin * 0.01 * c.profile.personality.chatty && !c.bubble) {
            const lines = c.profile.personality.lines
            this.speak(c, lines[Math.floor(Math.random() * lines.length)], 'say', 2)
          }
          break
        case 'leaving':
          c.y = FLOOR_Y
          if (walk(DOOR_X - 10)) c.state = 'gone'
          break
      }
      // 打烊：赶客
      if (minute >= CLOSE_TIME && (c.state === 'browsing' || c.state === 'waiting')) this.leave(c)
      if (minute >= SETTLE_TIME - 4 && c.state !== 'leaving' && c.state !== 'gone') this.leave(c)
    }
    for (let i = this.customers.length - 1; i >= 0; i--) if (this.customers[i].state === 'gone') this.customers.splice(i, 1)

    // ---- 调酒师 ----
    for (const b of this.bartenders) {
      if (!b.task) {
        const next = this.queue.shift()
        const c = next !== undefined ? this.customers.find((x) => x.id === next) : undefined
        if (c && c.state === 'waiting' && c.tapIndex !== undefined) {
          b.task = { customerId: c.id, tapIndex: c.tapIndex, phase: 'toTap', timer: 0 }
          b.targetX = tapX(c.tapIndex % 12, g.taps.length)
        } else {
          b.targetX = b.id === 0 ? 330 : 300 + b.id * 25
        }
      }
      const d = b.targetX - b.x
      const step = WALK_SPEED * 1.6 * dtMin
      if (Math.abs(d) > step) {
        b.x += Math.sign(d) * step
        b.walkPhase += dtMin
      } else b.x = b.targetX
      const t = b.task
      if (!t) continue
      const c = this.customers.find((x) => x.id === t.customerId)
      if (!c || c.state !== 'waiting') {
        b.task = undefined
        continue
      }
      if (t.phase === 'toTap' && b.x === b.targetX) {
        t.phase = 'pour'
        t.timer = 2.5
        sfx('pour')
      } else if (t.phase === 'pour') {
        t.timer -= dtMin
        if (t.timer <= 0) {
          t.phase = 'deliver'
          b.targetX = Math.max(BAR_X0 + 6, Math.min(BAR_X1 - 6, c.x))
        }
      } else if (t.phase === 'deliver' && b.x === b.targetX) {
        this.serve(c)
        b.task = undefined
      }
    }
  }

  order(c: Customer) {
    const g = this.g
    const offers = this.offers()
    if (!offers.length) {
      this.speak(c, say('noMatch'), 'think')
      g.today.lost++
      this.leave(c)
      return
    }
    const o = chooseTap(c.profile, offers, g.familyDemand, g.priceTolerance, c.tried)
    if (!o) {
      this.speak(c, say('noMatch'), 'think')
      if (c.cups === 0) g.today.lost++
      this.leave(c)
      return
    }
    c.tapIndex = o.tapIndex
    c.offer = o
    c.state = 'waiting'
    c.patience = c.profile.personality.patience
    this.queue.push(c.id)
    this.speak(c, o.mystery ? '来杯神秘酒头！' : `${say('order') || '来一杯'}`, 'say', 1.8)
  }

  serve(c: Customer) {
    const g = this.g
    const offers = this.offers()
    const o = offers.find((x) => x.tapIndex === c.tapIndex) // 可能已经卖完
    if (!o) {
      this.speak(c, '啊？卖完了？', 'angry')
      this.leave(c)
      return
    }
    c.offer = o
    c.hasBeer = true
    c.beerColor = srmToHex(o.batch.color)
    c.state = 'drinking'
    c.timer = 22 + Math.random() * 25
    c.served = true
    const r = rateBeer(c.profile, o, g.priceTolerance)
    c.rating = r.score
    c.cups++
    c.tried.add(o.batch.id)
    const tip = r.score >= 85 ? Math.round(o.price * c.profile.personality.tip * 0.25 * 10) / 10 : 0
    c.spent += o.price + tip
    g.recordSale(o.tapIndex, r.score, o.price, tip)
    // 第一次接触某家族
    let line = r.comment
    for (const f of o.families) {
      if (!g.stats.familiesTasted.includes(f)) {
        g.stats.familiesTasted.push(f)
        const l = firstFamilyLine(f)
        if (l && Math.random() < 0.7) line = l
      }
    }
    const kind = r.score >= 85 ? 'love' : r.score < 50 ? 'angry' : 'say'
    setTimeout(() => this.speak(c, line, kind, 3), 400)
    g.log({
      kind: 'rating',
      who: c.profile.name,
      beer: o.mystery ? `神秘酒头（${o.batch.displayName}）` : o.batch.displayName,
      score: r.score,
      text: r.comments.slice(0, 2).join(' / '),
      detail: `风格准确 ${r.accuracy} · 品质 ${r.quality} · 新鲜 ${r.freshness} · 温度 ${r.temperature} · 酒杯 ${r.glass} · 偏好 ${r.preference >= 0 ? '+' : ''}${r.preference}%${r.pricePenalty > 0 ? ` · 价格 -${r.pricePenalty}` : ''}`,
    })
    if (!g.tutorial.done && g.tutorial.step === 7) {
      g.tutorial.step = 8
      useUi().toast(`第一位客人评分：❤️ ${r.score}`, '⭐', 'gold')
    }
  }

  afterDrink(c: Customer) {
    const g = this.g
    c.hasBeer = false
    const open = g.minute < CLOSE_TIME - 20
    const budgetLeft = c.profile.archetype.budget * 3 - c.spent
    const again = open && (c.rating ?? 0) >= 70 && Math.random() < c.profile.personality.repeat * ((c.rating ?? 0) / 100) && budgetLeft > 0 && c.cups < 4
    if (again) {
      this.speak(c, say('again'), 'love', 1.6)
      c.state = 'browsing'
      c.timer = 2 + Math.random() * 4
    } else {
      if (Math.random() < 0.4) this.speak(c, say('leaving'))
      this.leave(c)
    }
  }

  leave(c: Customer) {
    this.queue = this.queue.filter((x) => x !== c.id)
    c.state = 'leaving'
    c.hasBeer = false
    c.seat = undefined
    c.facing = -1
  }
}

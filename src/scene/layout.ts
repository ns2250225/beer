// 场景布局（480×270 逻辑像素）——模拟与渲染共用
import type { GameStore } from '../stores/game'
import { decorationById } from '../engine/db'

export const W = 480
export const H = 270
export const FLOOR_Y = 160 // 前厅地面（客人脚底）
export const BACK_ROW_Y = 146
export const DOOR_X = 18
export const BAR_X0 = 262
export const BAR_X1 = 404
export const COUNTER_Y = 124
export const BREW_TOP = 176
export const BREW_FLOOR = 262

export interface Seat {
  id: string
  x: number
  y: number
  kind: 'table' | 'bar' | 'sofa'
  /** 桌子/沙发的绘制锚点 */
  group: number
}

export interface FloorItem {
  kind: 'table' | 'sofa'
  x: number
  y: number
  group: number
}

/** 前厅可放置座位物件的槽位 */
const FLOOR_SLOTS = [
  { x: 70, y: FLOOR_Y },
  { x: 128, y: FLOOR_Y },
  { x: 186, y: FLOOR_Y },
  { x: 236, y: FLOOR_Y },
  { x: 92, y: BACK_ROW_Y },
  { x: 150, y: BACK_ROW_Y },
  { x: 208, y: BACK_ROW_Y },
  { x: 56, y: BACK_ROW_Y },
  { x: 240, y: BACK_ROW_Y },
]

export function computeLayout(g: Pick<GameStore, 'decorations'>) {
  const items: FloorItem[] = []
  const seats: Seat[] = []
  let slot = 0
  const place = (kind: 'table' | 'sofa') => {
    const s = FLOOR_SLOTS[slot]
    if (!s) return
    const group = slot
    items.push({ kind, x: s.x, y: s.y, group })
    if (kind === 'table') {
      seats.push({ id: `t${slot}a`, x: s.x - 11, y: s.y, kind: 'table', group })
      seats.push({ id: `t${slot}b`, x: s.x + 11, y: s.y, kind: 'table', group })
    } else {
      seats.push({ id: `s${slot}a`, x: s.x - 10, y: s.y - 1, kind: 'sofa', group })
      seats.push({ id: `s${slot}b`, x: s.x, y: s.y - 1, kind: 'sofa', group })
      seats.push({ id: `s${slot}c`, x: s.x + 10, y: s.y - 1, kind: 'sofa', group })
    }
    slot++
  }
  // 初始两张桌子
  place('table')
  place('table')
  for (let i = 0; i < (g.decorations['wood_table'] || 0); i++) place('table')
  for (let i = 0; i < (g.decorations['sofa'] || 0); i++) place('sofa')
  // 吧台高脚凳
  const stools = 3 + Math.min(6, (g.decorations['bar_stool'] || 0) * (decorationById['bar_stool']?.seats?.count ?? 1))
  const span = BAR_X1 - BAR_X0 - 16
  for (let i = 0; i < stools; i++) {
    const x = Math.round(BAR_X0 + 8 + (span * (i + 0.5)) / stools)
    seats.push({ id: `bar${i}`, x, y: FLOOR_Y, kind: 'bar', group: -1 })
  }
  return { items, seats, stools }
}

export function tapX(i: number, n: number) {
  const span = BAR_X1 - BAR_X0 - 24
  return Math.round(BAR_X0 + 12 + (span * (i + 0.5)) / Math.max(1, Math.min(n, 12))) + (i >= 12 ? 0 : 0)
}

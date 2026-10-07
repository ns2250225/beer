// PixiJS 酒吧场景：所有像素图形由代码绘制（无外部素材）
import { Application, Container, Graphics, Text } from 'pixi.js'
import type { GameStore } from '../stores/game'
import { CLOSE_TIME, OPEN_TIME } from '../stores/game'
import type { BarSim, Customer } from '../engine/sim'
import { srmToHex } from '../engine/sim'
import { decorationById, styleById } from '../engine/db'
import { BAR_X0, BAR_X1, BREW_FLOOR, BREW_TOP, COUNTER_Y, FLOOR_Y, H, W, computeLayout, tapX } from './layout'

const hex = (s: string) => parseInt(s.replace('#', ''), 16)
const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: number
  size: number
  layer: 'steam' | 'bubble' | 'weather' | 'spark'
}

export class BarScene {
  app = new Application()
  root = new Container()
  staticLayer = new Container()
  staticG = new Graphics()
  dynG = new Graphics()
  fxG = new Graphics()
  textLayer = new Container()
  staticKey = ''
  scale = 2
  particles: Particle[] = []
  bubbleTexts: Text[] = []
  labelTexts: Text[] = []
  time = 0
  ready = false
  lightning = 0
  hoverCb?: (info: string | null) => void

  constructor(
    public g: GameStore,
    public sim: BarSim,
  ) {}

  async init(parent: HTMLElement) {
    await this.app.init({ width: W * 2, height: H * 2, background: 0x120c14, antialias: false, resolution: 1 })
    parent.appendChild(this.app.canvas)
    this.app.canvas.style.imageRendering = 'pixelated'
    this.app.stage.addChild(this.root)
    this.root.addChild(this.staticLayer)
    this.staticLayer.addChild(this.staticG)
    this.root.addChild(this.dynG)
    this.root.addChild(this.fxG)
    this.root.addChild(this.textLayer)
    this.ready = true
    this.resize(parent.clientWidth, parent.clientHeight)
  }

  destroy() {
    this.ready = false
    this.app.destroy(true, { children: true })
  }

  resize(w: number, h: number) {
    if (!this.ready) return
    const s = Math.max(1, Math.floor(Math.min(w / W, h / H)))
    this.scale = s
    this.app.renderer.resize(W * s, H * s)
    this.root.scale.set(s)
    this.staticKey = ''
    for (const t of [...this.bubbleTexts, ...this.labelTexts]) t.resolution = s * (window.devicePixelRatio || 1)
    // 不足一倍时用 CSS 缩小
    const css = Math.min(w / (W * s), h / (H * s))
    this.app.canvas.style.width = `${W * s * css}px`
    this.app.canvas.style.height = `${H * s * css}px`
  }

  // ---------------- 工具 ----------------
  rect(gr: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1) {
    gr.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).fill({ color: c, alpha: a })
  }

  makeText(size: number, color = 0xffffff, bold = false) {
    const t = new Text({
      text: '',
      style: { fontFamily: FONT, fontSize: size, fill: color, fontWeight: bold ? 'bold' : 'normal', lineHeight: size + 2, letterSpacing: 0.2 },
    })
    t.resolution = this.scale * (window.devicePixelRatio || 1)
    return t
  }

  // ---------------- 静态层 ----------------
  buildStatic() {
    const g = this.g
    const gr = this.staticG
    gr.clear()
    for (const t of this.labelTexts) t.destroy()
    this.labelTexts = []
    const label = (text: string, x: number, y: number, size = 6, color = 0xf3e2c0, anchor = 0.5) => {
      const t = this.makeText(size, color)
      t.text = text
      t.anchor.set(anchor, 0)
      t.x = x
      t.y = y
      this.staticLayer.addChild(t)
      this.labelTexts.push(t)
      return t
    }

    // ===== 前厅墙面 =====
    this.rect(gr, 0, 0, W, 170, 0x4a2c2a)
    // 砖纹
    for (let y = 14; y < 104; y += 6) {
      const off = (y / 6) % 2 ? 0 : 6
      for (let x = -12 + off; x < W; x += 12) {
        this.rect(gr, x + 1, y + 1, 10, 4, 0x5b3530)
        if ((x * 7 + y * 3) % 5 === 0) this.rect(gr, x + 2, y + 2, 4, 1, 0x6a3f37)
      }
    }
    // 护墙板
    this.rect(gr, 0, 104, W, 44, 0x6b4226)
    for (let x = 0; x < W; x += 16) this.rect(gr, x, 106, 1, 40, 0x553419)
    this.rect(gr, 0, 104, W, 2, 0x8b5a2b)
    // 地板
    this.rect(gr, 0, 140, W, 30, 0x7a4b2a)
    for (let y = 142; y < 170; y += 5) this.rect(gr, 0, y, W, 1, 0x6a3f22)
    for (let y = 142, i = 0; y < 170; y += 5, i++) for (let x = (i % 2) * 20; x < W; x += 40) this.rect(gr, x, y, 1, 5, 0x5c351c)
    // 天花板横梁
    this.rect(gr, 0, 0, W, 12, 0x2b1a14)
    this.rect(gr, 0, 11, W, 2, 0x3d261c)
    for (let x = 30; x < W; x += 90) {
      this.rect(gr, x, 12, 1, 6, 0x222222)
      this.rect(gr, x - 3, 18, 7, 3, 0x3a3a3a)
    }

    // ===== 招牌 =====
    this.rect(gr, 150, 2, 180, 20, 0x2a1810)
    this.rect(gr, 152, 4, 176, 16, 0x8b5a2b)
    this.rect(gr, 154, 6, 172, 12, 0x3a2416)
    label(g.barName || 'PIXEL CRAFT BREWERY', 240, 6, 8, 0xffd36e)

    // ===== 门 =====
    this.rect(gr, 2, 92, 30, 68, 0x2b1a14)
    this.rect(gr, 5, 95, 24, 65, 0x7a4a24)
    this.rect(gr, 8, 99, 18, 24, 0x9fd3e8)
    this.rect(gr, 8, 110, 18, 1, 0x7a4a24)
    this.rect(gr, 16, 99, 1, 24, 0x7a4a24)
    this.rect(gr, 24, 130, 3, 3, 0xd4a656)
    label('OPEN', 17, 84, 7, 0x7dff9a)

    // ===== 窗户框（内容在动态层） =====
    this.rect(gr, 38, 30, 74, 58, 0x2b1a14)
    this.rect(gr, 38, 86, 74, 4, 0x8b5a2b)

    // ===== 墙面装饰 =====
    const wallSlots = [
      [118, 34],
      [148, 34],
      [178, 34],
      [208, 34],
      [118, 66],
      [148, 66],
      [178, 66],
      [208, 66],
      [234, 50],
    ]
    let ws = 0
    const ceilingSlots = [60, 140, 210, 300, 380, 440]
    let cs = 0
    const floorDeco = [
      [44, 150],
      [252, 150],
      [36, 150],
    ]
    let fs = 0
    const barDeco = [
      [272, 112],
      [392, 112],
      [300, 112],
    ]
    let bs = 0
    for (const [id, count] of Object.entries(g.decorations)) {
      const d = decorationById[id]
      if (!d) continue
      for (let i = 0; i < count; i++) {
        const cols = d.colors.map(hex)
        if (d.slot === 'wall' || d.slot === 'window') {
          if (d.slot === 'window' && id === 'neon_sign') {
            this.drawNeon(gr, 46 + i * 34, 40, cols)
            continue
          }
          const s = wallSlots[ws++]
          if (s) this.drawWallDeco(gr, id, s[0], s[1], cols)
        } else if (d.slot === 'ceiling') {
          const x = ceilingSlots[cs++]
          if (x !== undefined) this.drawCeilingDeco(gr, id, x, cols)
        } else if (d.slot === 'floor' && !d.seats) {
          const s = floorDeco[fs++]
          if (s) this.drawFloorDeco(gr, id, s[0], s[1], cols)
        } else if (d.slot === 'bar' && !d.seats) {
          const s = barDeco[bs++]
          if (s) this.drawBarDeco(gr, id, s[0], s[1], cols)
        }
      }
    }

    // ===== 桌椅沙发 =====
    const layout = computeLayout(g)
    for (const it of layout.items) {
      if (it.kind === 'table') {
        // 椅子
        for (const dx of [-11, 11]) {
          this.rect(gr, it.x + dx - 4, it.y - 9, 8, 2, 0x5c351c)
          this.rect(gr, it.x + dx - 4, it.y - 9, 1, 9, 0x4a2a14)
          this.rect(gr, it.x + dx + 3, it.y - 9, 1, 9, 0x4a2a14)
          this.rect(gr, it.x + dx + (dx < 0 ? -4 : 3), it.y - 18, 1, 10, 0x4a2a14)
        }
        this.rect(gr, it.x - 9, it.y - 14, 18, 3, 0xa0703c)
        this.rect(gr, it.x - 9, it.y - 11, 18, 1, 0x6b4226)
        this.rect(gr, it.x - 1, it.y - 11, 2, 11, 0x5c351c)
        this.rect(gr, it.x - 4, it.y - 1, 8, 1, 0x4a2a14)
      } else {
        this.rect(gr, it.x - 17, it.y - 18, 34, 8, 0x7a2e3a)
        this.rect(gr, it.x - 17, it.y - 11, 34, 8, 0x93394a)
        this.rect(gr, it.x - 19, it.y - 15, 3, 13, 0x6a2533)
        this.rect(gr, it.x + 16, it.y - 15, 3, 13, 0x6a2533)
        this.rect(gr, it.x - 16, it.y - 3, 2, 3, 0x2b1a14)
        this.rect(gr, it.x + 14, it.y - 3, 2, 3, 0x2b1a14)
      }
    }

    // ===== 后吧台：酒架 =====
    this.rect(gr, BAR_X0 - 4, 26, BAR_X1 - BAR_X0 + 8, 72, 0x3a2416)
    for (const sy of [40, 62, 84]) {
      this.rect(gr, BAR_X0, sy, BAR_X1 - BAR_X0, 2, 0x8b5a2b)
      for (let x = BAR_X0 + 4; x < BAR_X1 - 4; x += 7) {
        const c = [0x2f6b3a, 0x7a3b16, 0xb8860b, 0x3b5b7a, 0x8b2f3a, 0xd9c27a][(x * 13 + sy) % 6]
        this.rect(gr, x, sy - 9, 4, 9, c)
        this.rect(gr, x + 1, sy - 12, 2, 3, c)
        this.rect(gr, x + 1, sy - 7, 2, 3, 0xf3e2c0, 0.6)
      }
    }
    // 黑板菜单（今日酒单）
    this.rect(gr, 412, 22, 62, 66, 0x6b4226)
    this.rect(gr, 414, 24, 58, 62, 0x1f2a24)
    label("TODAY'S TAP", 443, 26, 7, 0xf3e2c0)

    // ===== 吧台 =====
    this.rect(gr, BAR_X0 - 6, COUNTER_Y - 4, BAR_X1 - BAR_X0 + 12, 5, 0xa0703c)
    this.rect(gr, BAR_X0 - 6, COUNTER_Y - 4, BAR_X1 - BAR_X0 + 12, 1, 0xc08850)
    this.rect(gr, BAR_X0 - 4, COUNTER_Y + 1, BAR_X1 - BAR_X0 + 8, 36, 0x6b4226)
    for (let x = BAR_X0; x < BAR_X1; x += 12) this.rect(gr, x, COUNTER_Y + 4, 10, 30, 0x5c351c)
    this.rect(gr, BAR_X0 - 4, COUNTER_Y + 34, BAR_X1 - BAR_X0 + 8, 2, 0xb8860b)
    // 高脚凳
    for (const s of layout.seats.filter((x) => x.kind === 'bar')) {
      this.rect(gr, s.x - 4, FLOOR_Y - 12, 8, 2, 0x8b2f3a)
      this.rect(gr, s.x - 1, FLOOR_Y - 10, 2, 10, 0x777777)
      this.rect(gr, s.x - 3, FLOOR_Y - 1, 6, 1, 0x555555)
    }
    // 酒头
    const n = g.taps.length
    const shown = Math.min(n, 12)
    this.rect(gr, BAR_X0 + 6, COUNTER_Y - 20, BAR_X1 - BAR_X0 - 12, 3, 0xb0b0b8)
    for (let i = 0; i < shown; i++) {
      const x = tapX(i, n)
      this.rect(gr, x - 1, COUNTER_Y - 17, 2, 6, 0xc0c0c8)
      this.rect(gr, x - 1, COUNTER_Y - 11, 3, 2, 0x909098)
    }
    if (n > 12) label(`+${n - 12}`, BAR_X1 - 10, COUNTER_Y - 28, 7, 0xffd36e)

    // ===== 冰箱 / 冷库 =====
    const cold = g.equipment.coldStorage
    this.rect(gr, 412, 94, 60, 64, 0xd8dde3)
    this.rect(gr, 414, 96, 56, 60, cold >= 1 ? 0x9fb8c8 : 0xc8ced6)
    this.rect(gr, 414, 125, 56, 1, 0x8a96a3)
    this.rect(gr, 464, 104, 2, 14, 0x707a85)
    this.rect(gr, 464, 132, 2, 14, 0x707a85)
    if (cold >= 1) for (let i = 0; i < 4; i++) this.rect(gr, 418 + i * 11, 100, 8, 22, [0xd9822b, 0x3d1a0b, 0xf2c94c, 0x93451a][i])
    label(['旧冰箱', '冷藏柜', '冷库', '恒温库'][cold] ?? '冰箱', 440, 146, 7, 0x333a44)

    // ===== 分隔：后方酿造区域 =====
    this.rect(gr, 0, 168, W, 102, 0x2a2a33)
    for (let y = BREW_TOP; y < BREW_FLOOR; y += 8) for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) this.rect(gr, x, y, 15, 7, 0x30303a)
    this.rect(gr, 0, BREW_FLOOR, W, 8, 0x45454f)
    for (let x = 0; x < W; x += 12) this.rect(gr, x, BREW_FLOOR + 1, 10, 1, 0x50505c)
    this.rect(gr, 0, 168, W, 6, 0x1d1414)
    this.rect(gr, 0, 172, W, 1, 0x8b5a2b)
    label('—— 后方酿造区域 ——', W / 2, 174, 7, 0xd8c8b0)

    // 麦芽袋
    for (let i = 0; i < 4; i++) {
      const x = 8 + (i % 2) * 16
      const y = BREW_FLOOR - 14 - Math.floor(i / 2) * 12
      this.rect(gr, x, y, 15, 13, 0xcdb88a)
      this.rect(gr, x + 2, y - 2, 11, 3, 0xb8a272)
      this.rect(gr, x + 4, y + 5, 7, 3, 0x8b6a3a)
    }
    label('麦芽', 22, BREW_FLOOR - 40, 7, 0xcdb88a)
    // 研磨机
    const mill = g.equipment.mill
    this.rect(gr, 46, BREW_FLOOR - 30, 16, 30, 0x5c5c66)
    this.rect(gr, 44, BREW_FLOOR - 40, 20, 10, mill >= 2 ? 0x3b5b7a : 0x8a8a94)
    this.rect(gr, 62, BREW_FLOOR - 26, 6, 2, 0x333333)
    label('研磨', 54, BREW_FLOOR - 50, 7)
    // 糖化锅
    const mt = g.equipment.mashTun
    const mtw = 26 + mt * 4
    this.drawVessel(gr, 76, BREW_FLOOR, mtw, 34 + mt * 4, mt >= 1 ? 0xb8bcc4 : 0x3b6ea5, '糖化锅', label)
    // 煮沸锅
    const kt = g.equipment.kettle
    const ktw = 26 + kt * 5
    this.drawVessel(gr, 76 + mtw + 10, BREW_FLOOR, ktw, 34 + kt * 5, 0xc8ccd4, '煮沸锅', label)
    this.rect(gr, 76 + mtw + 10 + 4, BREW_FLOOR - 4, ktw - 8, 4, 0x3a2a2a)
    // 发酵罐（数量 = 拥有的发酵罐）
    let fx = 76 + mtw + ktw + 26
    for (const f of g.fermenters) {
      const cap = g.fermenterCapacity(f)
      const fw = cap >= 2000 ? 26 : cap >= 500 ? 22 : cap >= 100 ? 18 : 13
      const fh = cap >= 2000 ? 58 : cap >= 500 ? 50 : cap >= 100 ? 42 : 24
      if (fx + fw > 352) break
      if (f.tier === 0) {
        this.rect(gr, fx, BREW_FLOOR - fh, fw, fh, 0xe8e2d0)
        this.rect(gr, fx - 1, BREW_FLOOR - fh, fw + 2, 3, 0xd8d0b8)
        this.rect(gr, fx + fw / 2 - 1, BREW_FLOOR - fh - 5, 2, 5, 0x9fd3e8)
      } else {
        this.rect(gr, fx, BREW_FLOOR - fh, fw, fh - 8, 0xc8ccd4)
        this.rect(gr, fx + 1, BREW_FLOOR - fh + 2, 2, fh - 12, 0xe8ecf0)
        this.rect(gr, fx + 3, BREW_FLOOR - 8, fw - 6, 4, 0xa8acb4)
        this.rect(gr, fx + fw / 2 - 1, BREW_FLOOR - 4, 2, 4, 0x777777)
        this.rect(gr, fx + 2, BREW_FLOOR - 4, 1, 4, 0x777777)
        this.rect(gr, fx + fw - 3, BREW_FLOOR - 4, 1, 4, 0x777777)
      }
      fx += fw + 5
    }
    label('发酵罐', (76 + mtw + ktw + 26 + Math.min(fx, 352)) / 2, BREW_FLOOR - 72, 7)
    // 木桶
    const slots = g.barrelSlots
    for (let i = 0; i < Math.min(slots, 8); i++) {
      const bx = 358 + (i % 4) * 13
      const by = BREW_FLOOR - 12 - Math.floor(i / 4) * 12
      const owned = i < g.barrels.length
      this.rect(gr, bx, by, 12, 11, owned ? 0x8b5a2b : 0x3a2a20, owned ? 1 : 0.5)
      if (owned) {
        this.rect(gr, bx, by + 2, 12, 1, 0x333333)
        this.rect(gr, bx, by + 8, 12, 1, 0x333333)
        this.rect(gr, bx + 5, by + 4, 2, 2, 0x5c351c)
      }
    }
    if (slots > 0) label('木桶', 384, BREW_FLOOR - 38, 7)
    // 清酒罐
    if (g.equipment.brightTank > 0) {
      this.rect(gr, 412, BREW_FLOOR - 44, 14, 40, 0xd0d4dc)
      this.rect(gr, 413, BREW_FLOOR - 42, 2, 36, 0xf0f4f8)
      label('清酒', 419, BREW_FLOOR - 54, 7)
    }
    // 酒桶堆
    const kegs = Math.min(9, 3 + g.equipment.keg * 2)
    for (let i = 0; i < kegs; i++) {
      const kx = 432 + (i % 3) * 14
      const ky = BREW_FLOOR - 14 - Math.floor(i / 3) * 14
      this.rect(gr, kx, ky, 12, 13, 0xa8acb4)
      this.rect(gr, kx, ky + 3, 12, 1, 0x707480)
      this.rect(gr, kx, ky + 9, 12, 1, 0x707480)
      this.rect(gr, kx + 4, ky - 1, 4, 1, 0x505460)
    }
    label('酒桶', 452, BREW_FLOOR - 60, 7)
  }

  drawVessel(gr: Graphics, x: number, floor: number, w: number, h: number, color: number, name: string, label: (t: string, x: number, y: number, s?: number) => void) {
    this.rect(gr, x, floor - h, w, h - 6, color)
    this.rect(gr, x + 2, floor - h + 2, 3, h - 10, 0xffffff, 0.25)
    this.rect(gr, x - 1, floor - h - 2, w + 2, 3, 0x8a8e96)
    this.rect(gr, x + 2, floor - 6, 2, 6, 0x555555)
    this.rect(gr, x + w - 4, floor - 6, 2, 6, 0x555555)
    this.rect(gr, x + w - 2, floor - 16, 6, 2, 0x777777)
    label(name, x + w / 2, floor - h - 13, 7)
  }

  drawNeon(gr: Graphics, x: number, y: number, cols: number[]) {
    const c = cols[0] ?? 0xff4fa3
    this.rect(gr, x, y, 22, 2, c)
    this.rect(gr, x, y, 2, 12, c)
    this.rect(gr, x + 20, y, 2, 12, c)
    this.rect(gr, x + 6, y + 5, 10, 2, cols[1] ?? 0x4fd8ff)
    this.rect(gr, x - 2, y - 2, 26, 16, c, 0.15)
  }

  drawWallDeco(gr: Graphics, id: string, x: number, y: number, c: number[]) {
    const c0 = c[0] ?? 0x888888
    const c1 = c[1] ?? 0x555555
    const c2 = c[2] ?? 0xdddddd
    switch (id) {
      case 'beer_poster':
        this.rect(gr, x, y, 18, 24, c1)
        this.rect(gr, x + 1, y + 1, 16, 22, c0)
        this.rect(gr, x + 6, y + 6, 6, 10, 0xe8a73a)
        this.rect(gr, x + 6, y + 5, 6, 2, 0xffffff)
        this.rect(gr, x + 3, y + 18, 12, 2, c2)
        break
      case 'chalkboard_menu':
        this.rect(gr, x, y, 26, 20, 0x8b5a2b)
        this.rect(gr, x + 1, y + 1, 24, 18, 0x1f2a24)
        for (let i = 0; i < 4; i++) this.rect(gr, x + 3, y + 4 + i * 4, 14 + ((i * 5) % 7), 1, 0xe8e8e8)
        break
      case 'barrel_wall':
        for (let i = 0; i < 6; i++) {
          const bx = x + (i % 3) * 9
          const by = y + Math.floor(i / 3) * 10
          this.rect(gr, bx, by, 8, 9, 0x8b5a2b)
          this.rect(gr, bx + 3, by + 3, 2, 2, 0x3a2416)
        }
        break
      case 'speakers':
        this.rect(gr, x, y, 10, 16, 0x222222)
        this.rect(gr, x + 2, y + 2, 6, 6, 0x444444)
        this.rect(gr, x + 3, y + 10, 4, 4, 0x444444)
        break
      case 'darts':
        this.rect(gr, x + 2, y, 18, 18, 0x222222)
        this.rect(gr, x + 4, y + 2, 14, 14, 0xd9534f)
        this.rect(gr, x + 7, y + 5, 8, 8, 0xf3e2c0)
        this.rect(gr, x + 10, y + 8, 2, 2, 0x5cb85c)
        break
      case 'display_case':
        this.rect(gr, x, y, 26, 22, 0x6b4226)
        this.rect(gr, x + 2, y + 2, 22, 18, 0x9fd3e8, 0.4)
        for (let i = 0; i < 4; i++) this.rect(gr, x + 4 + i * 5, y + 8, 3, 10, [0x2f6b3a, 0x7a3b16, 0xb8860b, 0x8b2f3a][i])
        break
      case 'world_map':
        this.rect(gr, x, y, 28, 18, 0x8b5a2b)
        this.rect(gr, x + 1, y + 1, 26, 16, 0x3b6ea5)
        this.rect(gr, x + 4, y + 4, 6, 6, 0x5cb85c)
        this.rect(gr, x + 13, y + 3, 5, 5, 0x5cb85c)
        this.rect(gr, x + 15, y + 9, 4, 5, 0x5cb85c)
        this.rect(gr, x + 21, y + 11, 4, 3, 0x5cb85c)
        break
      case 'fireplace':
        this.rect(gr, x - 2, y + 8, 28, 26, 0x7a6a62)
        this.rect(gr, x + 4, y + 16, 16, 18, 0x1a1010)
        break
      case 'tap_handle_wall':
        this.rect(gr, x, y, 26, 20, 0x3a2416)
        for (let i = 0; i < 6; i++) this.rect(gr, x + 2 + i * 4, y + 3 + (i % 2) * 3, 2, 12, [0xd9534f, 0xf0ad4e, 0x5cb85c, 0x337ab7, 0x6f42c1, 0xe8e8e8][i])
        break
      default:
        this.rect(gr, x, y, 20, 18, c1)
        this.rect(gr, x + 1, y + 1, 18, 16, c0)
        this.rect(gr, x + 5, y + 5, 10, 8, c2)
    }
  }

  drawCeilingDeco(gr: Graphics, id: string, x: number, c: number[]) {
    if (id === 'hop_garland') {
      for (let i = 0; i < 7; i++) {
        this.rect(gr, x + i * 6, 13 + Math.abs(3 - i), 4, 4, 0x6aa84f)
        this.rect(gr, x + i * 6 + 1, 14 + Math.abs(3 - i), 2, 2, 0x8fcf6f)
      }
    } else if (id === 'string_lights') {
      for (let i = 0; i < 10; i++) this.rect(gr, x + i * 5, 14 + Math.round(Math.sin(i * 0.7) * 2), 2, 2, c[i % c.length] ?? 0xffd36e)
    } else {
      for (let i = 0; i < 6; i++) {
        this.rect(gr, x + i * 7, 13, 5, 6, c[i % c.length] ?? 0xd9534f)
        this.rect(gr, x + i * 7 + 1, 19, 3, 1, c[i % c.length] ?? 0xd9534f)
      }
    }
  }

  drawFloorDeco(gr: Graphics, id: string, x: number, y: number, c: number[]) {
    if (id === 'plants') {
      this.rect(gr, x - 4, y - 6, 8, 6, 0x8b5a2b)
      this.rect(gr, x - 6, y - 18, 12, 12, c[0] ?? 0x3f8f3a)
      this.rect(gr, x - 3, y - 22, 6, 6, c[1] ?? 0x5cb85c)
    } else if (id === 'board_games') {
      this.rect(gr, x - 6, y - 6, 12, 6, c[0] ?? 0xd9534f)
      this.rect(gr, x - 5, y - 10, 10, 4, c[1] ?? 0x337ab7)
    } else {
      this.rect(gr, x - 5, y - 10, 10, 10, c[0] ?? 0x888888)
    }
  }

  drawBarDeco(gr: Graphics, id: string, x: number, y: number, c: number[]) {
    if (id === 'vinyl_player') {
      this.rect(gr, x - 6, y, 12, 4, 0x6b4226)
      this.rect(gr, x - 4, y - 1, 8, 1, 0x111111)
    } else if (id === 'beer_fridge') {
      this.rect(gr, x - 7, y - 8, 14, 12, 0x333a44)
      this.rect(gr, x - 6, y - 7, 12, 10, 0x9fd3e8, 0.6)
    } else if (id === 'pixel_cat') {
      this.rect(gr, x - 4, y, 8, 4, c[0] ?? 0xf0ad4e)
      this.rect(gr, x + 2, y - 3, 4, 4, c[0] ?? 0xf0ad4e)
      this.rect(gr, x + 2, y - 4, 1, 1, c[0] ?? 0xf0ad4e)
      this.rect(gr, x + 5, y - 4, 1, 1, c[0] ?? 0xf0ad4e)
      this.rect(gr, x - 5, y - 2, 1, 3, c[0] ?? 0xf0ad4e)
    }
  }

  // ---------------- 人物 ----------------
  drawPerson(
    gr: Graphics,
    x: number,
    y: number,
    look: { skin: string; hair: string; hairStyle: string; shirt: string; pants: string; accessory: string; hat?: string },
    opts: { sitting?: boolean; facing?: number; walk?: number; beer?: number; apron?: boolean; hideLegs?: boolean },
  ) {
    const skin = hex(look.skin)
    const hair = hex(look.hair)
    const shirt = hex(look.shirt)
    const pants = hex(look.pants)
    x = Math.round(x)
    y = Math.round(y)
    const f = opts.facing ?? 1
    const sit = opts.sitting
    const bodyBottom = sit ? y - 9 : y - 8
    // 腿
    if (!opts.hideLegs) {
      if (sit) {
        this.rect(gr, x - 3, bodyBottom, 6, 2, pants)
        this.rect(gr, x + (f > 0 ? 2 : -4), bodyBottom, 2, 8, pants)
        this.rect(gr, x - 1, bodyBottom + 2, 2, 6, pants)
      } else {
        const ph = Math.floor((opts.walk ?? 0) / 1.5) % 2
        this.rect(gr, x - 3, y - 8, 2, 8 - (ph ? 1 : 0), pants)
        this.rect(gr, x + 1, y - 8, 2, 8 - (ph ? 0 : 1), pants)
        this.rect(gr, x - 3, y - 1, 3, 1, 0x222222)
        this.rect(gr, x + 1, y - 1, 3, 1, 0x222222)
      }
    }
    // 身体
    const by = bodyBottom - 9
    this.rect(gr, x - 4, by, 8, 9, shirt)
    if (opts.apron) this.rect(gr, x - 3, by + 3, 6, 6, 0x3a2416)
    // 手臂
    this.rect(gr, x + (f > 0 ? 3 : -5), by + 1, 2, 6, shirt)
    this.rect(gr, x + (f > 0 ? 3 : -5), by + 7, 2, 1, skin)
    // 啤酒
    if (opts.beer !== undefined) {
      const gx = x + (f > 0 ? 5 : -8)
      this.rect(gr, gx, by + 3, 3, 5, opts.beer)
      this.rect(gr, gx, by + 2, 3, 1, 0xfff8e8)
    }
    // 头
    const hy = by - 7
    this.rect(gr, x - 3, hy, 7, 7, skin)
    this.rect(gr, x + (f > 0 ? 2 : -1), hy + 3, 1, 1, 0x1a1010)
    // 发型
    switch (look.hairStyle) {
      case 'bald':
        break
      case 'long':
        this.rect(gr, x - 4, hy - 1, 9, 3, hair)
        this.rect(gr, x - 4, hy, 2, 9, hair)
        this.rect(gr, x + 3, hy, 2, 7, hair)
        break
      case 'bun':
        this.rect(gr, x - 3, hy - 1, 7, 2, hair)
        this.rect(gr, x - 1, hy - 4, 4, 3, hair)
        break
      case 'mohawk':
        this.rect(gr, x - 1, hy - 3, 3, 3, hair)
        break
      case 'curly':
        this.rect(gr, x - 4, hy - 2, 9, 3, hair)
        this.rect(gr, x - 4, hy + 1, 1, 3, hair)
        this.rect(gr, x + 4, hy + 1, 1, 3, hair)
        break
      case 'ponytail':
        this.rect(gr, x - 3, hy - 1, 7, 2, hair)
        this.rect(gr, x + (f > 0 ? -5 : 4), hy + 1, 2, 5, hair)
        break
      case 'cap':
        this.rect(gr, x - 3, hy - 2, 7, 3, shirt === 0xd9534f ? 0x337ab7 : 0xd9534f)
        this.rect(gr, x + (f > 0 ? 3 : -5), hy, 3, 1, shirt === 0xd9534f ? 0x337ab7 : 0xd9534f)
        break
      default:
        this.rect(gr, x - 3, hy - 1, 7, 2, hair)
        this.rect(gr, x + (f > 0 ? -3 : 3), hy, 1, 3, hair)
    }
    if (look.hat) {
      const hc = 0x3a2a4a
      if (look.hat === 'tophat') {
        this.rect(gr, x - 4, hy - 1, 9, 1, hc)
        this.rect(gr, x - 2, hy - 6, 5, 5, hc)
      } else if (look.hat === 'beret') this.rect(gr, x - 4, hy - 2, 8, 2, 0x8b2f3a)
      else if (look.hat === 'hood') {
        this.rect(gr, x - 4, hy - 2, 9, 3, 0x2b2d42)
        this.rect(gr, x - 4, hy, 1, 6, 0x2b2d42)
      } else if (look.hat === 'bandana') this.rect(gr, x - 3, hy - 1, 7, 2, 0xd9534f)
      else this.rect(gr, x - 3, hy - 2, 7, 2, 0x5c351c)
    }
    switch (look.accessory) {
      case 'glasses':
        this.rect(gr, x - 2, hy + 3, 6, 1, 0x111111)
        break
      case 'beard':
        this.rect(gr, x - 3, hy + 5, 7, 3, hair)
        break
      case 'hat':
        this.rect(gr, x - 4, hy - 2, 9, 2, 0x2b2d42)
        this.rect(gr, x - 2, hy - 4, 5, 2, 0x2b2d42)
        break
      case 'headphones':
        this.rect(gr, x - 4, hy + 2, 1, 3, 0x222222)
        this.rect(gr, x + 4, hy + 2, 1, 3, 0x222222)
        this.rect(gr, x - 3, hy - 2, 7, 1, 0x222222)
        break
      case 'scarf':
        this.rect(gr, x - 3, by, 7, 2, 0xd9534f)
        break
      case 'camera':
        this.rect(gr, x - 2, by + 3, 4, 3, 0x222222)
        break
    }
  }

  // ---------------- 每帧 ----------------
  render(dtReal: number) {
    if (!this.ready) return
    this.time += dtReal
    const g = this.g
    const key = JSON.stringify([g.decorations, g.equipment, g.fermenters.map((f) => f.tier), g.taps.length, g.barrels.length, g.barName, this.scale])
    if (key !== this.staticKey) {
      this.staticKey = key
      this.buildStatic()
    }
    const gr = this.dynG
    gr.clear()
    this.drawWindow(gr, dtReal)
    this.drawLights(gr)
    this.drawMenuBoard()
    this.drawBrewery(gr, dtReal)
    // 客人（后排先画）
    const cs = [...this.sim.customers].sort((a, b) => a.y - b.y)
    for (const c of cs) this.drawCustomer(gr, c)
    // 调酒师（在吧台后）
    for (const b of this.sim.bartenders) {
      const look = b.id === 0
        ? { skin: '#eac39b', hair: '#3b2a20', hairStyle: 'short', shirt: '#e8e8e8', pants: '#2c3e50', accessory: 'none' }
        : { skin: '#d9a477', hair: '#1b1b1f', hairStyle: 'ponytail', shirt: '#2b2d42', pants: '#2c3e50', accessory: 'none' }
      const pouring = b.task?.phase === 'pour'
      const busy = b.task?.phase === 'deliver'
      this.drawPerson(gr, b.x, COUNTER_Y + 2, look, { apron: true, facing: busy ? -1 : 1, hideLegs: true, beer: busy || pouring ? 0xe8a73a : undefined })
    }
    // 吧台前挡（遮住调酒师下半身）
    this.rect(gr, BAR_X0 - 6, COUNTER_Y - 4, BAR_X1 - BAR_X0 + 12, 5, 0xa0703c)
    this.rect(gr, BAR_X0 - 6, COUNTER_Y - 4, BAR_X1 - BAR_X0 + 12, 1, 0xc08850)
    // 酒头把手颜色（显示正在出售的酒）
    const n = g.taps.length
    for (let i = 0; i < Math.min(n, 12); i++) {
      const t = g.taps[i]
      const b = t.batchId ? g.batches.find((x) => x.id === t.batchId) : undefined
      const x = tapX(i, n)
      this.rect(gr, x - 1, COUNTER_Y - 27, 3, 8, b ? srmToHex(b.color) : 0x444444)
      if (t.mystery) this.rect(gr, x - 1, COUNTER_Y - 29, 3, 2, 0xff4fa3)
    }
    this.drawParticles(dtReal)
    this.drawBubbles()
  }

  skyColor(minute: number): [number, number] {
    const h = (minute / 60) % 24
    if (h >= 14 && h < 17) return [0x7ec8f0, 0xbfe6ff]
    if (h >= 17 && h < 18.5) return [0xf0a060, 0xffd890]
    if (h >= 18.5 && h < 20) return [0x7a4a8a, 0xe07a5a]
    return [0x0e1030, 0x1c2050]
  }

  drawWindow(gr: Graphics, dt: number) {
    const g = this.g
    const [top, bottom] = this.skyColor(g.minute)
    const x0 = 40
    const y0 = 32
    const w = 70
    const h = 54
    for (let i = 0; i < h; i += 2) {
      const t = i / h
      const r = ((top >> 16) & 255) * (1 - t) + ((bottom >> 16) & 255) * t
      const gg = ((top >> 8) & 255) * (1 - t) + ((bottom >> 8) & 255) * t
      const b = (top & 255) * (1 - t) + (bottom & 255) * t
      this.rect(gr, x0, y0 + i, w, 2, (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b))
    }
    const hour = (g.minute / 60) % 24
    const night = hour >= 20 || hour < 6
    if (night) {
      for (let i = 0; i < 9; i++) this.rect(gr, x0 + ((i * 23) % w), y0 + ((i * 17) % 26), 1, 1, 0xffffff, 0.5 + 0.5 * Math.sin(this.time * 2 + i))
      this.rect(gr, x0 + 52, y0 + 6, 6, 6, 0xf3efd8)
      this.rect(gr, x0 + 54, y0 + 6, 4, 4, 0x1c2050, 0.9)
    } else if (g.weather === 'sunny' || g.weather === 'hot') {
      this.rect(gr, x0 + 50, y0 + 6, 9, 9, g.weather === 'hot' ? 0xffb030 : 0xffe066)
    }
    // 远处的城市
    for (let i = 0; i < 7; i++) {
      const bh = 8 + ((i * 37) % 14)
      this.rect(gr, x0 + i * 10, y0 + h - bh, 9, bh, night ? 0x141428 : 0x5a6a80)
      if (night) for (let k = 0; k < 3; k++) if ((i + k) % 2) this.rect(gr, x0 + i * 10 + 2 + k * 2, y0 + h - bh + 3 + k * 3, 1, 1, 0xffd36e)
    }
    // 云
    if (['cloudy', 'rain', 'storm', 'snow', 'cold'].includes(g.weather)) {
      const cc = g.weather === 'storm' ? 0x4a4a5a : g.weather === 'cloudy' ? 0xd8dde3 : 0x9aa0aa
      for (let i = 0; i < 3; i++) {
        const cx = x0 + ((this.time * 3 + i * 30) % (w + 20)) - 14
        this.rect(gr, Math.max(x0, cx), y0 + 6 + i * 6, Math.min(16, x0 + w - Math.max(x0, cx)), 5, cc, 0.9)
      }
    }
    // 天气粒子
    const wx = g.weather
    if (wx === 'rain' || wx === 'storm') {
      for (let i = 0; i < (wx === 'storm' ? 26 : 16); i++) {
        const px = x0 + ((i * 29 + this.time * 40) % w)
        const py = y0 + ((i * 13 + this.time * 90) % h)
        this.rect(gr, px, py, 1, 3, 0x9fc8ff, 0.8)
      }
      if (wx === 'storm') {
        this.lightning -= dt
        if (this.lightning < -3 - Math.random() * 4) this.lightning = 0.15
        if (this.lightning > 0) this.rect(gr, x0, y0, w, h, 0xffffff, 0.6)
      }
    } else if (wx === 'snow' || wx === 'cold') {
      for (let i = 0; i < 18; i++) {
        const px = x0 + ((i * 31 + Math.sin(this.time + i) * 4 + 70) % w)
        const py = y0 + ((i * 11 + this.time * 12) % h)
        this.rect(gr, px, py, 1, 1, 0xffffff)
      }
      if (wx === 'snow') this.rect(gr, x0, y0 + h - 3, w, 3, 0xf0f4f8)
    } else if (wx === 'hot') {
      this.rect(gr, x0, y0, w, h, 0xffa040, 0.08 + 0.04 * Math.sin(this.time * 3))
    }
    // 窗格
    this.rect(gr, x0 + w / 2 - 1, y0, 2, h, 0x2b1a14)
    this.rect(gr, x0, y0 + h / 2 - 1, w, 2, 0x2b1a14)
  }

  drawLights(gr: Graphics) {
    const hour = (this.g.minute / 60) % 24
    const night = hour >= 18 || hour < 6
    const open = this.g.minute >= OPEN_TIME && this.g.minute < CLOSE_TIME
    for (let x = 30; x < W; x += 90) {
      this.rect(gr, x - 2, 21, 5, 2, night || open ? 0xffd36e : 0x777766)
      if (night) this.rect(gr, x - 14, 23, 29, 30, 0xffc860, 0.05)
    }
    // OPEN 灯
    this.rect(gr, 8, 84, 18, 8, open ? 0x7dff9a : 0x444444, open ? 0.25 : 0.5)
  }

  menuText?: Text
  drawMenuBoard() {
    if (!this.menuText) {
      this.menuText = this.makeText(6, 0xf3e2c0)
      this.menuText.x = 417
      this.menuText.y = 35
      this.textLayer.addChild(this.menuText)
    }
    const lines = this.g.taps
      .slice(0, 7)
      .map((t, i) => {
        const b = t.batchId ? this.g.batches.find((x) => x.id === t.batchId) : undefined
        if (!b) return `${i + 1}. ----`
        const name = t.mystery ? 'Mystery Tap' : b.displayName
        return `${i + 1}.${name.slice(0, 10)} $${t.price}`
      })
      .join('\n')
    if (this.menuText.text !== lines) this.menuText.text = lines
    this.menuText.style.fontSize = 6
    this.menuText.style.lineHeight = 7
  }

  drawBrewery(gr: Graphics, dt: number) {
    const g = this.g
    const mtw = 26 + g.equipment.mashTun * 4
    const ktw = 26 + g.equipment.kettle * 5
    const brewing = g.today.brews > 0 && g.minute < 20 * 60
    // 糖化锅、煮锅冒蒸汽
    if (brewing || Math.random() < 0.02) {
      if (Math.random() < dt * 8) this.spawnParticle(76 + mtw / 2 + (Math.random() - 0.5) * 10, BREW_FLOOR - 36 - g.equipment.mashTun * 4, 'steam')
      if (Math.random() < dt * 10) this.spawnParticle(76 + mtw + 10 + ktw / 2 + (Math.random() - 0.5) * 10, BREW_FLOOR - 38 - g.equipment.kettle * 5, 'steam')
    }
    // 煮沸火焰
    if (brewing) {
      const fx = 76 + mtw + 10
      for (let i = 0; i < 4; i++) this.rect(gr, fx + 5 + i * ((ktw - 10) / 3), BREW_FLOOR - 4 - Math.round(Math.random() * 2), 2, 3, Math.random() < 0.5 ? 0xff9a3a : 0xffd36e)
    }
    // 发酵罐：酒液与气泡
    let fx = 76 + mtw + ktw + 26
    for (const f of g.fermenters) {
      const cap = g.fermenterCapacity(f)
      const fw = cap >= 2000 ? 26 : cap >= 500 ? 22 : cap >= 100 ? 18 : 13
      const fh = cap >= 2000 ? 58 : cap >= 500 ? 50 : cap >= 100 ? 42 : 24
      if (fx + fw > 352) break
      const b = f.batchId ? g.batches.find((x) => x.id === f.batchId) : undefined
      if (b) {
        const fill = Math.max(0.2, Math.min(1, b.volume / cap))
        const lh = Math.round((fh - 12) * fill)
        if (f.tier === 0) this.rect(gr, fx + 2, BREW_FLOOR - 2 - lh, fw - 4, lh, srmToHex(b.color), 0.75)
        else {
          // 状态灯
          const c = b.stage === 'ready' ? 0x7dff9a : b.stage === 'maturing' ? 0x4fd8ff : 0xffb030
          this.rect(gr, fx + fw - 4, BREW_FLOOR - fh + 6, 2, 2, c)
          this.rect(gr, fx + 4, BREW_FLOOR - fh + 10, fw - 8, 3, srmToHex(b.color))
        }
        if (b.stage === 'fermenting' && Math.random() < dt * 4) this.spawnParticle(fx + fw / 2, BREW_FLOOR - fh - 4, 'bubble')
        if (b.stage === 'ready' && Math.sin(this.time * 6) > 0) this.rect(gr, fx + fw / 2 - 1, BREW_FLOOR - fh - 8, 3, 3, 0x7dff9a)
      }
      fx += fw + 5
    }
    // 木桶陈酿标记
    g.barrels.forEach((s, i) => {
      if (i >= 8 || !s.batchId) return
      const bx = 358 + (i % 4) * 13
      const by = BREW_FLOOR - 12 - Math.floor(i / 4) * 12
      this.rect(gr, bx + 4, by - 3, 4, 2, 0xffd36e, 0.5 + 0.5 * Math.sin(this.time * 2 + i))
    })
    // 员工搬运酒桶
    const workers = g.staff.brewer
    for (let i = 0; i < workers; i++) {
      const span = 300
      const p = ((this.time * 12 + i * 120) % (span * 2)) / span
      const x = p < 1 ? 80 + p * span : 80 + (2 - p) * span
      const facing = p < 1 ? 1 : -1
      this.drawPerson(gr, x, BREW_FLOOR, { skin: '#d9a477', hair: '#3b2a20', hairStyle: 'cap', shirt: '#3b5b7a', pants: '#2c3e50', accessory: 'none' }, { facing, walk: this.time * 6 })
      if (p < 1) {
        this.rect(gr, x + 4 * facing - 3, BREW_FLOOR - 18, 7, 8, 0xa8acb4)
        this.rect(gr, x + 4 * facing - 3, BREW_FLOOR - 15, 7, 1, 0x707480)
      }
    }
  }

  spawnParticle(x: number, y: number, layer: Particle['layer']) {
    if (this.particles.length > 220) return
    if (layer === 'steam') this.particles.push({ x, y, vx: (Math.random() - 0.5) * 4, vy: -10 - Math.random() * 6, life: 0, max: 1.6, color: 0xe8e8f0, size: 2, layer })
    else if (layer === 'bubble') this.particles.push({ x: x + (Math.random() - 0.5) * 4, y, vx: 0, vy: -8, life: 0, max: 0.8, color: 0xffffff, size: 1, layer })
    else this.particles.push({ x, y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 0, max: 0.8, color: 0xffd36e, size: 1, layer })
  }

  sparkle(x: number, y: number) {
    for (let i = 0; i < 12; i++) this.spawnParticle(x, y, 'spark')
  }

  drawParticles(dt: number) {
    const gr = this.fxG
    gr.clear()
    for (const p of this.particles) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.layer === 'spark') p.vy += 40 * dt
      const a = 1 - p.life / p.max
      const s = p.layer === 'steam' ? p.size + p.life * 3 : p.size
      if (a > 0) this.rect(gr, p.x, p.y, s, s, p.color, a * (p.layer === 'steam' ? 0.5 : 1))
    }
    this.particles = this.particles.filter((p) => p.life < p.max)
  }

  drawCustomer(gr: Graphics, c: Customer) {
    const sitting = c.state === 'browsing' || c.state === 'waiting' || c.state === 'drinking'
    const y = c.y
    this.drawPerson(gr, c.x, y, c.profile.look, {
      sitting,
      facing: c.facing,
      walk: c.walkPhase,
      beer: c.hasBeer ? c.beerColor : undefined,
    })
    // NPC 标记
    if (c.profile.npc) this.rect(gr, c.x - 1, y - (sitting ? 33 : 32), 3, 3, 0xffd36e, 0.6 + 0.4 * Math.sin(this.time * 4))
    // 等待中显示耐心条
    if (c.state === 'waiting') {
      const r = Math.max(0, c.patience / c.profile.personality.patience)
      this.rect(gr, c.x - 5, y - 30, 10, 2, 0x222222)
      this.rect(gr, c.x - 5, y - 30, Math.round(10 * r), 2, r > 0.5 ? 0x7dff9a : r > 0.25 ? 0xffd36e : 0xff5a5a)
    }
  }

  drawBubbles() {
    const all = this.g.settings.showBubbles ? this.sim.customers.filter((c) => c.bubble) : []
    // 新气泡优先，特殊客人优先
    all.sort((a, b) => (b.profile.npc ? 1 : 0) - (a.profile.npc ? 1 : 0) || b.bubble!.ttl - a.bubble!.ttl)
    const shown = all.slice(0, 8)
    while (this.bubbleTexts.length < shown.length) {
      const t = this.makeText(7, 0x2a1810)
      t.style.wordWrap = true
      t.style.breakWords = true
      t.style.wordWrapWidth = 110
      t.anchor.set(0.5, 1)
      this.textLayer.addChild(t)
      this.bubbleTexts.push(t)
    }
    const gr = this.fxG
    const placed: { x: number; y: number; w: number; h: number }[] = []
    const overlaps = (r: { x: number; y: number; w: number; h: number }) =>
      placed.some((q) => r.x < q.x + q.w + 1 && r.x + r.w + 1 > q.x && r.y < q.y + q.h + 1 && r.y + r.h + 1 > q.y)
    this.bubbleTexts.forEach((t, i) => {
      const c = shown[i]
      t.visible = false
      if (!c) return
      const text = c.bubble!.text
      if (t.text !== text) t.text = text
      const bw = Math.min(118, Math.ceil(t.width) + 6)
      const bh = Math.ceil(t.height) + 4
      let bx = Math.round(c.x - bw / 2)
      bx = Math.max(2, Math.min(W - bw - 2, bx))
      let by = Math.round(c.y - 34 - bh)
      let tries = 0
      while (overlaps({ x: bx, y: by, w: bw, h: bh }) && tries < 4) {
        by -= bh + 2
        tries++
      }
      if (overlaps({ x: bx, y: by, w: bw, h: bh }) || by < 14) return
      placed.push({ x: bx, y: by, w: bw, h: bh })
      t.visible = true
      const color = c.bubble!.kind === 'love' ? 0xffe0ec : c.bubble!.kind === 'angry' ? 0xffe0d0 : c.bubble!.kind === 'think' ? 0xe8eef8 : 0xfffaf0
      this.rect(gr, bx - 1, by, bw + 2, bh, 0x2a1810)
      this.rect(gr, bx, by - 1, bw, bh + 2, 0x2a1810)
      this.rect(gr, bx, by, bw, bh, color)
      if (tries === 0) {
        this.rect(gr, Math.round(c.x) - 1, by + bh, 3, 2, 0x2a1810)
        this.rect(gr, Math.round(c.x), by + bh, 1, 1, color)
      } else {
        // 被挤到上方时用细线连回头顶
        this.rect(gr, Math.round(c.x), by + bh, 1, Math.max(0, c.y - 34 - (by + bh)), 0x2a1810, 0.6)
      }
      t.x = bx + bw / 2
      t.y = by + bh - 2
      if (c.bubble!.kind === 'love') this.rect(gr, bx + bw - 4, by - 3, 3, 3, 0xff4f7a)
    })
  }

  /** 用于点击检测：返回点击位置的客人 */
  customerAt(px: number, py: number): Customer | undefined {
    const x = px / this.scale
    const y = py / this.scale
    return this.sim.customers.find((c) => Math.abs(c.x - x) < 6 && y < c.y && y > c.y - 30)
  }

  styleName(id?: string) {
    return id ? styleById[id]?.name : ''
  }
}

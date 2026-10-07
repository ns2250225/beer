import { srmToHex } from '../engine/sim'
import type { FlavorDim, LabelConfig } from '../types'

export function srmCss(srm: number) {
  return '#' + srmToHex(srm).toString(16).padStart(6, '0')
}

export const STATUS_COLORS = ['#555', '#7a7468', '#8c7a5a', '#e8a73a', '#c8d0d8', '#ffd36e']

export function dots(v: number, max = 5) {
  const n = Math.round(Math.max(0, Math.min(max, v)))
  return '●'.repeat(n) + '○'.repeat(max - n)
}

export const PRD_DIMS: FlavorDim[] = ['bitterness', 'sweetness', 'body', 'malt', 'hopAroma', 'fruity']

export function randomLabel(): LabelConfig {
  const pal = ['#1f3a5f', '#7a2e3a', '#2f6b3a', '#3a2416', '#5a2a6a', '#e8a73a', '#0f1a2a', '#d9534f', '#20b2aa', '#f3e2c0']
  const bg = pal[Math.floor(Math.random() * pal.length)]
  const fg = ['#f3e2c0', '#ffd36e', '#ffffff', '#1a1210'][Math.floor(Math.random() * 4)]
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
  return {
    bg,
    fg: fg === bg ? '#ffffff' : fg,
    pattern: pick(['none', 'stripes', 'dots', 'checker', 'waves', 'stars', 'diagonal', 'grid']),
    logo: pick(LOGOS),
    font: pick(['pixel', 'serif', 'bold', 'round']),
    border: pick(['none', 'single', 'double', 'dashed', 'ornate']),
    icon: pick(ICONS),
  }
}

export const LOGOS = ['hop', 'cat', 'star', 'moon', 'skull', 'wheat', 'barrel', 'planet', 'crown', 'wave', 'mountain', 'rocket']
export const ICONS = ['🍺', '🌿', '🐱', '⭐', '🌙', '🔥', '🍒', '🥭', '☕', '🍫', '🌊', '🚀', '👾', '🌸', '⚡', '🍋']

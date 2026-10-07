// Web Audio API 合成音效 + 简单 8-bit 背景音乐（不依赖任何音频文件）
let ctx: AudioContext | null = null
let master: GainNode | null = null
let musicGain: GainNode | null = null
let sfxVolume = 0.6
let musicVolume = 0.25
let musicTimer: number | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext
    if (!C) return null
    ctx = new C()
    master = ctx.createGain()
    master.gain.value = sfxVolume
    master.connect(ctx.destination)
    musicGain = ctx.createGain()
    musicGain.gain.value = musicVolume
    musicGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.2, when = 0, slide = 0, dest?: AudioNode) {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g)
  g.connect(dest || master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, vol = 0.15, filterFreq = 1200, when = 0) {
  const c = ac()
  if (!c || !master) return
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = filterFreq
  const g = c.createGain()
  g.gain.value = vol
  src.connect(f)
  f.connect(g)
  g.connect(master)
  src.start(c.currentTime + when)
}

export type Sfx = 'click' | 'coin' | 'pour' | 'discover' | 'bubble' | 'door' | 'levelup' | 'error' | 'brew' | 'achievement' | 'cheer'

export function sfx(name: Sfx) {
  if (sfxVolume <= 0) return
  switch (name) {
    case 'click':
      tone(660, 0.05, 'square', 0.08)
      break
    case 'coin':
      tone(988, 0.07, 'square', 0.1)
      tone(1319, 0.15, 'square', 0.1, 0.07)
      break
    case 'pour':
      noise(0.5, 0.12, 900)
      break
    case 'bubble':
      tone(300 + Math.random() * 200, 0.06, 'sine', 0.08, 0, 300)
      break
    case 'door':
      tone(523, 0.08, 'triangle', 0.1)
      tone(784, 0.12, 'triangle', 0.1, 0.08)
      break
    case 'discover':
      ;[523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.18, 'square', 0.1, i * 0.09))
      break
    case 'levelup':
      ;[392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, i * 0.1))
      break
    case 'achievement':
      ;[784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.09, i * 0.07))
      break
    case 'error':
      tone(200, 0.15, 'sawtooth', 0.08, 0, -80)
      break
    case 'brew':
      noise(0.3, 0.1, 400)
      tone(180, 0.3, 'sine', 0.06, 0, -60)
      break
    case 'cheer':
      noise(0.4, 0.1, 2000)
      break
  }
}

// 简单的循环小曲（C 大调五声音阶）
const MELODY = [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 9, 7, 4, 2, 0, 2, 4, 2, 0, -3, -5, -3, 0, 4, 2, 0, -3, 0, 0, 0]
const BASS = [0, 0, 5, 5, 7, 7, 0, 0]

export function startMusic() {
  if (musicTimer !== null || musicVolume <= 0) return
  const c = ac()
  if (!c || !musicGain) return
  let step = 0
  const beat = 0.28
  musicTimer = window.setInterval(() => {
    const n = MELODY[step % MELODY.length]
    const base = 392
    if (step % 2 === 0 || Math.random() < 0.6) tone(base * Math.pow(2, n / 12), beat * 0.9, 'triangle', 0.08, 0, 0, musicGain!)
    if (step % 4 === 0) {
      const b = BASS[(step / 4) % BASS.length]
      tone(98 * Math.pow(2, b / 12), beat * 3.5, 'square', 0.05, 0, 0, musicGain!)
    }
    step++
  }, beat * 1000)
}

export function stopMusic() {
  if (musicTimer !== null) {
    clearInterval(musicTimer)
    musicTimer = null
  }
}

export function setVolumes(s: number, m: number) {
  sfxVolume = s
  musicVolume = m
  if (master) master.gain.value = s
  if (musicGain) musicGain.gain.value = m
  if (m <= 0) stopMusic()
}

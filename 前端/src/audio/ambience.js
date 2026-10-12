// 白噪音混音器
// 文件条目：两个 <audio> 轮流播放，在结尾前做等功率交叉淡化，实现无缝循环
// 合成条目：目录中缺少对应文件时，用 Web Audio 程序合成；一旦放入同名文件即自动改用文件
import { engine, makeBrownBuffer, decodeCached } from './engine.js'
import { NOISE } from '../themes/index.js'

// 已知条目的中文名与图标；未知文件用说明文档里的描述或文件名
const KNOWN = {
  rain: { label: '雨', icon: 'rain' },
  wind: { label: '风', icon: 'wind' },
  forest: { label: '林间', icon: 'forest' },
  fireplace: { label: '篝火', icon: 'fire' },
  'artillery-trench': { label: '战壕炮火', icon: 'trench' },
  'artillery-distant': { label: '远方炮声', icon: 'distant' },
  snow: { label: '雪夜', icon: 'snow' },
  radio: { label: '电台杂音', icon: 'radio' },
  clock: { label: '座钟', icon: 'clock' },
}
const SYNTH = ['radio', 'snow', 'clock']

export const CHANNELS = (() => {
  const files = NOISE.items.map((it) => ({
    id: it.id,
    url: it.url,
    label: KNOWN[it.id]?.label ?? (it.note ? it.note.slice(0, 6) : it.id),
    note: it.note,
    icon: KNOWN[it.id]?.icon ?? 'wave',
    synth: false,
  }))
  const have = new Set(files.map((f) => f.id))
  const synth = SYNTH.filter((id) => !have.has(id)).map((id) => ({
    id, label: KNOWN[id].label, icon: KNOWN[id].icon, synth: true,
    note: { radio: '短波静电与远方的电码', snow: '落雪的低沉寂静', clock: '老座钟的摆锤' }[id],
  }))
  return [...files, ...synth]
})()

const XF = 3 // 交叉淡化秒数

class FileLoop {
  constructor(url) {
    this.url = url
    this.out = engine.ctx.createGain()
    this.out.gain.value = 0
    this.out.connect(engine.ambienceBus)
    this.players = [0, 1].map(() => {
      const el = new Audio()
      el.preload = 'auto'
      el.src = url
      const g = engine.ctx.createGain()
      g.gain.value = 0
      engine.ctx.createMediaElementSource(el).connect(g).connect(this.out)
      return { el, g }
    })
    this.active = 0
    this.crossing = false
    this.running = false
  }
  async start() {
    if (this.running) return
    this.running = true
    const p = this.players[this.active]
    // 长音频从随机位置开始，每次打开都有新鲜感
    if (Number.isFinite(p.el.duration) && p.el.duration > 60) p.el.currentTime = Math.random() * (p.el.duration - 30)
    p.g.gain.setValueAtTime(1, engine.ctx.currentTime)
    await p.el.play().catch(() => {})
    this.timer = setInterval(() => this.tick(), 250)
  }
  tick() {
    const a = this.players[this.active]
    const d = a.el.duration
    if (!Number.isFinite(d) || this.crossing) return
    if (d - a.el.currentTime < XF + 0.4) {
      this.crossing = true
      const b = this.players[1 - this.active]
      b.el.currentTime = 0
      b.el.play().catch(() => {})
      const t = engine.ctx.currentTime + 0.05
      const n = 64
      const up = new Float32Array(n), down = new Float32Array(n)
      for (let i = 0; i < n; i++) {
        up[i] = Math.sin((i / (n - 1)) * Math.PI / 2)
        down[i] = Math.cos((i / (n - 1)) * Math.PI / 2)
      }
      b.g.gain.cancelScheduledValues(t); b.g.gain.setValueCurveAtTime(up, t, XF)
      a.g.gain.cancelScheduledValues(t); a.g.gain.setValueCurveAtTime(down, t, XF)
      setTimeout(() => {
        a.el.pause()
        this.active = 1 - this.active
        this.crossing = false
      }, XF * 1000 + 200)
    }
  }
  stop() {
    this.running = false
    clearInterval(this.timer)
    for (const p of this.players) p.el.pause()
  }
}

// —— 合成音源 ——

class SynthSource {
  constructor(kind) {
    this.kind = kind
    this.out = engine.ctx.createGain()
    this.out.gain.value = 0
    this.out.connect(engine.ambienceBus)
    this.running = false
  }
  start() {
    if (this.running) return
    this.running = true
    const c = engine.ctx
    this.nodes = []
    const keep = (...xs) => { this.nodes.push(...xs); return xs[0] }
    if (this.kind === 'snow') {
      // 雪夜：低沉的褐噪声，缓慢阵风起伏，偶尔有积雪从枝头落下的闷响
      const src = keep(c.createBufferSource()); src.buffer = makeBrownBuffer(c, 8); src.loop = true
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520
      const gust = c.createGain(); gust.gain.value = 0.55
      const lfo = keep(c.createOscillator()); lfo.frequency.value = 0.06
      const lfoG = c.createGain(); lfoG.gain.value = 0.3
      lfo.connect(lfoG).connect(gust.gain)
      src.connect(lp).connect(gust).connect(this.out)
      src.start(); lfo.start()
      this.timer = setInterval(() => {
        if (Math.random() < 0.12) this.thud()
      }, 1000)
    } else if (this.kind === 'radio') {
      // 短波静电：窄带噪声随电离层缓慢起伏，偶尔飘来远方电台的电码
      const src = keep(c.createBufferSource()); src.buffer = makeBrownBuffer(c, 5); src.loop = true
      const white = keep(c.createBufferSource()); white.buffer = whiteBuffer(c); white.loop = true
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = 0.7
      const fadeG = c.createGain(); fadeG.gain.value = 0.32
      const lfo = keep(c.createOscillator()); lfo.frequency.value = 0.11
      const lfoG = c.createGain(); lfoG.gain.value = 0.14
      lfo.connect(lfoG).connect(fadeG.gain)
      white.connect(bp).connect(fadeG).connect(this.out)
      const low = c.createGain(); low.gain.value = 0.25
      src.connect(low).connect(this.out)
      src.start(); white.start(); lfo.start()
      this.timer = setInterval(() => {
        if (NOISE.effects.morse && Math.random() < 0.035) this.morse()
      }, 1000)
    } else if (this.kind === 'clock') {
      // 座钟：前瞻调度，滴答交替，音高略有差别
      this.nextTick = c.currentTime + 0.1
      this.beat = 0
      this.timer = setInterval(() => this.schedule(), 200)
      this.schedule()
    }
  }
  schedule() {
    const c = engine.ctx
    while (this.nextTick < c.currentTime + 1.6) {
      this.tick(this.nextTick, this.beat++ % 2)
      this.nextTick += 1
    }
  }
  tick(t, tock) {
    const c = engine.ctx
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.06), c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.0035))
    const s = c.createBufferSource(); s.buffer = buf
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = tock ? 2600 : 3300; f.Q.value = 3
    const body = c.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = tock ? 720 : 860; body.Q.value = 6; body.gain.value = 14
    const g = c.createGain(); g.gain.value = 0.9
    s.connect(f).connect(body).connect(g).connect(this.out)
    s.start(t)
  }
  thud() {
    const c = engine.ctx
    const t = c.currentTime + Math.random() * 0.8
    const s = c.createBufferSource(); s.buffer = makeBrownBuffer(c, 0.6)
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260
    const g = c.createGain()
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
    s.connect(lp).connect(g).connect(this.out)
    s.start(t)
  }
  async morse() {
    const c = engine.ctx
    const buf = await decodeCached(NOISE.effects.morse)
    const s = c.createBufferSource(); s.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.random() * 500; bp.Q.value = 2
    const g = c.createGain(); g.gain.value = 0.18
    s.connect(bp).connect(g).connect(this.out)
    s.start()
  }
  stop() {
    this.running = false
    clearInterval(this.timer)
    for (const n of this.nodes ?? []) { try { n.stop() } catch { /* 已停止 */ } }
    this.nodes = []
  }
}

let white = null
function whiteBuffer(c) {
  if (white) return white
  white = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
  const d = white.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return white
}

// —— 对外接口 ——

const sources = new Map()
const stopTimers = new Map()

export const ambience = {
  // level ∈ [0,1]，以平方律映射到增益，低段更细腻
  set(id, level) {
    if (!engine.ready) return
    const ch = CHANNELS.find((c) => c.id === id)
    if (!ch) return
    let src = sources.get(id)
    if (!src && level > 0) {
      src = ch.synth ? new SynthSource(id) : new FileLoop(ch.url)
      sources.set(id, src)
    }
    if (!src) return
    clearTimeout(stopTimers.get(id))
    const g = level * level * (ch.id === 'clock' ? 0.6 : 1)
    src.out.gain.setTargetAtTime(g, engine.ctx.currentTime, 0.15)
    if (level > 0) src.start()
    else stopTimers.set(id, setTimeout(() => src.stop(), 1200))
  },
  applyAll(levels) {
    for (const ch of CHANNELS) if (levels[ch.id] > 0) this.set(ch.id, levels[ch.id])
  },
}

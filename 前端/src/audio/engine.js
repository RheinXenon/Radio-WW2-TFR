// 音频引擎：Web Audio 图的唯一持有者
//
//  音乐 <audio> ─► fade ─► 高通 ─► 低通 ─► 中频共振 ─► signal ─► analyser ─┐
//  静电噪声（合成） ─► 带通 ─► staticGain ────────────────────────────────┤
//  差拍啸叫（振荡器） ─► whistleGain ─────────────────────────────────────┼─► master ─► 限幅 ─► 输出
//  白噪音混音器 ─► ambience ──────────────────────────────────────────────┤
//  界面音效 ─► fx ────────────────────────────────────────────────────────┘
//
// “信号强度” signal ∈ [0,1] 同时控制音乐的频带宽度、音量与静电量，
// 模拟收音机偏离电台时声音变窄、被噪声淹没的听感。

let ctx = null
let n = null
const el = new Audio()
el.preload = 'auto'

const STATIC_MAX = 0.2
const freqData = new Uint8Array(512)
const levels = { bass: 0, mid: 0, high: 0, rms: 0, beat: 0 }
let levelsAt = 0
let bassAvg = 0

// 程序生成的调幅广播静电：粉红噪声 + 缓慢起伏 + 随机爆裂声
function makeStaticBuffer(c, seconds = 4) {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, crackle = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      const pink = (b0 + b1 + b2 + w * 0.1848) * 0.16
      const t = i / c.sampleRate
      const flutter = 0.75 + 0.25 * Math.sin(t * 2 * Math.PI * 0.6 + ch) * Math.sin(t * 2 * Math.PI * 0.23)
      if (Math.random() < 0.00018) crackle = (Math.random() * 0.9 + 0.3) * (Math.random() < 0.5 ? -1 : 1)
      crackle *= 0.93
      d[i] = pink * flutter + crackle * (Math.random() * 0.6 + 0.4)
    }
    // 首尾交叉淡化，循环无缝
    const xf = Math.floor(c.sampleRate * 0.05)
    for (let i = 0; i < xf; i++) {
      const a = i / xf
      d[i] = d[i] * a + d[len - xf + i] * (1 - a)
    }
  }
  return buf
}

export function makeBrownBuffer(c, seconds = 6) {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let last = 0
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = last * 3.2
    }
    const xf = Math.floor(c.sampleRate * 0.1)
    for (let i = 0; i < xf; i++) {
      const a = i / xf
      d[i] = d[i] * a + d[len - xf + i] * (1 - a)
    }
  }
  return buf
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'playback' })
  const g = (v = 1) => { const x = ctx.createGain(); x.gain.value = v; return x }

  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -4
  limiter.knee.value = 6
  limiter.ratio.value = 6
  limiter.attack.value = 0.004
  limiter.release.value = 0.25
  limiter.connect(ctx.destination)

  const master = g(0)
  master.connect(limiter)

  const source = ctx.createMediaElementSource(el)
  const fade = g(0)
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 20; hp.Q.value = 0.5
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.6
  const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 1400; body.Q.value = 0.8; body.gain.value = 0
  const signal = g(1)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.72
  source.connect(fade).connect(hp).connect(lp).connect(body).connect(signal).connect(analyser).connect(master)

  const noise = ctx.createBufferSource()
  noise.buffer = makeStaticBuffer(ctx)
  noise.loop = true
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.45
  const staticGain = g(0)
  noise.connect(bp).connect(staticGain).connect(master)
  noise.start()

  const whistle = ctx.createOscillator()
  whistle.type = 'sine'
  whistle.frequency.value = 800
  const whistleGain = g(0)
  whistle.connect(whistleGain).connect(master)
  whistle.start()

  const ambience = g(1)
  ambience.connect(master)
  const fx = g(0.9)
  fx.connect(master)

  n = { master, fade, hp, lp, body, signal, analyser, staticGain, bp, whistle, whistleGain, ambience, fx }
  sigConst = 1
  sigCurve = null
}

// signal → 各参数的映射
const curve = {
  level: (s) => Math.pow(s, 1.5),
  lp: (s) => 1100 + 18900 * Math.pow(s, 3),
  hp: (s) => 20 + 560 * Math.pow(1 - s, 2),
  body: (s) => 9 * (1 - s),
  stat: (s) => STATIC_MAX * Math.pow(1 - s, 1.1),
}

const ramp = (param, v, tc = 0.06) => param.setTargetAtTime(v, ctx.currentTime, tc)

// 信号镜像：自动化排布的同时在 JS 侧记录同一条曲线
// AudioParam.value 在自动化进行中各浏览器取值不一，不能作为界面显示来源
let sigConst = 1
let sigCurve = null // { fn, start, dur }，fn(t) → { signal }
function sigNow() {
  if (!sigCurve) return sigConst
  const t = Math.max(0, Math.min(1, (ctx.currentTime - sigCurve.start) / sigCurve.dur))
  const v = sigCurve.fn(t).signal
  if (t >= 1) { sigConst = v; sigCurve = null }
  return v
}

export const engine = {
  el,
  get ctx() { return ctx },
  get ready() { return !!ctx },

  init() {
    if (!ctx) build()
    if (ctx.state === 'suspended') ctx.resume()
  },

  // —— 总音量 ——
  setVolume(v, tc = 0.08) {
    if (!ctx) return
    ramp(n.master.gain, v * v, tc)
  },

  // —— 信号与静电 ——
  setSignal(s, tc = 0.06) {
    if (!ctx) return
    s = Math.min(1, Math.max(0, s))
    sigConst = s
    sigCurve = null
    ramp(n.signal.gain, curve.level(s), tc)
    ramp(n.lp.frequency, curve.lp(s), tc)
    ramp(n.hp.frequency, curve.hp(s), tc)
    ramp(n.body.gain, curve.body(s), tc)
    ramp(n.staticGain.gain, curve.stat(s), tc)
  },
  setWhistle(hz, amp, tc = 0.05) {
    if (!ctx) return
    ramp(n.whistle.frequency, Math.max(30, hz), tc)
    ramp(n.whistleGain.gain, amp, tc)
  },

  // 在音频时钟上排布一次完整的调谐过程，后台标签页中同样精确
  // fn(t) → { signal, whistleHz, whistleAmp }，t ∈ [0,1]
  sweep(fn, duration, steps = 96) {
    if (!ctx) return
    const now = ctx.currentTime + 0.02
    sigCurve = { fn, start: now, dur: duration }
    const arrs = { level: [], lp: [], hp: [], body: [], stat: [], wf: [], wa: [] }
    for (let i = 0; i <= steps; i++) {
      const { signal: s, whistleHz, whistleAmp } = fn(i / steps)
      arrs.level.push(curve.level(s)); arrs.lp.push(curve.lp(s)); arrs.hp.push(curve.hp(s))
      arrs.body.push(curve.body(s)); arrs.stat.push(curve.stat(s))
      arrs.wf.push(Math.max(30, whistleHz)); arrs.wa.push(whistleAmp)
    }
    const apply = (param, values) => {
      param.cancelScheduledValues(now)
      param.setValueAtTime(param.value, now)
      param.setValueCurveAtTime(Float32Array.from(values), now + 0.001, duration)
    }
    apply(n.signal.gain, arrs.level); apply(n.lp.frequency, arrs.lp); apply(n.hp.frequency, arrs.hp)
    apply(n.body.gain, arrs.body); apply(n.staticGain.gain, arrs.stat)
    apply(n.whistle.frequency, arrs.wf); apply(n.whistleGain.gain, arrs.wa)
  },
  cancelSweep() {
    if (!ctx) return
    const t = ctx.currentTime
    // 参数在当前值上定格，镜像同样取当前计算值
    sigConst = sigNow()
    sigCurve = null
    for (const p of [n.signal.gain, n.lp.frequency, n.hp.frequency, n.body.gain, n.staticGain.gain, n.whistle.frequency, n.whistleGain.gain]) {
      const v = p.value
      p.cancelScheduledValues(t)
      p.setValueAtTime(v, t)
    }
  },

  // —— 音乐 ——
  fade(v, tc = 0.12) { if (ctx) ramp(n.fade.gain, v, tc) },
  fadeNow(v) { if (ctx) { n.fade.gain.cancelScheduledValues(ctx.currentTime); n.fade.gain.setValueAtTime(v, ctx.currentTime) } },
  // 现代风格换台：低通扫频加淡入淡出
  sweepFilter(from, to, duration) {
    if (!ctx) return
    const t = ctx.currentTime
    n.lp.frequency.cancelScheduledValues(t)
    n.lp.frequency.setValueAtTime(from, t)
    n.lp.frequency.exponentialRampToValueAtTime(to, t + duration)
  },
  load(url, song) {
    return new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve() }
      const fail = () => { cleanup(); reject(el.error) }
      const cleanup = () => { el.removeEventListener('canplay', done); el.removeEventListener('error', fail) }
      el.addEventListener('canplay', done, { once: true })
      el.addEventListener('error', fail, { once: true })
      // 直连外链(如 archive.org)须带 crossorigin 才能进 Web Audio,且须在设 src 之前
      el.crossOrigin = song?.cors ? 'anonymous' : null
      el.src = url
      el.load()
    })
  },

  get ambienceBus() { return n?.ambience },

  // 当前信号强度（0~1），取自 JS 侧镜像曲线，供魔眼显示
  signal() {
    if (!ctx) return 0
    return Math.min(1, Math.max(0, sigNow()))
  },

  // —— 频谱 ——
  // 每帧最多计算一次，供壁纸律动与魔眼共用
  levels() {
    if (!ctx) return levels
    const now = performance.now()
    if (now - levelsAt < 12) return levels
    const dt = Math.min(0.1, (now - levelsAt) / 1000)
    levelsAt = now
    n.analyser.getByteFrequencyData(freqData)
    const hzPer = ctx.sampleRate / n.analyser.fftSize
    const band = (lo, hi) => {
      let sum = 0, c = 0
      for (let i = Math.floor(lo / hzPer); i <= Math.min(511, Math.ceil(hi / hzPer)); i++) { sum += freqData[i]; c++ }
      return c ? sum / c / 255 : 0
    }
    const bass = band(30, 160)
    const mid = band(300, 2400)
    const high = band(3000, 9000)
    const k = 1 - Math.exp(-dt * 18)
    levels.bass += (bass - levels.bass) * k
    levels.mid += (mid - levels.mid) * k
    levels.high += (high - levels.high) * k
    levels.rms += ((bass * 0.4 + mid * 0.45 + high * 0.15) - levels.rms) * k
    // 节拍包络：低频高出近期均值时冲高，随后指数回落
    bassAvg += (bass - bassAvg) * (1 - Math.exp(-dt * 1.6))
    const hit = Math.max(0, bass - bassAvg * 1.08) * 4
    levels.beat = Math.max(levels.beat * Math.exp(-dt * 5.5), Math.min(1, hit))
    return levels
  },

  // 当前帧的频谱（512 个频点，0~255），与 levels() 共用同一次读取
  spectrum() {
    engine.levels()
    return freqData
  },

  // —— 界面音效 ——
  // 旋钮、琴键的机械咔嗒声
  click(kind = 'soft') {
    if (!ctx) return
    const t = ctx.currentTime
    const len = kind === 'key' ? 0.09 : 0.03
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const e = Math.exp(-i / (ctx.sampleRate * (kind === 'key' ? 0.012 : 0.004)))
      d[i] = (Math.random() * 2 - 1) * e
    }
    const s = ctx.createBufferSource(); s.buffer = buf
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = kind === 'key' ? 1700 : 3200; f.Q.value = 1.4
    const gg = ctx.createGain(); gg.gain.value = kind === 'key' ? 0.55 : 0.22
    s.connect(f).connect(gg).connect(n.fx)
    if (kind === 'key') {
      // 琴键落底的低沉回弹
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.08)
      const og = ctx.createGain(); og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      o.connect(og).connect(n.fx); o.start(t); o.stop(t + 0.12)
    }
    s.start(t)
  },

  // 开机：电源开关、整流管的交流哼声渐起渐落
  powerOn(duration = 3.2) {
    if (!ctx) return
    const t = ctx.currentTime
    this.click('key')
    const hum = ctx.createGain()
    hum.gain.setValueAtTime(0, t)
    hum.gain.linearRampToValueAtTime(0.09, t + duration * 0.5)
    hum.gain.linearRampToValueAtTime(0, t + duration)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420
    hum.connect(lp).connect(n.fx)
    for (const [f, a] of [[50, 1], [100, 0.6], [150, 0.25], [200, 0.12]]) {
      const o = ctx.createOscillator(); o.frequency.value = f
      const og = ctx.createGain(); og.gain.value = a
      o.connect(og).connect(hum); o.start(t); o.stop(t + duration + 0.1)
    }
  },

  // 合成单音：各主题开场与主题页用的音色。at 为相对现在的起始秒数，glide 为滑音终点频率
  tone(freq, { at = 0, dur = 1.2, gain = 0.12, type = 'sine', attack = 0.02, glide, lowpass = 6000, detune = 0 } = {}) {
    if (!ctx) return
    const t = ctx.currentTime + at
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur)
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass
    const gg = ctx.createGain()
    gg.gain.setValueAtTime(0, t)
    gg.gain.linearRampToValueAtTime(gain, t + attack)
    gg.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(f).connect(gg).connect(n.fx)
    o.start(t); o.stop(t + dur + 0.05)
  },

  // 一小段带通噪声：数字信号的毛刺、琴弓擦弦前的气息
  burst({ at = 0, dur = 0.08, gain = 0.2, freq = 2400, q = 1.2 } = {}) {
    if (!ctx) return
    const t = ctx.currentTime + at
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const s = ctx.createBufferSource(); s.buffer = buf
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q
    const gg = ctx.createGain(); gg.gain.value = gain
    s.connect(f).connect(gg).connect(n.fx)
    s.start(t)
  },

  async playEffect(url, { gain = 0.5, offset = 0, duration, bandpass } = {}) {
    if (!ctx || !url) return
    const buf = await decodeCached(url)
    const s = ctx.createBufferSource(); s.buffer = buf
    const gg = ctx.createGain(); gg.gain.value = gain
    let tail = gg
    if (bandpass) {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = bandpass; f.Q.value = 0.9
      gg.connect(f); tail = f
    }
    s.connect(gg)
    tail.connect(n.fx)
    s.start(ctx.currentTime, offset, duration)
    return s
  },
}

const decoded = new Map()
export function decodeCached(url) {
  if (!decoded.has(url)) {
    decoded.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)))
  }
  return decoded.get(url)
}

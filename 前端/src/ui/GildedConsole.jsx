// 鎏金音乐厅：古典回音的播放控件
// 一道黑漆鎏金的台座横贯底部，中央升起象牙珐琅的拱形表盘，像音乐厅的台口；
// 蓝钢苹果针从台座上的金轴摆过各个时代，所指之处一团暖光把台名照亮；
// 左翼是三枚鎏金按钮与渐强记号做成的音量，右翼是 solo / tutti / programma 三种波段与反复记号写成的播放顺序
import { useEffect, useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import { useRadio } from '../store.js'
import { useT, useLoc } from '../i18n/index.js'
import { radio, needlePos } from '../audio/radio.js'
import { engine } from '../audio/engine.js'
import { theme } from '../themes/index.js'
import { Emblem } from '../themes/marks.jsx'
import { Icon } from './Icon.jsx'
import './gilded.css'

// —— 表盘几何 ——
// 刻度画在以指针轴心为圆心的一族同心椭圆上（以基准椭圆 RX×RY 乘系数 k），指针在参数角 ±SPAN 之间摆动
const W = 460, H = 184
const PX = 230, PY = 166
const RX = 206, RY = 140
const FX = 216, FY = 150 // 表盘面
const SPAN = 70
const rad = (d) => (d * Math.PI) / 180
const paramOf = (pos) => rad(-SPAN + pos * 2 * SPAN)
const pt = (pos, k) => {
  const t = paramOf(pos)
  return [PX + k * RX * Math.sin(t), PY - k * RY * Math.cos(t)]
}
// 椭圆在该处的切线方向（度），台名顺着表盘弧线排开
const tangent = (pos) => {
  const t = paramOf(pos)
  return (Math.atan2(RY * Math.sin(t), RX * Math.cos(t)) * 180) / Math.PI
}
const arc = (k, from = 0, to = 1) => {
  const [x0, y0] = pt(from, k)
  const [x1, y1] = pt(to, k)
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${k * RX} ${k * RY} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}
const FACE = `M ${PX - FX} ${PY + 2} A ${FX} ${FY} 0 0 1 ${PX + FX} ${PY + 2} Z`

// 外框上一圈按弧长等距排开的连珠
function beads(rx, ry, gap) {
  const pts = []
  let prev = null, acc = gap
  for (let i = 0; i <= 720; i++) {
    const t = rad(-90 + (i / 720) * 180)
    const p = [PX + rx * Math.sin(t), PY - ry * Math.cos(t)]
    if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1])
    if (acc >= gap) { pts.push(p); acc = 0 }
    prev = p
  }
  return pts
}
const BEADS = beads(FX + 10.5, FY + 10.5, 7.2)

function ticksOf(dial) {
  const out = []
  const span = dial.max - dial.min
  const first = Math.ceil(dial.min / dial.step) * dial.step
  for (let i = 0, f = first; f < dial.max; i++, f = first + i * dial.step) {
    if (f <= dial.min) continue
    const major = Math.abs(f / dial.major - Math.round(f / dial.major)) < 1e-6
    const pos = (f - dial.min) / span
    const [x0, y0] = pt(pos, major ? 0.9 : 0.928)
    const [x1, y1] = pt(pos, major ? 0.99 : 0.972)
    out.push(<line key={i} x1={x0} y1={y0} x2={x1} y2={y1} className={major ? 'major' : ''} />)
  }
  return out
}

// —— 表盘 ——
function ArchDial() {
  const t = useT()
  const L = useLoc()
  const stations = theme.stations
  const dial = theme.dial
  const box = useRef(), light = useRef(), needle = useRef(), shaft = useRef(), pomme = useRef()
  const labels = useRef([])
  const enabled = useRadio((s) => s.enabled)
  const current = useRadio((s) => s.offAir ?? s.track?.station ?? s.station)
  const ticks = useMemo(() => ticksOf(dial), [dial])

  useEffect(() => {
    let raf
    const tick = () => {
      const p = needlePos()
      const t = paramOf(p)
      const a = (Math.atan2(RX * Math.sin(t), RY * Math.cos(t)) * 180) / Math.PI
      const L = 0.975 * Math.hypot(RX * Math.sin(t), RY * Math.cos(t))
      const ring = L - 15
      needle.current?.setAttribute('transform', `translate(${PX} ${PY}) rotate(${a.toFixed(3)})`)
      shaft.current?.setAttribute('d',
        `M -1.7 -9 L -0.62 ${-(ring - 3.4)} L 0.62 ${-(ring - 3.4)} L 1.7 -9 Z ` +
        `M -1.05 ${-(ring + 3.2)} L 0 ${-L} L 1.05 ${-(ring + 3.2)} Z`)
      pomme.current?.setAttribute('cy', -ring)
      const [lx, ly] = pt(p, 0.74)
      light.current?.setAttribute('cx', lx)
      light.current?.setAttribute('cy', ly)
      stations.forEach((st, i) => {
        const near = Math.max(0, 1 - Math.abs(p - st.pos) / 0.05)
        labels.current[i]?.style.setProperty('--near', near.toFixed(3))
      })
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  // 拖动表盘：按指针相对轴心的椭圆参数角换算成刻度位置
  const posAt = (e) => {
    const r = box.current.getBoundingClientRect()
    const dx = (e.clientX - r.left) * (W / r.width) - PX
    const dy = (e.clientY - r.top) * (H / r.height) - PY
    const t = (Math.atan2(dx / RX, -dy / RY) * 180) / Math.PI
    return Math.max(0, Math.min(1, (t + SPAN) / (2 * SPAN)))
  }
  const drag = useRef(false)
  const down = (e) => {
    if (e.target.closest('.gld__st')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = true
    radio.scrubStart()
    radio.scrubMove(posAt(e))
  }
  const move = (e) => { if (drag.current) radio.scrubMove(posAt(e)) }
  const up = () => {
    if (!drag.current) return
    drag.current = false
    radio.scrubEnd()
  }
  // 滚轮逐台切换
  const wheel = (e) => {
    const s = useRadio.getState()
    const cur = s.offAir ?? s.track?.station ?? s.station
    const i = stations.findIndex((x) => x.id === cur)
    const next = stations[Math.max(0, Math.min(stations.length - 1, i + (e.deltaY > 0 ? 1 : -1)))]
    if (next && next.id !== cur) radio.tune(next.id)
  }

  const fs = stations.length <= 4 ? 13.5 : stations.length <= 6 ? 12 : 11

  return (
    <div className="gld__dial" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
      <svg className="gld__face" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
        <defs>
          <linearGradient id="gd-gold" x1="0" y1="0" x2="1" y2="0.35">
            <stop offset="0" stopColor="#8a6526" /><stop offset="0.16" stopColor="#f8e2a2" /><stop offset="0.32" stopColor="#b58a3c" />
            <stop offset="0.5" stopColor="#fbe9b4" /><stop offset="0.68" stopColor="#a47b33" /><stop offset="0.84" stopColor="#f2d48c" /><stop offset="1" stopColor="#7a5520" />
          </linearGradient>
          <linearGradient id="gd-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6dd9c" /><stop offset="0.35" stopColor="#c9a050" /><stop offset="0.7" stopColor="#8f6a28" /><stop offset="1" stopColor="#5e4316" />
          </linearGradient>
          <radialGradient id="gd-face" cx={PX} cy={PY} r={FX} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${PX} ${PY}) scale(1 ${FY / FX}) translate(${-PX} ${-PY})`}>
            <stop offset="0" stopColor="#f3e6c6" /><stop offset="0.62" stopColor="#e6d4a8" /><stop offset="0.9" stopColor="#cdb27a" /><stop offset="1" stopColor="#a98a52" />
          </radialGradient>
          <radialGradient id="gd-boss" cx="0.4" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#fff4cc" /><stop offset="0.45" stopColor="#dcb662" /><stop offset="1" stopColor="#6e4e1a" />
          </radialGradient>
          <clipPath id="gd-faceclip"><path d={FACE} /></clipPath>
          <filter id="gd-paper" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
            <feColorMatrix values="0 0 0 0 0.32  0 0 0 0 0.22  0 0 0 0 0.1  0.22 0 0 0 -0.04" />
          </filter>
        </defs>

        {/* 连珠、鎏金外框与拱心的玫瑰饰 */}
        {BEADS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.7" fill="url(#gd-boss)" />)}
        <path d={`M ${PX - FX - 4} ${PY + 2} A ${FX + 4} ${FY + 4} 0 0 1 ${PX + FX + 4} ${PY + 2}`} fill="none" stroke="url(#gd-gold)" strokeWidth="8" />
        <path d={`M ${PX - FX - 7.6} ${PY + 2} A ${FX + 7.6} ${FY + 7.6} 0 0 1 ${PX + FX + 7.6} ${PY + 2}`} fill="none" stroke="#3a2a10" strokeWidth="0.8" opacity="0.7" />
        <g transform={`translate(${PX} ${PY - FY - 9})`}>
          <circle r="8" fill="url(#gd-boss)" stroke="#5e4316" strokeWidth="0.6" />
          {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cy="-4" rx="1.6" ry="3.2" fill="#fbe9b4" opacity="0.55" transform={`rotate(${i * 45})`} />)}
          <circle r="2.2" fill="#7a5520" />
        </g>

        {/* 象牙珐琅表盘：边缘压暗，叠一层细微的纸纹 */}
        <path d={FACE} fill="url(#gd-face)" />
        <rect width={W} height={H} filter="url(#gd-paper)" clipPath="url(#gd-faceclip)" />
        <path d={FACE} fill="none" stroke="#5a3f15" strokeWidth="1.2" />

        {/* 刻度 */}
        <path d={arc(0.99, -0.02, 1.02)} className="gld__rule" />
        <path d={arc(0.9, -0.02, 1.02)} className="gld__rule gld__rule--thin" />
        <g className="gld__ticks">{ticks}</g>
        {stations.map((st) => {
          const [x, y] = pt(st.pos, 0.865)
          return <circle key={st.id} cx={x} cy={y} r="2.2" fill={st.accent} stroke="#3a2610" strokeWidth="0.6" />
        })}
        {stations.map((st) => {
          const [x, y] = pt(st.pos, 0.655)
          return (
            <text key={st.id} className="gld__freq tnum" x={x} y={y} textAnchor="middle" dominantBaseline="central"
              transform={`rotate(${tangent(st.pos)} ${x} ${y})`}>{dial.fmt(st.freq)}</text>
          )
        })}
        <text className="gld__brand" x={PX} y={PY - 62} textAnchor="middle">{theme.latin || theme.name}</text>
        <text className="gld__band" x={PX} y={PY - 46} textAnchor="middle">{dial.band} · {dial.unit}</text>

        {/* 台座金条与轴心 */}
        <rect x={PX - FX - 12} y={PY + 1} width={2 * FX + 24} height={H - PY - 1} rx="2" fill="url(#gd-bar)" />
        <line x1={PX - FX - 10} x2={PX + FX + 10} y1={PY + 2.2} y2={PY + 2.2} stroke="#fff4cc" strokeOpacity="0.55" strokeWidth="0.8" />
        <text className="gld__engrave" x={PX - FX + 8} y={PY + 12.5}>{dial.band}</text>
        <text className="gld__engrave" x={PX + FX - 8} y={PY + 12.5} textAnchor="end">{dial.unit}</text>
        <circle cx={PX} cy={PY} r="16" fill="url(#gd-boss)" stroke="#4a3410" strokeWidth="0.8" />
        <circle cx={PX} cy={PY} r="11.5" fill="none" stroke="#5e4316" strokeWidth="0.5" opacity="0.6" />
      </svg>

      {/* 指针所指之处的一团暖光 */}
      <svg className="gld__light" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
        <defs>
          <radialGradient id="gd-lamp">
            <stop offset="0" stopColor="#fffaea" stopOpacity="0.62" /><stop offset="0.45" stopColor="#fff1c8" stopOpacity="0.26" /><stop offset="1" stopColor="#ffe2a0" stopOpacity="0" />
          </radialGradient>
          <clipPath id="gd-lampclip"><path d={FACE} /></clipPath>
        </defs>
        <g clipPath="url(#gd-lampclip)"><circle ref={light} r="86" fill="url(#gd-lamp)" /></g>
      </svg>

      <div className="gld__labels" style={{ '--fs': `${fs}px` }}>
        {stations.map((st, i) => {
          const [x, y] = pt(st.pos, 0.77)
          const on = enabled[st.id] !== false
          return (
            <button
              key={st.id}
              ref={(el) => (labels.current[i] = el)}
              className={`gld__st ${st.id === current ? 'is-cur' : ''} ${on ? '' : 'is-off'}`}
              style={{ left: x, top: y, transform: `translate(-50%, -50%) rotate(${tangent(st.pos)}deg)`, '--glow': st.glow }}
              onClick={() => radio.tune(st.id)}
              title={`${L(st, 'name')} · ${L(st, 'genre')}${on ? '' : t('（已停播）')}`}
            >
              <Emblem kind={st.emblem} size={14} ring={false} />
              <span>{L(st, 'label')}</span>
            </button>
          )
        })}
      </div>

      {/* 蓝钢苹果针与轴帽 */}
      <svg className="gld__needle" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
        <defs>
          <linearGradient id="gd-blued" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#101a48" /><stop offset="0.5" stopColor="#3b5db4" /><stop offset="1" stopColor="#101a48" />
          </linearGradient>
          <radialGradient id="gd-cap" cx="0.38" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff6d2" /><stop offset="0.5" stopColor="#d7ae58" /><stop offset="1" stopColor="#6e4e1a" />
          </radialGradient>
          <filter id="gd-shadow" x="-50%" y="-10%" width="200%" height="120%">
            <feDropShadow dx="1.2" dy="2" stdDeviation="1.1" floodColor="#2a1a06" floodOpacity="0.45" />
          </filter>
        </defs>
        <g ref={needle} filter="url(#gd-shadow)">
          <path d="M -1.7 0 L -1.3 12 L 1.3 12 L 1.7 0 Z" fill="url(#gd-blued)" />
          <circle cy="13" r="3.4" fill="url(#gd-blued)" />
          <path ref={shaft} fill="url(#gd-blued)" />
          <circle ref={pomme} r="3.4" fill="none" stroke="url(#gd-blued)" strokeWidth="1.3" />
        </g>
        <circle cx={PX} cy={PY} r="5.6" fill="url(#gd-cap)" stroke="#4a3410" strokeWidth="0.6" />
        <circle cx={PX} cy={PY} r="1.6" fill="#1d2c63" />
      </svg>
    </div>
  )
}

// —— 左翼：走带按钮与力度音量 ——
const MARKS = [[0.06, 'ppp'], [0.2, 'pp'], [0.36, 'p'], [0.52, 'mp'], [0.68, 'mf'], [0.84, 'f'], [Infinity, 'ff']]
const markOf = (v) => MARKS.find(([lim]) => v < lim)[1]

function Transport() {
  const t = useT()
  const playing = useRadio((s) => s.playing)
  const press = (fn) => () => { engine.click('key'); fn() }
  return (
    <div className="gld__transport">
      <button className="gld__btn" onClick={press(radio.prev)} title={t('上一首（←）')}><Icon name="prev" size={15} /></button>
      <button className={`gld__btn gld__btn--play ${playing ? 'is-on' : ''}`} onClick={press(radio.toggle)} title={t('播放 / 暂停（空格）')}>
        <Icon name={playing ? 'pause' : 'play'} size={19} />
      </button>
      <button className="gld__btn" onClick={press(radio.next)} title={t('下一首（→）')}><Icon name="next" size={15} /></button>
    </div>
  )
}

// 音量画成乐谱上的渐强记号：楔形里的金色随音量涨满，旁边写着对应的力度
function Dynamics() {
  const t = useT()
  const volume = useRadio((s) => s.volume)
  const muted = useRadio((s) => s.muted)
  const v = muted ? 0 : volume
  const setAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    radio.setVolume((e.clientX - r.left - 2) / (r.width - 4))
  }
  return (
    <div className="gld__dyn">
      <button className={`gld__mark ${muted ? 'is-tacet' : ''}`} onClick={radio.toggleMute} title={t('静音（M）')}>{muted ? 'tacet' : markOf(volume)}</button>
      <div
        className="gld__hairpin"
        role="slider"
        aria-label={t('音量')}
        aria-valuenow={Math.round(v * 100)}
        title={t('音量：点按、拖动或滚轮（↑ ↓）')}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setAt(e) }}
        onPointerMove={(e) => { if (e.buttons & 1) setAt(e) }}
        onWheel={(e) => radio.setVolume(volume + (e.deltaY < 0 ? 0.04 : -0.04))}
      >
        <svg viewBox="0 0 132 24" aria-hidden>
          <defs>
            <linearGradient id="gd-wedge" x1="0" x2="1">
              <stop offset="0" stopColor="#e9c97f" stopOpacity="0.15" /><stop offset="1" stopColor="#f6dc9c" stopOpacity="0.85" />
            </linearGradient>
            <clipPath id="gd-vol"><rect width={2 + v * 128} height="24" /></clipPath>
          </defs>
          <path d="M 2 12 L 130 3 L 130 21 Z" fill="url(#gd-wedge)" clipPath="url(#gd-vol)" />
          <path d="M 130 2.6 L 2 12 L 130 21.4" fill="none" stroke="#efd291" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          <g transform={`translate(${2 + v * 128} 12)`}>
            <path d="M 0 -4.2 L 3 0 L 0 4.2 L -3 0 Z" fill="#fff1c6" stroke="#6e4e1a" strokeWidth="0.6" />
          </g>
        </svg>
      </div>
    </div>
  )
}

// —— 右翼：波段与播放顺序 ——
const BANDS = [['station', '本台', 'solo', 1], ['all', '全频段', 'tutti', 2], ['list', '歌单', 'programma', 3]]
const ORDER_NEXT = { seq: 'shuffle', shuffle: 'one', one: 'seq' }
const ORDER = { seq: ['attacca', '顺序播放', 'seq'], shuffle: ['ad lib.', '随机播放', 'shuffle'], one: ['da capo', '单曲循环', 'one'] }

function Bands() {
  const t = useT()
  const band = useRadio((s) => s.band)
  return (
    <div className="gld__bands">
      {BANDS.map(([id, zh, it, key]) => (
        <button key={id} className={band === id ? 'is-on' : ''} onClick={() => radio.setBand(id)} title={`${t(zh)}${t('（{k}）', { k: key })}`}>
          <span className="gld__zh">{t(zh)}</span>
          <em>{it}</em>
          {band === id && <motion.i layoutId="gld-band" className="gld__orn" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
        </button>
      ))}
    </div>
  )
}

function Order() {
  const t = useT()
  const order = useRadio((s) => s.order)
  const [term, zh, icon] = ORDER[order]
  return (
    <button className="gld__order" onClick={() => useRadio.setState({ order: ORDER_NEXT[order] })} title={`${t(zh)}${t('（S）')}`}>
      <Icon name={icon} size={16} />
      <span><em>{term}</em><small>{t(zh)}</small></span>
    </button>
  )
}

export default function GildedConsole() {
  return (
    <div className="gld" style={{ '--dial-w': `${W}px` }}>
      <div className="gld__plinth">
        <div className="gld__wing">
          <Transport />
          <i className="gld__sep" />
          <Dynamics />
        </div>
        <div className="gld__wing">
          <Bands />
          <i className="gld__sep" />
          <Order />
        </div>
      </div>
      <ArchDial />
    </div>
  )
}

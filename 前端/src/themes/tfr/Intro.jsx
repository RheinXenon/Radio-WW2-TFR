// 烈焰升腾开场
// 显像管点亮成一道紫色细线再撑开成屏；终端逐行打出广播网络的握手记录；
// 主题名带着红蓝错位的故障闪烁浮现，六座电台的六角铭牌随合成器琶音依次点亮；
// 底部紫焰升起，画面几下闪断后熄灭，城市显影
import { useEffect, useRef, useState } from 'react'
import { engine } from '../../audio/engine.js'
import { useT, useLoc } from '../../i18n/index.js'
import { theme } from '../index.js'
import { Emblem } from './marks.jsx'
import { STATIONS, DIAL } from './stations.js'
import './intro.css'

// 末行的台数与频率范围取自组装后的主题（台位按频道数量均分刻度盘）
const LOG_HEAD = [
  '> TFR//BROADCAST NETWORK  v2.0.20',
  '> HANDSHAKE ........................ OK',
  '> 2020-01-01 00:00 UTC  ·  NEW WORLD',
]
const ARP = [220, 261.63, 329.63, 392, 440, 523.25]

export default function Intro({ onReveal, onDone }) {
  const done = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const t = useT()
  const L = useLoc()
  const name = L(theme, 'name')
  const freqs = theme.stations.map((st) => st.freq)
  const LOG = [...LOG_HEAD, `> ${freqs.length} STATIONS ONLINE  ·  ${DIAL.band} ${DIAL.fmt(freqs[0])} — ${DIAL.fmt(freqs[freqs.length - 1])}`]

  useEffect(() => {
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    // 合成器底音与显像管的高压啸声
    engine.tone(55, { dur: 5.8, gain: 0.07, type: 'sawtooth', attack: 1.2, lowpass: 380, glide: 82 })
    engine.tone(15600, { dur: 0.9, gain: 0.012, type: 'sine', attack: 0.05 })
    engine.burst({ at: 0.15, dur: 0.12, gain: 0.25, freq: 3000 })
    LOG.forEach((_, i) => at(700 + i * 380, () => engine.click('soft')))
    at(2300, () => { engine.burst({ dur: 0.18, gain: 0.3, freq: 1800, q: 0.7 }); engine.burst({ at: 0.22, dur: 0.06, gain: 0.2, freq: 5200 }) })
    STATIONS.forEach((_, i) => at(3300 + i * 170, () => engine.tone(ARP[i], { dur: 1.4, gain: 0.05, type: 'triangle', lowpass: 3200 })))
    at(4500, () => [220, 277.18, 329.63, 440].forEach((f, i) => engine.tone(f, { dur: 2.6, gain: 0.035, type: 'sawtooth', attack: 0.3, lowpass: 1600, detune: i * 4 })))
    const finish = (fast) => {
      if (done.current) return
      done.current = true
      setLeaving(true)
      engine.burst({ dur: 0.25, gain: 0.22, freq: 900, q: 0.5 })
      onReveal()
      setTimeout(onDone, fast ? 450 : 1100)
    }
    at(6200, () => finish(false))
    const skip = () => finish(true)
    at(500, () => {
      window.addEventListener('pointerdown', skip)
      window.addEventListener('keydown', skip)
    })
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [])

  return (
    <div className={`tfi ${leaving ? 'is-leaving' : ''}`}>
      <div className="tfi__crt" />
      <div className="tfi__log">
        {LOG.map((l, i) => <div key={i} style={{ '--i': i }}>{l}</div>)}
      </div>
      <div className="tfi__center">
        <div className="tfi__kicker">{t('第二主题 · 接入')}</div>
        <h1 className="tfi__title" data-text={name}>{name}</h1>
        <div className="tfi__latin">THE&nbsp;FIRE&nbsp;RISES</div>
        <div className="tfi__stations">
          {STATIONS.map((s, i) => (
            <div key={s.id} className="tfi__st" style={{ '--i': i, '--glow': s.glow }}>
              <Emblem kind={s.emblem} size={46} />
              <span>{s.name}</span>
              <em>{DIAL.fmt(theme.stations[i].freq)}</em>
            </div>
          ))}
        </div>
        <div className="tfi__quote">{t('烈焰升腾，舞台属于你。')}</div>
      </div>
      <div className="tfi__fire" />
      <div className="tfi__scan" />
    </div>
  )
}

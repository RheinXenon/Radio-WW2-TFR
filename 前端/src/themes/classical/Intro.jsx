// 古典回音开场：乐队调音
// 黑暗的音乐厅里，双簧管吹出 A 音，五道金色谱线随之从左向右划开；
// 弦乐声部接住这个 A 音铺成一片，主题名像音符一样落到谱线上，四个时期的铭章依次亮起；
// 最后谱线化作一片暖光，帷幕后的画面显影
import { useEffect, useRef, useState } from 'react'
import { engine } from '../../audio/engine.js'
import { Emblem } from './marks.jsx'
import { STATIONS } from './stations.js'
import './intro.css'

export default function Intro({ onReveal, onDone }) {
  const done = useRef(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    // 双簧管的 A：锯齿波经低通，几层微小的音分偏移模仿揉音
    ;[0, 5, -4].forEach((d, i) => engine.tone(440, { at: 0.3, dur: 3.2, gain: i ? 0.02 : 0.045, type: 'sawtooth', attack: 0.35, lowpass: 2100, detune: d }))
    // 弦乐声部陆续加入，八度与五度叠成一片
    ;[[220, -6], [220, 7], [440, -3], [660, 4], [110, 0]].forEach(([f, d], i) =>
      engine.tone(f, { at: 1.5 + i * 0.25, dur: 3.6, gain: 0.025, type: 'sawtooth', attack: 1.1, lowpass: 1400, detune: d }))
    STATIONS.forEach((_, i) => at(3600 + i * 260, () => engine.click('soft')))
    // 收束在 D 大三和弦上
    at(4700, () => [293.66, 369.99, 440, 587.33].forEach((f, i) => engine.tone(f, { at: i * 0.05, dur: 3, gain: 0.03, type: 'triangle', attack: 0.4, lowpass: 2600 })))
    const finish = (fast) => {
      if (done.current) return
      done.current = true
      if (fast) setLeaving(true)
      onReveal()
      setTimeout(onDone, fast ? 450 : 1200)
    }
    at(6400, () => finish(false))
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
    <div className={`cli ${leaving ? 'is-leaving' : ''}`}>
      <div className="cli__center">
        <div className="cli__kicker">第三主题 · 演出即将开始</div>
        <div className="cli__staff">
          {Array.from({ length: 5 }, (_, i) => <i key={i} style={{ '--i': i }} />)}
          <span className="cli__clef">𝄞</span>
          <span className="cli__a latin">A 440</span>
        </div>
        <h1 className="cli__title">
          {[...'古典回音'].map((c, i) => <span key={i} style={{ '--i': i, '--y': `${[10, -14, 6, -6][i]}px` }}>{c}</span>)}
        </h1>
        <div className="cli__latin sc">Echoes of the Classics</div>
        <div className="cli__eras">
          {STATIONS.map((s, i) => (
            <div key={s.id} className="cli__era" style={{ '--i': i }}>
              <Emblem kind={s.emblem} size={44} />
              <span>{s.name}</span>
              <em className="latin">{s.years}</em>
            </div>
          ))}
        </div>
        <div className="cli__quote">“音乐是比一切智慧、一切哲学更高的启示。”<i>—— 贝多芬</i></div>
      </div>
      <div className="cli__light" />
    </div>
  )
}

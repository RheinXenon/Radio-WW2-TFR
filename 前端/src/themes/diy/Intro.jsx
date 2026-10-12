// 自建主题的开场：极简的现代风格
// 一道主色细光从中线向两侧展开，名字从失焦中收拢成形，频道的字徽像音符一样逐个亮起，
// 一束高光扫过后整屏柔化退去
import { useEffect, useRef, useState } from 'react'
import { engine } from '../../audio/engine.js'
import { theme } from '../index.js'
import { Emblem } from '../marks.jsx'
import './intro.css'

const CHIME = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1567.98, 1975.5]

export default function Intro({ onReveal, onDone }) {
  const done = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const t = theme

  useEffect(() => {
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    engine.tone(130.81, { dur: 4.8, gain: 0.05, type: 'triangle', attack: 1.4, lowpass: 900 })
    engine.tone(196, { at: 0.6, dur: 4.2, gain: 0.03, type: 'sine', attack: 1.2 })
    t.stations.forEach((_, i) => at(2500 + i * 180, () => engine.tone(CHIME[i % CHIME.length], { dur: 1.6, gain: 0.04, type: 'sine', attack: 0.005 })))
    const finish = (fast) => {
      if (done.current) return
      done.current = true
      setLeaving(true)
      onReveal()
      setTimeout(onDone, fast ? 450 : 1000)
    }
    at(5400, () => finish(false))
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
    <div className={`dyi ${leaving ? 'is-leaving' : ''}`} style={{ '--a': t.accent, '--b': t.accent2 ?? t.accent }}>
      <div className="dyi__aura" />
      <div className="dyi__center">
        <div className="dyi__line" />
        <h1 className="dyi__title">{t.name}</h1>
        {t.latin && <div className="dyi__latin">{t.latin}</div>}
        <div className="dyi__sub">{t.subtitle}</div>
        <div className="dyi__chips">
          {t.stations.map((s, i) => (
            <div key={s.id} className="dyi__chip" style={{ '--i': i }}>
              <Emblem kind={s.emblem} size={30} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="dyi__sweep" />
    </div>
  )
}

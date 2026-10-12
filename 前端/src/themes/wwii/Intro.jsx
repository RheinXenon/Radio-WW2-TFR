// 二战主题开场
// 摩尔斯电码沿一道黄铜细线逐点亮起，两端浮现 1939 与 1945；
// 主题名从模糊中显影，八国徽记像刻度盘上的电台一样依次点亮；
// 最后黑幕退去，壁纸由远及近显影
import { useEffect, useMemo, useRef, useState } from 'react'
import { engine } from '../../audio/engine.js'
import { NOISE } from '../index.js'
import { STATIONS } from './stations.js'
import { Emblem } from './Emblem.jsx'
import './intro.css'

const MORSE = { 1: '.----', 9: '----.', 3: '...--', 4: '....-', 5: '.....' }

export default function Intro({ onReveal, onDone }) {
  const marks = useMemo(() => {
    const out = []
    for (const word of ['1939', '1945']) {
      for (const ch of word) {
        for (const m of MORSE[ch]) out.push(m)
        out.push(' ')
      }
      out.push(' ', ' ')
    }
    return out
  }, [])
  const done = useRef(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    const morse = NOISE.effects.morse && engine.playEffect(NOISE.effects.morse, { gain: 0.5, bandpass: 1300 })
    STATIONS.forEach((_, i) => at(4300 + i * 110, () => engine.click('soft')))
    const finish = (fast) => {
      if (done.current) return
      done.current = true
      if (fast) setLeaving(true)
      onReveal()
      setTimeout(onDone, fast ? 450 : 1100)
    }
    at(6300, () => finish(false))
    const skip = () => finish(true)
    at(500, () => {
      window.addEventListener('pointerdown', skip)
      window.addEventListener('keydown', skip)
    })
    return () => {
      morse?.then((src) => src?.stop()).catch(() => {})
      timers.forEach(clearTimeout)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [])

  return (
    <div className={`intro ${leaving ? 'is-leaving' : ''}`}>
      <div className="intro__center">
        <div className="intro__kicker">第一主题 · 收听自</div>
        <div className="intro__line">
          <span className="intro__year intro__year--l latin">1939</span>
          <div className="intro__rule">
            <div className="intro__morse">
              {marks.map((m, i) => (
                <i key={i} className={m === '.' ? 'dot' : m === '-' ? 'dash' : 'gap'} style={{ '--i': i }} />
              ))}
            </div>
          </div>
          <span className="intro__year intro__year--r latin">1945</span>
        </div>
        <h1 className="intro__title">
          {[...'烽火电波'].map((c, i) => <span key={i} style={{ '--i': i }}>{c}</span>)}
        </h1>
        <div className="intro__sub">第二次世界大战 · 广播年代</div>
        <div className="intro__emblems">
          {STATIONS.map((s, i) => (
            <div key={s.id} className="intro__emblem" style={{ '--i': i, '--glow': s.glow }}>
              <Emblem kind={s.emblem} size={34} />
              <span>{s.city}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

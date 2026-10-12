// 电台开场：待机 → 开机预热
// 待机时铭牌是未点亮的玻璃；按下电源，灯丝加热、刻度灯逐字点亮台名、魔眼睁开
import { useEffect } from 'react'
import './boot.css'

const NAME = '沉浸式电台'

export default function Boot({ on, onPower, onDone }) {
  useEffect(() => {
    if (!on) {
      const go = (e) => {
        if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return
        onPower()
      }
      window.addEventListener('keydown', go)
      return () => window.removeEventListener('keydown', go)
    }
    const t = setTimeout(onDone, 4700)
    const skip = () => onDone()
    const arm = setTimeout(() => {
      window.addEventListener('pointerdown', skip)
      window.addEventListener('keydown', skip)
    }, 400)
    return () => {
      clearTimeout(t); clearTimeout(arm)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [on])

  return (
    <div className={`boot ${on ? 'is-on' : ''}`} onClick={on ? undefined : onPower}>
      <div className="boot__warm" />
      <div className="boot__plate">
        <div className="boot__eye"><i /></div>
        <h1 className="boot__name" aria-label={NAME}>
          {[...NAME].map((c, i) => (
            <span key={i} style={{ '--i': i }}>{c}</span>
          ))}
        </h1>
        <div className="boot__filament" />
        <div className="boot__meta">
          <span>中波</span><i>·</i><span>短波</span><i>·</i><span>拾音</span>
        </div>
      </div>
      <button className="boot__switch" aria-label="开机" onClick={(e) => { e.stopPropagation(); if (!on) onPower() }}>
        <span className="boot__knob" />
        <span className="boot__hint">轻触 · 开机</span>
      </button>
      <div className="boot__grain" />
    </div>
  )
}

// 面板外壳与通用控件
import { motion } from 'motion/react'
import { useRadio } from '../store.js'
import { engine } from '../audio/engine.js'
import { Icon } from './Icon.jsx'
import './panel.css'

export function Panel({ title, sub, width = 520, children, footer, className = '' }) {
  const close = () => useRadio.setState({ panel: null })
  return (
    <motion.aside
      className={`panel ${className}`}
      style={{ width: `min(${width}px, calc(100vw - 48px))` }}
      initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 30, filter: 'blur(6px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="panel__head">
        <div>
          <div className="panel__sub sc">{sub}</div>
          <h2 className="panel__title">{title}</h2>
        </div>
        <button className="panel__close" onClick={close} title="关闭（Esc）"><Icon name="close" size={18} /></button>
      </header>
      <div className="hairline" />
      <div className="panel__body">{children}</div>
      {footer && <footer className="panel__foot">{footer}</footer>}
    </motion.aside>
  )
}

export function Section({ title, hint, children }) {
  return (
    <section className="psec">
      <h3 className="psec__title"><span>{title}</span>{hint && <em>{hint}</em>}</h3>
      {children}
    </section>
  )
}

// 拨动开关：黄铜钮在乌木槽里滑动，开启时亮起一盏琥珀指示灯
export function Toggle({ on, onChange, label }) {
  return (
    <button
      className={`toggle ${on ? 'is-on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => { engine.click('soft'); onChange(!on) }}
    >
      <span className="toggle__lamp" />
      <span className="toggle__slot"><span className="toggle__knob" /></span>
    </button>
  )
}

export function Slider({ value, min = 0, max = 1, onChange, label }) {
  const p = (value - min) / (max - min)
  const setAt = (e, el) => {
    const r = el.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    onChange(min + t * (max - min))
  }
  return (
    <div
      className="pslider"
      role="slider"
      aria-label={label}
      aria-valuenow={value}
      style={{ '--p': p }}
      onPointerDown={(e) => {
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        setAt(e, el)
        el.onpointermove = (ev) => setAt(ev, el)
        el.onpointerup = () => { el.onpointermove = null }
      }}
    >
      <div className="pslider__track" />
      <div className="pslider__fill" />
      <div className="pslider__thumb" />
    </div>
  )
}

// 档位滑动条：固定几个档位，拖动与点击都吸附到最近的节点
export function StepSlider({ steps, value, onChange, label }) {
  const idx = Math.max(0, steps.indexOf(value))
  const setAt = (e, el) => {
    const r = el.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
    onChange(steps[Math.round(t * (steps.length - 1))])
  }
  return (
    <div
      className="pslider"
      role="slider"
      aria-label={label}
      aria-valuenow={steps[idx]}
      style={{ '--p': idx / (steps.length - 1) }}
      onPointerDown={(e) => {
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        setAt(e, el)
        el.onpointermove = (ev) => setAt(ev, el)
        el.onpointerup = () => { el.onpointermove = null }
      }}
    >
      <div className="pslider__track" />
      <div className="pslider__fill" />
      {steps.map((s, i) => (
        <i key={s} className="pslider__node" style={{ left: `${(i / (steps.length - 1)) * 100}%` }} />
      ))}
      <div className="pslider__thumb" />
    </div>
  )
}

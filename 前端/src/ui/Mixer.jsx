// 环境声混音台：每一路一根竖向推子，可任意叠加
import { useRadio } from '../store.js'
import { ambience, CHANNELS } from '../audio/ambience.js'
import { Panel } from './Panel.jsx'
import { Icon } from './Icon.jsx'
import './mixer.css'

function Fader({ ch }) {
  const v = useRadio((s) => s.mixer[ch.id] ?? 0)
  const setMixer = useRadio((s) => s.setMixer)
  const setAt = (e, el) => {
    const r = el.getBoundingClientRect()
    const t = 1 - (e.clientY - r.top) / r.height
    setMixer(ch.id, Math.round(Math.max(0, Math.min(1, t)) * 100) / 100)
  }
  return (
    <div className={`strip ${v > 0 ? 'is-live' : ''}`} title={ch.note || ch.label}>
      <span className="strip__lamp" />
      <Icon name={ch.icon} size={22} className="strip__icon" />
      <div
        className="strip__fader"
        role="slider"
        aria-label={ch.label}
        aria-valuenow={Math.round(v * 100)}
        style={{ '--v': v }}
        onPointerDown={(e) => {
          const el = e.currentTarget
          el.setPointerCapture(e.pointerId)
          setAt(e, el)
          el.onpointermove = (ev) => setAt(ev, el)
          el.onpointerup = () => { el.onpointermove = null }
        }}
        onDoubleClick={() => setMixer(ch.id, 0)}
        onWheel={(e) => setMixer(ch.id, Math.round(Math.max(0, Math.min(1, v + (e.deltaY < 0 ? 0.05 : -0.05))) * 100) / 100)}
      >
        <div className="strip__scale">{Array.from({ length: 11 }, (_, i) => <i key={i} className={i % 5 ? '' : 'major'} />)}</div>
        <div className="strip__groove"><div className="strip__fill" /></div>
        <div className="strip__cap"><i /></div>
      </div>
      <span className="strip__val latin tnum">{Math.round(v * 10)}</span>
      <span className="strip__label">{ch.label}</span>
      {ch.synth && <span className="strip__tag">合成</span>}
    </div>
  )
}

export default function Mixer() {
  const mixer = useRadio((s) => s.mixer)
  const live = CHANNELS.filter((c) => (mixer[c.id] ?? 0) > 0).length
  return (
    <Panel
      title="环境声"
      sub="Ambience · 混音台"
      width={Math.max(560, CHANNELS.length * 68 + 80)}
      footer={
        <>
          <span>音源放入 Resources/White Noise/ 即新增一路；双击推子归零</span>
          <button className="pbtn" onClick={() => useRadio.setState({ mixer: {} })} disabled={!live}>全部归零</button>
        </>
      }
    >
      <div className="console">
        {CHANNELS.map((ch) => <Fader key={ch.id} ch={ch} />)}
      </div>
    </Panel>
  )
}

// 混音电平与音频引擎同步
export function syncAmbience() {
  let prev = useRadio.getState().mixer
  ambience.applyAll(prev)
  return useRadio.subscribe((s) => {
    if (s.mixer === prev) return
    for (const ch of CHANNELS) {
      const a = prev[ch.id] ?? 0
      const b = s.mixer[ch.id] ?? 0
      if (a !== b) ambience.set(ch.id, b)
    }
    prev = s.mixer
  })
}

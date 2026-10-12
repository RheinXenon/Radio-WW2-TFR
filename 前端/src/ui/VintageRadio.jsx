// 复古收音机：音量旋钮、魔眼、乌玻璃刻度盘、调谐旋钮、象牙琴键
import { useEffect, useRef, useState } from 'react'
import { useRadio, listName } from '../store.js'
import { radio, needlePos, useDial } from '../audio/radio.js'
import { engine } from '../audio/engine.js'
import { theme } from '../themes/index.js'
import { Emblem } from '../themes/marks.jsx'
import { Icon } from './Icon.jsx'
import './radio.css'

const ORDER_LABEL = { seq: '顺序', shuffle: '随机', one: '单曲' }
const ORDER_NEXT = { seq: 'shuffle', shuffle: 'one', one: 'seq' }

// —— 旋钮 ——
// 拖动绕旋钮中心旋转（顺时针为正），滚轮微调；高光层不随旋钮转动
// read() 返回当前角度，旋钮在动画帧里自行同步，不触发 React 重渲染
function Knob({ read, size, label, ticks, onTurn, onStart, onEnd, onWheel, title }) {
  const drag = useRef(null)
  const body = useRef()
  useEffect(() => {
    let raf
    const tick = () => {
      if (body.current) body.current.style.transform = `rotate(${read()}deg)`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [read])
  // 指针相对旋钮中心的角度
  const angleAt = (e) => {
    const r = body.current.getBoundingClientRect()
    return (Math.atan2(e.clientY - r.top - r.height / 2, e.clientX - r.left - r.width / 2) * 180) / Math.PI
  }
  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { a: angleAt(e) }
    onStart?.()
  }
  const move = (e) => {
    if (!drag.current) return
    const a = angleAt(e)
    let d = a - drag.current.a
    if (d > 180) d -= 360
    else if (d < -180) d += 360
    drag.current.a = a
    onTurn(d)
  }
  const up = () => {
    if (!drag.current) return
    drag.current = null
    onEnd?.()
  }
  return (
    <div className="knob" style={{ '--size': `${size}px` }} title={title}>
      {ticks && (
        <svg className="knob__scale" viewBox="-60 -60 120 120" aria-hidden>
          {Array.from({ length: 11 }, (_, i) => {
            const a = -135 + i * 27
            return <line key={i} y1={-56} y2={i % 5 ? -52 : -50} transform={`rotate(${a})`} />
          })}
        </svg>
      )}
      <div
        className="knob__grip"
        role="slider"
        aria-label={label}
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onWheel={(e) => onWheel?.(e.deltaY < 0 ? 1 : -1)}
      >
        <div className="knob__body" ref={body}>
          <div className="knob__cap"><i /></div>
        </div>
        <div className="knob__sheen" />
      </div>
      <span className="knob__label">{label}</span>
    </div>
  )
}

// —— 魔眼 ——
// 荧光扇面的缺口随信号强度收拢；音乐响时轻轻跳动
function MagicEye() {
  const ref = useRef()
  useEffect(() => {
    let raf
    let open = 0.5
    let lastGap = '', lastLit = ''
    const tick = () => {
      const lv = engine.levels()
      const s = useRadio.getState()
      const sig = engine.signal()
      const active = s.playing || s.offAir ? 1 : 0.15
      const target = 1 - Math.min(1, sig * active * (0.7 + lv.rms * 0.9))
      open += (target - open) * 0.25
      // 缺口 18°（满信号）~ 150°（无信号），亮度随缺口同步走低;
      // 角度取整、亮度留两位,量化后值不变就跳过,安静处不再逐帧写样式
      const gap = `${Math.round(18 + open * 140)}deg`
      const lit = (0.3 + (1 - open) * 0.7).toFixed(2)
      if (gap !== lastGap) { lastGap = gap; ref.current?.style.setProperty('--gap', gap) }
      if (lit !== lastLit) { lastLit = lit; ref.current?.style.setProperty('--lit', lit) }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="eye" ref={ref} title="调谐指示">
      <div className="eye__glass">
        <div className="eye__fan" />
        <div className="eye__cap" />
      </div>
      <span className="knob__label">调谐</span>
    </div>
  )
}

// —— 刻度盘 ——
// 刻度：按主题刻度盘的步长逐格画出，逢大格加长
function dialTicks(dial) {
  const out = []
  const span = dial.max - dial.min
  const first = Math.ceil(dial.min / dial.step) * dial.step
  for (let i = 0, f = first; f < dial.max; i++, f = first + i * dial.step) {
    if (f <= dial.min) continue
    const major = Math.abs(f / dial.major - Math.round(f / dial.major)) < 1e-6
    const x = ((f - dial.min) / span) * 1000
    out.push(<line key={i} x1={x} x2={x} y1={major ? 0 : 5} y2={major ? 16 : 11} className={major ? 'major' : ''} />)
  }
  return out
}

function Dial() {
  const stations = theme.stations
  const dial = theme.dial
  const root = useRef()
  const glass = useRef()
  const labels = useRef([])
  const enabled = useRadio((s) => s.enabled)
  const current = useRadio((s) => s.offAir ?? s.track?.station ?? s.station)

  useEffect(() => {
    let raf
    const tick = () => {
      const p = needlePos()
      root.current?.style.setProperty('--needle', p)
      stations.forEach((st, i) => {
        const near = Math.max(0, 1 - Math.abs(p - st.pos) / 0.035)
        labels.current[i]?.style.setProperty('--near', near.toFixed(3))
      })
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  const posAt = (e) => {
    const r = glass.current.getBoundingClientRect()
    const pad = 34
    return (e.clientX - r.left - pad) / (r.width - pad * 2)
  }
  const drag = useRef(false)
  const down = (e) => {
    if (e.target.closest('.dial__st')) return
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

  const ticks = dialTicks(dial)

  return (
    <div className="dial" ref={root}>
      <div className="dial__glass" ref={glass} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className="dial__lamp" />
        <div className="dial__track">
          <div className="dial__row dial__row--st">
            {stations.map((st, i) => (
              <button
                key={st.id}
                ref={(el) => (labels.current[i] = el)}
                className={`dial__st ${st.id === current ? 'is-cur' : ''} ${enabled[st.id] !== false ? '' : 'is-off'}`}
                style={{ left: `${st.pos * 100}%`, '--glow': st.glow }}
                onClick={() => radio.tune(st.id)}
                title={`${st.name} · ${st.genre}${enabled[st.id] !== false ? '' : '（已停播）'}`}
              >
                <Emblem kind={st.emblem} size={15} ring={false} />
                <span className="dial__city">{st.label}</span>
              </button>
            ))}
          </div>
          <svg className="dial__ticks" viewBox="0 0 1000 16" preserveAspectRatio="none" aria-hidden>{ticks}</svg>
          <div className="dial__row dial__row--num">
            {stations.map((st) => (
              <span key={st.id} className="latin tnum" style={{ left: `${st.pos * 100}%` }}>{dial.fmt(st.freq)}</span>
            ))}
          </div>
          <div className="dial__row dial__row--latin">
            {stations.map((st) => (
              <span key={st.id} className="sc" style={{ left: `${st.pos * 100}%` }}>{st.latin}</span>
            ))}
          </div>
          <div className="dial__needle"><i /></div>
        </div>
        <span className="dial__corner dial__corner--l sc">{dial.band}</span>
        <span className="dial__corner dial__corner--r sc">{dial.unit}</span>
        <div className="dial__sheen" />
      </div>
    </div>
  )
}

// —— 琴键 ——
function Keys() {
  const playing = useRadio((s) => s.playing)
  const band = useRadio((s) => s.band)
  const order = useRadio((s) => s.order)
  const listTitle = useRadio((s) => listName(s, s.list))
  const [pressed, setPressed] = useState(null)
  const press = (id, fn) => () => {
    engine.click('key')
    setPressed(id)
    setTimeout(() => setPressed((p) => (p === id ? null : p)), 160)
    fn()
  }
  const Key = ({ id, latched, children, onClick, title, wide }) => (
    <button className={`key ${latched || pressed === id ? 'is-down' : ''} ${wide ? 'key--wide' : ''}`} onClick={press(id, onClick)} title={title}>
      <span className="key__face">{children}</span>
    </button>
  )
  return (
    <div className="keys">
      <div className="keys__group">
        <Key id="prev" onClick={radio.prev} title="上一首（←）"><Icon name="prev" size={13} /></Key>
        <Key id="play" onClick={radio.toggle} title="播放 / 暂停（空格）" wide>
          <Icon name={playing ? 'pause' : 'play'} size={13} /><em>{playing ? '暂停' : '播放'}</em>
        </Key>
        <Key id="next" onClick={radio.next} title="下一首（→）"><Icon name="next" size={13} /></Key>
      </div>
      <div className="keys__group">
        <Key id="station" latched={band === 'station'} onClick={() => radio.setBand('station')} title="只听当前频道（1）"><em>本台</em></Key>
        <Key id="all" latched={band === 'all'} onClick={() => radio.setBand('all')} title="在所有启用的频道间混播（2）"><em>全频段</em></Key>
        <Key id="list" latched={band === 'list'} onClick={() => radio.setBand('list')} title={`播放歌单：${listTitle}（3）`}><em>歌单</em></Key>
      </div>
      <div className="keys__group">
        <Key id="order" onClick={() => useRadio.setState({ order: ORDER_NEXT[order] })} title="播放顺序（S）" wide>
          <Icon name={order === 'seq' ? 'seq' : order === 'one' ? 'one' : 'shuffle'} size={14} /><em>{ORDER_LABEL[order]}</em>
        </Key>
      </div>
    </div>
  )
}

const readVolume = () => {
  const s = useRadio.getState()
  return -135 + (s.muted ? 0 : s.volume) * 270
}
// 调谐旋钮的角度跟随指针：指针自动移动时旋钮也一起转
const readTune = () => needlePos() * 1080

export default function VintageRadio() {
  const lastDetent = useRef(0)

  const stepStation = (dir) => {
    const stations = theme.stations
    const cur = useRadio.getState().offAir ?? useRadio.getState().track?.station ?? useRadio.getState().station
    const i = stations.findIndex((s) => s.id === cur)
    const next = stations[Math.max(0, Math.min(stations.length - 1, i + dir))]
    if (next && next.id !== cur) radio.tune(next.id)
  }

  return (
    <div className="radio">
      <Keys />
      <div className="radio__body">
        <Knob
          size={78}
          label="音量"
          ticks
          title="音量：拖动或滚轮（↑ ↓）"
          read={readVolume}
          onTurn={(d) => radio.setVolume(useRadio.getState().volume + d / 270)}
          onWheel={(dir) => radio.setVolume(useRadio.getState().volume + dir * 0.04)}
        />
        <MagicEye />
        <Dial />
        <Knob
          size={92}
          label="调谐"
          title="调谐：拖动旋转，滚轮逐台切换"
          read={readTune}
          onStart={() => radio.scrubStart()}
          onTurn={(d) => {
            const p = Math.max(0, Math.min(1, (useDial.getState().scrub ?? needlePos()) + d / 1080))
            radio.scrubMove(p)
            // 每转过一小格发出一声棘齿轻响
            if (Math.abs(p - lastDetent.current) > 0.012) { lastDetent.current = p; engine.click('soft') }
          }}
          onEnd={() => radio.scrubEnd()}
          onWheel={(dir) => stepStation(-dir)}
        />
      </div>
    </div>
  )
}

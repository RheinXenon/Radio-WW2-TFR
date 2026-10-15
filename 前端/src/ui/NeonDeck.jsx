// 霓虹调谐台：烈焰升腾的播放控件
// 切角的紫玻璃面板，霓虹描边与底光随低音呼吸；六角播放键，数字频率读数随指针滚动、换台时被干扰撕开，
// 下面一排实时频谱；平行四边形的台位像一排霓虹招牌，选中的那块亮起本台的颜色；右侧是模式灯、播放顺序与阶梯音量
import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { useRadio } from '../store.js'
import { radio, needlePos } from '../audio/radio.js'
import { engine } from '../audio/engine.js'
import { theme } from '../themes/index.js'
import { Emblem } from '../themes/marks.jsx'
import { Icon } from './Icon.jsx'
import { useT, useLoc } from '../i18n/index.js'
import './neondeck.css'

const BANDS = [['station', '本台'], ['all', '全频段'], ['list', '歌单']]
const ORDER_NEXT = { seq: 'shuffle', shuffle: 'one', one: 'seq' }
const ORDER_LABEL = { seq: '顺序播放', shuffle: '随机播放', one: '单曲循环' }
const ORDER_CODE = { seq: 'SEQ', shuffle: 'SHUF', one: 'LOOP' }
const ORDER_ICON = { seq: 'seq', shuffle: 'shuffle', one: 'one' }

// 频谱：30 根柱，频点按对数间隔取（约 86 Hz ~ 16 kHz），柱顶留一道缓缓下落的峰值线
const SPEC = { w: 150, h: 20, bars: 30, bar: 3 }
const EDGES = Array.from({ length: SPEC.bars + 1 }, (_, i) => Math.round(2 * Math.pow(372 / 2, i / SPEC.bars)))

function useReadout(root, num, canvas) {
  useEffect(() => {
    const cv = canvas.current
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const { w: W, h: H, bars: N, bar: BW } = SPEC
    cv.width = W * dpr
    cv.height = H * dpr
    const g = cv.getContext('2d')
    g.scale(dpr, dpr)
    const fill = g.createLinearGradient(0, H, 0, 0)
    fill.addColorStop(0, '#7a3cff')
    fill.addColorStop(0.55, '#ff3ea5')
    fill.addColorStop(1, '#ffd2f2')
    const step = (W - N * BW) / (N - 1)
    const vals = new Float32Array(N)
    const peaks = new Float32Array(N)
    const dial = theme.dial
    // 只把 --beat 写到真正消费它的三个元素(底光、玻璃描边、播放键)身上:
    // 写在面板根上会让整个面板子树逐帧样式重算
    const beatEls = root.current ? [...root.current.querySelectorAll('.neo__glow, .neo__bg, .neo__play')] : []
    let last = ''
    let lastBeat = ''
    let at = performance.now()
    let raf
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - at) / 1000)
      at = now
      // 频率读数跟随指针，按刻度步长取整
      const f = dial.min + needlePos() * (dial.max - dial.min)
      const txt = dial.fmt(Math.round(f / dial.step) * dial.step)
      if (txt !== last && num.current) {
        last = txt
        num.current.textContent = txt
        num.current.dataset.text = txt
      }
      const s = useRadio.getState()
      const live = s.playing && !s.offAir
      const data = engine.spectrum()
      g.clearRect(0, 0, W, H)
      for (let i = 0; i < N; i++) {
        let v = 0
        for (let b = EDGES[i]; b < Math.max(EDGES[i] + 1, EDGES[i + 1]); b++) v = Math.max(v, data[b])
        v = live ? Math.pow(v / 255, 1.5) : 0
        vals[i] += (v - vals[i]) * (v > vals[i] ? 0.55 : 0.14)
        peaks[i] = Math.max(vals[i], peaks[i] - dt * 0.5)
        const x = i * (BW + step)
        const bh = Math.max(1, vals[i] * (H - 2))
        g.fillStyle = fill
        g.fillRect(x, H - bh, BW, bh)
        if (peaks[i] > 0.04) {
          g.fillStyle = '#a8f8ff'
          g.fillRect(x, H - peaks[i] * (H - 2) - 2, BW, 1)
        }
      }
      // 节拍量化后不变则不写,静止与暂停时不再让面板样式失效
      const beat = (live ? engine.levels().beat : 0).toFixed(2)
      if (beat !== lastBeat) { lastBeat = beat; beatEls.forEach((el) => el.style.setProperty('--beat', beat)) }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
}

// 阶梯音量：12 根由矮到高的斜柱，点按或拖动设定，滚轮微调
function Volume() {
  const t = useT()
  const volume = useRadio((s) => s.volume)
  const muted = useRadio((s) => s.muted)
  const lit = muted ? 0 : Math.round(volume * 12)
  const setAt = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    radio.setVolume((e.clientX - r.left) / r.width)
  }
  return (
    <div className="neo__vol">
      <button onClick={radio.toggleMute} title={t('静音（M）')}><Icon name={muted || volume === 0 ? 'mute' : 'volume'} size={17} /></button>
      <div
        className="neo__bars"
        role="slider"
        aria-label={t('音量')}
        aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
        title={t('音量：点按、拖动或滚轮（↑ ↓）')}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setAt(e) }}
        onPointerMove={(e) => { if (e.buttons & 1) setAt(e) }}
        onWheel={(e) => radio.setVolume(volume + (e.deltaY < 0 ? 0.04 : -0.04))}
      >
        {Array.from({ length: 12 }, (_, i) => <i key={i} className={i < lit ? 'on' : ''} style={{ '--k': i / 11 }} />)}
      </div>
    </div>
  )
}

export default function NeonDeck() {
  const t = useT()
  const L = useLoc()
  const root = useRef(), num = useRef(), canvas = useRef()
  const playing = useRadio((s) => s.playing)
  const band = useRadio((s) => s.band)
  const order = useRadio((s) => s.order)
  const enabled = useRadio((s) => s.enabled)
  const tuning = useRadio((s) => !!s.tuning)
  const offAir = useRadio((s) => !!s.offAir)
  const current = useRadio((s) => s.tuning ?? s.offAir ?? s.track?.station ?? s.station)
  useReadout(root, num, canvas)

  const stations = theme.stations
  const index = stations.findIndex((st) => st.id === current) + 1
  const status = offAir ? 'NO SIGNAL' : tuning ? 'SCANNING' : playing ? 'ON AIR' : 'STANDBY'

  return (
    <div ref={root} className={`neo ${tuning ? 'is-tuning' : ''} ${offAir ? 'is-offair' : ''} ${playing ? 'is-playing' : ''}`}>
      <div className="neo__glow" />
      <div className="neo__bg" />
      <i className="neo__cut neo__cut--tl" />
      <i className="neo__cut neo__cut--br" />
      <div className="neo__tag">
        <span>{(theme.latin || theme.name).toUpperCase()}</span>
        <span className="tnum">CH {String(index).padStart(2, '0')}/{String(stations.length).padStart(2, '0')}</span>
        <span className="neo__status"><i />{status}</span>
      </div>

      <div className="neo__transport">
        <button className="neo__skip" onClick={radio.prev} title={t('上一首（←）')}><Icon name="prev" size={17} /></button>
        <button className={`neo__play ${playing ? 'is-on' : ''}`} onClick={radio.toggle} title={t('播放 / 暂停（空格）')}>
          <span className="neo__hex"><Icon name={playing ? 'pause' : 'play'} size={20} /></span>
        </button>
        <button className="neo__skip" onClick={radio.next} title={t('下一首（→）')}><Icon name="next" size={17} /></button>
      </div>

      <div className="neo__readout">
        <div className="neo__freq">
          <span className="neo__unit">{theme.dial.band}</span>
          <b ref={num} className="tnum" />
          <span className="neo__unit">{theme.dial.unit}</span>
        </div>
        <div className="neo__specwrap">
          <canvas ref={canvas} className="neo__spec" style={{ width: SPEC.w, height: SPEC.h }} />
          {offAir && <span className="neo__nosig">NO SIGNAL</span>}
        </div>
      </div>

      <div className="neo__stations">
        {stations.map((st) => (
          <button
            key={st.id}
            className={`neo__st ${current === st.id ? 'is-cur' : ''} ${enabled[st.id] !== false ? '' : 'is-off'}`}
            onClick={() => radio.tune(st.id)}
            title={`${L(st, 'name')} · ${L(st, 'genre')}${enabled[st.id] !== false ? '' : t('（已停播）')}`}
            style={{ '--glow': st.glow, '--acc': st.accent }}
          >
            {current === st.id && (
              <motion.span layoutId="neo-ind" className="neo__ind" transition={{ type: 'spring', stiffness: 420, damping: 36 }}><i /></motion.span>
            )}
            <Emblem kind={st.emblem} size={16} ring={false} />
            <span className="neo__stname">{L(st, 'label')}</span>
          </button>
        ))}
      </div>

      <div className="neo__modes">
        {BANDS.map(([id, label]) => (
          <button key={id} className={band === id ? 'is-on' : ''} onClick={() => radio.setBand(id)}>
            <i className="neo__led" />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>
      <button className="neo__order" onClick={() => useRadio.setState({ order: ORDER_NEXT[order] })} title={`${t(ORDER_LABEL[order])}（S）`}>
        <Icon name={ORDER_ICON[order]} size={17} />
        <span>{ORDER_CODE[order]}</span>
      </button>
      <Volume />
    </div>
  )
}

// 现代风格控制条：一条磨砂玻璃，频道横排，选中指示在频道间平滑滑动
import { motion } from 'motion/react'
import { useRadio } from '../store.js'
import { radio } from '../audio/radio.js'
import { theme } from '../themes/index.js'
import { Emblem } from '../themes/marks.jsx'
import { Icon } from './Icon.jsx'
import { useT, useLoc } from '../i18n/index.js'
import './modern.css'

const BANDS = [['station', '本台'], ['all', '全频段'], ['list', '歌单']]
const ORDER_NEXT = { seq: 'shuffle', shuffle: 'one', one: 'seq' }
const ORDER_LABEL = { seq: '顺序播放', shuffle: '随机播放', one: '单曲循环' }

function Volume() {
  const t = useT()
  const volume = useRadio((s) => s.volume)
  const muted = useRadio((s) => s.muted)
  const setAt = (e, el) => {
    const r = el.getBoundingClientRect()
    radio.setVolume((e.clientX - r.left) / r.width)
  }
  return (
    <div className="mvol">
      <button onClick={radio.toggleMute} title={t('静音（M）')}><Icon name={muted || volume === 0 ? 'mute' : 'volume'} size={18} /></button>
      <div
        className="mvol__track"
        role="slider"
        aria-label={t('音量')}
        onPointerDown={(e) => {
          const el = e.currentTarget
          el.setPointerCapture(e.pointerId)
          setAt(e, el)
          el.onpointermove = (ev) => setAt(ev, el)
          el.onpointerup = () => { el.onpointermove = null }
        }}
        onWheel={(e) => radio.setVolume(volume + (e.deltaY < 0 ? 0.04 : -0.04))}
      >
        <div className="mvol__fill" style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
      </div>
    </div>
  )
}

export default function ModernDeck() {
  const t = useT()
  const L = useLoc()
  const playing = useRadio((s) => s.playing)
  const band = useRadio((s) => s.band)
  const order = useRadio((s) => s.order)
  const enabled = useRadio((s) => s.enabled)
  const current = useRadio((s) => s.tuning ?? s.offAir ?? s.track?.station ?? s.station)

  return (
    <div className="deck">
      <div className="deck__transport">
        <button onClick={radio.prev} title={t('上一首（←）')}><Icon name="prev" size={18} /></button>
        <button className="deck__play" onClick={radio.toggle} title={t('播放 / 暂停（空格）')}>
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <button onClick={radio.next} title={t('下一首（→）')}><Icon name="next" size={18} /></button>
      </div>

      <div className="deck__stations">
        {theme.stations.map((st) => (
          <button
            key={st.id}
            className={`deck__st ${current === st.id ? 'is-cur' : ''} ${enabled[st.id] !== false ? '' : 'is-off'}`}
            onClick={() => radio.tune(st.id)}
            title={`${L(st, 'name')} · ${L(st, 'genre')}`}
            style={{ '--glow': st.glow }}
          >
            {current === st.id && <motion.span layoutId="deck-indicator" className="deck__ind" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
            <Emblem kind={st.emblem} size={16} ring={false} />
            <span>{L(st, 'label')}</span>
          </button>
        ))}
      </div>

      <div className="deck__right">
        <div className="deck__seg">
          {BANDS.map(([id, label]) => (
            <button key={id} className={band === id ? 'is-on' : ''} onClick={() => radio.setBand(id)}>
              {band === id && <motion.span layoutId="deck-band" className="deck__segbg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span>{t(label)}</span>
            </button>
          ))}
        </div>
        <button className="deck__order" onClick={() => useRadio.setState({ order: ORDER_NEXT[order] })} title={t(ORDER_LABEL[order])}>
          <Icon name={order === 'seq' ? 'seq' : order === 'one' ? 'one' : 'shuffle'} size={18} />
        </button>
        <Volume />
      </div>
    </div>
  )
}

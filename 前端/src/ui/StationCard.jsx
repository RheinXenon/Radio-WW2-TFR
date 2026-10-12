// 换台时的呼号卡片
// 指针式控件（老收音机、鎏金音乐厅）：锁台后，画面中央淡淡浮现当年的电台开场语，如 “Говорит Москва”
// 数字式控件（现代、霓虹）：换台一开始，城市名以大字号随一道光带横向揭开，再向上散去
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRadio, isOn } from '../store.js'
import { events } from '../audio/radio.js'
import { theme } from '../themes/index.js'
import { isAnalog } from '../skins.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import './stationcard.css'

export default function StationCard() {
  const analog = useRadio((s) => isAnalog(s.style))
  const [card, setCard] = useState(null)

  useEffect(() => {
    let timer
    const show = (type) => (e) => {
      const { station, manual } = e.detail
      if (!manual) return
      if (analog !== (type === 'locked')) return
      clearTimeout(timer)
      setCard({ station, key: performance.now(), analog, offAir: !isOn(useRadio.getState(), station) })
      timer = setTimeout(() => setCard(null), analog ? 3600 : 2100)
    }
    const onLocked = show('locked')
    const onStart = show('tunestart')
    events.addEventListener('locked', onLocked)
    events.addEventListener('tunestart', onStart)
    return () => {
      clearTimeout(timer)
      events.removeEventListener('locked', onLocked)
      events.removeEventListener('tunestart', onStart)
    }
  }, [analog])

  const st = card && theme.stationMap[card.station]
  return (
    <AnimatePresence>
      {card && card.analog && (
        <motion.div
          key={card.key}
          className="callsign"
          style={{ '--glow': st.glow, '--accent': st.accent }}
          initial={{ opacity: 0, filter: 'blur(10px)', y: 8 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, filter: 'blur(6px)', y: -6 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Emblem kind={st.emblem} size={46} />
          <div className={`callsign__call ${/[぀-鿿]/.test(st.call) ? '' : 'latin'}`}>{st.call}</div>
          <div className="callsign__meta">
            <span className="callsign__rule" />
            <span>这里是 {st.city}</span>
            <i>·</i>
            <span className="latin tnum">{theme.dial.fmt(st.freq)} {theme.dial.unit}</span>
            <span className="callsign__rule" />
          </div>
        </motion.div>
      )}
      {card && !card.analog && (
        <motion.div
          key={card.key}
          className="sweep"
          style={{ '--glow': st.glow, '--accent': st.accent }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -40, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        >
          <motion.div
            className="sweep__band"
            initial={{ scaleX: 0, opacity: 0.9 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="sweep__inner"
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sweep__kicker">
              <Emblem kind={st.emblem} size={20} />
              <span className="sc">{st.latin}</span>
              <span className="latin tnum">{theme.dial.fmt(st.freq)} {theme.dial.unit}</span>
            </div>
            <div className="sweep__city">{st.city}</div>
            <Pattern kind={st.pattern} color={st.glow} height={6} opacity={0.6} className="sweep__pattern" />
            <div className="sweep__genre">{card.offAir ? '本台已停播' : `${st.name} · ${st.genre}`}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

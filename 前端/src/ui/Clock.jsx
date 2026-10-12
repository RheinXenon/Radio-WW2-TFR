// 时钟：按当前选定的样式显示，换样式时旧表淡出、新表淡入
import { AnimatePresence, motion } from 'motion/react'
import { useRadio } from '../store.js'
import Watch from './Watch.jsx'
import NeonClock from './NeonClock.jsx'
import PocketWatch from './PocketWatch.jsx'
import FlatClock from './FlatClock.jsx'
import './clock.css'

const FACES = { pilot: Watch, neon: NeonClock, pocket: PocketWatch, flat: FlatClock }

export default function Clock() {
  const id = useRadio((s) => s.clock)
  const Face = FACES[id] ?? Watch
  return (
    <div className="clock">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={id}
          className="clock__face"
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Face />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

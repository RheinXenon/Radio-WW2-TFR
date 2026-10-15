// 超级事件：模组事件插画的详情弹窗，从画廊进入，覆盖全屏
// 烈焰升腾专用（主题定义里 dossier: 'event'，App 据此分流）：插画在上、事件条在下，
// 标题与引语按游戏超级事件的排式陈列；与史实档案共用 dossier 状态与翻页键盘
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRadio } from '../store.js'
import { engine } from '../audio/engine.js'
import { theme } from '../themes/index.js'
import { useT, useLoc } from '../i18n/index.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import { resolveWall } from '../scene/Stage.jsx'
import { stepDossier } from './Dossier.jsx'
import { Icon } from './Icon.jsx'
import './superevent.css'

const EASE = [0.16, 1, 0.3, 1]
const pad = (n) => String(n).padStart(2, '0')

const close = () => useRadio.setState({ dossier: null })

// 页进出方向与逐行浮现，同史实档案
const PAGE = {
  enter: (dir) => ({ opacity: 0, x: 64 * dir, filter: 'blur(8px)' }),
  show: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: EASE, staggerChildren: 0.06, delayChildren: 0.2 },
  },
  leave: (dir) => ({ opacity: 0, x: -44 * dir, filter: 'blur(8px)', transition: { duration: 0.26, ease: [0.65, 0, 0.35, 1] } }),
}
const LINE = {
  enter: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

export default function SuperEvent() {
  const key = useRadio((s) => s.dossier)
  const t = useT()
  const entry = theme.photoMap[key]
  const index = theme.photos.indexOf(entry)
  const n = theme.photos.length

  // 翻页方向决定新旧两页的进出方向；首次打开原地淡入
  const [nav, setNav] = useState({ index, dir: 0 })
  if (nav.index !== index) setNav({ index, dir: (index - nav.index + n) % n <= n / 2 ? 1 : -1 })

  // 预读相邻事件的缩略图，翻页时即时显影
  useEffect(() => {
    for (const d of [-1, 1]) {
      const thumb = theme.photos[(index + d + n) % n]?.wall?.thumb
      if (thumb) new Image().src = thumb
    }
  }, [index, n])

  if (!entry) return null
  const station = theme.stationMap[theme.pools[entry.pool].station]

  return (
    <motion.div
      className="sev"
      style={{ '--accent': station.accent, '--glow': station.glow }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      transition={{ duration: 0.4 }}
      onPointerDown={close}
    >
      <Backdrop entry={entry} />
      <motion.article
        className="sev__case"
        initial={{ opacity: 0, y: 30, scale: 0.975 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.985 }}
        transition={{ duration: 0.6, ease: EASE }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait" custom={nav.dir}>
          <motion.div key={key} className="sev__page" custom={nav.dir} variants={PAGE} initial="enter" animate="show" exit="leave">
        <Plate entry={entry} station={station} />
        <Strip entry={entry} index={index} total={n} />
          </motion.div>
        </AnimatePresence>
        <button className="panel__close sev__close" onClick={close} title={t('返回画廊（Esc）')}><Icon name="close" size={18} /></button>
      </motion.article>
    </motion.div>
  )
}

// 背景：当前事件的画面放大虚化，翻页时交叉淡入
function Backdrop({ entry }) {
  const src = entry.wall?.thumb ?? entry.wall?.url
  return (
    <div className="sev__backdrop">
      <AnimatePresence initial={false}>
        {src && (
          <motion.img
            key={src}
            src={src}
            alt=""
            draggable={false}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
      <div className="sev__vignette" />
    </div>
  )
}

// 插画：先铺缩略图，原尺寸图读完后如显像管通电般泛白显影；罩扫描线与一道游走的亮带
function Plate({ entry, station }) {
  const [full, setFull] = useState(false)
  const t = useT()
  const wall = entry.wall
  if (!wall) {
    return (
      <div className="sev__plate sev__plate--empty">
        <Pattern kind={station.pattern} color={station.accent} height={16} opacity={0.1} style={{ height: '100%' }} />
        <Emblem kind={station.emblem} size={54} style={{ opacity: 0.4 }} />
        <strong>{t('插画待收录')}</strong>
      </div>
    )
  }
  return (
    <motion.div className="sev__plate" variants={LINE}>
      {wall.thumb && <img className="sev__thumb" src={wall.thumb} alt="" draggable={false} />}
      <img
        className={`sev__full ${full ? 'is-in' : ''}`}
        src={wall.url}
        alt={entry.title}
        draggable={false}
        decoding="async"
        onLoad={() => setFull(true)}
      />
      <i className="sev__scan" aria-hidden />
      <i className="sev__beam" aria-hidden />
    </motion.div>
  )
}

// 事件条：眉题与编号、事件标题、引语与署名、底部工具行
// 中英两语各有主副行：当前语言为主，另一语言退为拉丁副行（用户语言切换即互换顺序）
function Strip({ entry, index, total }) {
  const t = useT()
  const L = useLoc()
  const terms = theme.terms
  const isEn = useRadio((s) => s.lang) === 'en'
  const title = isEn ? entry.en?.title ?? entry.title : entry.title
  const titleAlt = isEn ? entry.title : entry.en?.title
  const quote = isEn ? entry.en?.quote ?? entry.quote : entry.quote
  const quoteAlt = isEn ? entry.quote : entry.en?.quote
  const author = isEn ? entry.en?.author ?? entry.author : entry.author
  const authorAlt = isEn ? entry.author : entry.en?.author
  const sel = useRadio((s) => s.wallpaper)
  const showing = entry.wall && resolveWall(sel)?.id === entry.wall.id
  return (
    <motion.footer className="sev__strip">
      <motion.div className="sev__brow sc" variants={LINE}>
        <i className="sev__tick" aria-hidden />
        {isEn ? terms.recordLatin : terms.record} · {isEn ? terms.record : terms.recordLatin} · {L(theme.pools[entry.pool], 'name')}
        <b className="latin tnum sev__num">{pad(index + 1)}<i>/</i>{pad(total)}</b>
      </motion.div>

      <motion.h2 className="sev__title sc" variants={LINE}>{title}</motion.h2>
      {titleAlt && titleAlt !== title && <motion.div className="sev__latin latin" variants={LINE}>{titleAlt}</motion.div>}

      {quote && (
        <motion.p className="sev__quote sc" variants={LINE}>“{quote}”</motion.p>
      )}
      {(author || authorAlt) && (
        <motion.p className="sev__author sc" variants={LINE}>
          {author && <>— {author}</>}
          {authorAlt && authorAlt !== author && <span className="latin">{author ? ` · ${authorAlt}` : `— ${authorAlt}`}</span>}
        </motion.p>
      )}
      {quoteAlt && quoteAlt !== quote && (
        <motion.p className="sev__enq latin" variants={LINE}>“{quoteAlt}”</motion.p>
      )}

      <motion.div className="sev__bar" variants={LINE}>
        {entry.wall && (showing
          ? <span className="sev__showing"><i />{t('正在展出')}</span>
          : (
            <button
              className="pbtn"
              onClick={() => { engine.click('soft'); useRadio.setState({ wallpaper: { pool: entry.pool, name: entry.wall.name } }) }}
            >
              {t('设为壁纸')}
            </button>
          ))}
        <div className="sev__pager">
          <button onClick={() => stepDossier(-1)} aria-label={t('上一个事件')} title={t('上一个（←）')}><Icon name="back" size={15} /></button>
          <button onClick={() => stepDossier(1)} aria-label={t('下一个事件')} title={t('下一个（→）')}><Icon name="forward" size={15} /></button>
        </div>
      </motion.div>
    </motion.footer>
  )
}

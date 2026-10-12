// 史实档案：一张史实照片的详情，从画廊进入，覆盖全屏
// 左侧看片台有四档：原照、分界（同框拖动黄铜分界线对照）、并列、转绘，
// 两幅图片在各档之间连续移动与变形；右侧象牙纸档案卡载出处、画面要点与史实。
// 壁纸未绘制或原照未收录时，相关档位停用，档案卡照常成立
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useRadio, getRadio } from '../store.js'
import { engine } from '../audio/engine.js'
import { theme } from '../themes/index.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import { resolveWall } from '../scene/Stage.jsx'
import { Icon } from './Icon.jsx'
import './dossier.css'

const EASE = [0.16, 1, 0.3, 1]
const WALL_RATIO = 16 / 9
const keyOf = (entry) => `${entry.pool}/${entry.id}`
const pad = (n) => String(n).padStart(2, '0')

// 出处一段拆成“来历”与“画面要点”，并取出原题与年份（登记 meta 给了年份时优先用它）
export function readSource(entry) {
  const source = entry.source
  const [origin, points] = source.split(/画面要点[：:]/)
  return {
    origin: origin.trim(),
    points: points?.trim() ?? null,
    latin: /^《[^》]+》（([^）]+)）/.exec(source)?.[1].split('，')[0] ?? null,
    year: entry.meta?.year?.match(/\d{3,4}/)?.[0] ?? /19[34]\d/.exec(source)?.[0] ?? null,
  }
}

export function openDossier(entry) {
  engine.click('soft')
  useRadio.setState({ dossier: keyOf(entry) })
}

export function stepDossier(dir) {
  const list = theme.photos
  const i = list.findIndex((e) => keyOf(e) === getRadio().dossier)
  if (i < 0 || list.length < 2) return
  engine.click('soft')
  useRadio.setState({ dossier: keyOf(list[(i + dir + list.length) % list.length]) })
}

const close = () => useRadio.setState({ dossier: null })

// ———————————————————— 图片预读 ————————————————————

// 原照宽高比：预读后缓存，翻回看过的档案时无需等待；读取失败记为 0，按未收录处理
const ratioJobs = new Map()
const ratios = new Map()
function readRatio(url) {
  if (!ratioJobs.has(url)) {
    ratioJobs.set(url, new Promise((done) => {
      const img = new Image()
      img.onload = () => { ratios.set(url, img.naturalWidth / img.naturalHeight); done() }
      img.onerror = () => { ratios.set(url, 0); done() }
      img.src = url
    }))
  }
  return ratioJobs.get(url)
}

// 返回 undefined 表示读取中，0 表示没有原照
function useRatio(url) {
  const [ratio, setRatio] = useState(() => (url ? ratios.get(url) : 0))
  useEffect(() => {
    if (!url || ratio !== undefined) return
    let live = true
    readRatio(url).then(() => live && setRatio(ratios.get(url)))
    return () => { live = false }
  }, [url, ratio])
  return ratio
}

function useSize(ref) {
  const [size, setSize] = useState(null)
  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return size
}

// ———————————————————— 外壳 ————————————————————

export default function Dossier() {
  const key = useRadio((s) => s.dossier)
  const entry = theme.photoMap[key]
  const index = theme.photos.indexOf(entry)
  const n = theme.photos.length

  // 翻页方向决定新旧两页的进出方向；从末页翻到首页也算向后。首次打开时为 0，原地淡入
  const [nav, setNav] = useState({ index, dir: 0 })
  if (nav.index !== index) setNav({ index, dir: (index - nav.index + n) % n <= n / 2 ? 1 : -1 })

  // 预读相邻两份档案的原照与壁纸缩略图，翻页时即时显影
  useEffect(() => {
    for (const d of [-1, 1]) {
      const e = theme.photos[(index + d + n) % n]
      if (e?.photo) readRatio(e.photo)
      if (e?.wall?.thumb) new Image().src = e.wall.thumb
    }
  }, [index, n])

  if (!entry) return null
  const station = theme.stationMap[theme.pools[entry.pool].station]

  return (
    <motion.div
      className="dos"
      style={{ '--accent': station.accent, '--glow': station.glow }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.15 } }}
      transition={{ duration: 0.5 }}
      onPointerDown={close}
    >
      <Backdrop entry={entry} />
      <motion.article
        className="dos__case"
        initial={{ opacity: 0, y: 34, scale: 0.97, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 22, scale: 0.98, filter: 'blur(8px)' }}
        transition={{ duration: 0.75, ease: EASE }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {['tl', 'tr', 'bl', 'br'].map((c) => <i key={c} className={`dos__screw dos__screw--${c}`} />)}
        <Head entry={entry} index={index} total={n} station={station} />
        <div className="hairline" />
        <AnimatePresence mode="wait" custom={nav.dir}>
          <motion.div
            key={key}
            className="dos__body"
            custom={nav.dir}
            variants={PAGE}
            initial="enter"
            animate="show"
            exit="leave"
          >
            <Viewer entry={entry} />
            <Card entry={entry} index={index} station={station} />
          </motion.div>
        </AnimatePresence>
      </motion.article>
    </motion.div>
  )
}

const PAGE = {
  enter: (dir) => ({ opacity: 0, x: 56 * dir, filter: 'blur(6px)' }),
  show: {
    opacity: 1, x: 0, filter: 'blur(0px)',
    transition: { duration: 0.65, ease: EASE, staggerChildren: 0.05, delayChildren: 0.12 },
  },
  leave: (dir) => ({ opacity: 0, x: -36 * dir, filter: 'blur(6px)', transition: { duration: 0.28, ease: [0.65, 0, 0.35, 1] } }),
}
const LINE = {
  enter: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

// 背景：当前档案的画面放大虚化，翻页时交叉淡入
function Backdrop({ entry }) {
  const src = entry.wall?.thumb ?? entry.wall?.url ?? entry.photo
  return (
    <div className="dos__backdrop">
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
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />
        )}
      </AnimatePresence>
      <div className="dos__vignette" />
    </div>
  )
}

function Head({ entry, index, total, station }) {
  const sel = useRadio((s) => s.wallpaper)
  const t = theme.terms
  const { latin } = readSource(entry)
  const showing = entry.wall && resolveWall(sel)?.id === entry.wall.id
  return (
    <header className="dos__head">
      <Emblem kind={station.emblem} size={40} className="dos__emblem" />
      <div className="dos__titles">
        <div className="panel__sub sc">{t.record} · {t.recordLatin} · {theme.pools[entry.pool].name}</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <h2 className="dos__title">{entry.title}</h2>
            {latin && <div className="dos__latin latin">{latin}</div>}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="dos__tools">
        {entry.wall && (showing
          ? <span className="dos__showing"><i />正在展出</span>
          : (
            <button
              className="pbtn"
              onClick={() => { engine.click('soft'); useRadio.setState({ wallpaper: { pool: entry.pool, name: entry.wall.name } }) }}
            >
              设为壁纸
            </button>
          ))}
        <div className="dos__pager">
          <button onClick={() => stepDossier(-1)} aria-label="上一份档案" title="上一份（←）"><Icon name="back" size={16} /></button>
          <span className="latin tnum">{pad(index + 1)}<i>/</i>{pad(total)}</span>
          <button onClick={() => stepDossier(1)} aria-label="下一份档案" title="下一份（→）"><Icon name="forward" size={16} /></button>
        </div>
        <button className="panel__close" onClick={close} title="返回画廊（Esc）"><Icon name="close" size={18} /></button>
      </div>
    </header>
  )
}

// ———————————————————— 看片台 ————————————————————

// 看片台档位：登记里带原图的主题（hasPhotos）才有原照一侧；壁纸即原作的主题（如古典的名画）
// 只剩壁纸一档，档位唯一时整个切换器收起
const modesOf = (t, hasPhotos) => [
  hasPhotos && { id: 'photo', label: t.photo },
  hasPhotos && { id: 'split', label: '分界' },
  hasPhotos && { id: 'apart', label: '并列' },
  { id: 'wall', label: t.wall },
].filter(Boolean)

const fit = (W, H, r) => (W / H > r ? { w: H * r, h: H } : { w: W, h: W / r })

// 各档位下原照与转绘两块图版的位置尺寸。原照档、转绘档里被盖住的一块与可见的一块重合，
// 切换时分界线扫过的同时，画框在两种画幅之间伸缩
function plates(mode, S, rp) {
  const center = ({ w, h }) => ({ x: (S.w - w) / 2, y: (S.h - h) / 2, w, h })
  if (mode === 'apart') {
    // 左右并排或上下叠放，两幅等高（等宽），取画面更大的一种
    const gap = 28
    const hRow = Math.min(S.h, (S.w - gap) / (rp + WALL_RATIO))
    const wCol = Math.min(S.w, (S.h - gap) / (1 / rp + 1 / WALL_RATIO))
    if (hRow * hRow * (rp + WALL_RATIO) >= wCol * wCol * (1 / rp + 1 / WALL_RATIO)) {
      const x0 = (S.w - (hRow * (rp + WALL_RATIO) + gap)) / 2
      const y = (S.h - hRow) / 2
      return {
        photo: { x: x0, y, w: hRow * rp, h: hRow },
        wall: { x: x0 + hRow * rp + gap, y, w: hRow * WALL_RATIO, h: hRow },
      }
    }
    const y0 = (S.h - (wCol / rp + gap + wCol / WALL_RATIO)) / 2
    const x = (S.w - wCol) / 2
    return {
      photo: { x, y: y0, w: wCol, h: wCol / rp },
      wall: { x, y: y0 + wCol / rp + gap, w: wCol, h: wCol / WALL_RATIO },
    }
  }
  const frame = center(fit(S.w, S.h, mode === 'wall' ? WALL_RATIO : rp))
  return { photo: frame, wall: frame }
}

const rectAnim = (r) => ({ left: r.x, top: r.y, width: r.w, height: r.h })
const SHIFT = { duration: 0.9, ease: EASE }

function Viewer({ entry }) {
  const field = useRef(null)
  const size = useSize(field)
  const t = theme.terms
  const ph = theme.hasPhotos
  const modes = modesOf(t, ph)
  const ratio = useRatio(entry.photo)
  const hasPhoto = ratio > 0
  const hasWall = !!entry.wall
  const can = { photo: hasPhoto, split: hasPhoto && hasWall, apart: hasPhoto && hasWall, wall: hasWall }

  // 原照读取期间不摆图版，免得先以转绘画幅出场、读完再变形
  const loading = !!entry.photo && ratio === undefined
  const [want, setWant] = useState(entry.photo && hasWall ? 'split' : hasWall ? 'wall' : 'photo')
  const mode = loading ? null : can[want] ? want : modes.map((m) => m.id).find((id) => can[id]) ?? null

  // p：原照在画框中露出的比例（自左向右）。分界档记住用户最后拖到的位置
  const p = useMotionValue(entry.photo ? 1 : 0)
  const split = useRef(0.5)
  const touched = useRef(false)
  useEffect(() => {
    if (!mode) return
    const to = mode === 'split' ? split.current : mode === 'wall' ? 0 : 1
    // 首次进入分界档：先让原照在暗房里显影，再把分界线推到中央，露出转绘
    const ctl = animate(p, to, touched.current ? SHIFT : { delay: 1.15, duration: 1.6, ease: EASE })
    return () => ctl.stop()
  }, [mode, p])

  const pick = (id) => {
    if (!can[id] || id === mode) return
    touched.current = true
    engine.click('soft')
    setWant(id)
  }

  const rects = size && mode ? plates(mode, size, hasPhoto ? ratio : WALL_RATIO) : null
  const hint = loading ? `${t.photo}冲洗中`
    : !mode ? (ph ? `${t.photo}与${t.wall}都尚未收录，档案文字见右侧` : `${t.wall}尚未上架，档案文字见右侧`)
      : !hasWall ? (ph ? `${t.wall}尚未绘制，仅可查看${t.photo}` : `${t.wall}尚未上架，档案文字见右侧`)
        : !hasPhoto ? (ph ? `${t.photo}暂未收录，仅可查看${t.wall}` : `${t.wall} · 16 : 9`)
          : {
            photo: `历史${t.photo}`,
            split: `拖动黄铜分界线，对照${t.photo}与${t.wall}`,
            apart: `左为历史${t.photo}，右为${t.wall}壁纸`,
            wall: `${t.wall}壁纸 · 16 : 9`,
          }[mode]

  return (
    <motion.section className="dos__viewer" variants={LINE}>
      <div className="dos__stage">
        <div ref={field} className="dos__field">
          {rects && hasWall && <WallPlate wall={entry.wall} rect={rects.wall} hidden={mode === 'photo'} />}
          {rects && hasPhoto && <PhotoPlate entry={entry} rect={rects.photo} p={p} mode={mode} />}
          {rects && can.split && (
            <Divider rect={plates('split', size, ratio).photo} p={p} active={mode === 'split'}
              onMove={(t) => { touched.current = true; split.current = t }} />
          )}
          {size && !mode && !loading && <Blank entry={entry} size={size} />}
        </div>
      </div>

      <div className="dos__bar">
        {modes.length > 1 && (
          <div className="dos__switch" role="radiogroup" aria-label="查看方式">
            {mode && (
              <motion.span
                className="dos__knob"
                initial={false}
                animate={{ x: `${modes.findIndex((m) => m.id === mode) * 100}%` }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {modes.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={mode === m.id}
                className={mode === m.id ? 'is-on' : ''}
                disabled={!can[m.id]}
                title={can[m.id] ? undefined : !hasPhoto ? `${t.photo}暂未收录` : `${t.wall}尚未绘制`}
                onClick={() => pick(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={hint}
            className="dos__hint"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3 }}
          >
            {hint}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

// 原照：像冲印的相纸一样从白中显影；原照档与并列档里带一圈相纸白边
function PhotoPlate({ entry, rect, p, mode }) {
  const [ready, setReady] = useState(false)
  const clip = useTransform(p, (v) => `inset(0 ${(1 - v) * 100}% 0 0)`)
  const { year } = readSource(entry)
  const orig = `历史${theme.terms.photo}`
  return (
    <motion.div
      className={`dos__plate dos__plate--photo ${mode === 'photo' || mode === 'apart' ? 'is-print' : ''} ${mode === 'wall' ? 'is-under' : ''}`}
      initial={false}
      animate={rectAnim(rect)}
      transition={SHIFT}
    >
      <motion.div className="dos__inner dos__inner--photo" style={{ clipPath: clip }}>
        <motion.img
          src={entry.photo}
          alt={`${entry.title}（${orig}）`}
          draggable={false}
          decoding="async"
          onLoad={() => setReady(true)}
          initial={{ opacity: 0, filter: 'brightness(2.6) contrast(0.35) sepia(0.7) blur(3px)' }}
          animate={ready ? { opacity: 1, filter: 'brightness(1) contrast(1) sepia(0) blur(0px)' } : undefined}
          transition={{ opacity: { duration: 0.5 }, filter: { duration: 1.8, ease: EASE } }}
        />
        <div className="dos__grain" />
        <span className="dos__tag dos__tag--l">{orig}{year && <b className="latin tnum">{year}</b>}</span>
      </motion.div>
    </motion.div>
  )
}

// 转绘：先铺缩略图，原尺寸图读完后淡入
function WallPlate({ wall, rect, hidden }) {
  const [full, setFull] = useState(false)
  return (
    <motion.div
      className="dos__plate dos__plate--wall"
      initial={false}
      animate={{ ...rectAnim(rect), opacity: hidden ? 0 : 1 }}
      transition={{ ...SHIFT, opacity: { duration: 0.5, delay: hidden ? 0.5 : 0 } }}
    >
      <div className="dos__inner">
        {wall.thumb && <img className="dos__thumb" src={wall.thumb} alt="" draggable={false} />}
        <img
          className={`dos__full ${full ? 'is-in' : ''}`}
          src={wall.url}
          alt={`${theme.terms.wall}壁纸`}
          draggable={false}
          decoding="async"
          onLoad={() => setFull(true)}
        />
        <span className="dos__tag dos__tag--r">{theme.terms.wall}</span>
      </div>
    </motion.div>
  )
}

// 分界线：只在分界档出现；点击画面任意处即把分界线移过去，按住拖动跟随
function Divider({ rect, p, active, onMove }) {
  const left = useTransform(p, (v) => `${v * 100}%`)
  const to = (t) => { onMove(t); p.stop(); p.set(t) }
  const down = (e) => {
    const el = e.currentTarget
    const at = (ev) => {
      const r = el.getBoundingClientRect()
      return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width))
    }
    el.setPointerCapture(e.pointerId)
    const t = at(e)
    onMove(t)
    animate(p, t, { duration: 0.35, ease: EASE })
    el.onpointermove = (ev) => to(at(ev))
    el.onpointerup = () => { el.onpointermove = null }
  }
  // 聚焦分界线时，左右键微调；拦下事件，免得同时翻页
  const key = (e) => {
    const d = { ArrowLeft: -0.04, ArrowRight: 0.04 }[e.key]
    if (!d) return
    e.preventDefault()
    e.stopPropagation()
    to(Math.max(0, Math.min(1, p.get() + d)))
  }
  return (
    <motion.div
      className={`dos__divider ${active ? 'is-on' : ''}`}
      initial={false}
      animate={{ ...rectAnim(rect), opacity: active ? 1 : 0 }}
      transition={{ ...SHIFT, opacity: { duration: 0.4, delay: active ? 0.5 : 0 } }}
      onPointerDown={active ? down : undefined}
    >
      <motion.div className="dos__line" style={{ left }}>
        <div
          className="dos__grip"
          role="slider"
          tabIndex={active ? 0 : -1}
          aria-label="原照与转绘的分界"
          aria-valuenow={Math.round(p.get() * 100)}
          onKeyDown={key}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M9.5 7 4.5 12l5 5M14.5 7l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </motion.div>
    </motion.div>
  )
}

// 原照与转绘都缺：暗房红灯下一张空相纸
function Blank({ entry, size }) {
  const st = theme.stationMap[theme.pools[entry.pool].station]
  const t = theme.terms
  const r = fit(size.w, size.h, 4 / 3)
  return (
    <motion.div
      className="dos__blank"
      style={{ width: r.w, height: r.h }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <Pattern kind={st.pattern} color={st.accent} height={16} opacity={0.1} className="dos__blankpat" style={{ height: '100%' }} />
      <Emblem kind={st.emblem} size={46} style={{ opacity: 0.35 }} />
      <strong>底片待冲洗</strong>
      <span>{theme.hasPhotos ? `${t.photo}与${t.wall}都尚未收录` : `${t.wall}尚未上架`}</span>
    </motion.div>
  )
}

// ———————————————————— 档案卡 ————————————————————

function Card({ entry, index, station }) {
  const t = theme.terms
  const { origin, points, year } = readSource(entry)
  const story = entry.story.map((s) => s.trim()).filter(Boolean)
  return (
    <motion.section className="dos__side" variants={LINE}>
      <span className="dos__clip" aria-hidden />
      <div className="dos__card">
        <div className="dos__scroll">
          <motion.div
            className="dos__stamp"
            style={{ '--ink': station.accent }}
            initial={{ opacity: 0, scale: 1.7, rotate: -4 }}
            animate={{ opacity: 0.86, scale: 1, rotate: -11 }}
            transition={{ delay: 0.75, duration: 0.45, ease: [0.3, 1.5, 0.5, 1] }}
          >
            <span>{t.stamp}</span>
            <b className="latin tnum">{year ?? '—'}</b>
          </motion.div>

          <motion.dl className="dos__fields" variants={LINE}>
            <div><dt>档案编号</dt><dd className="latin tnum">No. {pad(index + 1)}</dd></div>
            <div><dt>{t.nation}</dt><dd>{theme.pools[entry.pool].name}</dd></div>
            <div><dt>年份</dt><dd className="latin tnum">{entry.meta?.year ?? year ?? '不详'}</dd></div>
          </motion.dl>

          <motion.h4 variants={LINE}>出处</motion.h4>
          <motion.p className="dos__origin" variants={LINE}>{origin}</motion.p>
          {points && (
            <>
              <motion.h4 variants={LINE}>画面要点</motion.h4>
              <motion.p className="dos__points" variants={LINE}>{points}</motion.p>
            </>
          )}

          <motion.h4 variants={LINE}>{t.story}</motion.h4>
          {story.map((s, i) => <motion.p key={i} className="dos__story" variants={LINE}>{s}</motion.p>)}

          <motion.ul className="dos__annex" variants={LINE}>
            {theme.hasPhotos && (
              <li className={entry.photo ? 'is-on' : ''}><i />历史{t.photo}<em>{entry.photo ? '已收录' : '暂未收录'}</em></li>
            )}
            <li className={entry.wall ? 'is-on' : ''}><i />{t.wall}壁纸<em>{entry.wall ? '已上架' : theme.hasPhotos ? '尚未绘制' : '尚未上架'}</em></li>
          </motion.ul>
        </div>
      </div>
    </motion.section>
  )
}

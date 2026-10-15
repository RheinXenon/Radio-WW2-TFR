// 主题页：左侧是竖向沉浸式滚动的主题列表，一屏一个主题；右侧是当前主题的壁纸放映台。
// 放映台的样式随主题而变：烽火电波是一条上下带齿孔的电影胶片，烈焰升腾是霓虹监视屏，
// 古典回音是挂在暗纹墙上的鎏金画框，自建主题是一块现代的磨砂玻璃。
// 列表末尾是“新建主题”。开机之后先来到这里，选定主题再进入它的开场
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRadio, getRadio } from '../store.js'
import { engine } from '../audio/engine.js'
import { listThemes, MAX_STATIONS } from '../themes/index.js'
import { Emblem } from '../themes/marks.jsx'
import { useT, useLoc } from '../i18n/index.js'
import { entryTitle } from './Dossier.jsx'
import { Icon } from './Icon.jsx'
import './themeselect.css'

const FRAME_NAME = { film: '胶片放映', neon: '霓虹监视屏', gilded: '鎏金画框', glass: '磨砂玻璃' }

// Fisher–Yates 洗牌，返回新数组
function shuffled(a) {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

// 每个池随机抽两幅作放映片段，整卷再洗乱；各放映台一致随机，每次进页重新抽
// 场景说明按当前语言读：登记照片取 en.title，否则用池名的 nameEn
function reelOf(th) {
  const en = getRadio().lang === 'en'
  const frames = th.poolOrder.flatMap((id) => {
    const p = th.pools[id]
    const st = th.stationMap[p.station]
    const walls = shuffled(p.walls).slice(0, 2)
    return walls.map((w) => {
      const ph = th.photoMap?.[`${id}/${w.name}`]
      const scene = w.scene ?? (ph ? entryTitle(ph) : en ? p.nameEn ?? p.name : p.name)
      return { wall: w, st, scene }
    })
  })
  return shuffled(frames)
}

// 预览图优先，未生成派生图的壁纸退回原图
const picOf = (w) => w.thumb ?? w.url

// 周期推进的序号；every 毫秒走一格
function useTicker(n, every, key) {
  const [i, setI] = useState(0)
  useEffect(() => {
    setI(0)
    if (n < 2) return
    const t = setInterval(() => setI((x) => x + 1), every)
    return () => clearInterval(t)
  }, [n, every, key])
  return i
}

// —— 放映台：胶片 ——
// 片窗一格一格地向左拉片：拉片瞬间快、停格时带轻微的片门晃动与闪烁；
// 每格上下是带齿孔的片边，印着片基型号与格号
function Film({ reel, tick }) {
  const n = reel.length
  const i = tick % n
  const strip = [...reel, reel[0]]
  const [pos, setPos] = useState(0)
  const [snap, setSnap] = useState(false)
  useEffect(() => {
    if (tick === 0) { setSnap(true); setPos(0); return }
    setSnap(false)
    setPos((p) => p + 1)
  }, [tick])
  useEffect(() => {
    if (pos < n) return
    const t = setTimeout(() => { setSnap(true); setPos(0) }, 900)
    return () => clearTimeout(t)
  }, [pos, n])
  return (
    <div className="film">
      <div className="film__gate">
        <div
          className="film__strip"
          style={{ transform: `translateX(${-pos * 100}%)`, transition: snap ? 'none' : undefined }}
        >
          {strip.map((r, k) => (
            <div className="film__frame" key={k}>
              <Sprockets label={`KODAK  SAFETY  FILM  5247  ▸ ${String(((k % n) + 1) * 3).padStart(2, '0')}A`} />
              <div className="film__pic">
                {Math.abs(k - pos) <= 1 && <img src={picOf(r.wall)} alt="" draggable={false} decoding="async" />}
              </div>
              <Sprockets label={`${r.st?.latin ?? ''}  ·  ${r.st?.years ?? ''}`} />
            </div>
          ))}
        </div>
        <div className="film__flicker" />
        <div className="film__leak" />
      </div>
      <Caption r={reel[i]} />
    </div>
  )
}

function Sprockets({ label }) {
  return (
    <div className="film__edge">
      <svg className="film__holes" width="100%" height="100%" aria-hidden>
        <defs>
          <pattern id="sprocket" width="26" height="100%" patternUnits="userSpaceOnUse">
            <rect x="7" y="22%" width="12" height="56%" rx="2.6" fill="#e9dcc0" fillOpacity="0.88" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sprocket)" />
      </svg>
      <span className="film__print">{label}</span>
    </div>
  )
}

// —— 放映台：霓虹监视屏 ——
function Neon({ reel, tick, th }) {
  const r = reel[tick % reel.length]
  const [hex, setHex] = useState('00')
  useEffect(() => {
    const id = setInterval(() => setHex(Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0')), 140)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="neon">
      <div className="neon__screen">
        <AnimatePresence initial={false}>
          <motion.img
            key={r.wall.id}
            src={picOf(r.wall)}
            alt=""
            draggable={false}
            className="neon__pic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        </AnimatePresence>
        <div key={`g${tick}`} className="neon__glitch" style={{ backgroundImage: `url(${r.wall.thumb})` }} />
        <div className="neon__scan" />
        <div className="neon__hud">
          <span className="neon__live"><i />LIVE</span>
          <span>CH {String(th.stations.indexOf(r.st) + 1).padStart(2, '0')}</span>
          <span>{r.st ? `${th.dial.fmt(r.st.freq)} ${th.dial.unit}` : ''}</span>
          <span className="neon__hex">0x{hex}</span>
        </div>
        {['tl', 'tr', 'bl', 'br'].map((c) => <i key={c} className={`neon__corner neon__corner--${c}`} />)}
      </div>
      <Caption r={r} />
    </div>
  )
}

// —— 放映台：鎏金画框 ——
function Gilded({ reel, tick }) {
  const L = useLoc()
  const r = reel[tick % reel.length]
  return (
    <div className="gild">
      <div className="gild__lamp" />
      <div className="gild__frame">
        <div className="gild__mat">
          <div className="gild__canvas">
            <AnimatePresence initial={false}>
              <motion.img
                key={r.wall.id}
                src={picOf(r.wall)}
                alt=""
                draggable={false}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
              />
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="gild__plaque">
        <b>{r.scene}</b>
        <span>{r.st ? `${L(r.st, 'name')} · ${r.st.years ?? L(r.st, 'city')}` : ''}</span>
      </div>
    </div>
  )
}

// —— 放映台：磨砂玻璃 ——
function Glass({ reel, tick, th }) {
  const r = reel[tick % reel.length]
  return (
    <div className="glass">
      <div className="glass__card">
        <AnimatePresence initial={false}>
          <motion.img
            key={r.wall.id}
            src={picOf(r.wall)}
            alt=""
            draggable={false}
            initial={{ opacity: 0, filter: 'blur(18px)', scale: 1.04 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(12px)' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </AnimatePresence>
        <div className="glass__chip">
          {r.st && <Emblem kind={r.st.emblem} of={th} size={22} />}
          <span>{r.scene}</span>
        </div>
      </div>
      <div className="glass__reflect" />
    </div>
  )
}

function Caption({ r }) {
  const L = useLoc()
  if (!r) return null
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={r.wall.id}
        className="ts__caption"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.45 }}
      >
        <span>{r.scene}</span>
        {r.st && <em>{L(r.st, 'name')}</em>}
      </motion.div>
    </AnimatePresence>
  )
}

function NewPreview() {
  return (
    <div className="glass is-new">
      <div className="glass__card ts__blank">
        <div className="ts__blankmesh" />
        <div className="ts__blankplus"><Icon name="plus" size={44} /></div>
      </div>
    </div>
  )
}

// 没有壁纸的主题：一块中性的空放映位，提示图片该放到哪里
function EmptyPreview({ th }) {
  const t = useT()
  return (
    <div className="glass">
      <div className="glass__card ts__blank">
        <div className="ts__blankmesh" />
        <div className="ts__blankhint">
          <span>{t('壁纸待放入')}</span>
          <em>Resources/{th.wallRoot}/</em>
        </div>
      </div>
    </div>
  )
}

const PREVIEW = { film: Film, neon: Neon, gilded: Gilded, glass: Glass }

function Preview({ th }) {
  // 每次进页都重新抽片、随机排序；语言切换后场景说明也要跟着换
  const lang = useRadio((s) => s.lang)
  const reel = useMemo(() => reelOf(th), [th, lang])
  const tick = useTicker(reel.length, th.frame === 'film' ? 3600 : 5200, th.id)
  const P = PREVIEW[th.frame] ?? Glass
  if (!reel.length) return <EmptyPreview th={th} />
  return <P reel={reel} tick={tick} th={th} />
}

// —— 一屏主题 ——
function Slide({ th, i, cur, booted, current, onEnter, onFocus }) {
  const t = useT()
  const L = useLoc()
  const left = MAX_STATIONS - th.stations.length
  return (
    <section
      className={`ts__slide ${cur ? 'is-cur' : ''}`}
      data-frame={th.frame}
      style={{ '--ac': th.accent ?? th.stations[0]?.accent, '--ac2': th.accent2 ?? th.stations[1]?.accent }}
      onClick={cur ? undefined : onFocus}
    >
      <div className="ts__no"><b>{String(i + 1).padStart(2, '0')}</b><span>{t(FRAME_NAME[th.frame])}</span></div>
      <div className="ts__latin">{th.latin}</div>
      <h2 className="ts__name">{L(th, 'name')}</h2>
      <div className="ts__sub">
        <span>{L(th, 'subtitle')}</span>
        {th.years && <em>{th.years[0]} — {th.years[1]}</em>}
      </div>
      <p className="ts__blurb">{L(th, 'blurb')}</p>
      <ul className="ts__roster">
        {th.stations.map((st) => (
          <li key={st.id} style={{ '--glow': st.glow }}>
            <Emblem kind={st.emblem} of={th} size={26} />
            <span>{L(st, 'name')}</span>
          </li>
        ))}
      </ul>
      <div className="ts__count">
        {left > 0
          ? t('{n} 个频道 · 还可添加 {m} 个', { n: th.stations.length, m: left })
          : t('{n} 个频道 · 频道已满', { n: th.stations.length })}
      </div>
      <div className="ts__actions">
        <button className="ts__go" onClick={(e) => { e.stopPropagation(); onEnter(th.id) }} tabIndex={cur ? 0 : -1}>
          <span>{!booted ? t('开始收听') : current ? t('回到正在播的电台') : t('切换到这个主题')}</span>
          <Icon name="forward" size={18} />
        </button>
        <button
          className="ts__edit"
          tabIndex={cur ? 0 : -1}
          onClick={(e) => { e.stopPropagation(); useRadio.setState({ editing: th.id }) }}
        >
          <Icon name={th.custom ? 'edit' : 'plus'} size={16} />
          <span>{th.custom ? t('编辑主题') : t('添加频道')}</span>
        </button>
      </div>
    </section>
  )
}

function NewSlide({ i, cur, onFocus }) {
  const t = useT()
  return (
    <section className={`ts__slide is-new ${cur ? 'is-cur' : ''}`} data-frame="glass" onClick={cur ? undefined : onFocus}>
      <div className="ts__no"><b>{String(i + 1).padStart(2, '0')}</b><span>{t('自己动手')}</span></div>
      <div className="ts__latin">Your Own Frequency</div>
      <h2 className="ts__name">{t('新建主题')}</h2>
      <div className="ts__sub"><span>{t('名字、配色、画面与频道，全部由你决定')}</span></div>
      <p className="ts__blurb">
        {t('新主题默认采用现代风格：磨砂玻璃的控制条与程序生成的抽象画面。最多八个频道，音乐可以放进本地目录，也可以从云音乐导入歌单；放进壁纸目录的图片会排在程序画面之前。')}
      </p>
      <div className="ts__actions">
        <button className="ts__go" tabIndex={cur ? 0 : -1} onClick={(e) => { e.stopPropagation(); useRadio.setState({ editing: 'new' }) }}>
          <span>{t('开始创建')}</span>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </section>
  )
}

export default function ThemeSelect({ booted, onEnter }) {
  const t = useT()
  const L = useLoc()
  const customThemes = useRadio((s) => s.customThemes)
  const userStations = useRadio((s) => s.userStations)
  const active = useRadio((s) => s.theme)
  const editing = useRadio((s) => s.editing)
  const themes = useMemo(() => listThemes(getRadio()), [customThemes, userStations])
  const total = themes.length + 1
  const [index, setIndex] = useState(() => Math.max(0, themes.findIndex((x) => x.id === active)))
  const focus = Math.min(index, total - 1)
  const th = themes[focus]

  // 新建的主题保存后，列表停到它上面
  const lastCount = useRef(customThemes.length)
  useEffect(() => {
    if (customThemes.length > lastCount.current) setIndex(themes.length - 1)
    lastCount.current = customThemes.length
  }, [customThemes, themes.length])

  const step = (d) => setIndex((x) => {
    const n = Math.max(0, Math.min(total - 1, x + d))
    if (n !== x && engine.ready) {
      engine.click('soft')
      engine.tone(n === total - 1 ? 880 : 660 + n * 40, { dur: 0.5, gain: 0.018, type: 'sine', attack: 0.01 })
    }
    return n
  })

  const go = (id) => {
    if (engine.ready) engine.click('key')
    onEnter(id)
  }

  // 滚轮、键盘与拖动都一次只走一屏；走完一屏前的余量不累计，免得一下滚过头
  useEffect(() => {
    if (editing) return
    let acc = 0
    let lock = 0
    const wheel = (e) => {
      e.preventDefault()
      const now = performance.now()
      if (now < lock) return
      acc += e.deltaY
      if (Math.abs(acc) > 46) {
        step(Math.sign(acc))
        acc = 0
        lock = now + 820
      }
    }
    const key = (e) => {
      if (e.target instanceof HTMLInputElement) return
      const k = e.key
      if (['ArrowDown', 'PageDown', 'j'].includes(k)) { e.preventDefault(); step(1) }
      else if (['ArrowUp', 'PageUp', 'k'].includes(k)) { e.preventDefault(); step(-1) }
      else if (k === 'Home') setIndex(0)
      else if (k === 'End') setIndex(total - 1)
      else if (k === 'Enter' || k === ' ') {
        e.preventDefault()
        if (th) go(th.id)
        else useRadio.setState({ editing: 'new' })
      } else if (k === 'Escape' && booted) go(active)
    }
    let y0 = null
    const down = (e) => { y0 = e.clientY }
    const up = (e) => {
      if (y0 == null) return
      const dy = e.clientY - y0
      y0 = null
      if (Math.abs(dy) > 70) step(dy < 0 ? 1 : -1)
    }
    window.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [editing, total, th?.id, booted, active])

  const frame = th?.frame ?? 'glass'
  const reelBg = th ? reelOf(th)[0]?.wall.thumb : null

  return (
    <motion.div
      className="ts"
      data-frame={frame}
      style={{ '--ac': th?.accent ?? th?.stations[0]?.accent ?? '#8a9bff' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
      transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={th?.id ?? 'new'}
          className="ts__bg"
          style={{ backgroundImage: reelBg ? `url(${reelBg})` : undefined }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
        />
      </AnimatePresence>
      <div className="ts__tint" />

      <header className="ts__brand">
        <span className="ts__logo">{t('沉浸式电台')}</span>
        <i />
        <span>{t('选择今晚的频率')}</span>
      </header>

      <nav className="ts__rail" aria-label={t('主题')}>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} className={i === focus ? 'is-on' : ''} onClick={() => setIndex(i)} aria-label={themes[i] ? L(themes[i], 'name') : t('新建主题')}>
            <i />
            <span>{themes[i] ? L(themes[i], 'name') : t('新建')}</span>
          </button>
        ))}
      </nav>

      <div className="ts__viewport">
        <div className="ts__list" style={{ transform: `translateY(${-focus * 100}vh)` }}>
          {themes.map((x, i) => (
            <Slide
              key={x.id}
              th={x}
              i={i}
              cur={i === focus}
              booted={booted}
              current={booted && x.id === active}
              onEnter={go}
              onFocus={() => setIndex(i)}
            />
          ))}
          <NewSlide i={themes.length} cur={focus === themes.length} onFocus={() => setIndex(themes.length)} />
        </div>
      </div>

      <div className="ts__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={th?.id ?? 'new'}
            className="ts__stageinner"
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            {th ? <Preview th={th} /> : <NewPreview />}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="ts__hint">
        <span><kbd>{t('滚轮')}</kbd><kbd>↑</kbd><kbd>↓</kbd>{' '}{t('浏览')}</span>
        <span><kbd>Enter</kbd>{' '}{t('进入')}</span>
        {booted && <span><kbd>Esc</kbd>{' '}{t('返回')}</span>}
      </footer>
    </motion.div>
  )
}

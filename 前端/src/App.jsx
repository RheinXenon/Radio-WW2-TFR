// 外壳：待机 → 开机 → 主题页 → 主题开场 → 正式播出；播出中可随时回到主题页换主题
import { Fragment, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRadio, getRadio } from './store.js'
import { engine } from './audio/engine.js'
import { radio } from './audio/radio.js'
import { startSession } from './audio/session.js'
import { cloudLibrary } from './netease/library.js'
import { theme } from './themes/index.js'
import { STYLES, CLOCKS, styleOf, nextOf } from './skins.js'
import Stage, { resolveWall } from './scene/Stage.jsx'
import Boot from './ui/Boot.jsx'
import ThemeSelect from './ui/ThemeSelect.jsx'
import ThemeEditor from './ui/ThemeEditor.jsx'
import Clock from './ui/Clock.jsx'
import NowPlaying from './ui/NowPlaying.jsx'
import VintageRadio from './ui/VintageRadio.jsx'
import ModernDeck from './ui/ModernDeck.jsx'
import NeonDeck from './ui/NeonDeck.jsx'
import GildedConsole from './ui/GildedConsole.jsx'
import StationCard from './ui/StationCard.jsx'
import Gallery from './ui/Gallery.jsx'
import Mixer, { syncAmbience } from './ui/Mixer.jsx'
import Settings from './ui/Settings.jsx'
import Playlist from './ui/Playlist.jsx'
import NeteaseImport from './ui/NeteaseImport.jsx'
import LoginGuide from './ui/LoginGuide.jsx'
import Dossier, { stepDossier } from './ui/Dossier.jsx'
import SuperEvent from './ui/SuperEvent.jsx'
import { Brand, Rail, Help, Toast, notify } from './ui/Chrome.jsx'

const set = (patch) => useRadio.setState(patch)
const ORDER_NEXT = { seq: 'shuffle', shuffle: 'one', one: 'seq' }
const ORDER_LABEL = { seq: '顺序播放', shuffle: '随机播放', one: '单曲循环' }
const DOSSIER_PASS = new Set([' ', 'arrowup', 'arrowdown', 'm'])
const SKINS = { vintage: VintageRadio, neon: NeonDeck, gilded: GildedConsole, modern: ModernDeck }

// 自建主题或用户频道的修订号：内容一变，界面整体重建以读到新的频道表
const revs = new WeakMap()
let revSeq = 0
function customRev(...objs) {
  return objs.map((o) => {
    if (!revs.has(o)) revs.set(o, ++revSeq)
    return revs.get(o)
  }).join('.')
}

// 鼠标与键盘静止一段时间后，控件隐去
function useIdle(ms, hold) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let t
    const wake = () => {
      setIdle(false)
      clearTimeout(t)
      if (!hold) t = setTimeout(() => setIdle(true), ms)
    }
    wake()
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel']
    evs.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, wake)) }
  }, [ms, hold])
  return idle
}

function stepStation(dir) {
  const s = getRadio()
  const cur = s.offAir ?? s.track?.station ?? s.station
  const list = theme.stations
  const i = list.findIndex((x) => x.id === cur)
  const next = list[(i + dir + list.length) % list.length]
  radio.tune(next.id)
}

// 轮换牌序：换到某个壁纸池时重新洗一次牌，轮换与前后翻页都按牌序走，一轮之内不重复
let deckPool = null
let deck = []
function deckFor(pool) {
  if (deckPool === theme.pools[pool]) return deck
  deckPool = theme.pools[pool]
  deck = [...deckPool.walls]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function stepWallpaper(dir, { quiet } = {}) {
  const s = getRadio()
  const cur = resolveWall(s.wallpaper)
  if (!cur) return
  const pool = cur.id.split('/')[0]
  if (!theme.pools[pool] || theme.pools[pool].walls.length < 2) {
    if (!quiet && theme.pools[pool]) notify(`${theme.pools[pool].name}目前只有这一幅壁纸`)
    return
  }
  const dk = deckFor(pool)
  const i = dk.findIndex((w) => w.id === cur.id)
  const next = dk[(i + dir + dk.length) % dk.length]
  set({ wallpaper: { pool, name: next.name } })
}

const openThemes = () => set({ phase: 'select', panel: null, dossier: null, editing: null, uiHidden: false })

function onKey(e) {
  const s = getRadio()
  if (s.phase !== 'live' || s.editing || e.ctrlKey || e.metaKey || e.altKey) return
  // 在输入框里打字时只认 Esc
  if (e.target instanceof HTMLInputElement && e.key !== 'Escape') return
  const k = e.key
  const map = {
    ' ': () => radio.toggle(),
    ArrowRight: () => radio.next(),
    ArrowLeft: () => radio.prev(),
    ArrowUp: () => radio.setVolume(s.volume + 0.05),
    ArrowDown: () => radio.setVolume(s.volume - 0.05),
    m: () => radio.toggleMute(),
    '[': () => stepStation(-1),
    ']': () => stepStation(1),
    1: () => radio.setBand('station'),
    2: () => radio.setBand('all'),
    3: () => radio.setBand('list'),
    s: () => { set({ order: ORDER_NEXT[s.order] }); notify(ORDER_LABEL[ORDER_NEXT[s.order]]) },
    f: () => {
      if (!s.track) return
      const had = s.favorites.includes(s.track.id)
      s.toggleFavorite(s.track.id)
      notify(had ? '已移出珍藏' : `已收入珍藏：${s.track.title}`)
    },
    q: () => stepWallpaper(-1),
    w: () => stepWallpaper(1),
    l: () => s.togglePanel('playlist'),
    n: () => s.togglePanel('netease'),
    g: () => s.togglePanel('gallery'),
    e: () => s.togglePanel('mixer'),
    o: () => s.togglePanel('settings'),
    t: openThemes,
    v: () => { const v = nextOf(STYLES, s.style); set({ style: v.id }); notify(`播放控件：${v.name}`) },
    c: () => { const c = nextOf(CLOCKS, s.clock); set({ clock: c.id }); notify(`时钟：${c.name}`) },
    h: () => set({ uiHidden: !s.uiHidden, panel: null }),
    '?': () => s.togglePanel('help'),
    Escape: () => (s.panel ? set({ panel: null }) : s.uiHidden && set({ uiHidden: false })),
  }
  const fn = map[k] ?? map[k.toLowerCase?.()]
  // 史实档案打开时：← → 翻阅档案，Esc 返回画廊；其余只放行播放与音量类按键
  const act = s.dossier
    ? { ArrowLeft: () => stepDossier(-1), ArrowRight: () => stepDossier(1), Escape: () => set({ dossier: null }) }[k]
      ?? (DOSSIER_PASS.has(k.toLowerCase()) ? fn : null)
    : fn
  if (!act) return
  e.preventDefault()
  act()
}

export default function App() {
  const phase = useRadio((s) => s.phase)
  const style = useRadio((s) => s.style)
  const panel = useRadio((s) => s.panel)
  const dossier = useRadio((s) => s.dossier)
  const uiHidden = useRadio((s) => s.uiHidden)
  const wallpaper = useRadio((s) => s.wallpaper)
  const wallRotate = useRadio((s) => s.wallRotate)
  const wallRotateSec = useRadio((s) => s.wallRotateSec)
  const editing = useRadio((s) => s.editing)
  const [revealed, setRevealed] = useState(false)
  const [entered, setEntered] = useState(false)
  const replaying = useRef(false)
  const idle = useIdle(6000, !!panel || !!dossier || phase !== 'live')

  // 启动时拉取云音乐库并注入频道（在线歌曲，本地无文件）
  useEffect(() => { cloudLibrary.init() }, [])

  // 全局联动：标签页标题与媒体键、频道与分组启停、壁纸随频道
  useEffect(() => {
    const stopSession = startSession()
    const stopWatch = useRadio.subscribe((s, prev) => {
      if (s.phase === 'live' && (
        s.enabled !== prev.enabled || s.groupsOff !== prev.groupsOff || s.skipped !== prev.skipped
        || s.skipVipWithoutMember !== prev.skipVipWithoutMember || s.neteaseVip !== prev.neteaseVip
      )) radio.refresh()
      if (s.wallFollows && s.track && s.track.station !== prev.track?.station) {
        const pool = theme.stationMap[s.track.station]?.pool
        const walls = theme.pools[pool]?.walls ?? []
        if (walls.length && resolveWall(s.wallpaper)?.id.split('/')[0] !== pool) {
          set({ wallpaper: { pool, name: walls[Math.floor(Math.random() * walls.length)].name } })
        }
      }
      if (s.uiHidden && !prev.uiHidden) notify('按 H 或 Esc 恢复界面')
    })
    window.addEventListener('keydown', onKey)
    window.addEventListener('radio:themes', openThemes)
    return () => {
      stopSession(); stopWatch()
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('radio:themes', openThemes)
    }
  }, [])

  // 主题的配色与字体经 data-theme 落到全局样式；自建主题再写入它自己的主色
  const themeId = useRadio((s) => s.theme)
  const themeRev = useRadio((s) => s.customThemes) // 编辑自建主题后界面随之重建
  const userStations = useRadio((s) => s.userStations)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme.custom ? 'diy' : theme.id
    for (const [k, v] of [['--accent', theme.custom && theme.accent], ['--accent-2', theme.custom && theme.accent2]]) {
      if (v) root.style.setProperty(k, v)
      else root.style.removeProperty(k)
    }
  }, [themeId, themeRev])

  // 入场动画只在首次揭幕时播放
  useEffect(() => {
    if (!revealed) return
    const t = setTimeout(() => setEntered(true), 5000)
    return () => clearTimeout(t)
  }, [revealed])

  // 壁纸自动轮换：到时按牌序换同国的下一幅；任何方式的换壁纸都会重置计时
  useEffect(() => {
    if (!wallRotate || phase !== 'live') return
    const t = setInterval(() => stepWallpaper(1, { quiet: true }), wallRotateSec * 1000)
    return () => clearInterval(t)
  }, [wallRotate, wallRotateSec, wallpaper, phase])

  // 待机页按下开机：这一下操作同时解锁声音（浏览器要求一次用户操作才能出声）
  const powerOn = () => {
    if (getRadio().phase !== 'off') return
    engine.init()
    const s = getRadio()
    engine.setVolume(s.muted ? 0 : s.volume, 0.05)
    engine.powerOn()
    syncAmbience()
    set({ phase: 'boot' })
  }
  // 开机预热结束进入主题页；在设置里重播开场时直接接当前主题的开场
  const booted = () => set({ phase: replaying.current ? 'intro' : 'select' })

  // 在主题页选定主题：回到正在播的同一主题直接返回；否则停下旧主题的音乐（若有），走新主题的开场
  const started = useRef(false)
  const enterTheme = (id) => {
    const s = getRadio()
    if (started.current && id === s.theme && s.track) return set({ phase: 'live' })
    if (started.current) radio.stop()
    started.current = true
    s.switchTheme(id)
    setRevealed(false)
    setEntered(false)
    set({ phase: 'intro' })
  }

  const reveal = () => {
    setRevealed(true)
    if (replaying.current) {
      replaying.current = false
      if (getRadio().playing) engine.fade(1, 0.6)
    } else {
      setTimeout(() => radio.start(), 700)
    }
  }

  const replay = () => {
    replaying.current = true
    engine.fade(0, 0.3)
    engine.powerOn(2.4)
    set({ phase: 'boot', panel: null })
  }

  const live = phase === 'live'
  const npBottom = idle ? 64 : styleOf(style).np
  const Intro = theme.Intro
  const Skin = SKINS[style] ?? VintageRadio

  return (
    <div className={`app ${idle && live ? 'is-idle' : ''}`}>
      <Stage revealed={revealed} paused={phase === 'select'} />

      {revealed && (
        <Fragment key={`${themeId}:${theme.stations.length}:${customRev(themeRev, userStations)}`}>
          <div className="scrim scrim--top" style={{ opacity: uiHidden ? 0 : undefined }} />
          <div className="scrim scrim--bottom" style={{ opacity: uiHidden ? 0 : undefined }} />
          <div className={`ui ${entered ? '' : 'ui--enter'} ${uiHidden ? 'is-hidden' : ''}`} style={{ '--np-bottom': `${npBottom}px` }}>
            <Clock />
            <NowPlaying />
            <div className={`controls ${idle && live ? 'is-idle' : ''}`}>
              <Brand />
              <Rail />
              <AnimatePresence mode="wait">
                <motion.div
                  key={style}
                  className="skin"
                  initial={{ opacity: 0, y: 36, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                  exit={{ opacity: 0, y: 36, filter: 'blur(6px)' }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Skin />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <StationCard />
          <AnimatePresence>
            {panel === 'playlist' && <Playlist key="playlist" />}
            {panel === 'netease' && <NeteaseImport key="netease" />}
            {panel === 'gallery' && <Gallery key="gallery" />}
            {panel === 'mixer' && <Mixer key="mixer" />}
            {panel === 'settings' && <Settings key="settings" onReplay={replay} />}
            {panel === 'help' && <Help key="help" />}
          </AnimatePresence>
          {/* 详情弹窗按主题分流：史实主题开档案卡，事件主题（dossier: 'event'）开超级事件弹窗，两者共用 dossier 状态与翻页键盘 */}
          <AnimatePresence>
            {dossier && (theme.dossier === 'event'
              ? <SuperEvent key="dossier" />
              : <Dossier key="dossier" />)}
          </AnimatePresence>
          <Toast />
          <LoginGuide />
        </Fragment>
      )}

      <AnimatePresence>
        {phase === 'select' && <ThemeSelect key="select" booted={started.current} onEnter={enterTheme} />}
      </AnimatePresence>
      {(phase === 'off' || phase === 'boot') && <Boot on={phase === 'boot'} onPower={powerOn} onDone={booted} />}
      {phase === 'intro' && <Intro key={themeId} onReveal={reveal} onDone={() => set({ phase: 'live' })} />}
      <AnimatePresence>{editing && <ThemeEditor key="editor" id={editing} />}</AnimatePresence>
    </div>
  )
}

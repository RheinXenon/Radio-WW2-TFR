// 正在播放：左侧一张随播放旋转的黑胶唱片，右侧歌名原文为主、中文小字为辅；
// 换歌时逐字显影，换台途中随信号闪烁
// 云音乐歌曲（网易云导入）在歌手下方随进度显示歌词
import { useEffect, useRef, useState } from 'react'
import { useRadio, listName, FAV } from '../store.js'
import { useT, useLoc } from '../i18n/index.js'
import { radio } from '../audio/radio.js'
import { engine } from '../audio/engine.js'
import { useLyric } from '../audio/lyric.js'
import { theme, genreOf } from '../themes/index.js'
import { songCover, forgetCover } from '../netease/covers.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import { Icon } from './Icon.jsx'
import './nowplaying.css'

export const CJK = /[぀-ヿ㐀-鿿]/
const fmt = (t) => {
  if (!Number.isFinite(t) || t < 0) return '0:00'
  const m = Math.floor(t / 60)
  return `${m}:${String(Math.floor(t % 60)).padStart(2, '0')}`
}

function titleSize(title) {
  if (CJK.test(title)) return title.length > 10 ? 44 : 58
  const n = title.length
  return n <= 14 ? 66 : n <= 22 ? 54 : n <= 32 ? 44 : 36
}

function Letters({ text, delay = 0, step = 0.022 }) {
  return [...text].map((c, i) => (
    <span key={i} className="np__ch" style={{ animationDelay: `${delay + i * step}s` }}>{c === ' ' ? ' ' : c}</span>
  ))
}

function Progress() {
  const t = useT()
  const fill = useRef(), cur = useRef(), dur = useRef(), bar = useRef()
  useEffect(() => {
    let raf
    let lastP = '', lastT = '', lastD = ''
    const el = engine.el
    const tick = () => {
      const d = el.duration
      const ct = el.currentTime
      const p = Number.isFinite(d) && d > 0 ? ct / d : 0
      // 进度是匀速量:量化到 0.1% 后交给 CSS 线性补间,不必每帧写 transform;
      // 拖动或跳转造成的陡变先关掉补间,免得进度条扫过整条轨道
      const ps = p.toFixed(3)
      if (fill.current && ps !== lastP) {
        const jump = Math.abs(p - (lastP === '' ? 0 : +lastP)) > 0.02
        if (jump) fill.current.style.transition = 'none'
        fill.current.style.transform = `scaleX(${ps})`
        if (jump) { void fill.current.offsetWidth; fill.current.style.transition = '' }
      }
      // 光点位置与时间文本变了才写,免得页面每帧样式失效
      if (bar.current && ps !== lastP) bar.current.style.setProperty('--p', ps)
      if (ps !== lastP) lastP = ps
      if (cur.current) { const s = fmt(ct); if (s !== lastT) { lastT = s; cur.current.textContent = s } }
      if (dur.current) { const s = fmt(d); if (s !== lastD) { lastD = s; dur.current.textContent = s } }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  const seekAt = (e) => {
    const r = bar.current.getBoundingClientRect()
    radio.seek(((e.clientX - r.left) / r.width) * engine.el.duration)
  }
  const onDown = (e) => {
    seekAt(e)
    const move = (ev) => seekAt(ev)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="np__progress">
      <span ref={cur} className="np__time latin tnum">0:00</span>
      <div ref={bar} className="np__bar" onPointerDown={onDown} role="slider" aria-label={t('播放进度')}>
        <div className="np__track" />
        <div ref={fill} className="np__fill" />
        <div className="np__bead" />
      </div>
      <span ref={dur} className="np__time latin tnum">0:00</span>
    </div>
  )
}

// 收藏印章：短按收入珍藏，长按弹出菜单加入其他歌单
// 中心是一枚悬挂勋章：双缎带下垂，五角星叠在带端
export function Seal({ on, songId, onClick }) {
  const [menu, setMenu] = useState(false)
  const hold = useRef(null)
  const firedAt = useRef(0)
  const t = useT()
  const favorites = useRadio((s) => s.favorites)
  const playlists = useRadio((s) => s.playlists)

  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!e.target.closest('.seal-wrap')) setMenu(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [menu])

  const start = (e) => {
    hold.current = {
      x: e.clientX, y: e.clientY,
      timer: setTimeout(() => {
        firedAt.current = Date.now()
        hold.current = null
        setMenu(true)
        engine.click('key')
      }, 450),
    }
  }
  const move = (e) => {
    if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > 8) {
      clearTimeout(hold.current.timer)
      hold.current = null
    }
  }
  const end = () => { if (hold.current) { clearTimeout(hold.current.timer); hold.current = null } }

  const lists = [{ id: FAV, name: t('珍藏'), songs: favorites }, ...playlists]
  const { toggleInList, createList } = useRadio.getState()

  return (
    <div className="seal-wrap">
      <button
        className={`seal ${on ? 'is-on' : ''}`}
        onClick={() => { if (Date.now() - firedAt.current < 600) return; onClick() }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onContextMenu={(e) => e.preventDefault()}
        title={on ? t('已收入珍藏，再按一次取消；长按加入歌单') : t('收入珍藏；长按加入歌单')}
        aria-pressed={on}
      >
        <svg viewBox="0 0 40 40" aria-hidden>
          <defs>
            <filter id="sealRough">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
              <feDisplacementMap in="SourceGraphic" scale="1.6" />
            </filter>
            <mask id="sealInk">
              <rect width="40" height="40" fill="#fff" />
              <rect width="40" height="40" fill="#000" filter="url(#sealRough)" opacity="0.18" />
            </mask>
          </defs>
          <g filter="url(#sealRough)">
            <rect x="3" y="3" width="34" height="34" rx="3" className="seal__body" mask="url(#sealInk)" />
            <path className="seal__mark" mask="url(#sealInk)"
              d="M13.5 7 L18 7 L19.5 19.5 L15 19.5 Z M26.5 7 L22 7 L20.5 19.5 L25 19.5 Z
                 M20 17.5 L21.9 22.8 L27.6 23 L23.1 26.5 L24.7 32 L20 28.8 L15.3 32 L16.9 26.5 L12.4 23 L18.1 22.8 Z" />
          </g>
        </svg>
      </button>
      {menu && (
        <div className="pl__menu is-up seal__menu">
          <div className="pl__menulabel">{t('加入歌单')}</div>
          {lists.map((l) => (
            <button key={l.id} onClick={() => toggleInList(l.id, songId)}>
              <Icon name="check" size={14} style={{ visibility: l.songs.includes(songId) ? 'visible' : 'hidden' }} />
              <span>{l.name}</span>
            </button>
          ))}
          <hr />
          <button onClick={() => { createList(t('新歌单 {n}', { n: playlists.length + 1 }), [songId]); setMenu(false) }}>
            <Icon name="plus" size={14} />
            <span>{t('新建歌单并加入')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

// 唱片：缀在歌名行尾缓缓旋转的黑胶，尺寸随歌名字号（em）；封面作盘面主体，
// 黑边只留装饰窄圈；没有封面（本地歌、封面失效）时压一张频道主色的台版盘。
// 外圈光晕随节拍呼吸，随乐律动关掉时只剩恒定微光
function Disc({ track, st }) {
  const playing = useRadio((s) => s.playing)
  const reactive = useRadio((s) => s.reactive)
  const [cover, setCover] = useState(null)
  const glow = useRef()

  useEffect(() => {
    let on = true
    setCover(null)
    songCover(track).then((u) => { if (on) setCover(u) })
    return () => { on = false }
  }, [track.id])

  useEffect(() => {
    const el = glow.current
    if (!el) return
    if (!reactive || !playing) { el.style.setProperty('--beat', 0); return }
    let raf
    let last = ''
    let v = 0, at = performance.now()
    const tick = () => {
      const now = performance.now()
      const dt = Math.min(0.1, (now - at) / 1000)
      at = now
      // 原先靠 0.45s 的 box-shadow 过渡滤平滑,代价是每帧重启过渡;
      // 改在 JS 里做同样的低通再量化写入,呼吸手感不变,写入大减
      v += (engine.levels().beat - v) * (1 - Math.exp(-dt * 5))
      const b = (Math.round(v * 50) / 50).toFixed(2)
      if (b !== last) { last = b; el.style.setProperty('--beat', b) }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [reactive, playing])

  return (
    <div className="np__disc-wrap" ref={glow}>
      <div className={`np__disc ${playing ? 'is-playing' : ''}`}>
        {cover ? (
          <div key="cover" className="np__label">
            <img src={cover} alt="" onError={() => { forgetCover(track); setCover(null) }} />
          </div>
        ) : (
          <div key="st" className="np__label np__label--st">
            <Emblem kind={st.emblem} size={30} />
          </div>
        )}
      </div>
    </div>
  )
}

// 云音乐歌词：上一句留淡影，当前句随行切换淡入，官方中文翻译作小字缀在下方
function Lyric({ track }) {
  const { lines, index } = useLyric(track)
  if (!lines.length) return null
  const prev = index > 0 ? lines[index - 1] : null
  const cur = index >= 0 ? lines[index] : null
  return (
    <div className="np__lyric">
      {prev && <p className="np__lyric-prev">{prev.text}</p>}
      <p key={index} className="np__lyric-line" lang={CJK.test(cur?.text ?? '') ? 'zh' : undefined}>
        {cur?.text || '♪'}
        {cur?.trans && <span className="np__lyric-trans">{cur.trans}</span>}
      </p>
    </div>
  )
}

export default function NowPlaying() {
  const t = useT()
  const L = useLoc()
  const lang = useRadio((s) => s.lang)
  const track = useRadio((s) => s.track)
  const tuning = useRadio((s) => s.tuning)
  const band = useRadio((s) => s.band)
  const listTitle = useRadio((s) => listName(s, s.list))
  const offAir = useRadio((s) => s.offAir)
  const offAirEnabled = useRadio((s) => !!s.offAir && s.enabled[s.offAir] !== false)
  const fav = useRadio((s) => (s.track ? s.favorites.includes(s.track.id) : false))
  const toggleFavorite = useRadio((s) => s.toggleFavorite)
  const discOn = useRadio((s) => s.disc)

  // 停播有两种：频道被停用，或频道启用着但分组与逐首跳过把歌都关掉了
  if (offAir) {
    const st = theme.stationMap[offAir]
    const title = t('本台今夜停播')
    return (
      <section className="np is-offair" style={{ '--accent': st.accent, '--glow': st.glow }}>
        <header className="np__head">
          <Emblem kind={st.emblem} size={22} />
          <span>{L(st, 'city')} · {L(st, 'genre')}</span>
          <i className="np__dot" />
          <span className="np__band">{t('停播')}</span>
        </header>
        <h2 className={`np__title ${CJK.test(title) ? 'np__title--zh' : 'latin'}`} style={{ fontSize: 50 }}>{title}</h2>
        <p className="np__zh">{offAirEnabled ? t('本台的歌都已关闭，只剩静电') : t('只收得到静电与远方的电码')}</p>
        {offAirEnabled
          ? <button className="np__restore" onClick={() => useRadio.setState({ panel: 'playlist' })}>{t('打开歌单')}</button>
          : <button className="np__restore" onClick={() => {
            useRadio.setState((s) => ({ enabled: { ...s.enabled, [offAir]: true } }))
          }}>{t('恢复本台播出')}</button>}
      </section>
    )
  }

  if (!track) return <section className="np is-empty" />

  const st = theme.stationMap[track.station]
  // 频道副题：中文模式显示当前歌所属子歌单名（分组），英文模式退回频道流派的双语字段
  const genre = lang === 'en' ? L(st, 'genre') : genreOf(st, track)
  // 歌名与歌手：原文为主、中文小字为辅——原文多为英文，两种语言下主副行不必互换；
  // 中文歌的 titleZh 与 title 相同，副行自然隐藏
  const zhTitle = track.titleZh && track.titleZh !== track.title ? track.titleZh : ''
  const artist = track.artist
  const artistZh = track.artistZh && track.artistZh !== track.artist ? track.artistZh : ''
  const cjk = CJK.test(track.title)
  const bandLabel = band === 'all' ? t('全频段混播') : band === 'list' ? t(listTitle) : t('本台')

  return (
    <section className={`np ${tuning ? 'is-weak' : ''}`} style={{ '--accent': st.accent, '--glow': st.glow }}>
      <div key={track.id} className="np__inner">
        <header className="np__head">
          <Emblem kind={st.emblem} size={22} />
          <span>{t('现正播送')}</span>
          <i className="np__dot" />
          <span className="np__genre">{L(st, 'city')} · {genre}</span>
          <i className="np__dot" />
          <span className="np__band">{bandLabel}</span>
        </header>
        <Pattern kind={st.pattern} color={st.accent} height={7} opacity={0.55} className="np__pattern" />
        <h2 className={`np__title ${cjk ? 'np__title--zh' : 'latin'}`} style={{ fontSize: titleSize(track.title) }} lang={cjk ? 'zh' : undefined}>
          <Letters text={track.title} delay={0.1} />
          {discOn && <Disc track={track} st={st} />}
        </h2>
        {zhTitle && <p className="np__zh"><Letters text={zhTitle} delay={0.35} step={0.04} /></p>}
        <p className="np__artist">
          {artist ? <span className="latin np__artist-o">{artist}</span> : <span className="np__artist-o np__artist-anon">{t('佚名')}</span>}
          {artistZh && <span className="np__artist-zh">{artistZh}</span>}
        </p>
        {track.cloud && <Lyric track={track} />}
      </div>
      <div className="np__foot">
        <Progress />
        <Seal on={fav} songId={track.id} onClick={() => {
          toggleFavorite(track.id)
          if (!fav) engine.click('key')
        }} />
      </div>
    </section>
  )
}

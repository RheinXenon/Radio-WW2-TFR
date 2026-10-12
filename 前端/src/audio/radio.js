// 电台控制器：选曲、换台过程编排、手动调谐
import { create } from 'zustand'
import { engine } from './engine.js'
import { useRadio, getRadio, listSongIds, listName, FAV, isOn } from '../store.js'
import { theme, NOISE } from '../themes/index.js'
import { isAnalog } from '../skins.js'
import { directUrl } from '../netease/api.js'
import { cloudLibrary } from '../netease/library.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

// 刻度盘指针状态，界面逐帧读取。scrub 非空时表示正在手动拖动
// 换台事件：tunestart（开始换台）、locked（锁定新台），供界面播放呼号卡片
export const events = new EventTarget()
const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }))

export const useDial = create(() => ({ from: 0.5, to: 0.5, start: 0, duration: 0, scrub: null }))
export const needlePos = () => {
  const d = useDial.getState()
  if (d.scrub != null) return d.scrub
  const t = d.duration ? Math.min(1, (performance.now() - d.start) / (d.duration * 1000)) : 1
  return d.from + (d.to - d.from) * easeInOut(t)
}
const moveNeedle = (to, duration, from = needlePos()) =>
  useDial.setState({ from, to, start: performance.now(), duration, scrub: null })

const set = (patch) => useRadio.setState(patch)
const stationOf = (id) => theme.stationMap[id]
const history = []
const bags = new Map()
const lastInStation = new Map()
let token = 0
let failures = 0

// —— 选曲 ——

// 无会员权限时挡下云音乐会员歌曲（设置可关，默认开；点播与歌单波段不受影响）。
// 歌单面板用它给被挡下的歌做灰显
export const vipBlocked = (song, s) => song.cloud && song.vip && s.skipVipWithoutMember && !s.neteaseVip

// 一台里参与本台与全频段播放的歌：去掉关闭的分组、逐首跳过的歌与被挡的会员歌，不考虑频道是否启用
export const songsOf = (st, s = getRadio()) =>
  st.songs.filter((song) => !s.groupsOff[`${st.id}/${song.group}`] && !s.skipped[song.id] && !vipBlocked(song, s))

function listFor(s = getRadio()) {
  if (s.band === 'all') return theme.stations.filter((st) => isOn(s, st.id)).flatMap((st) => songsOf(st, s))
  // 歌单跨主题共用，只播属于当前主题的歌
  if (s.band === 'list') return listSongIds(s, s.list).map((id) => theme.songIndex.get(id)).filter(Boolean)
  const st = stationOf(s.station)
  return st && isOn(s, st.id) ? songsOf(st, s) : []
}
const bagKey = (s) => (s.band === 'station' ? `station:${s.station}` : s.band === 'list' ? `list:${s.list}` : s.band)
// 每首歌在当前主题全部频道里的原始次序，按主题各建一份；之后才加入的云音乐歌曲排在最后
const ranks = new WeakMap()
function rankOf(id) {
  let rank = ranks.get(theme.songIndex)
  if (!rank) ranks.set(theme.songIndex, (rank = new Map([...theme.songIndex.keys()].map((x, i) => [x, i]))))
  return rank.get(id) ?? Number.MAX_SAFE_INTEGER
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickNext({ resume = false } = {}) {
  const s = getRadio()
  const list = listFor(s)
  if (!list.length) return null
  const cur = s.track?.id
  if (s.order === 'shuffle') {
    const ids = new Set(list.map((x) => x.id))
    let bag = bags.get(bagKey(s))
    for (let guard = 0; guard < 2; guard++) {
      while (bag?.length) {
        const id = bag.pop()
        if (ids.has(id) && id !== cur) return theme.songIndex.get(id) ?? list.find((x) => x.id === id)
      }
      bag = shuffle(list.map((x) => x.id))
      bags.set(bagKey(s), bag)
    }
    return list[0]
  }
  let idx = list.findIndex((x) => x.id === cur)
  if (idx < 0 && resume && s.band === 'station') idx = list.findIndex((x) => x.id === lastInStation.get(s.station))
  // 当前歌刚被分组开关或跳过排除：接着它在原始编号里的位置往下播
  if (idx < 0 && cur && s.band !== 'list') {
    const after = list.findIndex((x) => rankOf(x.id) > rankOf(cur))
    idx = Math.max(0, after) - 1
  }
  return list[(idx + 1) % list.length]
}

// —— 换台过程 ——

// 指针从 from 扫到 to：离开原台时信号迅速衰减，途经其他电台时载波回升并出现差拍啸叫
function travelCurve(from, to, startSignal) {
  return (t) => {
    const p = from + (to - from) * easeInOut(t)
    let dd = 1
    for (const st of theme.stations) if (Math.abs(st.pos - to) > 0.001) dd = Math.min(dd, Math.abs(st.pos - p))
    const near = Math.max(0, 1 - dd / 0.035)
    return {
      signal: Math.min(1, startSignal * Math.max(0, 1 - t * 3.5) + 0.55 * near),
      whistleHz: 90 + dd * 26000,
      whistleAmp: 0.05 * near * near,
    }
  }
}
// 锁台：信号拉满，啸叫滑向零拍消失
const lockCurve = (from) => (t) => {
  const e = 1 - Math.pow(1 - t, 3)
  return { signal: from + (1 - from) * e, whistleHz: 30 + 700 * Math.pow(1 - t, 2.2), whistleAmp: 0.035 * Math.pow(1 - t, 1.5) }
}

// 载入一首歌：网易云条目先解析直链直连 CDN（响应带 CORS 头，完整 Web Audio 链保留），
// 解析或直连失败退回代理取流；会员曲的完整直链由解析时随请求带去的登录态决定
let directSrc = null
let recovering = false
async function loadSong(song) {
  directSrc = null
  if (song.nid) {
    const url = await directUrl(song.nid, cloudLibrary.level).catch(() => null)
    if (url) {
      directSrc = url
      try { return await engine.load(url, { cors: true }) } catch { directSrc = null }
    }
  }
  return engine.load(song.url, song)
}

async function transition(song, { kind, fromPos }) {
  const my = ++token
  const s = getRadio()
  const analog = isAnalog(s.style)
  const target = stationOf(song.station)
  const prevStation = s.track ? s.track.station : s.station
  const changing = kind === 'tune' || prevStation !== song.station
  set({ tuning: song.station, offAir: null })
  if (changing) emit('tunestart', { station: song.station, manual: kind === 'tune' })

  if (analog) {
    const from = fromPos ?? needlePos()
    if (changing) {
      const dur = 0.6 + 1.25 * Math.abs(target.pos - from)
      moveNeedle(target.pos, dur, from)
      engine.sweep(travelCurve(from, target.pos, s.playing ? 1 : 0.4), dur)
      const loading = (async () => { await sleep(260); if (my === token) await loadSong(song) })()
      await Promise.all([sleep(dur * 1000), loading])
    } else {
      // 同台换曲：唱片间的短暂空白里，载波底噪轻轻浮起
      engine.fade(0, 0.12)
      engine.sweep(() => ({ signal: 0.62, whistleHz: 60, whistleAmp: 0 }), 0.5)
      await Promise.all([sleep(650), loadSong(song)])
    }
    if (my !== token) return
    engine.fadeNow(1)
    await engine.el.play().catch(() => {})
    engine.sweep(lockCurve(changing ? 0.04 : 0.62), changing ? 1.3 : 0.9)
  } else {
    moveNeedle(target.pos, 0.6)
    engine.cancelSweep()
    engine.setSignal(1)
    engine.setWhistle(60, 0)
    engine.fade(0, 0.1)
    engine.sweepFilter(20000, 500, 0.45)
    await Promise.all([sleep(480), loadSong(song)])
    if (my !== token) return
    engine.fadeNow(0)
    await engine.el.play().catch(() => {})
    engine.sweepFilter(500, 20000, 1.4)
    engine.fade(1, 0.35)
  }
  if (my !== token) return
  failures = 0
  lastInStation.set(song.station, song.id)
  set({ track: song, playing: true, tuning: null })
  if (changing) emit('locked', { station: song.station, manual: kind === 'tune' })
}

async function play(song, opts = {}) {
  if (!song) return
  const cur = getRadio().track
  if (cur && !opts.fromHistory && cur.id !== song.id) {
    history.push(cur.id)
    if (history.length > 80) history.shift()
  }
  try {
    await transition(song, opts)
  } catch {
    // 文件损坏或缺失：跳过，连续失败过多时停下
    if (++failures < 5) setTimeout(() => radio.next(), 600)
    else set({ playing: false, tuning: null })
  }
}

// —— 停播 ——
// 停用的频道仍可调到，但只剩静电与远处的摩尔斯电码
async function goOffAir(stationId, fromPos) {
  const my = ++token
  const s = getRadio()
  const st = stationOf(stationId)
  set({ station: stationId, tuning: stationId })
  emit('tunestart', { station: stationId, manual: true })
  engine.fade(0, 0.15)
  if (isAnalog(s.style)) {
    const from = fromPos ?? needlePos()
    const dur = 0.6 + 1.25 * Math.abs(st.pos - from)
    moveNeedle(st.pos, dur, from)
    engine.sweep(travelCurve(from, st.pos, s.playing ? 1 : 0.4), dur)
    await sleep(dur * 1000)
    if (my !== token) return
    engine.el.pause()
    engine.sweep(() => ({ signal: 0.45, whistleHz: 40, whistleAmp: 0 }), 0.6)
    if (NOISE.effects.morse) engine.playEffect(NOISE.effects.morse, { gain: 0.12, bandpass: 1100 })
  } else {
    moveNeedle(st.pos, 0.6)
    await sleep(400)
    if (my !== token) return
    engine.el.pause()
  }
  set({ playing: false, tuning: null, offAir: stationId })
}

// —— 对外接口 ——

engine.el.addEventListener('ended', () => {
  const s = getRadio()
  if (s.order === 'one' && s.track) play(s.track, { kind: 'next', fromHistory: true })
  else radio.next({ natural: true })
})

// 直连直链约二十分钟时效，中途取流失败（如暂停过久后继续）时换新直链从断点续播，
// 仍失败退回代理；换台进行中的失败由 loadSong 与 play 自己处理，这里只管已锁台的直连
engine.el.addEventListener('error', async () => {
  const s = getRadio()
  const song = s.track
  if (recovering || s.tuning || !directSrc || !song?.nid) return
  recovering = true
  const wasPlaying = s.playing
  const pos = engine.el.currentTime
  let ok = false
  const url = await directUrl(song.nid, cloudLibrary.level, true).catch(() => null)
  if (url) {
    try { await engine.load(url, { cors: true }); directSrc = url; ok = true } catch { /* 换代理 */ }
  }
  if (!ok) {
    try { await engine.load(song.url, song); directSrc = null; ok = true } catch { /* 放弃这首 */ }
  }
  recovering = false
  if (!ok) {
    if (++failures < 5) setTimeout(() => radio.next(), 600)
    else set({ playing: false, tuning: null })
    return
  }
  failures = 0
  if (Number.isFinite(pos)) engine.el.currentTime = Math.max(0, Math.min(pos, (engine.el.duration || pos) - 0.2))
  if (wasPlaying) engine.el.play().catch(() => {})
})

export const radio = {
  // 开场结束后开播。上次停在空歌单上就退回本台；本台无歌可播时换到第一个有歌的频道
  start() {
    if (getRadio().band !== 'station' && !listFor().length) set({ band: 'station' })
    const s = getRadio()
    const playable = (id) => isOn(s, id) && songsOf(stationOf(id), s).length
    let station = stationOf(s.station) ? s.station : theme.stations[0].id
    if (s.band === 'station' && !playable(station)) station = theme.stations.find((st) => playable(st.id))?.id ?? station
    set({ station })
    useDial.setState({ from: 0, to: stationOf(station).pos, start: performance.now(), duration: 0, scrub: null })
    engine.setVolume(s.muted ? 0 : s.volume, 0.6)
    const song = pickNext({ resume: true })
    if (song) play(song, { kind: 'tune', fromPos: Math.max(0, stationOf(song.station).pos - 0.12) })
    else goOffAir(station, 0)
  },

  // 离开当前主题：作废进行中的换台，音乐淡出后停下
  async stop() {
    token++
    engine.cancelSweep()
    engine.fade(0, 0.25)
    set({ playing: false, tuning: null })
    await sleep(700)
    if (!getRadio().playing) engine.el.pause()
  },

  tune(stationId, { fromPos } = {}) {
    const s = getRadio()
    if (s.band === 'station' && s.station === stationId && !s.offAir && !fromPos && s.track?.station === stationId) return
    set({ band: 'station', station: stationId })
    const song = pickNext({ resume: true })
    if (!song) return goOffAir(stationId, fromPos)
    play(song, { kind: 'tune', fromPos })
  },

  // 切换波段；歌单波段可同时指定要播的歌单
  setBand(band, list = getRadio().list) {
    const s = getRadio()
    if (s.band === band && (band !== 'list' || s.list === list)) return
    const target = { ...s, band, list }
    const songs = listFor(target)
    if (band !== 'station' && !songs.length) {
      const text = band === 'all' ? '没有可播的频道，请在设置或歌单中打开'
        : list === FAV ? '珍藏里还没有歌：点歌名旁的印章即可收入'
          : `歌单“${listName(s, list)}”还是空的，可在歌单面板里添歌`
      return set({ notice: { text, at: performance.now() } })
    }
    set({ band, list })
    if (band === 'station') {
      const st = s.track?.station ?? s.station
      set({ station: st })
      return
    }
    // 当前歌曲仍属于新波段就继续播放，否则立即换歌
    if (!s.track || s.offAir || !songs.some((x) => x.id === s.track.id)) play(pickNext(), { kind: 'tune' })
  },

  // 在歌单面板里点播一首歌。给出 list 时进入该歌单；来自频道列表时，
  // 全频段里有这首歌就留在全频段，否则调到它所在的频道
  pick(song, list) {
    const s = getRadio()
    if (list) set({ band: 'list', list })
    else if (s.band !== 'all' || !listFor(s).some((x) => x.id === song.id)) set({ band: 'station', station: song.station })
    play(song, { kind: 'pick' })
  },

  next({ natural = false } = {}) {
    const s = getRadio()
    if (s.offAir) return
    const song = pickNext()
    // 无歌可接：本台转入停播；歌单被清空时播完这首就停下
    if (!song) {
      if (s.band === 'station') goOffAir(s.station)
      else if (natural) set({ playing: false })
      return
    }
    if (s.band === 'station' && song.station !== s.station) set({ station: song.station })
    play(song, { kind: natural ? 'natural' : 'next' })
  },

  prev() {
    const s = getRadio()
    if (engine.el.currentTime > 6 && s.track) { engine.el.currentTime = 0; return }
    const id = history.pop()
    const song = id && theme.songIndex.get(id)
    if (!song) return
    if (s.band === 'station') set({ station: song.station })
    play(song, { kind: 'prev', fromHistory: true })
  },

  async toggle() {
    const s = getRadio()
    if (s.offAir) return
    if (!s.track) return radio.start()
    if (s.playing) {
      set({ playing: false })
      engine.fade(0, 0.08)
      await sleep(260)
      if (!getRadio().playing) engine.el.pause()
    } else {
      set({ playing: true })
      engine.fadeNow(0)
      await engine.el.play().catch(() => set({ playing: false }))
      engine.fade(1, 0.15)
    }
  },

  // 频道启停、分组开关或逐首跳过变化后：正在听的频道已无歌可播则转入停播，
  // 停播中的频道重新有歌则立即开播；正在播的歌被排除时直接换下一首。歌单波段不受这些开关影响
  refresh() {
    const s = getRadio()
    if (s.band === 'list') return
    const songs = listFor(s)
    if (s.band === 'station') {
      const id = s.offAir ?? s.station
      if (!songs.length && !s.offAir) return goOffAir(id)
      if (songs.length && s.offAir === id) {
        set({ offAir: null })
        return play(pickNext({ resume: true }), { kind: 'tune' })
      }
    }
    if (s.playing && !s.tuning && s.track && songs.length && !songs.some((x) => x.id === s.track.id)) radio.next()
  },

  seek(t) {
    if (Number.isFinite(engine.el.duration)) engine.el.currentTime = Math.max(0, Math.min(engine.el.duration - 0.2, t))
  },

  setVolume(v) {
    v = Math.max(0, Math.min(1, v))
    set({ volume: v, muted: false })
    engine.setVolume(v)
  },
  toggleMute() {
    const s = getRadio()
    set({ muted: !s.muted })
    engine.setVolume(s.muted ? s.volume : 0)
  },

  // —— 手动调谐（指针式控件） ——
  scrubStart() {
    token++
    engine.cancelSweep()
    useDial.setState({ scrub: needlePos() })
  },
  scrubMove(pos) {
    pos = Math.max(0, Math.min(1, pos))
    useDial.setState({ scrub: pos })
    const s = getRadio()
    const home = stationOf(s.track?.station ?? s.station)
    let dd = 1
    for (const st of theme.stations) dd = Math.min(dd, Math.abs(st.pos - pos))
    const near = Math.max(0, 1 - dd / 0.035)
    const away = Math.abs(pos - home.pos)
    const homeNear = Math.max(0, 1 - away / 0.032)
    // 本台满格,扫到其他电台刻度线附近时浮起六成载波,无台区域归零
    const sig = Math.max(homeNear, 0.6 * near)
    engine.setSignal(s.playing || s.offAir ? (s.offAir ? 0.45 * sig : sig) : 0.2, 0.03)
    engine.setWhistle(70 + dd * 26000, 0.05 * near * near * (away > 0.01 ? 1 : 0.2), 0.03)
  },
  scrubEnd() {
    const pos = useDial.getState().scrub
    if (pos == null) return
    const nearest = theme.stations.reduce((a, b) => (Math.abs(b.pos - pos) < Math.abs(a.pos - pos) ? b : a))
    const s = getRadio()
    const current = s.track?.station ?? s.station
    if (nearest.id === current && s.band === 'station' && (s.track || s.offAir)) {
      // 回到原台：指针归位，信号重新锁定
      const d = Math.abs(nearest.pos - pos)
      moveNeedle(nearest.pos, 0.25 + d * 6, pos)
      if (s.offAir) engine.sweep(() => ({ signal: 0.45, whistleHz: 40, whistleAmp: 0 }), 0.4)
      else engine.sweep(lockCurve(Math.max(0, 1 - d / 0.032)), 0.8)
      return
    }
    radio.tune(nearest.id, { fromPos: pos })
  },
}

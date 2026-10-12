// 云音乐库（运行时）：按主题拉取各频道子歌单里的云音乐歌曲并注入频道数据；
// 增删改后原地同步该主题的歌曲表并 bump cloudRev，界面随修订号重算，不刷新页面；
// 换主题时重新拉取目标主题的库，各主题互不串味
// 库有两种存放方式，启动时探测 /netease/library 是否存在自动选定：
//  - 文件模式（本地 dev/preview）：库由中间件按主题读写 Resources/Netease Cloud/<主题 id>.json
//  - 浏览器模式（线上）：库按主题存 localStorage；为空时以构建时烘焙进清单的库为种子
import { useRadio } from '../store.js'
import { builtThemes, onAssemble, refreshStationGroups } from '../themes/index.js'
import manifest from 'virtual:radio-manifest'
import { get, post, sessionCookie } from './api.js'

const libKey = (id) => `radio.cloud.library.${id}`
const LEGACY_KEY = 'radio.cloud.library' // 旧版整库存于单键，启动时迁到烽火电波名下
const EMPTY = () => ({ level: 'exhigh', stations: {} })

// 云音乐歌曲对象：url 取值时才拼，网易云条目走 /netease/stream,音质参数始终跟随
// 当前设置;外链条目里 archive.org 直连(响应带 Access-Control-Allow-Origin: *,
// 直连即有完整 Web Audio 音频,也避开服务端出口被 archive.org 限流),其余外链经
// /ext/stream 同源代理(跨域媒体不经代理接 Web Audio 会被静音);order 为组内编号,
// 由调用方接着本地歌续排
function toSong(stationId, group, song, order) {
  const key = song.nid ?? song.url
  return {
    id: `cloud/${key}`,
    nid: song.nid,
    station: stationId,
    group,
    order,
    title: song.title,
    titleZh: song.titleZh ?? '',
    artist: song.artist,
    artistZh: '',
    cover: song.cover ?? '', // 专辑封面直存库里，播放界面不用再按 nid 拉
    get url() {
      if (song.nid) return `/netease/stream?id=${song.nid}&level=${cloudLibrary.level}`
      if (song.direct) return song.url
      return `/ext/stream?url=${encodeURIComponent(song.url)}`
    },
    get cors() { return !!song.direct },
    vip: !!song.vip, // 会员歌曲：无会员账号时只有试听片段
    cloud: true,
  }
}

// 把库写进频道数据：先摘掉旧云音乐歌曲，再按频道注入(编号接着各组本地歌的末号续排，
// 全新的组从 1 起)，最后重建索引与分组
function inject(t, lib) {
  for (const st of t.stations) {
    st.songs = st.songs.filter((song) => !song.cloud)
    const groups = lib.stations?.[st.id] ?? {}
    for (const [group, list] of Object.entries(groups)) {
      const base = st.songs.reduce((m, song) => (song.group === group ? Math.max(m, song.order) : m), 0)
      list.forEach((song, i) => st.songs.push(toSong(st.id, group, song, base + 1 + i)))
    }
    refreshStationGroups(st)
  }
  for (const [id, song] of [...t.songIndex]) if (song.cloud) t.songIndex.delete(id)
  for (const st of t.stations) for (const song of st.songs) t.songIndex.set(song.id, song)
}

// 应用某主题的库：记下所属主题并只注入它，别的主题的运行时数据不动
function applyLibrary(id, lib) {
  libTheme = id
  cloudLibrary.level = lib.level ?? 'exhigh'
  current = JSON.parse(JSON.stringify({ level: cloudLibrary.level, stations: lib.stations ?? {} }))
  const t = builtThemes().find((x) => x.id === id)
  if (t) inject(t, current)
  useRadio.setState((s) => ({ cloudRev: s.cloudRev + 1 }))
}

// ———————————————————— 浏览器模式下的库操作 ————————————————————

const readLocal = (id) => { try { return JSON.parse(localStorage.getItem(libKey(id))) } catch { return null } }
const writeLocal = (id, lib) => { try { localStorage.setItem(libKey(id), JSON.stringify(lib)) } catch {} }

// 旧版整库迁移：单键里的数据全部是烽火电波频道的，挪到它名下后清掉
function migrateLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    if (!localStorage.getItem(libKey('wwii'))) localStorage.setItem(libKey('wwii'), raw)
    localStorage.removeItem(LEGACY_KEY)
  } catch { /* 存储不可用时交给后面的空库兜底 */ }
}

// 浏览器模式下某主题的种子库：本地留存优先，其次构建时烘焙的库
const seedBrowser = (id) => readLocal(id) ?? manifest.netease?.[id] ?? EMPTY()

// 在当前库的副本上改写并落盘，返回新库；合并语义与中间件写文件的逻辑保持一致
function localMutate(fn) {
  const id = useRadio.getState().theme
  const lib = libTheme === id ? current ?? EMPTY() : seedBrowser(id)
  fn(lib)
  writeLocal(id, lib)
  return JSON.parse(JSON.stringify(lib))
}

function localAdd({ station, group, songs }) {
  return localMutate((lib) => {
    const groups = lib.stations[station] ?? {}
    const list = groups[group] ?? []
    for (const s of songs) {
      const i = list.findIndex((x) => (x.nid ?? x.url) === (s.nid ?? s.url))
      if (i >= 0) list[i] = s
      else list.push(s)
    }
    groups[group] = list
    lib.stations[station] = groups
  })
}

function localRemove({ station, group, nid }) {
  return localMutate((lib) => {
    const groups = lib.stations[station]
    if (!groups || !(group in groups)) return
    if (nid == null) delete groups[group]
    else {
      groups[group] = groups[group].filter((s) => (s.nid ?? s.url) !== nid)
      if (!groups[group].length) delete groups[group]
    }
    if (!Object.keys(groups).length) delete lib.stations[station]
  })
}

// 改组名：目标名已存在时合并（本组接在目标组后面并按 nid 去重），纯改名保持组的位置
function localRename({ station, group, name }) {
  return localMutate((lib) => {
    const groups = lib.stations[station]
    if (!groups || !(group in groups) || !name || name === group) return
    const list = groups[group]
    const out = {}
    for (const [k, v] of Object.entries(groups)) {
      if (k === group) continue
      if (k === name) {
        const seen = new Set()
        out[k] = [...v, ...list].filter((s) => {
          const key = s.nid ?? s.url
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      } else out[k] = v
    }
    if (!(name in out)) for (const [k, v] of Object.entries(groups)) out[k === group ? name : k] = v
    lib.stations[station] = out
  })
}

// 按给定 nid 顺序重排组内歌曲
function localReorder({ station, group, nids }) {
  return localMutate((lib) => {
    const list = lib.stations[station]?.[group]
    if (!list) return
    const by = new Map(list.map((s) => [s.nid ?? s.url, s]))
    lib.stations[station][group] = nids.map((n) => by.get(n)).filter(Boolean)
  })
}

// ———————————————————— 对外接口 ————————————————————

let remote = true // 文件模式开关；浏览器模式下为 false
let current = null // 最近一次应用的库（结构化的深拷贝），导出用
let libTheme = null // current 所属的主题 id
// 之后才组装的主题补注入它自己主题的库
onAssemble((t) => { if (current && t.id === libTheme) inject(t, current) })

// 拉取（或读取）某主题的库并注入；失败静默，界面沿用已有的歌曲表
async function loadTheme(id) {
  if (!remote) return applyLibrary(id, seedBrowser(id))
  try {
    const r = await fetch(`/netease/library?theme=${encodeURIComponent(id)}`)
    if (r.ok) applyLibrary(id, await r.json())
  } catch { /* 网络异常时保持现状 */ }
}

export const cloudLibrary = {
  level: 'exhigh', // 在线播放音质，随库同步
  get remote() { return remote }, // 面板用它标注库的存放位置
  get snapshot() { return current ?? { level: this.level, stations: {} } },

  // 应用启动时调用；探测库存放方式并注入当前主题的库，失败静默（后端未起时电台照常用本地歌单）
  async init() {
    const id = useRadio.getState().theme
    try {
      const r = await fetch(`/netease/library?theme=${encodeURIComponent(id)}`)
      if (r.status === 404) {
        // 线上函数没有 /library 路由：浏览器模式，本地库为空时以烘焙进清单的库为种子
        remote = false
        migrateLegacy()
        applyLibrary(id, seedBrowser(id))
      } else if (r.ok) {
        applyLibrary(id, await r.json())
      }
    } catch { /* 网络异常时保持本地歌单 */ }
    // 校验登录态：失效即清掉留存（见 refreshSession）
    await this.refreshSession().catch(() => { /* 后端未起或网络异常 */ })
    // 换主题时加载新主题自己的库
    let last = useRadio.getState().theme
    useRadio.subscribe((s) => { if (s.theme !== last) { last = s.theme; loadTheme(s.theme) } })
  },

  // 拉取登录信息并同步会员状态，返回会话（未登录时 nickname 为空）。
  // 本地存有 cookie 却查不到会话，说明登录态已在网易云侧过期，清掉留存让面板
  // 回到扫码态；清除期间取流退回匿名，会员歌只剩试听，重新扫码即恢复
  async refreshSession() {
    const sess = await get('/session')
    useRadio.setState({ neteaseVip: sess.vipType > 0 })
    if (!sess.nickname && sessionCookie.get()) sessionCookie.clear()
    return sess
  },

  // 加入歌曲到某频道的子歌单：items 为完整歌曲对象（搜索结果）或纯 id 数组（歌单导入），
  // 纯 id 时先经 /details 批量取元数据；成功后同步注入当前主题
  async add(station, group, items) {
    let songs = items
    if (items.length && typeof items[0] !== 'object') songs = (await get(`/details?ids=${items.join(',')}`)).songs
    const lib = remote
      ? await post('/library/add', { theme: useRadio.getState().theme, station, group, songs })
      : localAdd({ station, group, songs })
    applyLibrary(useRadio.getState().theme, lib)
  },

  // 从子歌单移除一首;运行时对象的 url 是代理地址,外链条目的原始键从 id(形如 cloud/<键>)截取
  async remove(song) {
    const nid = song.nid ?? song.id.slice(6)
    const lib = remote
      ? await post('/library/remove', { theme: useRadio.getState().theme, station: song.station, group: song.group, nid })
      : localRemove({ station: song.station, group: song.group, nid })
    applyLibrary(useRadio.getState().theme, lib)
  },

  // 删除整组云音乐子歌单
  async removeGroup(station, group) {
    const lib = remote
      ? await post('/library/remove', { theme: useRadio.getState().theme, station, group })
      : localRemove({ station, group })
    applyLibrary(useRadio.getState().theme, lib)
  },

  // 子歌单改名；目标名已存在时两组合并（本组接在目标组后面）
  async rename(station, group, name) {
    const lib = remote
      ? await post('/library/rename', { theme: useRadio.getState().theme, station, group, name })
      : localRename({ station, group, name })
    applyLibrary(useRadio.getState().theme, lib)
  },

  // 按给定顺序重排子歌单（传组内全部 nid，运行时对象按 cloud/ 前缀 id 传）
  async reorder(station, group, nids) {
    const lib = remote
      ? await post('/library/reorder', { theme: useRadio.getState().theme, station, group, nids })
      : localReorder({ station, group, nids })
    applyLibrary(useRadio.getState().theme, lib)
  },

  // 在线播放音质
  async setLevel(level) {
    const lib = remote
      ? await post('/library/level', { theme: useRadio.getState().theme, level })
      : localMutate((l) => { l.level = level })
    applyLibrary(useRadio.getState().theme, lib)
  },

  // 整库导入（与导出的 JSON 同构，写进当前主题的库文件）
  async replace(lib) {
    if (!lib || typeof lib !== 'object' || typeof lib.stations !== 'object' || Array.isArray(lib.stations)) {
      throw new Error('库格式不对')
    }
    const id = useRadio.getState().theme
    applyLibrary(id, remote ? await post('/library/replace', { theme: id, ...lib }) : (writeLocal(id, lib), JSON.parse(JSON.stringify(lib))))
  },
}

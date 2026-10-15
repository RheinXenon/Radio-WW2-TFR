// 主题注册表与“当前主题”
// 内置主题各自提供频道、刻度盘、徽记、纹样、开场与壁纸；用户自建（DIY）主题由编辑器存进状态，
// 经 diyTheme() 补齐成同样的结构。任何主题都可以再追加用户频道，总数不超过 MAX_STATIONS。
// 外壳一律通过 theme（指向当前主题的代理）读取，切换主题后各处读到的就是新主题
import manifest from 'virtual:radio-manifest'
import wwii from './wwii/index.js'
import tfr from './tfr/index.js'
import classical from './classical/index.js'
import { diyTheme } from './diy/index.js'
import { loc } from '../i18n/index.js'

export const MAX_STATIONS = 8
export const BUILTIN = [wwii, tfr, classical]
export const NOISE = manifest.noise
const NONE = []

// 档案界面用语，默认是二战的讲法；主题在定义里给 terms 覆盖个别词，
// photo 一词只在 theme.hasPhotos（登记的壁纸里有带原图的）时才会出现在界面上
// 中英双份（xxxEn 后缀），界面按 store.lang 选择
const TERMS = {
  record: '史实档案', recordEn: 'Historical Record', // 画廊与档案页对这类壁纸的称呼
  recordLatin: 'Historical Record',
  stamp: '史实', stampEn: 'RECORD', // 档案卡上的印章
  story: '史实', storyEn: 'The Story', // 背景文字小节的标题
  nation: '国别', nationEn: 'Nation', // 池在档案卡里的字段名
  photo: '原照', photoEn: 'Original Photo', // 登记里附带的原图
  wall: '转绘', wallEn: 'Painting', // 壁纸一侧的叫法
  legend: '带黄铜光晕的是史实转绘：停留可见历史原照，双击或掀开纸角查看出处与史实',
  legendEn: 'Brass-haloed entries are painted records: hover for the original photo, double-click or lift the corner for provenance and the story',
}

// 正在播放界面的频道副题：当前歌所属子歌单（分组）名；歌散在频道根目录时退回频道预写的流派
export const genreOf = (st, song) => {
  const g = st?.groups?.find((x) => x.id === song?.group)
  return g?.id ? loc(g, 'name') : loc(st, 'genre')
}

// 按频道当前的 songs 重算分组列表；云音乐歌曲运行时增删后由 library.js 调用
// 分组名的登记值兼容字符串与 { name, nameEn } 对象两种形式
const gv = (g) => (typeof g === 'string' ? { name: g } : g ?? {})
export function refreshStationGroups(station, songs = station.songs, groups = station.groupNames ?? {}) {
  const ids = [...new Set(songs.map((song) => song.group))]
  station.groups = ids.map((id) => ({
    id,
    key: `${station.id}/${id}`,
    name: gv(groups[id]).name ?? (id || '未分组'),
    nameEn: gv(groups[id]).nameEn ?? id ?? 'Ungrouped',
    count: songs.filter((song) => song.group === id).length,
  }))
}

// 把清单与主题定义组装成主题对象。频道的歌单目录与壁纸池默认取频道名；
// 台位按频道数量把刻度盘等分，各台落在每格中央并对齐到最近的刻度格，
// 频道增减后整个刻度盘重新均分（数量与刻度步长相配时恰落在大格上，如二战八台 600—1300 kHz）
const slotFreqs = (dial, n) =>
  Array.from({ length: n }, (_, i) => Math.round((dial.min + ((dial.max - dial.min) * (i + 0.5)) / n) / dial.step) * dial.step)

function assemble(def, extra) {
  const lists = manifest.radios[def.radioRoot] ?? []
  const files = manifest.wallpapers[def.wallRoot] ?? {}
  const photos = manifest.photos[def.wallRoot] ?? []
  const { dial } = def
  const songIndex = new Map()
  const list = [...def.stations, ...extra].slice(0, MAX_STATIONS)
  const freqs = slotFreqs(dial, list.length)
  const stations = list.map((src, i) => {
    const folder = src.folder ?? src.name
    const s = {
      ...src,
      folder,
      pool: src.pool ?? folder,
      emblem: src.emblem ?? `glyph:${src.glyph || [...src.name][0]}:${src.accent}`,
      pattern: src.pattern ?? 'dots',
      glow: src.glow ?? src.accent,
      city: src.city || src.name,
      genre: src.genre || '自选曲目',
      call: src.call || `这里是${src.name}`,
      latin: src.latin || '',
      freq: freqs[i],
      groupNames: def.groups ?? {},
    }
    s.pos = (s.freq - dial.min) / (dial.max - dial.min)
    s.label = (def.dialLabel && s[def.dialLabel]) || s.name // 刻度盘与控制条上的台名
    // 盘面台名的英文可用 labelEn 给短词（如古典四时期），否则退回 dialLabel/nameEn
    s.labelEn = s.labelEn ?? ((def.dialLabel && (s[def.dialLabel + 'En'] ?? s[def.dialLabel])) || s.nameEn || s.name)
    s.songs = (lists.find((l) => l.folder === folder)?.songs ?? []).map((song) => ({ ...song, station: s.id }))
    s.songs.forEach((song) => songIndex.set(song.id, song))
    refreshStationGroups(s)
    return s
  })
  const declared = def.pools ?? []
  const pools = [
    ...declared,
    ...stations.filter((st) => !declared.some((p) => p.id === st.pool)).map((st) => ({ id: st.pool, name: st.name, nameEn: st.nameEn, station: st.id })),
  ]
  const poolMap = Object.fromEntries(pools.map((p) => [p.id, { ...p, walls: [...(files[p.id] ?? [])] }]))
  const stationMap = Object.fromEntries(stations.map((s) => [s.id, s]))
  return {
    ...def,
    poolOrder: pools.map((p) => p.id),
    poolSlots: def.poolSlots ?? [],
    stations,
    stationMap,
    songIndex,
    pools: poolMap,
    photos,
    photoMap: Object.fromEntries(photos.map((p) => [`${p.pool}/${p.id}`, p])),
    hasPhotos: photos.some((e) => e.photo),
    terms: { ...TERMS, ...def.terms },
  }
}

// —— 主题对象的缓存：定义或用户频道没变就复用，变了才重新组装 ——
const cache = new Map()
const full = new WeakMap()
const fullDef = (raw) => {
  if (!raw.custom) return raw
  if (!full.has(raw)) full.set(raw, diyTheme(raw))
  return full.get(raw)
}
// 组装完成后的附加处理（云音乐注入歌曲），由 library.js 登记
let decorate = () => {}
export function onAssemble(fn) {
  decorate = fn
  for (const c of cache.values()) fn(c.built)
}
export const builtThemes = () => [...cache.values()].map((c) => c.built)

const rawOf = (id, s) => BUILTIN.find((t) => t.id === id) ?? s.customThemes?.find((t) => t.id === id)

export function getTheme(id, s) {
  const raw = rawOf(id, s)
  if (!raw) return null
  const extra = (!raw.custom && s.userStations?.[id]) || NONE
  const hit = cache.get(id)
  if (hit && hit.raw === raw && hit.extra === extra) return hit.built
  const built = assemble(fullDef(raw), extra)
  cache.set(id, { raw, extra, built })
  decorate(built)
  return built
}

// 主题页列出的全部主题：内置在前，自建按创建先后
export const listThemes = (s) => [...BUILTIN, ...(s.customThemes ?? [])].map((t) => getTheme(t.id, s))

// —— 当前主题 ——
let active = null
export function activate(s) {
  active = getTheme(s.theme, s) ?? getTheme(BUILTIN[0].id, s)
  return active
}
export const theme = new Proxy({}, {
  get: (_, k) => active?.[k],
  has: (_, k) => !!active && k in active,
})

// 歌曲 id 是否属于任意已组装的主题：歌单跨主题共用，别的主题的歌在这里只是暂不显示，并非缺失
export const knownSong = (id) => builtThemes().some((t) => t.songIndex.has(id))

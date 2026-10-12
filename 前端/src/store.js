// 全局状态：界面与播放的可持久化设置。高频数据（播放进度、频谱）不进这里
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { activate, getTheme, BUILTIN, MAX_STATIONS } from './themes/index.js'

// 在“键 → true”的集合对象里开关一项；关掉时删去该键，免得持久化数据越攒越多
const flip = (obj, key) => {
  const { [key]: on, ...rest } = obj
  return on ? rest : { ...rest, [key]: true }
}

// 歌单：fav 为内置的“珍藏”，其余为自建歌单 { id, name, songs }
export const FAV = 'fav'
export const listSongIds = (s, id) => (id === FAV ? s.favorites : s.playlists.find((p) => p.id === id)?.songs ?? [])
export const listName = (s, id) => (id === FAV ? '珍藏' : s.playlists.find((p) => p.id === id)?.name ?? '')
export const nextListName = (playlists) => `新歌单 ${playlists.length + 1}`
const writeList = (s, id, ids) => (id === FAV
  ? { favorites: ids }
  : { playlists: s.playlists.map((p) => (p.id === id ? { ...p, songs: ids } : p)) })

// 频道是否启用：没有记录的频道（新主题、新添加的频道）默认启用
export const isOn = (s, id) => s.enabled[id] !== false

// 切换主题时随主题一起记住、一起恢复的那部分状态
const MEMO_KEYS = ['station', 'band', 'list', 'wallpaper', 'style', 'clock']
const pickMemo = (s) => Object.fromEntries(MEMO_KEYS.map((k) => [k, s[k]]))

// 首次进入主题时的起手壁纸：在指定台（缺省第一个台）的池里随机挑一张，开场不再总是同一幅
const FIRST_STATION = 'GER' // 新用户开机时默认主题（BUILTIN[0]）停留的频道
const startWall = (t, stationId) => {
  const pool = (t.stationMap[stationId] ?? t.stations[0])?.pool ?? t.poolOrder[0]
  const walls = t.pools[pool]?.walls ?? []
  return { pool, name: walls[Math.floor(Math.random() * walls.length)]?.name ?? '' }
}
function memoFor(t, saved) {
  return {
    station: t.stations[0]?.id ?? null,
    band: 'station',
    wallpaper: startWall(t),
    style: t.style ?? 'modern',
    clock: t.clock ?? 'flat',
    ...saved,
  }
}

export const useRadio = create(
  persist(
    (set, get) => ({
      // —— 开场与主题 ——
      phase: 'off', // off 待机 → boot 开机 → select 主题页 → intro 主题开场 → live
      theme: BUILTIN[0].id,
      themeMemo: {}, // 主题 id → 离开时的频道、波段、歌单、壁纸与换台风格
      customThemes: [], // 自建主题的定义，见 themes/diy
      userStations: {}, // 内置主题 id → 用户追加的频道

      // —— 播放 ——
      station: FIRST_STATION, // 当前调谐的频道（新用户开机停在默认主题的这一台）
      band: 'station', // station 本台 / all 全频段混播 / list 歌单
      list: FAV, // 歌单波段播放的歌单
      order: 'shuffle', // seq 顺序 / shuffle 随机 / one 单曲循环
      enabled: {}, // 频道 id → 是否启用，未记录的视为启用（见 isOn）
      groupsOff: {}, // 关闭的分组，键形如 GER/military
      groupsFolded: {}, // 歌单面板里收起的分组，键同上
      skipped: {}, // 本台与全频段播放时跳过的歌曲 id
      favorites: [],
      playlists: [],
      volume: 0.8,
      muted: false,
      track: null, // 当前歌曲对象
      playing: false,
      tuning: null, // 正在换台时的目标频道，用于界面动画
      offAir: null, // 调到已停用频道时为该频道 id

      // —— 外观 ——
      style: 'vintage', // 播放控件，见 skins.js 的 STYLES
      clock: 'pilot', // 时钟样式，见 skins.js 的 CLOCKS
      reactive: true, // 随乐律动
      disc: true, // 歌名行尾的旋转唱片
      parallax: 1, // 视差强度 0~1.6
      panMode: 'wheel', // 纵向移动画面：wheel 滚轮 / pointer 鼠标指针
      wallFollows: true, // 壁纸随频道联动
      wallRotate: true, // 壁纸自动轮换
      wallRotateSec: 15, // 轮换间隔（秒）
      wallpaper: startWall(getTheme(BUILTIN[0].id, {}), FIRST_STATION),
      uiHidden: false,

      // —— 白噪音 ——
      mixer: {}, // id → 0~1

      // —— 面板 ——
      panel: null, // gallery / mixer / settings / help / netease
      dossier: null, // 打开中的史实档案，键同 WWII.photoMap（池/照片 id），不持久化
      notice: null, // 轻提示 { text, at }
      editing: null, // 正在编辑的主题 id（新建时为 'new'），不持久化
      cloudRev: 0, // 云音乐库修订号，运行时增删歌曲后递增，不持久化
      neteaseVip: false, // 当前云音乐账号是否会员（未登录为否），随会话刷新，不持久化
      skipVipWithoutMember: true, // 无会员权限时轮播自动跳过云音乐会员歌曲

      set: (patch) => set(typeof patch === 'function' ? patch : () => patch),
      toggleFavorite: (id) => get().toggleInList(FAV, id),
      toggleGroup: (key) => set((s) => ({ groupsOff: flip(s.groupsOff, key) })),
      toggleFold: (key) => set((s) => ({ groupsFolded: flip(s.groupsFolded, key) })),
      toggleSkip: (id) => set((s) => ({ skipped: flip(s.skipped, id) })),

      // 歌单编辑。珍藏新歌排在最前，自建歌单新歌排在最后
      setListSongs: (listId, ids) => set((s) => writeList(s, listId, ids)),
      toggleInList: (listId, songId) => set((s) => {
        const ids = listSongIds(s, listId)
        if (ids.includes(songId)) return writeList(s, listId, ids.filter((x) => x !== songId))
        return writeList(s, listId, listId === FAV ? [songId, ...ids] : [...ids, songId])
      }),
      createList: (name, songs = []) => {
        const id = `p${Date.now().toString(36)}`
        set((s) => ({ playlists: [...s.playlists, { id, name, songs }] }))
        return id
      },
      renameList: (id, name) => set((s) => ({ playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)) })),
      deleteList: (id) => set((s) => ({
        playlists: s.playlists.filter((p) => p.id !== id),
        list: s.list === id ? FAV : s.list,
      })),

      // —— 主题 ——
      // 换到另一个主题：记下当前主题的现场，恢复目标主题上次的现场（首次进入用主题的默认值）
      switchTheme: (id) => set((s) => {
        const t = getTheme(id, s)
        if (!t || id === s.theme) return {}
        const themeMemo = { ...s.themeMemo, [s.theme]: pickMemo(s) }
        const memo = memoFor(t, themeMemo[id])
        if (!t.stationMap[memo.station]) memo.station = t.stations[0]?.id ?? null
        return { theme: id, themeMemo, ...memo, track: null, playing: false, tuning: null, offAir: null }
      }),
      // 保存自建主题（新建或修改）
      saveCustomTheme: (def) => set((s) => ({
        customThemes: s.customThemes.some((t) => t.id === def.id)
          ? s.customThemes.map((t) => (t.id === def.id ? def : t))
          : [...s.customThemes, def],
      })),
      deleteCustomTheme: (id) => set((s) => {
        const { [id]: _, ...themeMemo } = s.themeMemo
        return {
          customThemes: s.customThemes.filter((t) => t.id !== id),
          themeMemo,
          ...(s.theme === id ? { theme: BUILTIN[0].id, ...memoFor(getTheme(BUILTIN[0].id, s), s.themeMemo[BUILTIN[0].id]), track: null, playing: false } : {}),
        }
      }),
      // 内置主题的用户频道：整表替换，超出上限的部分丢弃
      setUserStations: (themeId, list) => set((s) => {
        const base = BUILTIN.find((t) => t.id === themeId)?.stations.length ?? 0
        return { userStations: { ...s.userStations, [themeId]: list.slice(0, MAX_STATIONS - base) } }
      }),

      setMixer: (id, v) => set((s) => ({ mixer: { ...s.mixer, [id]: v } })),
      togglePanel: (p) => set((s) => ({ panel: s.panel === p ? null : p })),
    }),
    {
      name: 'private-radio',
      version: 5,
      partialize: (s) => ({
        theme: s.theme, themeMemo: s.themeMemo, customThemes: s.customThemes, userStations: s.userStations, station: s.station, band: s.band, list: s.list, order: s.order, enabled: s.enabled,
        groupsOff: s.groupsOff, groupsFolded: s.groupsFolded, skipped: s.skipped, favorites: s.favorites, playlists: s.playlists,
        volume: s.volume, muted: s.muted, style: s.style, clock: s.clock, reactive: s.reactive, disc: s.disc,
        parallax: s.parallax, panMode: s.panMode, wallFollows: s.wallFollows, wallRotate: s.wallRotate,
        wallRotateSec: s.wallRotateSec, wallpaper: s.wallpaper, mixer: s.mixer,
        skipVipWithoutMember: s.skipVipWithoutMember,
      }),
      migrate: (saved, from) => {
        // v2：壁纸随频道联动改为默认开启，旧存的关闭值一并翻新
        if (from < 2) saved.wallFollows = true
        // v3：歌单改为一国一目录，旧歌曲 id 换成新路径；德国军乐台并入德国台的 military 分组；
        // “珍藏”波段扩展为“歌单”波段
        if (from < 3) {
          const rename = (id) => id.replace(/^WWII (radio|military) songs (\w+)\//, (_, group, code) => `${code}/${group}/`)
          saved.favorites = (saved.favorites ?? []).map(rename)
          if (saved.enabled) {
            if (saved.enabled.GERM === false) saved.groupsOff = { 'GER/military': true }
            delete saved.enabled.GERM
          }
          if (saved.station === 'GERM') saved.station = 'GER'
          if (saved.band === 'fav') saved.band = 'list'
        }
        // v5：烈焰升腾与古典回音有了各自的播放控件，旧存的风格让位给新的默认值；时钟也随主题记住
        if (from < 5) {
          const builtin = (id) => BUILTIN.find((t) => t.id === id)
          for (const id of ['tfr', 'classical']) if (saved.themeMemo?.[id]) delete saved.themeMemo[id].style
          if (saved.theme === 'tfr' || saved.theme === 'classical') saved.style = builtin(saved.theme).style
          saved.clock = builtin(saved.theme)?.clock ?? 'flat'
        }
        return saved
      },
    },
  ),
)

export const getRadio = useRadio.getState

// 当前主题跟随状态：主题、自建主题定义或用户频道一变，立即重新指向（必要时重新组装）
activate(getRadio())
useRadio.subscribe((s, prev) => {
  if (s.theme !== prev.theme || s.customThemes !== prev.customThemes || s.userStations !== prev.userStations) activate(s)
})

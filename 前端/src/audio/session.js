// 标签页标题与系统媒体控制（键盘媒体键、系统音量浮层上的曲目信息）
import { useRadio } from '../store.js'
import { radio } from './radio.js'
import { theme, genreOf } from '../themes/index.js'
import { t, loc } from '../i18n/index.js'

function titleFor(s) {
  const BASE = t('沉浸式电台')
  if (s.phase !== 'live') return BASE
  if (s.offAir) return t('停播 · {name}', { name: loc(theme.stationMap[s.offAir], 'name') ?? '' }) + ' — ' + BASE
  if (!s.track) return BASE
  const tr = s.track
  const zh = tr.titleZh && tr.titleZh !== tr.title ? `（${tr.titleZh}）` : ''
  const artist = tr.artist || tr.artistZh
  return `${s.playing ? '♪ ' : '❙❙ '}${tr.title}${zh}${artist ? ' — ' + artist : ''}`
}

export function startSession() {
  const ms = navigator.mediaSession
  if (ms) {
    ms.setActionHandler('play', () => radio.toggle())
    ms.setActionHandler('pause', () => radio.toggle())
    ms.setActionHandler('nexttrack', () => radio.next())
    ms.setActionHandler('previoustrack', () => radio.prev())
  }
  let lastTrack = null
  return useRadio.subscribe((s) => {
    document.title = titleFor(s)
    if (!ms) return
    ms.playbackState = s.playing ? 'playing' : 'paused'
    if (s.track && s.track !== lastTrack) {
      lastTrack = s.track
      const st = theme.stationMap[s.track.station]
      const pool = theme.pools[s.wallpaper.pool]
      const wall = pool?.walls.find((w) => w.name === s.wallpaper.name) ?? pool?.walls[0]
      ms.metadata = new MediaMetadata({
        title: s.track.title,
        artist: s.track.artist || s.track.artistZh || t('佚名'),
        album: [loc(st, 'name'), genreOf(st, s.track)].filter(Boolean).join(' · '),
        artwork: wall?.thumb ? [{ src: wall.thumb, sizes: '480x270', type: 'image/jpeg' }] : [],
      })
    }
  })
}

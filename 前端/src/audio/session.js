// 标签页标题与系统媒体控制（键盘媒体键、系统音量浮层上的曲目信息）
import { useRadio } from '../store.js'
import { radio } from './radio.js'
import { theme, genreOf } from '../themes/index.js'

const BASE = '沉浸式电台'

function titleFor(s) {
  if (s.phase !== 'live') return BASE
  if (s.offAir) return `停播 · ${theme.stationMap[s.offAir]?.name ?? ''} — ${BASE}`
  if (!s.track) return BASE
  const t = s.track
  const zh = t.titleZh && t.titleZh !== t.title ? `（${t.titleZh}）` : ''
  const artist = t.artist || t.artistZh
  return `${s.playing ? '♪ ' : '❙❙ '}${t.title}${zh}${artist ? ' — ' + artist : ''}`
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
        artist: s.track.artist || s.track.artistZh || '佚名',
        album: [st?.name, genreOf(st, s.track)].filter(Boolean).join(' · '),
        artwork: wall?.thumb ? [{ src: wall.thumb, sizes: '480x270', type: 'image/jpeg' }] : [],
      })
    }
  })
}

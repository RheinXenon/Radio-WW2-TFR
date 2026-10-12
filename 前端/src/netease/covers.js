// 歌曲封面：云音乐歌按 nid 拉专辑封面，内存与 localStorage 双层缓存；
// 本地歌没有封面，直接给 null（界面落回台版唱片）。拉取失败的 nid 只在本次
// 会话里记住空结果，不写盘，下次启动还有机会重试
import { get } from './api.js'

const KEY = 'radio.covers'
const SIZE = '?param=224y224' // 网易云图片 CDN 的缩图参数，盘面最大 104px 的两倍有余

let mem = {}
try {
  const saved = JSON.parse(localStorage.getItem(KEY))
  if (saved && typeof saved === 'object') mem = saved
} catch { /* 存储不可用时只用内存缓存 */ }

const inflight = new Map()

const fit = (url) => (url.includes('?') ? url : url + SIZE)

export async function songCover(song) {
  if (!song?.cloud || !song?.nid) return null
  if (song.cover) return fit(song.cover) // 库里随歌曲存下的封面，不必再查
  const hit = mem[song.nid]
  if (hit !== undefined) return hit
  if (!inflight.has(song.nid)) {
    inflight.set(song.nid, (async () => {
      let url = null
      try { url = (await get(`/song?id=${song.nid}`)).cover || null } catch { /* 接口异常时界面用台版盘 */ }
      if (url) {
        mem[song.nid] = url = fit(url)
        try { localStorage.setItem(KEY, JSON.stringify(mem)) } catch {}
      } else mem[song.nid] = null
      inflight.delete(song.nid)
      return url
    })())
  }
  return inflight.get(song.nid)
}

// 封面地址失效（加载 404 等）时弃掉缓存，好让下一首歌之后重试或回退台版盘
export function forgetCover(song) {
  if (!song?.nid) return
  delete mem[song.nid]
  try { localStorage.setItem(KEY, JSON.stringify(mem)) } catch {}
}

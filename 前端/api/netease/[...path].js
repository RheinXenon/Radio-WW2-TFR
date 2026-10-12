// 线上云音乐代理（Vercel serverless 函数）：与本地 dev 中间件共用 netease-core.js
//  - 登录态（cookie）由浏览器保管，经 X-Netease-Cookie 头带回，函数完全无状态
//  - 不注册 /library 路由：线上云音乐库存在使用者浏览器里，前端探测到 404 即切换本地库模式
import {
  qrCreate, qrCheck, accountInfo, myPlaylists, playlistMeta, albumMeta, songDetails,
  searchSongs, songLyric, pipeStream, cachedSongUrl, djProgram, djRadioPrograms,
} from '../../plugins/netease-core.js'

// 流式转发一个 Range 分片通常几秒完成，放宽到 60s 以防慢客户端
export const maxDuration = 60

const json = (res, code, data) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

// 播放取流来自 <audio> 元素，带不了 X-Netease-Cookie 头，登录态从标准 cookie 的镜像解析
// （镜像由前端 api.js 写入，值经 encodeURIComponent，见 src/netease/api.js）
const streamCookie = (req) => {
  const header = req.headers['x-netease-cookie']
  if (header) return header
  const m = /(?:^|;\s*)radio\.netease\.cookie=([^;]*)/.exec(req.headers.cookie ?? '')
  return m ? decodeURIComponent(m[1]) : undefined
}

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://localhost')
    // 重写进入时 Vercel 传入原始路径 /netease/...，直连时是 /api/netease/...，两种前缀都剥
    const pathname = u.pathname.replace(/^\/(api\/)?netease/, '') || '/'
  const qs = u.searchParams
  const cookie = req.headers['x-netease-cookie']
  try {
    if (pathname === '/session' && req.method === 'GET') return json(res, 200, await accountInfo(cookie) ?? { nickname: null })
    if (pathname === '/qr' && req.method === 'POST') return json(res, 200, await qrCreate())
    if (pathname === '/qr' && req.method === 'GET') return json(res, 200, await qrCheck(qs.get('key')))
    if (pathname === '/logout' && req.method === 'POST') return json(res, 200, { ok: true })
    if (pathname === '/my' && req.method === 'GET') return json(res, 200, { playlists: await myPlaylists(cookie) })
    if (pathname === '/playlist' && req.method === 'GET') {
      const meta = await playlistMeta(qs.get('id'))
      return json(res, 200, { id: meta.id, name: meta.name, count: meta.trackIds.length, trackIds: meta.trackIds })
    }
    if (pathname === '/album' && req.method === 'GET') {
      const meta = await albumMeta(qs.get('id'))
      return json(res, 200, { id: meta.id, name: meta.name, artist: meta.artist, count: meta.trackIds.length, trackIds: meta.trackIds })
    }
    if (pathname === '/search' && req.method === 'GET') return json(res, 200, { songs: await searchSongs(qs.get('kw')) })
    if (pathname === '/dj' && req.method === 'GET') return json(res, 200, await djProgram(qs.get('id')))
    if (pathname === '/djradio' && req.method === 'GET') return json(res, 200, await djRadioPrograms(qs.get('id')))
    if (pathname === '/song' && req.method === 'GET') {
      const [song] = await songDetails([Number(qs.get('id'))])
      if (!song) return json(res, 404, { error: '歌曲不存在' })
      return json(res, 200, song)
    }
    if (pathname === '/lyric' && req.method === 'GET') return json(res, 200, await songLyric(qs.get('id')))
    if (pathname === '/details' && req.method === 'GET') {
      const ids = (qs.get('ids') ?? '').split(',').map(Number).filter(Boolean)
      if (!ids.length) return json(res, 400, { error: '缺少 ids' })
      return json(res, 200, { songs: await songDetails(ids) })
    }
    if (pathname === '/stream' && req.method === 'GET') {
      const id = Number(qs.get('id'))
      if (!id) return json(res, 400, { error: '缺少 id' })
      return pipeStream(req, res, id, qs.get('level') ?? 'exhigh', streamCookie(req))
    }
    // 直链解析：前端拿直链直连 CDN（响应带 CORS 头），音频字节不经服务端中转
    if (pathname === '/url' && req.method === 'GET') {
      const id = Number(qs.get('id'))
      if (!id) return json(res, 400, { error: '缺少 id' })
      const url = await cachedSongUrl(id, qs.get('level') ?? 'exhigh', cookie)
      if (!url) return json(res, 404, { error: '无版权或暂不可用' })
      return json(res, 200, { url })
    }
    return json(res, 404, { error: 'not found' })
  } catch (e) {
    return json(res, 500, { error: e.message })
  }
}

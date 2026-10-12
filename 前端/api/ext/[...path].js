// 线上外链音频代理(Vercel serverless 函数):与本地 dev 中间件共用 ext-core.js
// 仅一条流转发路由;分片通常几秒完成,放宽到 60s 以防慢客户端
import { pipeExt } from '../../plugins/ext-core.js'

export const maxDuration = 60

export default async function handler(req, res) {
  const u = new URL(req.url, 'http://localhost')
  // 同 netease：重写进入时传原始路径 /ext/...，直连时是 /api/ext/...，两种前缀都剥
  const pathname = u.pathname.replace(/^\/(api\/)?ext/, '') || '/'
  if (pathname === '/stream' && req.method === 'GET') {
    const url = u.searchParams.get('url')
    if (!url) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      return res.end(JSON.stringify({ error: '缺少 url' }))
    }
    return pipeExt(req, res, url)
  }
  res.statusCode = 404
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error: 'not found' }))
}

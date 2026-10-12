// 通用外链音频代理核心：转发 Range 与常见响应头，不含任何路由与状态
//  - 本地 dev/preview 由 plugins/ext.js 中间件使用，线上由 api/ext/[...path].js 函数使用
//  - 只允许 http/https 直链；跨域媒体必须经此同源转发，否则 Web Audio 静音
import { Readable } from 'node:stream'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const json = (res, code, error) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error }))
}

async function pipeExt(req, res, rawUrl) {
  let target
  try { target = new URL(rawUrl) } catch { return json(res, 400, '链接格式不对') }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return json(res, 400, '只支持 http/https 链接')
  const headers = { 'User-Agent': UA, Referer: `${target.protocol}//${target.host}` }
  if (req.headers.range) headers.Range = req.headers.range
  let up
  try { up = await fetch(target, { headers, redirect: 'follow' }) }
  catch { return json(res, 502, '外链不可达') }
  if (!up.ok && up.status !== 206) return json(res, 502, `外链 ${up.status}`)
  res.statusCode = up.status
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(h)
    if (v) res.setHeader(h, v)
  }
  res.on('close', () => up.body.cancel().catch(() => {}))
  Readable.fromWeb(up.body).pipe(res)
}

export { pipeExt }

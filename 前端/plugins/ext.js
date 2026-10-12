// 外链音频接入(dev/preview 中间件):/ext/* 一条流代理路由,接口逻辑在 ext-core.js
import { pipeExt } from './ext-core.js'

const json = (res, code, error) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ error }))
}

function route(req, res) {
  const [pathname, query] = (req.url || '').split('?')
  if (pathname === '/stream' && req.method === 'GET') {
    const url = new URLSearchParams(query ?? '').get('url')
    if (!url) return json(res, 400, '缺少 url')
    return pipeExt(req, res, url)
  }
  return json(res, 404, 'not found')
}

export default function extImport() {
  const mw = (req, res, next) => {
    if (!req.url.startsWith('/')) return next()
    route(req, res)
  }
  return {
    name: 'ext-import',
    configureServer(s) { s.middlewares.use('/ext', mw) },
    configurePreviewServer(s) { s.middlewares.use('/ext', mw) },
  }
}

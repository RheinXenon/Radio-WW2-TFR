// 浏览器侧云音乐请求：登录态 cookie 存 localStorage，每次请求经 X-Netease-Cookie 头带回
// 服务端（dev 中间件与线上函数）都无登录态，浏览器是唯一保管处
//
// 播放取流走 <audio> 元素，媒体请求带不了自定义头，所以登录态同时镜像一份到
// 标准 http cookie（仅 /netease 路径），流代理从那里解析；localStorage 仍是
// 唯一事实来源，页面每次加载回放镜像，http cookie 过期或丢失都不影响
const KEY = 'radio.netease.cookie'

// 镜像值编码后写入（网易云 cookie 串自带分号，不能裸放进单个 cookie 值）；
// max-age 取一年，反正每次加载都会按 localStorage 回放覆盖
const mirrorCookie = (c) => {
  const line = c
    ? `radio.netease.cookie=${encodeURIComponent(c)}; path=/netease; max-age=31536000; samesite=strict`
    : 'radio.netease.cookie=; path=/netease; max-age=0'
  try { document.cookie = line } catch { /* 极端隐私模式下播放退回匿名 */ }
}

try { mirrorCookie(localStorage.getItem(KEY)) } catch { /* 无法读 localStorage 时跳过 */ }

export const sessionCookie = {
  get: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: (c) => { try { localStorage.setItem(KEY, c) } catch {} ; mirrorCookie(c) },
  clear: () => { try { localStorage.removeItem(KEY) } catch {} ; mirrorCookie(null) },
}

const authHeaders = () => {
  const c = sessionCookie.get()
  return c ? { 'X-Netease-Cookie': c } : {}
}

async function request(path, options = {}) {
  const r = await fetch('/netease' + path, {
    ...options,
    headers: { ...(options.headers ?? {}), ...authHeaders() },
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.error ?? `HTTP ${r.status}`), { status: r.status })
  return j
}

export const get = (path) => request(path)
export const post = (path, body = {}) => request(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

// 直链解析：直链约二十分钟时效，结果缓存十分钟；CDN 响应带 CORS 头，
// 浏览器可带 crossorigin 直连播放并保留完整 Web Audio 链，字节不经服务端中转；
// http 直链统一改写为 https（https 站点里 http 媒体会被浏览器拦或升级）
const urlCache = new Map()
export async function directUrl(nid, level, refresh = false) {
  const key = `${nid}@${level}`
  const hit = urlCache.get(key)
  if (!refresh && hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.url
  try {
    const { url } = await get(`/url?id=${nid}&level=${encodeURIComponent(level)}`)
    if (url) {
      const fixed = url.replace(/^http:/, 'https:')
      urlCache.set(key, { url: fixed, at: Date.now() })
      return fixed
    }
  } catch { /* 解析失败时退回可能仍在时效内的旧直链 */ }
  return hit?.url ?? null
}

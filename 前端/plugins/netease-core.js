// 网易云音乐核心客户端：weapi 加密与全部接口封装，不含任何路由与磁盘状态
//  - 本地 dev/preview 由 plugins/netease.js 中间件使用，线上由 api/netease/[...path].js 函数使用
//  - 登录态（cookie 字符串）由调用方按请求传入；直链缓存在内存，冷启动丢失仅多一次请求
import crypto from 'node:crypto'
import { Readable } from 'node:stream'

// ———————————————————— weapi 加密 ————————————————————

const PRESET_KEY = Buffer.from('0CoJUm6Qyw8W8jud')
const IV = Buffer.from('0102030405060708')
const RSA_E = 65537n
const RSA_N = BigInt('0x00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7')

function modPow(b, e, n) {
  let r = 1n
  b %= n
  while (e > 0n) {
    if (e & 1n) r = r * b % n
    b = b * b % n
    e >>= 1n
  }
  return r
}

function aesCBC(text, key) {
  const c = crypto.createCipheriv('aes-128-cbc', key, IV)
  return Buffer.concat([c.update(text), c.final()])
}

// 网页端 weapi：两次 AES-CBC + 一次 RSA，encSecKey 加密的是反转后的随机密钥
function weapiBody(payload) {
  const text = JSON.stringify(payload)
  const secretKey = crypto.randomBytes(16).map((b) => (b & 0x3f) + 0x20)
  const params = aesCBC(aesCBC(text, PRESET_KEY).toString('base64'), secretKey).toString('base64')
  const encSecKey = modPow(BigInt('0x' + Buffer.from(secretKey).reverse().toString('hex')), RSA_E, RSA_N)
    .toString(16).padStart(256, '0')
  return new URLSearchParams({ params, encSecKey }).toString()
}

// ———————————————————— 会话与请求 ————————————————————

const baseCookie = () => 'osver=Microsoft-Windows-10-15063; os=pc; channel=100071; appver=8.10.05'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const BASE = 'https://music.163.com'

async function weapi(apiPath, payload, cookie) {
  const res = await fetch(BASE + apiPath, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: BASE,
      'User-Agent': UA,
      Cookie: [baseCookie(), cookie].filter(Boolean).join('; '),
    },
    body: weapiBody(payload),
  })
  return res.json()
}

async function plainGet(apiPath) {
  const res = await fetch(BASE + apiPath, {
    headers: { Referer: BASE, 'User-Agent': UA, Cookie: baseCookie() },
  })
  return res.json()
}

// ———————————————————— 登录与账号 ————————————————————

// 二维码 key；二维码内容为 codekey 链接，由网易云 App 扫描
async function qrCreate() {
  const data = await fetch(BASE + '/api/login/qrcode/unikey?type=1', {
    method: 'POST',
    headers: { Referer: BASE, 'User-Agent': UA, Cookie: baseCookie() },
  }).then((r) => r.json())
  if (!data.unikey) throw new Error('获取二维码失败')
  return { key: data.unikey, url: `https://music.163.com/login?codekey=${data.unikey}` }
}

// 轮询：801 待扫码 / 802 已扫码待确认 / 803 成功
// 登录态不落服务端：803 时把 cookie 原样交还调用方，由前端存进浏览器
async function qrCheck(key) {
  const res = await fetch(`${BASE}/api/login/qrcode/client/login?key=${encodeURIComponent(key)}&type=1`, {
    headers: { Referer: BASE, 'User-Agent': UA, Cookie: baseCookie() },
  })
  const body = await res.json()
  if (body.code === 803) {
    const pairs = (res.headers.getSetCookie?.() ?? []).map((l) => l.split(';')[0])
    const wanted = pairs.filter((p) => /^(MUSIC_U|__csrf|NMTID|__remember_me)=/.test(p)).join('; ')
    return wanted.includes('MUSIC_U=')
      ? { code: 803, message: '登录成功', cookie: wanted }
      : { code: 803, message: '登录态获取失败，请重试' }
  }
  return { code: body.code, message: body.message }
}

// 登录信息：未登录返回 null；vipType 非零为会员档(字段在 profile 上)
async function accountInfo(cookie) {
  if (!cookie) return null
  const data = await weapi('/weapi/w/nuser/account/get', {}, cookie)
  const p = data?.profile
  if (!p || data.account?.status === -10) return null
  return {
    nickname: p.nickname,
    avatarUrl: p.avatarUrl,
    vipType: p.vipType ?? data.vipType ?? 0,
    uid: p.userId,
  }
}

// ———————————————————— 内容查询 ————————————————————

async function myPlaylists(cookie) {
  const uid = (await accountInfo(cookie))?.uid
  if (!uid) throw new Error('未登录')
  const data = await weapi('/weapi/user/playlist', { uid, limit: 100, offset: 0, includeVideo: true }, cookie)
  return (data.playlist ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    count: p.trackCount,
    cover: p.coverImgUrl,
  }))
}

// 歌单元数据（只要名字与曲目 id 列表，n=0 不带歌曲详情，响应更小）
async function playlistMeta(id) {
  const data = await weapi('/weapi/v6/playlist/detail', { id: Number(id), n: 0, s: 0 })
  if (data.code !== 200 || !data.playlist) throw new Error('歌单不存在或不可见')
  return { id: data.playlist.id, name: data.playlist.name, trackIds: data.playlist.trackIds.map((t) => t.id) }
}

// 专辑元数据：weapi v1 一次带回全部曲目，映射成与歌单同构的形状；
// 专辑歌是普通歌曲，元数据可走常规 song/details 通道，artist 供结果条目展示
async function albumMeta(id) {
  const data = await weapi(`/weapi/v1/album/${Number(id)}`, {})
  if (data.code !== 200 || !data.album) throw new Error('专辑不存在或不可见')
  return {
    id: data.album.id,
    name: data.album.name,
    artist: data.album.artist?.name ?? '',
    trackIds: (data.songs ?? []).map((s) => s.id),
  }
}

// 歌曲详情，一次最多 1000；返回精简条目（vip 即 fee 非零，需要会员；tns[0] 为官方中文译名）
async function songDetails(ids) {
  const out = []
  for (let i = 0; i < ids.length; i += 1000) {
    const data = await weapi('/weapi/v3/song/detail', {
      c: `[${ids.slice(i, i + 1000).map((id) => `{"id":${id}}`).join(',')}]`,
    })
    for (const s of data.songs ?? []) {
      out.push({
        nid: s.id,
        title: s.name ?? '',
        titleZh: s.tns?.[0] ?? '',
        artist: (s.ar ?? []).map((a) => a.name).filter(Boolean).join('/'),
        album: s.al?.name ?? '',
        cover: s.al?.picUrl ?? '',
        vip: !!s.fee,
      })
    }
  }
  return out
}

// 播客节目 → 库条目：nid 用 mainSong.id（取流走常规歌曲接口），标题用节目名，
// 艺人取节目内嵌歌手（通常即主播），专辑放电台名；fee 恒 0，无需会员完整播放
function djEntry(p) {
  const ms = p.mainSong
  if (!ms?.id) return null
  return {
    nid: ms.id,
    title: p.name || ms.name || '',
    titleZh: '',
    artist: (ms.artists ?? []).map((a) => a?.name).filter(Boolean).join('/') || p.dj?.nickname || '',
    album: p.radio?.name ?? '',
    cover: p.coverUrl ?? '',
    vip: !!ms.fee,
  }
}

// 播客单期详情（dj 链接）；元数据只能由这里出，v3/song/detail 对播客 id 返回空名
async function djProgram(id) {
  const data = await weapi('/weapi/dj/program/detail', { id: Number(id) })
  const p = data?.program
  if (!p) throw new Error('节目不存在')
  const song = djEntry(p)
  if (!song) throw new Error('节目没有可播放的音频')
  return { radioName: p.radio?.name ?? '', serial: p.serialNum ?? 0, song }
}

// 播客电台全部节目，按期号正序整拉；djradio/detail 已下线，电台名取自节目内嵌的 radio 字段
async function djRadioPrograms(id) {
  const songs = []
  let name = ''
  for (let offset = 0; ; offset += 100) {
    const data = await weapi('/weapi/dj/program/byradio', { radioId: Number(id), limit: 100, offset, asc: true })
    const list = data.programs ?? []
    if (!list.length) break
    name ||= list.find((p) => p.radio?.name)?.radio.name
    for (const p of list) { const e = djEntry(p); if (e) songs.push(e) }
    if (list.length < 100) break
  }
  if (!songs.length) throw new Error('电台不存在或暂无节目')
  return { id: Number(id), name, count: songs.length, songs }
}

// 搜索走明文老接口（cloudsearch 的 weapi 通道已异常）；fee 非零即需要会员
async function searchSongs(keywords) {
  const data = await plainGet(`/api/search/get?s=${encodeURIComponent(keywords)}&type=1&limit=30&offset=0`)
  return (data.result?.songs ?? []).map((s) => ({
    nid: s.id,
    title: s.name,
    artist: (s.artists ?? []).map((a) => a.name).join('/'),
    album: s.album?.name ?? '',
    vip: !!s.fee,
  }))
}

// 播放链接；level: standard / exhigh / lossless，网易云按账号权限自动降级；
// 带 cookie 取流才有会员曲的完整链接，匿名只有试听片段
async function songUrls(ids, level, cookie) {
  const data = await weapi('/weapi/song/enhance/player/url/v1', {
    ids: `[${ids.join(',')}]`, level, encodeType: 'flac',
  }, cookie)
  return data.data ?? []
}

// 直链有约 20 分钟时效，缓存十分钟：<id> → { url, at }；匿名与登录态分开缓存，避免互相顶掉
const urlCache = new Map()
async function cachedSongUrl(id, level, cookie) {
  const key = `${id}@${level}@${cookie ? 'c' : 'a'}`
  const hit = urlCache.get(key)
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.url
  const [u] = await songUrls([id], level, cookie)
  if (u?.url) urlCache.set(key, { url: u.url, at: Date.now() })
  else urlCache.delete(key)
  return u?.url ?? null
}

// 歌词：lrc 原文，tlrc 官方中文翻译（时间轴与原文对齐）
async function songLyric(id) {
  const data = await weapi('/weapi/song/lyric', { id: Number(id), lv: 1, kv: 1, tv: 1 })
  return { lrc: data?.lrc?.lyric ?? '', tlrc: data?.tlyric?.lyric ?? '' }
}

// ———————————————————— 在线取流 ————————————————————

// 流式转发网易云 CDN 给 res（同源，避免 Web Audio 对跨域媒体静音）。
// audio 的 Range 请求（拖动进度）原样转发；req/res 为 Node http 风格，dev 中间件与
// serverless 函数里形态一致，两端共用；cookie 由调用方传入，登录态下会员曲才有完整链接
async function pipeStream(req, res, id, level, cookie) {
  const json = (code, error) => {
    res.statusCode = code
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error }))
  }
  const url = await cachedSongUrl(id, level, cookie)
  if (!url) return json(404, '无版权或暂不可用')
  const headers = { 'User-Agent': UA }
  if (req.headers.range) headers.Range = req.headers.range
  const cdn = await fetch(url, { headers })
  if (!cdn.ok && cdn.status !== 206) return json(502, `CDN ${cdn.status}`)
  res.statusCode = cdn.status
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = cdn.headers.get(h)
    if (v) res.setHeader(h, v)
  }
  res.on('close', () => cdn.body.cancel().catch(() => {}))
  Readable.fromWeb(cdn.body).pipe(res)
}

export {
  qrCreate, qrCheck, accountInfo, myPlaylists, playlistMeta, albumMeta, songDetails,
  searchSongs, songLyric, pipeStream, cachedSongUrl, djProgram, djRadioPrograms,
}

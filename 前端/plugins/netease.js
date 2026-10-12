// 网易云音乐接入（dev/preview 中间件）：路由薄层，接口逻辑全部在 netease-core.js
//  - /netease/* 给前端提供 JSON 接口；登录态（cookie）由浏览器保管，经 X-Netease-Cookie 头带回
//  - 云音乐库按主题存放在 Resources/Netease Cloud/<主题 id>.json，由本地文件读写
//    （dev 专属；线上无盘，库存浏览器里）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  qrCreate, qrCheck, accountInfo, myPlaylists, playlistMeta, albumMeta, songDetails,
  searchSongs, songLyric, pipeStream, cachedSongUrl, djProgram, djRadioPrograms,
} from './netease-core.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const RES = path.resolve(HERE, '../../Resources')
const LIB_DIR = path.join(RES, 'Netease Cloud') // 每主题一个文件：wwii.json → { level, stations: { GER: { radio: [歌曲…] } } }

// ———————————————————— 云音乐库 ————————————————————

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  const tmp = p + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, p)
}

// 主题 id 只认字母数字下划线连字符，防止路径越界
const THEME_OK = (t) => /^[\w-]{1,64}$/.test(t ?? '')
const libraryFile = (theme) => path.join(LIB_DIR, `${theme}.json`)

function readLibrary(theme) {
  return readJson(libraryFile(theme)) ?? { level: 'exhigh', stations: {} }
}

const writeLibrary = (theme, data) => writeJson(libraryFile(theme), data)

// 加入：同组内按 nid(外链条目按 url)去重，重复添加时覆盖元数据（让 VIP 标记保持准确）；
// 组名（子歌单名）作为文件夹式的 key 直接使用；歌曲元数据由前端随请求带来
function libraryAdd(theme, { station, group, songs }) {
  const lib = readLibrary(theme)
  const groups = lib.stations[station] ?? {}
  const list = groups[group] ?? []
  for (const s of songs) {
    const i = list.findIndex((x) => (x.nid ?? x.url) === (s.nid ?? s.url))
    if (i >= 0) list[i] = s
    else list.push(s)
  }
  groups[group] = list
  lib.stations[station] = groups
  writeLibrary(theme, lib)
  return lib
}

// 移除：给 nid（网易云 id 或外链 url）移除单曲，不给则整组删除；组空了顺手清掉
function libraryRemove(theme, { station, group, nid }) {
  const lib = readLibrary(theme)
  const groups = lib.stations[station]
  if (!groups || !(group in groups)) return lib
  if (nid == null) delete groups[group]
  else {
    groups[group] = groups[group].filter((s) => (s.nid ?? s.url) !== nid)
    if (!groups[group].length) delete groups[group]
  }
  if (!Object.keys(groups).length) delete lib.stations[station]
  writeLibrary(theme, lib)
  return lib
}

// 改组名：目标名已存在时两组合并（本组接在目标组后面并按 nid 去重），
// 纯改名则保持组在频道里的位置（组的显示顺序跟随库对象键序）
function libraryRename(theme, { station, group, name }) {
  const lib = readLibrary(theme)
  const groups = lib.stations[station]
  if (!groups || !(group in groups) || !name || name === group) return lib
  const list = groups[group]
  const out = {}
  for (const [k, v] of Object.entries(groups)) {
    if (k === group) continue
    if (k === name) {
      const seen = new Set()
      out[k] = [...v, ...list].filter((s) => {
        const key = s.nid ?? s.url
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    } else out[k] = v
  }
  if (!(name in out)) for (const [k, v] of Object.entries(groups)) out[k === group ? name : k] = v
  lib.stations[station] = out
  writeLibrary(theme, lib)
  return lib
}

// 按给定的 nid 顺序重排组内歌曲；没提到的留在库里不显示（由前端传全量）
function libraryReorder(theme, { station, group, nids }) {
  const lib = readLibrary(theme)
  const list = lib.stations[station]?.[group]
  if (!list) return lib
  const by = new Map(list.map((s) => [s.nid ?? s.url, s]))
  lib.stations[station][group] = nids.map((n) => by.get(n)).filter(Boolean)
  writeLibrary(theme, lib)
  return lib
}

// ———————————————————— 中间件 ————————————————————

const json = (res, code, data) => {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

const readBody = (req) => new Promise((resolve) => {
  let raw = ''
  req.on('data', (c) => { raw += c })
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')) } catch { resolve({}) } })
})

// 播放取流来自 <audio> 元素，带不了 X-Netease-Cookie 头，登录态从标准 cookie 的镜像解析
// （镜像由前端 api.js 写入，值经 encodeURIComponent，见 src/netease/api.js）
const streamCookie = (req) => {
  const header = req.headers['x-netease-cookie']
  if (header) return header
  const m = /(?:^|;\s*)radio\.netease\.cookie=([^;]*)/.exec(req.headers.cookie ?? '')
  return m ? decodeURIComponent(m[1]) : undefined
}

async function route(req, res) {
  const [pathname, query] = req.url.split('?')
  const qs = new URLSearchParams(query ?? '')
  const cookie = req.headers['x-netease-cookie']
  try {
    if (pathname === '/session' && req.method === 'GET') return json(res, 200, await accountInfo(cookie) ?? { nickname: null })
    if (pathname === '/qr' && req.method === 'POST') return json(res, 200, await qrCreate())
    if (pathname === '/qr' && req.method === 'GET') return json(res, 200, await qrCheck(qs.get('key')))
    if (pathname === '/logout' && req.method === 'POST') {
      // 服务端无登录态可清，退出只是告知；浏览器侧的 cookie 由前端自己清
      return json(res, 200, { ok: true })
    }
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

    // 在线播放：音质由前端取流时随 URL 带来，缺省回落到极高
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

    // 以下库路由都带 theme（GET 查询参数 / POST 正文），指定读写哪个主题的库文件
    if (pathname === '/library' && req.method === 'GET') {
      const theme = qs.get('theme')
      if (!THEME_OK(theme)) return json(res, 400, { error: '缺少主题' })
      return json(res, 200, readLibrary(theme))
    }
    if (pathname === '/library/add' && req.method === 'POST') {
      const body = await readBody(req)
      if (!THEME_OK(body.theme)) return json(res, 400, { error: '缺少主题' })
      if (!body.station || !body.group || !Array.isArray(body.songs) || !body.songs.length) return json(res, 400, { error: '参数不完整' })
      return json(res, 200, libraryAdd(body.theme, body))
    }
    if (pathname === '/library/remove' && req.method === 'POST') {
      const body = await readBody(req)
      if (!THEME_OK(body.theme)) return json(res, 400, { error: '缺少主题' })
      if (!body.station || !body.group) return json(res, 400, { error: '参数不完整' })
      return json(res, 200, libraryRemove(body.theme, { station: body.station, group: body.group, nid: body.nid ?? null }))
    }
    if (pathname === '/library/rename' && req.method === 'POST') {
      const body = await readBody(req)
      const name = (body.name ?? '').trim()
      if (!THEME_OK(body.theme)) return json(res, 400, { error: '缺少主题' })
      if (!body.station || !body.group || !name) return json(res, 400, { error: '参数不完整' })
      return json(res, 200, libraryRename(body.theme, { station: body.station, group: body.group, name }))
    }
    if (pathname === '/library/reorder' && req.method === 'POST') {
      const body = await readBody(req)
      if (!THEME_OK(body.theme)) return json(res, 400, { error: '缺少主题' })
      if (!body.station || !body.group || !Array.isArray(body.nids) || !body.nids.length) return json(res, 400, { error: '参数不完整' })
      return json(res, 200, libraryReorder(body.theme, { station: body.station, group: body.group, nids: body.nids }))
    }
    if (pathname === '/library/level' && req.method === 'POST') {
      const body = await readBody(req)
      if (!THEME_OK(body.theme)) return json(res, 400, { error: '缺少主题' })
      if (!['standard', 'exhigh', 'lossless'].includes(body.level)) return json(res, 400, { error: '未知音质' })
      const lib = readLibrary(body.theme)
      lib.level = body.level
      writeLibrary(body.theme, lib)
      return json(res, 200, lib)
    }
    // 整库写入：前端“导入”用，格式与库文件相同
    if (pathname === '/library/replace' && req.method === 'POST') {
      const body = await readBody(req)
      if (!THEME_OK(body.theme)) return json(res, 400, { error: '缺少主题' })
      if (!body || typeof body !== 'object' || !body.stations) return json(res, 400, { error: '库格式不对' })
      writeLibrary(body.theme, { level: body.level ?? 'exhigh', stations: body.stations })
      return json(res, 200, readLibrary(body.theme))
    }
    return json(res, 404, { error: 'not found' })
  } catch (e) {
    return json(res, 500, { error: e.message })
  }
}

// ———————————————————— 插件 ————————————————————

export default function neteaseImport() {
  const mw = (req, res, next) => {
    if (!req.url.startsWith('/')) return next()
    route(req, res).catch(next)
  }
  return {
    name: 'netease-import',
    configureServer(s) { s.middlewares.use('/netease', mw) },
    configurePreviewServer(s) { s.middlewares.use('/netease', mw) },
  }
}

// 电台资源插件：把工程外的 Resources 目录接入前端
//  - /res/*  直接读取 Resources，支持 Range 请求（音频拖动进度依赖它）
//  - /gen/*  派生资源（深度图、缩略图）在 public/gen，dev 与构建由 vite 处理
//  - virtual:radio-manifest  扫描目录生成资源清单，目录变动时自动刷新页面
//  - 发现缺少派生资源的壁纸时，在后台调用 scripts/derive.py 补齐
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const RES = path.resolve(HERE, '../../Resources')
const GEN = path.resolve(HERE, '../public/gen')
const DERIVE = path.resolve(HERE, '../scripts/derive.py')
const PYTHON = process.env.RADIO_PYTHON
  || (fs.existsSync('D:/miniconda3/envs/daily/python.exe') ? 'D:/miniconda3/envs/daily/python.exe' : 'python')

const VIRTUAL = 'virtual:radio-manifest'
const RESOLVED = '\0' + VIRTUAL
const AUDIO_EXT = new Set(['.mp3', '.ogg', '.oga', '.m4a', '.aac', '.wav', '.flac', '.opus'])
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp'])
const MIME = {
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.m4a': 'audio/mp4',
  '.aac': 'audio/aac', '.wav': 'audio/wav', '.flac': 'audio/flac', '.opus': 'audio/ogg',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
}

const toUrl = (prefix, ...segs) =>
  prefix + segs.flatMap((s) => s.split(/[\\/]/)).map(encodeURIComponent).join('/')
const dirs = (p) => fs.existsSync(p)
  ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_')).map((d) => d.name).sort()
  : []
const files = (p, exts) => fs.existsSync(p)
  ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isFile() && exts.has(path.extname(d.name).toLowerCase())).map((d) => d.name)
  : []
// 递归列出目录下的文件，返回以 / 分隔的相对路径；与 dirs 一样跳过 . 与 _ 开头的目录
const walk = (p, exts, rel = '') => [
  ...files(p, exts).map((f) => rel + f),
  ...dirs(p).flatMap((d) => walk(path.join(p, d), exts, `${rel}${d}/`)),
]
const naturalSort = (a, b) => a.localeCompare(b, 'zh', { numeric: true })
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }

// ———————————————————— 清单 ————————————————————

// 歌单：每张 JSON 对应一个国家目录，file 为相对国家目录的路径，可以落在子文件夹里；
// group 为歌曲所属分组（即子文件夹），JSON 未写时取路径的目录部分。
// 没有 JSON 的目录（新主题、自建频道）直接按文件生成歌单：文件名“歌手 - 歌名”自动拆开，
// 开头的序号去掉，子文件夹即分组
function scanRadios() {
  const radios = {}
  for (const root of dirs(RES).filter((d) => d.endsWith('Radio'))) {
    const base = path.join(RES, root)
    const lists = fs.readdirSync(base).filter((f) => f.endsWith('.json')).sort().map((f) => {
      const data = readJson(path.join(base, f))
      if (!data?.songs) return null
      const folder = data.folder ?? f.slice(0, -5)
      const present = new Set(walk(path.join(base, folder), AUDIO_EXT))
      const songs = data.songs.filter((s) => present.has(s.file)).map((s) => ({
        id: `${folder}/${s.file}`,
        group: s.group ?? s.file.split('/').slice(0, -1).join('/'),
        order: s.order,
        title: s.title,
        artist: s.artist,
        titleZh: s.titleZh,
        artistZh: s.artistZh,
        url: toUrl('/res/', root, folder, s.file),
      }))
      return { folder, songs }
    }).filter(Boolean)
    const listed = new Set(lists.map((l) => l.folder))
    for (const folder of dirs(base).filter((d) => !listed.has(d))) {
      const counter = {}
      const songs = walk(path.join(base, folder), AUDIO_EXT).sort(naturalSort).map((file) => {
        const group = file.split('/').slice(0, -1).join('/')
        const stem = path.basename(file).replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]+/, '')
        const parts = stem.split(/\s+-\s+/)
        return {
          id: `${folder}/${file}`,
          group,
          order: (counter[group] = (counter[group] ?? 0) + 1),
          title: parts.length > 1 ? parts.slice(1).join(' - ') : stem,
          artist: parts.length > 1 ? parts[0] : '',
          url: toUrl('/res/', root, folder, file),
        }
      })
      if (songs.length) lists.push({ folder, songs })
    }
    radios[root] = lists
  }
  return radios
}

function scanWallpapers() {
  const walls = {}
  for (const root of dirs(RES).filter((d) => d.endsWith('Wallpapers'))) {
    walls[root] = {}
    for (const pool of dirs(path.join(RES, root))) {
      walls[root][pool] = files(path.join(RES, root, pool), IMAGE_EXT).sort(naturalSort).map((f) => {
        const name = f.replace(/\.[^.]+$/, '')
        const gen = path.join(GEN, root, pool, name)
        const has = (n) => fs.existsSync(path.join(gen, n))
        return {
          id: `${pool}/${name}`,
          name,
          url: toUrl('/res/', root, pool, f),
          depth: has('depth.png') ? toUrl('/gen/', root, pool, name, 'depth.png') : null,
          thumb: has('thumb.jpg') ? toUrl('/gen/', root, pool, name, 'thumb.jpg') : null,
          meta: readJson(path.join(gen, 'meta.json')),
        }
      })
    }
  }
  return walls
}

// 史实档案：壁纸根目录下的 JSON 登记带出处的壁纸（id 为壁纸文件名），如二战的“史实照片.json”、
// 古典的“paintings.json”、烈焰升腾的“超级事件.json”，新主题照此放一份登记文件即可上架；
// 壁纸一侧直接取清单里扫到的对象（缺深度图时其字段为 null），
// 原图在 Photos 目录按登记的文件名解析地址（不带 photo 字段的登记没有原图，如事件插画），
// 壁纸或原图缺文件时对应字段为 null
function scanPhotos(walls) {
  const out = {}
  const photoDir = dirs(RES).find((d) => /photos/i.test(d))
  for (const root of dirs(RES).filter((d) => d.endsWith('Wallpapers'))) {
    out[root] = files(path.join(RES, root), new Set(['.json']))
      .map((f) => readJson(path.join(RES, root, f)))
      .filter(Array.isArray)
      .flat()
      .map((e) => ({
      ...e,
      wall: walls[root]?.[e.pool]?.find((w) => w.name === e.id) ?? null,
      photo: e.photo && photoDir && fs.existsSync(path.join(RES, photoDir, e.photo))
        ? toUrl('/res/', photoDir, e.photo)
        : null,
    }))
  }
  return out
}

// 白噪音：目录下每个音频即一个条目；说明文档的表格提供描述，
// “非白噪音条目”小节里提到的文件作为音效素材单独列出，不进混音器
function scanNoise() {
  const dir = dirs(RES).find((d) => /noise/i.test(d))
  if (!dir) return { items: [], effects: {} }
  const base = path.join(RES, dir)
  const doc = fs.readdirSync(base).filter((f) => f.endsWith('.md')).map((f) => fs.readFileSync(path.join(base, f), 'utf8')).join('\n')
  const notes = {}
  for (const m of doc.matchAll(/^\|\s*([^|]+?\.\w+)\s*\|[^|]*\|\s*([^|]+?)\s*\|/gm)) notes[m[1]] = m[2]
  const effectSection = doc.split(/^##\s*非白噪音条目/m)[1] ?? ''
  const items = []
  const effects = {}
  for (const f of files(base, AUDIO_EXT).sort(naturalSort)) {
    const id = f.replace(/\.[^.]+$/, '')
    const url = toUrl('/res/', dir, f)
    if (effectSection.includes(f)) effects[id] = url
    else items.push({ id, url, note: notes[f] ?? '' })
  }
  return { items, effects }
}

// 云音乐库种子：按主题一个文件，随构建烘焙进清单，线上浏览器库为空时以它初始化
const CLOUD_DIR = path.join(RES, 'Netease Cloud')
const readCloudSeed = () => Object.fromEntries(
  files(CLOUD_DIR, new Set(['.json'])).map((f) => [f.slice(0, -5), readJson(path.join(CLOUD_DIR, f))])
)

const buildManifest = () => {
  const wallpapers = scanWallpapers()
  return {
    radios: scanRadios(),
    wallpapers,
    photos: scanPhotos(wallpapers),
    noise: scanNoise(),
    netease: readCloudSeed(),
  }
}

// ———————————————————— 静态服务 ————————————————————

function serveDir(prefix, root) {
  return (req, res, next) => {
    if (!req.url.startsWith(prefix)) return next()
    let rel
    try { rel = decodeURIComponent(req.url.slice(prefix.length).split('?')[0]) } catch { return next() }
    const file = path.resolve(root, rel)
    if (!file.startsWith(root + path.sep)) { res.statusCode = 403; return res.end() }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.statusCode = 404; return res.end() }
      const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
      res.setHeader('Content-Type', type)
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Cache-Control', 'public, max-age=3600')
      res.setHeader('Last-Modified', st.mtime.toUTCString())
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '')
      let start = 0
      let end = st.size - 1
      if (range) {
        start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]))
        end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end
        if (start > end || start >= st.size) {
          res.statusCode = 416
          res.setHeader('Content-Range', `bytes */${st.size}`)
          return res.end()
        }
        res.statusCode = 206
        res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`)
      }
      res.setHeader('Content-Length', end - start + 1)
      if (req.method === 'HEAD') return res.end()
      fs.createReadStream(file, { start, end }).pipe(res)
    })
  }
}

// ———————————————————— 派生资源 ————————————————————

function missingDerived() {
  const walls = scanWallpapers()
  return Object.values(walls).flatMap((pools) => Object.values(pools).flat()).some((w) => !w.depth || !w.thumb || !w.meta)
}

function createDeriver(logger, onDone) {
  let running = false
  let again = false
  const run = () => {
    if (running) { again = true; return }
    if (!missingDerived()) return
    running = true
    logger.info('[电台] 发现新壁纸，正在后台生成深度图与缩略图……', { timestamp: true })
    const child = spawn(PYTHON, [DERIVE, RES, GEN], { env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    child.stdout.on('data', (d) => String(d).trim().split('\n').forEach((l) => logger.info(`[电台] ${l}`)))
    child.on('error', (e) => { running = false; logger.warn(`[电台] 无法调用 Python（${PYTHON}）：${e.message}。可设置环境变量 RADIO_PYTHON 指定解释器`) })
    child.on('close', (code) => {
      running = false
      if (code === 0) onDone()
      else logger.warn(`[电台] 派生资源生成失败（退出码 ${code}），壁纸将以无深度模式显示`)
      if (again) { again = false; run() }
    })
  }
  return run
}

// ———————————————————— 插件 ————————————————————

export default function radioResources() {
  let server
  let timer
  const reload = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      const mod = server.moduleGraph.getModuleById(RESOLVED)
      if (mod) server.moduleGraph.invalidateModule(mod)
      server.ws.send({ type: 'full-reload' })
    }, 400)
  }

  return {
    name: 'radio-resources',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(buildManifest())}` : null),

    // 部署构建（RADIO_DEPLOY=1，vercel.json 的 buildCommand 已带上）：把 /res/ 引用的
    // 资源拷进 dist，静态托管才有文件可发；本地构建不拷，dist 保持只有代码。
    // 音乐不参与线上（体积与版权），Radio 目录整体跳过——线上清单里本就没有本地歌
    closeBundle() {
      if (!process.env.RADIO_DEPLOY) return
      const dist = path.resolve(HERE, '../dist/res')
      const staticExt = new Set([...IMAGE_EXT, ...AUDIO_EXT])
      for (const root of dirs(RES)) {
        if (/radio/i.test(root)) continue
        fs.cpSync(path.join(RES, root), path.join(dist, root), {
          recursive: true,
          filter: (f) => fs.statSync(f).isDirectory() || staticExt.has(path.extname(f).toLowerCase()),
        })
      }
    },

    configureServer(s) {
      server = s
      s.middlewares.use(serveDir('/res/', RES))
      const derive = createDeriver(s.config.logger, reload)
      s.watcher.add(RES)
      const onChange = (file) => {
        const f = path.resolve(file)
        if (f.startsWith(GEN)) return
        if (!f.startsWith(RES)) return
        // 云音乐库由前端运行时按主题拉取更新，文件变化不触发页面重载
        if (f === CLOUD_DIR || f.startsWith(CLOUD_DIR + path.sep)) return
        const ext = path.extname(f).toLowerCase()
        if (IMAGE_EXT.has(ext)) derive()
        if (IMAGE_EXT.has(ext) || AUDIO_EXT.has(ext) || ext === '.json' || ext === '.md') reload()
      }
      for (const ev of ['add', 'unlink', 'change']) s.watcher.on(ev, onChange)
      derive()
    },

    configurePreviewServer(s) {
      s.middlewares.use(serveDir('/res/', RES))
    },
  }
}

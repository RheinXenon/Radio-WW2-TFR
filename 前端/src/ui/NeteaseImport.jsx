// 云音乐导入：扫码登录网易云，把单曲、整张歌单或播客电台加进当前主题各频道的子歌单
// 歌曲不落盘，播放时经 /netease/stream 在线取流；库由 src/netease/library.js 运行时维护，
// 加入与移除即时生效，不刷新页面；已加入的子歌单可在本面板展开管理：排序、改名、逐首增删
// 登录态 cookie 由浏览器保管（见 netease/api.js），扫码成功即存，退出即清
import { useEffect, useMemo, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { useRadio } from '../store.js'
import { theme } from '../themes/index.js'
import { cloudLibrary } from '../netease/library.js'
import { get, post, sessionCookie } from '../netease/api.js'
import { radio } from '../audio/radio.js'
import { Panel, Section } from './Panel.jsx'
import { Icon } from './Icon.jsx'
import { Emblem } from '../themes/marks.jsx'
import qrcode from 'qrcode-generator'
import './netease.css'

const LEVELS = [
  { id: 'standard', name: '标准', desc: '128k · 最快' },
  { id: 'exhigh', name: '极高', desc: '320k MP3' },
  { id: 'lossless', name: '无损', desc: 'FLAC · 需会员' },
]

const MY_PAGE_SIZE = 10 // 我的歌单每页条数，后端一页最多 100，界面分页浏览

// 从粘贴的链接里解析歌曲、歌单、专辑或播客 id，兼容纯数字（按歌曲处理）
// djradio 须在 dj 之前判定，二者是包含关系；id 只认查询参数，免得分享链接里
// base64 之类的杂参（如 uct2）恰好拼出 "id=" 被误配
const parseNeteaseLink = (text) => {
  const t = text.trim()
  const m = /[?&]id=(\d+)/.exec(t) || /^(\d+)$/.exec(t)
  if (!m) return null
  const kind = ['djradio', 'dj', 'album', 'playlist', 'song'].find((k) => t.includes(k)) ?? 'song'
  return { kind, id: m[1] }
}

// 二维码自绘 SVG
function QrSvg({ url, size = 176 }) {
  const rects = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(url)
    qr.make()
    const n = qr.getModuleCount()
    const cell = 100 / n
    const out = []
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
      if (qr.isDark(r, c)) out.push([(c * cell).toFixed(3), (r * cell).toFixed(3), cell])
    return out
  }, [url])
  return (
    <svg className="ncm__qr" viewBox="0 0 100 100" width={size} height={size} shapeRendering="crispEdges" aria-label="登录二维码">
      <rect width="100" height="100" fill="#f4efe4" />
      {rects.map(([x, y, w], i) => <rect key={i} x={x} y={y} width={w} height={w} fill="#1a140d" />)}
    </svg>
  )
}

// 组内一行：把手拖动排序，点歌名即播放，行尾移除单曲
function CloudRow({ song, onNotice }) {
  const controls = useDragControls()
  return (
    <Reorder.Item as="li" value={song} dragListener={false} dragControls={controls} className="ncm__grow"
      whileDrag={{ backgroundColor: 'rgba(38, 29, 20, 0.96)', boxShadow: '0 10px 28px rgba(0, 0, 0, 0.55)' }}>
      <span className="ncm__grip" onPointerDown={(e) => controls.start(e)} title="拖动调整顺序"><Icon name="grip" size={14} /></span>
      <button className="ncm__gsong" onClick={() => radio.pick(song)} title="播放">
        <span className="ncm__gtitle">{song.title}</span>
        {song.vip && <i className="ncm__vip" title="需要会员">VIP</i>}
        <em>{song.artist || song.album || ''}</em>
      </button>
      <button className="ncm__mdel" onClick={() => cloudLibrary.remove(song).catch((e) => onNotice(e.message))} title="移除这首">
        <Icon name="close" size={13} />
      </button>
    </Reorder.Item>
  )
}

// 已加入组的管理单元：展开列出组内歌曲，可拖动排序、逐首移除；
// 双击组名改名（目标名已存在则两组合并），删除整组需二次确认
function ManageGroup({ g, open, onToggle, onRenamed, onNotice }) {
  const [rename, setRename] = useState(null) // 编辑中的组名
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { if (!confirm) return; const t = setTimeout(() => setConfirm(false), 3000); return () => clearTimeout(t) }, [confirm])

  const submitRename = async () => {
    const name = (rename?.value ?? '').trim()
    const old = g.group
    setRename(null)
    if (!name || name === old) return
    try {
      await cloudLibrary.rename(g.station, old, name)
      onRenamed(`${g.station}/${old}`, `${g.station}/${name}`)
      onNotice(`已改名 ${name}`)
    } catch (e) { onNotice(e.message) }
  }

  // 运行时歌曲的 id 形如 cloud/<库键>，截出原始键（网易云 nid 或外链 url）交给库重排
  const reorder = (next) =>
    cloudLibrary.reorder(g.station, g.group, next.map((s) => s.id.slice(6))).catch((e) => onNotice(e.message))

  return (
    <li className="ncm__grp">
      <div className="ncm__mgroup">
        <button className="ncm__foldbtn" onClick={onToggle} aria-expanded={open} title={open ? '收起' : '展开管理'}>
          <Icon name="chevron" size={12} className={`ncm__fold ${open ? 'is-on' : ''}`} />
        </button>
        <Emblem kind={theme.stationMap[g.station]?.emblem} size={18} ring={false} />
        {rename != null ? (
          <input
            className="ncm__gname"
            value={rename.value}
            maxLength={24}
            autoFocus
            onChange={(e) => setRename({ value: e.target.value })}
            onBlur={submitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRename(null) }}
            aria-label="子歌单名称"
          />
        ) : (
          <>
            <strong title="双击改名" onDoubleClick={() => setRename({ value: g.group })}>{g.group}</strong>
            <button className="ncm__mren" onClick={() => setRename({ value: g.group })} title="给这个子歌单改名">
              <Icon name="edit" size={13} />
            </button>
          </>
        )}
        <em className="tnum">{g.songs.length} 首 · {g.name}</em>
        <button
          className={`ncm__mdel ${confirm ? 'is-warn' : ''}`}
          onClick={() => (confirm ? cloudLibrary.removeGroup(g.station, g.group).catch((e) => onNotice(e.message)) : setConfirm(true))}
        >
          {confirm ? '确认删除' : '删除整组'}
        </button>
      </div>
      {open && !!g.songs.length && (
        <Reorder.Group as="ul" axis="y" values={g.songs} onReorder={reorder} className="ncm__glist">
          {g.songs.map((song) => <CloudRow key={song.id} song={song} onNotice={onNotice} />)}
        </Reorder.Group>
      )}
      {open && !g.songs.length && <p className="ncm__empty">组是空的，从上面加歌进来</p>}
    </li>
  )
}

export default function NeteaseImport() {
  const [session, setSession] = useState(null)
  const [qr, setQr] = useState(null)
  const [qrMsg, setQrMsg] = useState('')
  const [myLists, setMyLists] = useState(null)
  const [myPage, setMyPage] = useState(0) // 我的歌单当前页码，歌单数变化时按页数钳制
  const [kw, setKw] = useState('')
  const [results, setResults] = useState(null)
  const [link, setLink] = useState('')
  const [linkMeta, setLinkMeta] = useState(null) // { kind: 'song' | 'playlist', ... }
  const [linkErr, setLinkErr] = useState('')
  // 外链与 archive.org:direct 为单曲直链,archive 为合集(文件列表 + 勾选)
  const [extLink, setExtLink] = useState('')
  const [extMeta, setExtMeta] = useState(null)
  const [extErr, setExtErr] = useState('')
  const [extSel, setExtSel] = useState(() => new Set())
  const [level, setLevel] = useState(cloudLibrary.level)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  // 目的地：频道 + 子歌单（选已有分组，或填新名字）；频道不预设，加入前必须自己选一个
  const [station, setStation] = useState(null)
  const [group, setGroup] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const st = station != null ? theme.stationMap[station] : null
  const destGroup = newGroup.trim() || group
  const destGroupName = st?.groups.find((g) => g.id === destGroup)?.name ?? (newGroup.trim() || group)
  const myPages = myLists ? Math.ceil(myLists.length / MY_PAGE_SIZE) : 1
  const myPageCur = Math.min(myPage, myPages - 1)

  const flash = (text) => setNotice(text)
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 2600); return () => clearTimeout(t) }, [notice])

  const refreshSession = () => cloudLibrary.refreshSession()
    .then((s) => { const norm = s.nickname ? s : null; setSession(norm); return norm })
    .catch(() => setSession(null))

  useEffect(() => { refreshSession() }, [])

  // 二维码轮询：801 等扫码 802 待确认 803 成功 800 过期
  useEffect(() => {
    if (!qr) return
    const t = setInterval(async () => {
      try {
        const s = await get(`/qr?key=${encodeURIComponent(qr.key)}`)
        if (s.code === 801) setQrMsg('打开网易云音乐 App 扫码')
        else if (s.code === 802) setQrMsg('已扫码，请在手机上确认')
        else if (s.code === 803) {
          // 登录态交由浏览器保管，之后所有请求都会带上
          if (s.cookie) sessionCookie.set(s.cookie)
          setQr(null); setQrMsg(''); await refreshSession()
        }
        else if (s.code === 800) { setQr(null); setQrMsg(''); flash('二维码已过期，请重新获取') }
      } catch { /* 网络抖动则等下一轮 */ }
    }, 2000)
    return () => clearInterval(t)
  }, [qr])

  useEffect(() => {
    if (session && !myLists) get('/my').then((d) => setMyLists(d.playlists)).catch((e) => flash(e.message))
  }, [session])

  const openQr = async () => {
    try { setQr(await post('/qr')); setQrMsg('打开网易云音乐 App 扫码') } catch (e) { flash(e.message) }
  }

  const logout = async () => {
    sessionCookie.clear()
    await post('/logout').catch(() => {})
    setSession(null)
    setMyLists(null)
    // 退出后同步会员状态，轮播会立刻恢复过滤会员歌曲
    cloudLibrary.refreshSession().catch(() => {})
  }

  const doSearch = async () => {
    if (!kw.trim()) return
    setBusy(true)
    try { setResults((await get(`/search?kw=${encodeURIComponent(kw.trim())}`)).songs) }
    catch (e) { flash(e.message); setResults([]) }
    finally { setBusy(false) }
  }

  // 查询歌曲、歌单、专辑或播客：纯数字先按歌曲试，不行再按歌单；
  // main/sub 为结果条目的展示文案，歌曲字段留在顶层供加入时取用
  const lookupLink = async () => {
    const p = parseNeteaseLink(link)
    setLinkMeta(null)
    setLinkErr('')
    if (!p) { setLinkErr('没认出链接，请粘贴网易云的歌曲、歌单、专辑或播客地址，也可以直接输入数字 ID'); return }
    setBusy(true)
    try {
      if (p.kind === 'dj') {
        const d = await get(`/dj?id=${p.id}`)
        setLinkMeta({ kind: 'dj', ...d.song, main: d.song.title, sub: `${d.radioName || '播客'}${d.serial ? ` · 第${d.serial}期` : ''}` })
      } else if (p.kind === 'djradio') {
        const r = await get(`/djradio?id=${p.id}`)
        setLinkMeta({ kind: 'djradio', ...r, main: r.name, sub: `${r.count} 期` })
      } else if (p.kind === 'album') {
        const m = await get(`/album?id=${p.id}`)
        setLinkMeta({ kind: 'album', ...m, main: m.name, sub: `${m.artist ? `${m.artist} · ` : ''}${m.count} 首` })
      } else if (p.kind === 'playlist') {
        const m = await get(`/playlist?id=${p.id}`)
        setLinkMeta({ kind: 'playlist', ...m, main: m.name, sub: `${m.count} 首` })
      } else {
        try {
          const s = await get(`/song?id=${p.id}`)
          setLinkMeta({ kind: 'song', ...s, main: s.title, sub: s.artist || '单曲' })
        } catch {
          const m = await get(`/playlist?id=${p.id}`)
          setLinkMeta({ kind: 'playlist', ...m, main: m.name, sub: `${m.count} 首` })
        }
      }
    } catch (e) { setLinkErr(e.message) }
    finally { setBusy(false) }
  }

  // 加入当前目的地；歌单与播客电台整张作为新子歌单（组名默认取名字，写进“新建”栏可改）
  // items 为完整歌曲对象（搜索、单曲、播客）或纯 id 数组（歌单导入，库那边会先取元数据）
  const add = async (items, groupOverride) => {
    if (!st) { flash('先在「加入到」里选择一个频道'); return false }
    const g = (groupOverride ?? destGroup).trim()
    if (!g) { flash('先选一个子歌单，或填写新名字'); return false }
    setBusy(true)
    try {
      await cloudLibrary.add(station, g, items)
      flash(`已加入 ${st.name} · ${destGroupName}`)
      // 本次建的是新组时切到它的 chip 并清空输入框，免得输入框与新组重复显示
      if (newGroup.trim() === g) { setGroup(g); setNewGroup('') }
      return true
    } catch (e) { flash(e.message); return false }
    finally { setBusy(false) }
  }

  // 整张歌单或整座播客电台作为新子歌单加入
  const addWhole = async (name, items) => {
    setNewGroup(name)
    if (await add(items, name)) { setLinkMeta(null); setLink('') }
  }

  // 我的歌单：默认整张新建同名子歌单，merge 时并入当前选中的子歌单
  const addMyPlaylist = async (p, merge) => {
    setBusy(true)
    try {
      const meta = await get(`/playlist?id=${p.id}`)
      if (merge) await add(meta.trackIds)
      else await addWhole(meta.name, meta.trackIds)
    }
    catch (e) { flash(e.message) } finally { setBusy(false) }
  }

  // ——— 外链与 archive.org ———

  // 解析粘贴内容:archive.org 合集或单曲页(取 identifier 与可选文件名),或任意 http(s) 音频直链
  const parseExtLink = (text) => {
    const t = text.trim()
    const m = /^https?:\/\/(?:www\.)?archive\.org\/details\/([^/\s?#]+)(?:\/([^\s?#]+))?/i.exec(t)
    if (m) return { kind: 'archive', id: m[1], file: m[2] ? decodeURIComponent(m[2].replaceAll('+', ' ')) : null }
    if (/^https?:\/\/\S+$/i.test(t)) return { kind: 'direct', url: t }
    return null
  }

  const lookupExt = async () => {
    setExtMeta(null)
    setExtErr('')
    const p = parseExtLink(extLink)
    if (!p) { setExtErr('没认出来:粘贴 mp3 等音频直链,或 archive.org 的合集 / 文件页链接'); return }
    if (p.kind === 'direct') {
      try {
        const u = new URL(p.url)
        const title = decodeURIComponent((u.pathname.split('/').pop() || '').replaceAll('+', ' ')).replace(/\.[a-z0-9]+$/i, '') || '未命名音频'
        setExtMeta({ kind: 'direct', song: { url: p.url, title, titleZh: '', artist: u.host, vip: false } })
      } catch { setExtErr('链接格式不对') }
      return
    }
    setBusy(true)
    try {
      // archive.org 的 metadata 接口带 Access-Control-Allow-Origin: *,浏览器可直连
      const r = await fetch(`https://archive.org/metadata/${encodeURIComponent(p.id)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      if (!d?.files?.length) {
        // 标识符不存在时 metadata 返回空对象;顺手搜相近合集给候选
        let hint = ''
        try {
          const stem = p.id.replace(/[^\w-]/g, '').slice(0, -3)
          if (stem.length >= 4) {
            const s = await fetch(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(`identifier:*${stem}*`)}&fl%5B%5D=identifier&rows=5&output=json`)
            const docs = (await s.json())?.response?.docs ?? []
            if (docs.length) hint = `相近的合集:${docs.map((x) => x.identifier).join('、')}`
          }
        } catch { /* 搜索失败不影响提示 */ }
        setExtErr(`archive.org 上没有「${p.id}」这个合集(标识符区分大小写)。${hint}`)
        return
      }
      const files = d.files
        .filter((f) => /\.(mp3|ogg|oga|flac|m4a|wav)$/i.test(f.name))
        .map((f) => ({ name: f.name, title: f.name.split('/').pop().replace(/\.[a-z0-9]+$/i, ''), size: Number(f.size ?? 0) }))
      // 双格式合集(同曲 mp3/ogg 并存)默认每曲只选一种,优先 mp3;文件页链接则精确预选该文件
      const byTitle = new Map()
      for (const f of files) {
        const cur = byTitle.get(f.title)
        if (!cur || (!/\.mp3$/i.test(cur.name) && /\.mp3$/i.test(f.name))) byTitle.set(f.title, f)
      }
      const smart = [...byTitle.values()].map((f) => f.name)
      const sel = p.file
        ? new Set(files.filter((f) => f.name === p.file || f.title === p.file.replace(/\.[a-z0-9]+$/i, '')).map((f) => f.name))
        : new Set(smart)
      setExtMeta({ kind: 'archive', id: p.id, name: d?.metadata?.title || p.id, files, smart })
      setExtSel(sel)
    } catch (e) { setExtErr(`读取合集失败(需能访问 archive.org 的网络):${e.message}`) }
    finally { setBusy(false) }
  }

  const addExtDirect = async () => {
    if (await add([extMeta.song])) { setExtMeta(null); setExtLink('') }
  }

  // archive.org 音频响应带 ACAO:*,标 direct 走前端直连播放,不经服务端代理
  const addExtArchive = async () => {
    const items = extMeta.files.filter((f) => extSel.has(f.name)).map((f) => ({
      url: `https://archive.org/download/${encodeURIComponent(extMeta.id)}/${f.name.split('/').map(encodeURIComponent).join('/')}`,
      title: f.title, titleZh: '', artist: extMeta.name, vip: false, direct: true,
    }))
    if (await add(items)) { setExtMeta(null); setExtLink(''); setExtSel(new Set()) }
  }

  // 库的导出与导入：线上库存放在浏览器里，导出成与库文件同构的 JSON 即可备份或换设备
  const fileRef = useRef(null)
  const exportLib = () => {
    const blob = new Blob([JSON.stringify(cloudLibrary.snapshot, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Netease Cloud.${theme.name}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importLib = async (file) => {
    try { await cloudLibrary.replace(JSON.parse(await file.text())); flash('已导入') }
    catch (e) { flash(e.message) }
  }

  const setLevelOf = async (id) => {
    setLevel(id)
    try { await cloudLibrary.setLevel(id) } catch (e) { flash(e.message) }
  }

  // 展开管理的组（key 为 频道/组名）；改名后跟着迁移，删除后残留无害
  const [openKeys, setOpenKeys] = useState(() => new Set())

  // 已加入的云音乐歌曲（按频道与子歌单归组），随修订号更新
  const cloudRev = useRadio((s) => s.cloudRev)
  const cloudGroups = useMemo(() => {
    const out = []
    for (const s of theme.stations) {
      const groups = {}
      for (const song of s.songs) if (song.cloud) (groups[song.group] ??= []).push(song)
      for (const [g, songs] of Object.entries(groups)) out.push({ station: s.id, name: s.name, group: g, songs })
    }
    return out
  }, [cloudRev])

  return (
    <Panel
      title="云音乐"
      sub="Netease · 加入频道歌单"
      width={560}
      footer={<span>云音乐与外链歌曲在线播放不占磁盘 · 付费歌曲需会员账号完整播放 · 展开已加入的组可排序、改名、逐首增删</span>}
    >
      {notice && <div className="ncm__notice">{notice}</div>}

      <Section title="账号">
        {session ? (
          <div className="ncm__account">
            <img src={session.avatarUrl} alt="" className="ncm__avatar" />
            <div className="ncm__who">
              <strong>{session.nickname}</strong>
              <em>{session.vipType ? '会员账号 · 付费歌曲完整播放' : '普通账号 · 付费歌曲只有试听'}</em>
            </div>
            <button className="pbtn" onClick={logout}>退出</button>
          </div>
        ) : qr ? (
          <div className="ncm__loginqr">
            <QrSvg url={qr.url} />
            <div className="ncm__loginhint">
              <p>{qrMsg}</p>
              <button className="pbtn" onClick={() => { setQr(null); setQrMsg('') }}>取消</button>
            </div>
          </div>
        ) : (
          <div className="ncm__guide">
            <div className="ncm__guidetext">
              <strong>强烈建议先登录网易云账号</strong>
              <p>未登录时以匿名访客取流：免费歌曲也有概率被限流而播放失败，付费（VIP）歌曲必须登录后才能播放。登录后还可导入自己账号的歌单。</p>
            </div>
            <button className="pbtn" onClick={openQr}>扫码登录</button>
          </div>
        )}
      </Section>

      <Section title="加入到" hint={st ? `当前：${st.name} · ${destGroupName}` : '先选择一个频道，再挑子歌单'}>
        <div className="ncm__stations">
          {theme.stations.map((s) => (
            <button
              key={s.id}
              className={`ncm__stbtn ${s.id === station ? 'is-on' : ''}`}
              onClick={() => { setStation(s.id); setGroup(s.groups[0]?.id ?? ''); setNewGroup('') }}
              title={s.name}
            >
              <Emblem kind={s.emblem} size={26} ring={false} />
              <span>{s.name}</span>
            </button>
          ))}
        </div>
        {st && (
          <div className="ncm__groups">
            {st.groups.map((g) => (
              <button key={g.id} className={`ncm__chip ${!newGroup.trim() && group === g.id ? 'is-on' : ''}`}
                onClick={() => { setGroup(g.id); setNewGroup('') }} title={`${g.count} 首`}>
                {g.name}
              </button>
            ))}
            <input
              className={`ncm__newgroup ${newGroup.trim() ? 'is-on' : ''}`}
              value={newGroup}
              placeholder="新建子歌单…"
              maxLength={24}
              onChange={(e) => setNewGroup(e.target.value)}
              aria-label="新建子歌单名称"
            />
          </div>
        )}
      </Section>

      {session && (
        <Section title="我的歌单" hint={myLists?.length > MY_PAGE_SIZE ? `${myLists.length} 个 · 整张作为子歌单加入` : '整张作为子歌单加入'}>
          {myLists === null ? <p className="ncm__empty">正在读取……</p>
            : !myLists.length ? <p className="ncm__empty">账号里还没有歌单</p>
            : <>
              {myLists.slice(myPageCur * MY_PAGE_SIZE, myPageCur * MY_PAGE_SIZE + MY_PAGE_SIZE).map((p) => (
                <div className="ncm__item" key={p.id}>
                  <img src={p.cover} alt="" loading="lazy" />
                  <span className="ncm__itemname">{p.name}</span>
                  <em className="tnum">{p.count} 首</em>
                  <button className="ncm__merge" disabled={busy} title={`加进 ${st?.name ?? ''} · ${destGroupName}`} onClick={() => addMyPlaylist(p, true)}>并入</button>
                  <button className="pbtn" disabled={busy} onClick={() => addMyPlaylist(p)}>加入</button>
                </div>
              ))}
              {myPages > 1 && (
                <div className="ncm__pager">
                  <button className="pbtn" disabled={myPageCur === 0} onClick={() => setMyPage(myPageCur - 1)}>上一页</button>
                  <em className="tnum">{myPageCur + 1} / {myPages}</em>
                  <button className="pbtn" disabled={myPageCur === myPages - 1} onClick={() => setMyPage(myPageCur + 1)}>下一页</button>
                </div>
              )}
            </>}
        </Section>
      )}

      <Section title="搜索单曲">
        <div className="ncm__searchbar">
          <Icon name="search" size={15} />
          <input
            value={kw}
            placeholder="歌名或歌手，加入当前选中的子歌单"
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
          />
          <button className="pbtn" disabled={busy || !kw.trim()} onClick={doSearch}>搜索</button>
        </div>
        {results && (
          results.length ? results.map((song) => (
            <div className="ncm__item" key={song.nid}>
              <span className="ncm__itemname">{song.title}<em>{song.artist || '—'}</em></span>
              {song.vip && <i className="ncm__vip" title="需要会员">VIP</i>}
              <button className="pbtn" disabled={busy} onClick={() => add([song])}>加入</button>
            </div>
          )) : <p className="ncm__empty">没有找到</p>
        )}
      </Section>

      <Section title="歌曲、歌单、专辑或播客链接">
        <div className="ncm__searchbar">
          <Icon name="list" size={15} />
          <input
            value={link}
            placeholder="粘贴网易云歌曲 / 歌单 / 专辑 / 播客链接或数字 ID"
            onChange={(e) => { setLink(e.target.value); setLinkMeta(null); setLinkErr('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') lookupLink() }}
          />
          <button className="pbtn" disabled={busy || !link.trim()} onClick={lookupLink}>查询</button>
        </div>
        {linkErr && <p className="ncm__empty">{linkErr}</p>}
        {linkMeta && (
          <div className="ncm__item">
            <span className="ncm__itemname">{linkMeta.main}<em>{linkMeta.sub}</em></span>
            {linkMeta.kind === 'song' || linkMeta.kind === 'dj' ? (
              <button className="pbtn" disabled={busy} onClick={() => add([{ nid: linkMeta.nid, title: linkMeta.title, artist: linkMeta.artist, album: linkMeta.album, vip: linkMeta.vip }])}>加入</button>
            ) : (
              <>
                <button
                  className="ncm__merge"
                  disabled={busy}
                  title={`加进 ${st?.name ?? ''} · ${destGroupName}`}
                  onClick={() => add(linkMeta.kind === 'djradio' ? linkMeta.songs : linkMeta.trackIds)}
                >并入当前</button>
                <button
                  className="pbtn"
                  disabled={busy}
                  onClick={() => addWhole(linkMeta.name, linkMeta.kind === 'djradio' ? linkMeta.songs : linkMeta.trackIds)}
                >新建子歌单</button>
              </>
            )}
          </div>
        )}
      </Section>

      <Section title="外链与 archive.org" hint="加入当前选中的子歌单">
        <div className="ncm__searchbar">
          <Icon name="list" size={15} />
          <input
            value={extLink}
            placeholder="粘贴 mp3 等音频直链,或 archive.org 合集 / 文件页链接"
            onChange={(e) => { setExtLink(e.target.value); setExtMeta(null); setExtErr('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') lookupExt() }}
          />
          <button className="pbtn" disabled={busy || !extLink.trim()} onClick={lookupExt}>解析</button>
        </div>
        {extErr && <p className="ncm__empty">{extErr}</p>}
        {extMeta?.kind === 'direct' && (
          <div className="ncm__item">
            <span className="ncm__itemname">{extMeta.song.title}<em>{extMeta.song.artist}</em></span>
            <button className="pbtn" disabled={busy} onClick={addExtDirect}>加入</button>
          </div>
        )}
        {extMeta?.kind === 'archive' && (
          <>
            <div className="ncm__extbar">
              <strong title={extMeta.name}>{extMeta.name}</strong>
              <em className="tnum">{extSel.size} / {extMeta.files.length} 首</em>
              <button className="ncm__exttoggle"
                onClick={() => setExtSel(extSel.size ? new Set() : new Set(extMeta.smart))}>
                {extSel.size ? '全不选' : '全选'}
              </button>
              <button className="pbtn" disabled={busy || !extSel.size} onClick={addExtArchive}>加入所选</button>
            </div>
            <div className="ncm__extlist">
              {extMeta.files.map((f) => (
                <label key={f.name} className={`ncm__extfile ${extSel.has(f.name) ? 'is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={extSel.has(f.name)}
                    onChange={() => {
                      const s = new Set(extSel)
                      if (s.has(f.name)) s.delete(f.name)
                      else s.add(f.name)
                      setExtSel(s)
                    }}
                  />
                  <span>{f.title}</span>
                  {!!f.size && <em className="tnum">{(f.size / 1048576).toFixed(1)}M</em>}
                </label>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="在线音质" hint="以账号实际权限为准">
        <div className="choices">
          {LEVELS.map((l) => (
            <button key={l.id} className={`choice ${level === l.id ? 'is-on' : ''}`} onClick={() => setLevelOf(l.id)}>
              <div className="choice__name">{l.name}</div>
              <div className="choice__desc">{l.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="已加入的云音乐歌曲"
        hint={cloudGroups.length ? `${cloudGroups.reduce((n, g) => n + g.songs.length, 0)} 首 · 存于${cloudLibrary.remote ? '本地文件' : '此浏览器'}` : `暂无 · 存于${cloudLibrary.remote ? '本地文件' : '此浏览器'}`}
      >
        {!cloudGroups.length ? (
          <p className="ncm__empty">从上面把歌曲加进频道的子歌单后，在这里展开管理：拖动排序、点组名旁的铅笔改名（双击组名也行）、逐首增删</p>
        ) : (
          <div className="ncm__manage">
            {cloudGroups.map((g) => {
              const key = `${g.station}/${g.group}`
              return (
                <ManageGroup
                  key={key}
                  g={g}
                  open={openKeys.has(key)}
                  onToggle={() => setOpenKeys((s) => {
                    const n = new Set(s)
                    if (n.has(key)) n.delete(key)
                    else n.add(key)
                    return n
                  })}
                  onRenamed={(from, to) => setOpenKeys((s) => {
                    const n = new Set(s)
                    n.delete(from)
                    n.add(to)
                    return n
                  })}
                  onNotice={flash}
                />
              )
            })}
          </div>
        )}
        <div className="ncm__libio">
          <span>库{cloudLibrary.remote ? `按主题存于仓库的 Netease Cloud/${theme.id}.json` : '只存在这个浏览器里，清数据会丢'}</span>
          <button className="pbtn" onClick={exportLib}>导出 JSON</button>
          <button className="pbtn" onClick={() => fileRef.current?.click()}>导入</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importLib(f) }}
          />
        </div>
      </Section>
    </Panel>
  )
}

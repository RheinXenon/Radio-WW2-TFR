// 歌单：左侧选来源（当前主题的频道、珍藏与自建歌单），右侧列出歌曲；歌单跨主题共用，只列出当前主题的歌
// 频道列表可按分组启停、点分组栏收起展开、逐首跳过；歌单可拖动排序、移出歌曲；任何一首都能点播或加入歌单
// 云音乐歌曲歌名带下划线，行尾多一枚移除按钮（从频道子歌单里删去，本地歌曲不受影响）
import { useEffect, useMemo, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'motion/react'
import { useRadio, listSongIds, listName, nextListName, FAV, isOn } from '../store.js'
import { radio, songsOf } from '../audio/radio.js'
import { theme } from '../themes/index.js'
import { cloudLibrary } from '../netease/library.js'
import { Emblem } from '../themes/marks.jsx'
import { Panel, Toggle } from './Panel.jsx'
import { Icon } from './Icon.jsx'
import { CJK } from './NowPlaying.jsx'
import './playlist.css'

const MAX_RESULTS = 200
const matches = (song, q) => [song.title, song.titleZh, song.artist, song.artistZh].some((t) => t?.toLowerCase().includes(q))

// 打开时停在正在播放的来源上
function initialView(s) {
  if (s.band === 'list' && (s.list === FAV || s.playlists.some((p) => p.id === s.list))) return { kind: 'list', id: s.list }
  return { kind: 'station', id: s.offAir ?? s.track?.station ?? s.station }
}

function SongText({ song }) {
  const zh = song.titleZh && song.titleZh !== song.title ? song.titleZh : ''
  const sub = [zh, song.artist || song.artistZh].filter(Boolean).join(' · ')
  return (
    <>
      <span className="pl__titleline">
        <span className={`pl__title ${CJK.test(song.title) ? '' : 'latin'}`}>{song.title}</span>
        {song.cloud && song.vip && <i className="ncm__vip" title="会员歌曲：无会员账号时只有试听片段">VIP</i>}
      </span>
      {sub && <span className="pl__sub">{sub}</span>}
    </>
  )
}

// “加入歌单”菜单：勾选即加入，再点一次移出；靠近窗口底部时向上展开
function AddMenu({ song, open, onOpen }) {
  const favorites = useRadio((s) => s.favorites)
  const playlists = useRadio((s) => s.playlists)
  const [up, setUp] = useState(false)
  const { toggleInList, createList } = useRadio.getState()
  const lists = [{ id: FAV, name: '珍藏', songs: favorites }, ...playlists]
  return (
    <div className="pl__menuwrap">
      <button
        className={`pl__act ${open ? 'is-open' : ''}`}
        title="加入歌单"
        onClick={(e) => {
          setUp(e.currentTarget.getBoundingClientRect().bottom > window.innerHeight - 240)
          onOpen(open ? null : song.id)
        }}
      >
        <Icon name="plus" size={16} />
      </button>
      {open && (
        <div className={`pl__menu ${up ? 'is-up' : ''}`}>
          <div className="pl__menulabel">加入歌单</div>
          {lists.map((l) => (
            <button key={l.id} onClick={() => toggleInList(l.id, song.id)}>
              <Icon name="check" size={14} style={{ visibility: l.songs.includes(song.id) ? 'visible' : 'hidden' }} />
              <span>{l.name}</span>
            </button>
          ))}
          <hr />
          <button onClick={() => { createList(nextListName(playlists), [song.id]); onOpen(null) }}>
            <Icon name="plus" size={14} />
            <span>新建歌单并加入</span>
          </button>
        </div>
      )}
    </div>
  )
}

// 频道与搜索结果中的一行：左侧指示灯亮着表示参与本台与全频段播放，点灯即跳过或恢复；
// 云音乐会员歌在无会员权限时灰显且不参与轮播
function SongRow({ song, cur, off, skipped, menu, setMenu, showStation }) {
  const st = theme.stationMap[song.station]
  const blocked = useRadio((s) => song.cloud && song.vip && s.skipVipWithoutMember && !s.neteaseVip)
  return (
    <div className={`pl__row ${cur ? 'is-cur' : ''} ${off || skipped || blocked ? 'is-off' : ''} ${song.cloud ? 'is-cloud' : ''}`}>
      <button
        className={`pl__lamp ${skipped ? '' : 'is-on'}`}
        onClick={() => useRadio.getState().toggleSkip(song.id)}
        title={skipped ? '已跳过，点一下恢复' : '跳过这首：本台与全频段播放时绕开它'}
        aria-pressed={!skipped}
      />
      {showStation
        ? <Emblem kind={st.emblem} size={16} ring={false} />
        : <span className="pl__no latin tnum">{cur ? <Icon name="wave" size={14} /> : song.order}</span>}
      <button
        className="pl__song"
        onClick={() => radio.pick(song)}
        title={blocked ? '会员歌曲：无会员账号时轮播跳过，点播只有试听片段' : song.cloud ? '云音乐歌曲，在线播放' : '播放'}
      >
        <SongText song={song} />
      </button>
      {song.cloud && (
        <button className="pl__act" onClick={() => cloudLibrary.remove(song)} title="从频道中移除这首云音乐歌曲">
          <Icon name="close" size={15} />
        </button>
      )}
      <AddMenu song={song} open={menu === song.id} onOpen={setMenu} />
    </div>
  )
}

// 歌单中的一行：只能从左侧把手拖动，免得点歌时误触排序
function ListRow({ id, listId, cur }) {
  const song = theme.songIndex.get(id)
  const st = theme.stationMap[song.station]
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={id}
      dragListener={false}
      dragControls={controls}
      className={`pl__row ${cur ? 'is-cur' : ''}`}
      whileDrag={{ backgroundColor: 'rgba(38, 29, 20, 0.96)', boxShadow: '0 10px 28px rgba(0, 0, 0, 0.55)' }}
    >
      <span className="pl__grip" onPointerDown={(e) => controls.start(e)} title="拖动调整顺序"><Icon name="grip" size={16} /></span>
      <Emblem kind={st.emblem} size={16} ring={false} />
      <button className="pl__song" onClick={() => radio.pick(song, listId)} title="播放">
        <SongText song={song} />
      </button>
      <button className="pl__act" onClick={() => useRadio.getState().toggleInList(listId, id)} title="移出歌单">
        <Icon name="close" size={15} />
      </button>
    </Reorder.Item>
  )
}

function StationView({ st, s, rowProps }) {
  return (
    <>
      <header className="pl__head" style={{ '--glow': st.glow }}>
        <Emblem kind={st.emblem} size={36} />
        <div className="pl__headmain">
          <h3>{st.name}<em>{st.city} · {st.genre}</em></h3>
          <p>{isOn(s, st.id) ? `参与本台与全频段播放 ${songsOf(st, s).length} / ${st.songs.length} 首` : '频道已停用，可在设置中恢复'}</p>
        </div>
        <button className="pbtn" onClick={() => radio.tune(st.id)}>收听本台</button>
      </header>
      {st.groups.map((g) => {
        const off = !!s.groupsOff[g.key]
        const folded = !!s.groupsFolded[g.key]
        return (
          <div key={g.id}>
            <div
              className={`pl__ghead ${folded ? 'is-folded' : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={!folded}
              title={folded ? '展开分组' : '收起分组'}
              onClick={() => s.toggleFold(g.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.toggleFold(g.key) } }}
            >
              <Icon name="chevron" size={12} className="pl__fold" />
              <strong>{g.name}</strong>
              <em className="tnum">{g.count} 首{off ? ' · 已关闭' : ''}</em>
              <span className="pl__gtoggle" onClick={(e) => e.stopPropagation()} title="启停分组，不随整栏收起">
                <Toggle on={!off} onChange={() => s.toggleGroup(g.key)} label={`${g.name}分组`} />
              </span>
            </div>
            {!folded && st.songs.filter((song) => song.group === g.id).map((song) => (
              <SongRow key={song.id} song={song} off={off} skipped={!!s.skipped[song.id]} {...rowProps(song)} />
            ))}
          </div>
        )
      })}
      {!st.songs.length && <p className="pl__empty">这个频道还没有歌</p>}
    </>
  )
}

function ListView({ id, fresh, s, curId }) {
  const [confirm, setConfirm] = useState(false)
  useEffect(() => setConfirm(false), [id])
  const ids = listSongIds(s, id)
  const shown = ids.filter((x) => theme.songIndex.has(x))
  // 别的主题的歌与音频暂时缺失的歌不显示，但留在歌单里，排序时接在末尾
  const missing = ids.filter((x) => !theme.songIndex.has(x))
  const custom = id !== FAV
  const playing = s.band === 'list' && s.list === id
  return (
    <>
      <header className="pl__head">
        <span className="pl__badge"><Icon name="list" size={22} /></span>
        <div className="pl__headmain">
          {custom
            ? <input
              key={id}
              className="pl__name"
              value={listName(s, id)}
              maxLength={24}
              autoFocus={fresh}
              onFocus={fresh ? (e) => e.target.select() : undefined}
              onChange={(e) => s.renameList(id, e.target.value)}
              onBlur={(e) => { if (!e.target.value.trim()) s.renameList(id, '未命名歌单') }}
              aria-label="歌单名称"
            />
            : <h3>珍藏<em>印章收入的歌</em></h3>}
          <p>{shown.length} 首{playing ? ' · 正在播放' : ''}</p>
        </div>
        <button className="pbtn" onClick={() => radio.setBand('list', id)}>播放歌单</button>
        {custom && (
          <button className={`pbtn ${confirm ? 'pbtn--warn' : ''}`} onClick={() => (confirm ? s.deleteList(id) : setConfirm(true))}>
            {confirm ? '确认删除' : '删除'}
          </button>
        )}
      </header>
      {missing.length > 0 && (
        <p className="pl__missing">
          另有 {missing.length} 首音频缺失(本地文件不在或已下架),不参与显示与播放
          <button className="pl__missclear" onClick={() => s.setListSongs(id, shown)}>清理失效条目</button>
        </p>
      )}
      {shown.length ? (
        <Reorder.Group as="div" axis="y" values={shown} onReorder={(next) => s.setListSongs(id, [...next, ...missing])}>
          {shown.map((x) => <ListRow key={x} id={x} listId={id} cur={x === curId} />)}
        </Reorder.Group>
      ) : (
        <p className="pl__empty">
          {custom ? '这张歌单还是空的。' : '珍藏里还没有歌。'}<br />
          {custom ? '在频道列表或搜索结果里点歌名右侧的＋，就能把歌加进来' : '点正在播放歌名旁的“藏”字印章，或在频道列表里点＋收入'}
        </p>
      )}
    </>
  )
}

function SearchView({ query, s, rowProps, allSongs }) {
  const q = query.trim().toLowerCase()
  const found = allSongs.filter((song) => matches(song, q))
  return (
    <>
      <header className="pl__head">
        <span className="pl__badge"><Icon name="search" size={22} /></span>
        <div className="pl__headmain">
          <h3>搜索<em>“{query.trim()}”</em></h3>
          <p>在{theme.name}的频道中找到 {found.length} 首</p>
        </div>
      </header>
      {found.slice(0, MAX_RESULTS).map((song) => (
        <SongRow
          key={song.id}
          song={song}
          off={!!s.groupsOff[`${song.station}/${song.group}`]}
          skipped={!!s.skipped[song.id]}
          showStation
          {...rowProps(song)}
        />
      ))}
      {found.length > MAX_RESULTS && <p className="pl__empty">只列出前 {MAX_RESULTS} 首，换个更具体的词试试</p>}
      {!found.length && <p className="pl__empty">没有找到相关的歌</p>}
    </>
  )
}

export default function Playlist() {
  const s = useRadio()
  const cloudRev = useRadio((st) => st.cloudRev)
  // 云音乐歌曲运行时增删后歌池变化，随修订号重算
  const allSongs = useMemo(() => [...theme.songIndex.values()], [cloudRev])
  const [view, setView] = useState(() => initialView(useRadio.getState()))
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(null)
  const main = useRef()
  const searching = !!query.trim()
  const curId = s.track?.id
  const live = s.band === 'list' ? `list:${s.list}` : s.band === 'station' ? `station:${s.offAir ?? s.track?.station ?? s.station}` : null

  // 正在看的自建歌单被删除后回到珍藏
  const gone = view.kind === 'list' && view.id !== FAV && !s.playlists.some((p) => p.id === view.id)
  useEffect(() => { if (gone) setView({ kind: 'list', id: FAV }) }, [gone])

  // 换来源时滚到正在播放的那首，没有则回到顶部
  useEffect(() => {
    const el = main.current
    const cur = el?.querySelector('.pl__row.is-cur')
    if (cur) cur.scrollIntoView({ block: 'center' })
    else if (el) el.scrollTop = 0
  }, [view.kind, view.id, searching])

  // 点菜单以外的地方收起菜单。面板会拦下冒泡的指针事件，所以在捕获阶段监听
  useEffect(() => {
    if (!menu) return
    const close = (e) => { if (!e.target.closest('.pl__menuwrap')) setMenu(null) }
    document.addEventListener('pointerdown', close, true)
    return () => document.removeEventListener('pointerdown', close, true)
  }, [menu])

  const go = (v) => { setView(v); setQuery(''); setMenu(null) }
  const rowProps = (song) => ({ cur: song.id === curId, menu, setMenu })
  const lists = [{ id: FAV, name: '珍藏', songs: s.favorites }, ...s.playlists]

  return (
    <Panel
      title="歌单"
      sub="Playlists · 选曲与编排"
      width={860}
      className="panel--split"
      footer={
        <span>
          {view.kind === 'list' && !searching
            ? '点歌名即播放 · 拖动左侧把手调整顺序 · 自建歌单的名字可直接改'
            : '点歌名即播放 · 灯亮的歌参与本台与全频段播放，点灯可跳过 · ＋ 加入歌单'}
        </span>
      }
    >
      <div className="pl">
        <aside className="pl__side">
          <label className="pl__search">
            <Icon name="search" size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索歌名或歌手" />
          </label>

          <div className="pl__label">频道</div>
          {theme.stations.map((st) => (
            <button
              key={st.id}
              className={`pl__src ${!searching && view.kind === 'station' && view.id === st.id ? 'is-on' : ''} ${isOn(s, st.id) ? '' : 'is-off'}`}
              onClick={() => go({ kind: 'station', id: st.id })}
            >
              <Emblem kind={st.emblem} size={20} />
              <span>{st.name}</span>
              {live === `station:${st.id}` && <i className="pl__live" title="正在播放" />}
              <em className="tnum">{songsOf(st, s).length}</em>
            </button>
          ))}

          <div className="pl__label">我的歌单</div>
          {lists.map((l) => (
            <button
              key={l.id}
              className={`pl__src ${!searching && view.kind === 'list' && view.id === l.id ? 'is-on' : ''}`}
              onClick={() => go({ kind: 'list', id: l.id })}
            >
              <Icon name="list" size={18} />
              <span>{l.name || '未命名歌单'}</span>
              {live === `list:${l.id}` && <i className="pl__live" title="正在播放" />}
              <em className="tnum">{l.songs.length}</em>
            </button>
          ))}
          <button className="pl__src is-new" onClick={() => go({ kind: 'list', id: s.createList(nextListName(s.playlists)), fresh: true })}>
            <Icon name="plus" size={18} />
            <span>新建歌单</span>
          </button>
        </aside>

        <section className="pl__main" ref={main}>
          {searching
            ? <SearchView query={query} s={s} rowProps={rowProps} allSongs={allSongs} />
            : view.kind === 'station'
              ? <StationView st={theme.stationMap[view.id]} s={s} rowProps={rowProps} />
              : <ListView id={view.id} fresh={view.fresh} s={s} curId={curId} />}
        </section>
      </div>
    </Panel>
  )
}

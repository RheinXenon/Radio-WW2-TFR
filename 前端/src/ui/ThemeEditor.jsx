// 主题工坊：新建与编辑自建主题，或给内置主题追加频道（总数不超过八个）。
// 自建主题的名称、配色、画面风格、默认播放控件与时钟、全部频道都可以改；
// 内置主题的原有频道只读，追加的频道可以改名、换色、调整次序或删除
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useRadio, getRadio } from '../store.js'
import { radio } from '../audio/radio.js'
import { BUILTIN, MAX_STATIONS, getTheme, theme } from '../themes/index.js'
import { STYLES, CLOCKS } from '../skins.js'
import { Emblem, Glyph, GENERIC_PATTERNS, Pattern } from '../themes/marks.jsx'
import { PALETTES, MOODS, newDiyTheme, newStation } from '../themes/diy/index.js'
import { paint as diyPaint } from '../themes/diy/paint.js'
import { paintedWall } from '../scene/paint.js'
import { Icon } from './Icon.jsx'
import './themeeditor.css'

const chars = (v) => Array.from(v ?? '')
const close = () => useRadio.setState({ editing: null })

function Field({ label, hint, children, wide }) {
  return (
    <label className={`ted__field ${wide ? 'is-wide' : ''}`}>
      <span className="ted__label">{label}{hint && <em>{hint}</em>}</span>
      {children}
    </label>
  )
}

// 画面风格的缩略图：用草稿里的配色现场画出
function MoodCard({ mood, label, desc, on, accent: a1, accent2: a2, onPick }) {
  // 拖动取色器时配色连续变化，缩略图跟在后面慢一拍重画
  const accent = useDeferredValue(a1)
  const accent2 = useDeferredValue(a2)
  const src = useMemo(() => {
    const [item] = diyPaint({ name: '预览', accent }, { mood, accent, accent2 })
    return paintedWall('预览', `${mood}${accent}${accent2}`, item.draw).thumb
  }, [mood, accent, accent2])
  return (
    <button className={`ted__mood ${on ? 'is-on' : ''}`} onClick={onPick} type="button">
      <img src={src} alt="" draggable={false} />
      <b>{label}</b>
      <span>{desc}</span>
    </button>
  )
}

function StationRow({ st, i, n, locked, of, onChange, onMove, onRemove }) {
  if (locked) {
    return (
      <div className="ted__st is-locked">
        <Emblem kind={st.emblem} of={of} size={34} />
        <div className="ted__stmain">
          <b>{st.name}</b>
          <span>{st.genre} · {st.call}</span>
        </div>
        <em className="ted__tag">内置</em>
      </div>
    )
  }
  const set = (patch) => onChange({ ...st, ...patch })
  return (
    <div className="ted__st">
      <div className="ted__glyph">
        <Glyph char={st.glyph || chars(st.name)[0] || '音'} color={st.accent} size={44} />
        <input
          className="ted__in ted__in--glyph"
          value={st.glyph ?? ''}
          placeholder={chars(st.name)[0] ?? '字'}
          onChange={(e) => set({ glyph: chars(e.target.value).slice(-1).join('') })}
          aria-label="徽记用字"
        />
        <input type="color" className="ted__color" value={st.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="频道主色" />
      </div>
      <div className="ted__stgrid">
        <Field label="频道名" hint="也是歌单与壁纸目录名">
          <input className="ted__in" value={st.name} maxLength={12} onChange={(e) => set({ name: e.target.value.replace(/[\\/:*?"<>|]/g, '') })} />
        </Field>
        <Field label="曲风">
          <input className="ted__in" value={st.genre ?? ''} maxLength={14} placeholder="比如：城市流行" onChange={(e) => set({ genre: e.target.value })} />
        </Field>
        <Field label="呼号" hint="锁定电台时浮现">
          <input className="ted__in" value={st.call ?? ''} maxLength={28} placeholder={`这里是${st.name}`} onChange={(e) => set({ call: e.target.value })} />
        </Field>
        <Field label="地点 / 西文名">
          <div className="ted__pair">
            <input className="ted__in" value={st.city ?? ''} maxLength={10} placeholder="地点" onChange={(e) => set({ city: e.target.value })} />
            <input className="ted__in" value={st.latin ?? ''} maxLength={24} placeholder="LATIN" onChange={(e) => set({ latin: e.target.value.toUpperCase() })} />
          </div>
        </Field>
        <Field label="纹样" wide>
          <div className="ted__patterns">
            {GENERIC_PATTERNS.map(([id, name]) => (
              <button key={id} type="button" className={st.pattern === id ? 'is-on' : ''} onClick={() => set({ pattern: id })} title={name}>
                <Pattern kind={id} color={st.accent} height={8} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </Field>
      </div>
      <div className="ted__stops">
        <button type="button" disabled={i === 0} onClick={() => onMove(-1)} aria-label="上移"><Icon name="up" size={16} /></button>
        <button type="button" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="下移"><Icon name="down" size={16} /></button>
        <button type="button" onClick={onRemove} aria-label="删除频道" className="is-danger"><Icon name="trash" size={16} /></button>
      </div>
    </div>
  )
}

export default function ThemeEditor({ id }) {
  const s = getRadio()
  const isNew = id === 'new'
  const builtin = BUILTIN.find((t) => t.id === id)
  const built = isNew ? null : getTheme(id, s)
  const [draft, setDraft] = useState(() => (isNew ? newDiyTheme(s.customThemes.length + 1) : builtin ? null : structuredClone(s.customThemes.find((t) => t.id === id))))
  const [extra, setExtra] = useState(() => (builtin ? structuredClone(s.userStations[id] ?? []) : []))
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const base = builtin ? builtin.stations : []
  const own = builtin ? extra : draft.stations
  const setOwn = (list) => (builtin ? setExtra(list) : setDraft((d) => ({ ...d, stations: list })))
  const room = MAX_STATIONS - base.length - own.length
  const accent = draft?.accent ?? builtin?.accent ?? '#8a9bff'

  const names = [...base, ...own].map((st) => st.name.trim())
  const dupName = names.find((n, i) => n && names.indexOf(n) !== i)
  const problem = (draft && !draft.name.trim()) ? '主题需要一个名字'
    : own.some((st) => !st.name.trim()) ? '每个频道都需要名字'
      : dupName ? `频道名“${dupName}”重复了，它同时是目录名，需要互不相同`
        : (draft && !own.length) ? '至少保留一个频道'
          : (draft && [...BUILTIN, ...s.customThemes].some((t) => t.id !== draft.id && t.name === draft.name.trim())) ? '已有同名主题，换个名字吧'
            : null

  const addStation = () => {
    const palette = [accent, draft?.accent2 ?? '#7dd3fc', '#ff8fb1', '#ffd36b', '#8be0a4', '#b79cff']
    const st = newStation(own.length + base.length, palette[own.length % palette.length])
    const taken = new Set(names)
    let k = 2
    const stem = st.name
    while (taken.has(st.name)) st.name = `${stem} ${k++}`
    setOwn([...own, st])
  }
  const move = (i, d) => {
    const list = [...own]
    ;[list[i], list[i + d]] = [list[i + d], list[i]]
    setOwn(list)
  }

  const save = () => {
    if (problem) return
    const clean = own.map((st) => ({ ...st, name: st.name.trim() }))
    const st = getRadio()
    if (builtin) st.setUserStations(id, clean)
    else st.saveCustomTheme({ ...draft, name: draft.name.trim(), stations: clean })
    close()
    // 正在播的频道被删掉了：换到这个主题的第一个频道
    const now = getRadio()
    if (now.phase === 'live' && now.theme === id && !theme.stationMap[now.station]) radio.tune(theme.stations[0].id)
  }

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true)
    const wasActive = getRadio().theme === id
    getRadio().deleteCustomTheme(id)
    useRadio.setState({ editing: null, ...(wasActive && getRadio().phase === 'live' ? { phase: 'select' } : {}) })
    if (wasActive) radio.stop()
  }

  const title = isNew ? '新建主题' : builtin ? `${builtin.name} · 频道` : `编辑 ${built?.name ?? ''}`
  const folderName = draft?.name.trim() || builtin?.name
  const radioRoot = builtin?.radioRoot ?? `${folderName} Radio`
  const wallRoot = builtin?.wallRoot ?? `${folderName} Wallpapers`

  return (
    <motion.div
      className="ted"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onPointerDown={close}
      style={{ '--ac': accent }}
    >
      <motion.aside
        className="ted__sheet"
        initial={{ x: 60, opacity: 0, filter: 'blur(8px)' }}
        animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
        exit={{ x: 40, opacity: 0, filter: 'blur(6px)' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <header className="ted__head">
          <div>
            <div className="ted__kicker">主题工坊 · Theme Studio</div>
            <h2>{title}</h2>
          </div>
          <button className="ted__x" onClick={close} aria-label="关闭"><Icon name="close" size={18} /></button>
        </header>

        <div className="ted__body">
          {draft && (
            <>
              <section className="ted__sec">
                <h3>基本信息</h3>
                <div className="ted__grid">
                  <Field label="主题名" hint="也是资源目录名">
                    <input className="ted__in ted__in--big" value={draft.name} maxLength={12} onChange={(e) => setDraft({ ...draft, name: e.target.value.replace(/[\\/:*?"<>|]/g, '') })} />
                  </Field>
                  <Field label="西文名">
                    <input className="ted__in" value={draft.latin} maxLength={32} onChange={(e) => setDraft({ ...draft, latin: e.target.value })} />
                  </Field>
                  <Field label="副标题">
                    <input className="ted__in" value={draft.subtitle} maxLength={28} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
                  </Field>
                  <Field label="年代" hint="可留空">
                    <div className="ted__pair">
                      <input className="ted__in" value={draft.years[0]} maxLength={6} placeholder="起" onChange={(e) => setDraft({ ...draft, years: [e.target.value, draft.years[1]] })} />
                      <input className="ted__in" value={draft.years[1]} maxLength={6} placeholder="止" onChange={(e) => setDraft({ ...draft, years: [draft.years[0], e.target.value] })} />
                    </div>
                  </Field>
                  <Field label="播放控件" hint="进入主题时的默认值">
                    <div className="ted__seg">
                      {STYLES.map((v) => (
                        <button key={v.id} type="button" className={(draft.style ?? 'modern') === v.id ? 'is-on' : ''} onClick={() => setDraft({ ...draft, style: v.id })}>{v.short}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="时钟">
                    <div className="ted__seg">
                      {CLOCKS.map((v) => (
                        <button key={v.id} type="button" className={(draft.clock ?? 'flat') === v.id ? 'is-on' : ''} onClick={() => setDraft({ ...draft, clock: v.id })}>{v.short}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="一段介绍" hint="显示在主题页" wide>
                    <textarea className="ted__in ted__in--area" value={draft.blurb} maxLength={120} rows={2} placeholder="写几句这个电台的气质" onChange={(e) => setDraft({ ...draft, blurb: e.target.value })} />
                  </Field>
                </div>
              </section>

              <section className="ted__sec">
                <h3>配色</h3>
                <div className="ted__palettes">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={draft.accent === p.accent && draft.accent2 === p.accent2 ? 'is-on' : ''}
                      onClick={() => setDraft({ ...draft, accent: p.accent, accent2: p.accent2 })}
                    >
                      <i style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})` }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                  <label className="ted__custom">
                    <input type="color" value={draft.accent} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} />
                    <input type="color" value={draft.accent2} onChange={(e) => setDraft({ ...draft, accent2: e.target.value })} />
                    <span>自定主色 / 辅色</span>
                  </label>
                </div>
              </section>

              <section className="ted__sec">
                <h3>画面风格<em>放入壁纸目录的图片会排在程序画面之前</em></h3>
                <div className="ted__moods">
                  {MOODS.map(([m, label, desc]) => (
                    <MoodCard key={m} mood={m} label={label} desc={desc} on={draft.mood === m} accent={draft.accent} accent2={draft.accent2} onPick={() => setDraft({ ...draft, mood: m })} />
                  ))}
                </div>
              </section>
            </>
          )}

          <section className="ted__sec">
            <h3>频道<em>{base.length + own.length} / {MAX_STATIONS}</em></h3>
            <div className="ted__stations">
              {base.map((st) => <StationRow key={st.id} st={built?.stationMap[st.id] ?? st} locked of={built} />)}
              {own.map((st, i) => (
                <StationRow
                  key={st.id}
                  st={st}
                  i={i}
                  n={own.length}
                  onChange={(v) => setOwn(own.map((x) => (x.id === st.id ? v : x)))}
                  onMove={(d) => move(i, d)}
                  onRemove={() => setOwn(own.filter((x) => x.id !== st.id))}
                />
              ))}
            </div>
            <button className="ted__add" type="button" disabled={room <= 0} onClick={addStation}>
              <Icon name="plus" size={16} />
              <span>{room > 0 ? `添加频道（还可添加 ${room} 个）` : `已到 ${MAX_STATIONS} 个频道的上限`}</span>
            </button>
          </section>

          <section className="ted__sec">
            <h3>音乐与壁纸放在哪里</h3>
            <ul className="ted__paths">
              <li><span>本地音乐</span><code>Resources/{radioRoot}/&lt;频道名&gt;/</code></li>
              <li><span>壁纸</span><code>Resources/{wallRoot}/&lt;频道名&gt;/</code></li>
              <li><span>在线歌单</span><code>云音乐面板（N）选中频道后导入</code></li>
            </ul>
            <p className="ted__note">音频直接丢进目录即可，文件名写成“歌手 - 歌名”会自动拆开；子文件夹会成为频道下的分组。目录变化后页面自动刷新。</p>
          </section>
        </div>

        <footer className="ted__foot">
          {draft && !isNew && (
            <button type="button" className={`ted__del ${confirmDelete ? 'is-armed' : ''}`} onClick={remove}>
              <Icon name="trash" size={15} />
              <span>{confirmDelete ? '再点一次，确认删除' : '删除主题'}</span>
            </button>
          )}
          <span className="ted__problem">{problem}</span>
          <button type="button" className="ted__cancel" onClick={close}>取消</button>
          <button type="button" className="ted__save" disabled={!!problem} onClick={save}>{isNew ? '创建主题' : '保存'}</button>
        </footer>
      </motion.aside>
    </motion.div>
  )
}

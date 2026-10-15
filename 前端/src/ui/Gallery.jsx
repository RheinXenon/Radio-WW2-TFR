// 画廊：按国别挑选壁纸。缺图的位置是一张“底片待冲洗”的暗房卡片
// 史实转绘的壁纸带黄铜光晕，悬停可见历史原照，双击或掀开折角进入史实档案；
// 登记了却尚未转绘的史实照片，以原照陈列在末尾
import { useState } from 'react'
import { useRadio } from '../store.js'
import { useT, useLoc } from '../i18n/index.js'
import { theme } from '../themes/index.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import { resolveWall } from '../scene/Stage.jsx'
import { Panel, Toggle } from './Panel.jsx'
import { openDossier, entryTitle } from './Dossier.jsx'
import './gallery.css'

export default function Gallery() {
  const sel = useRadio((s) => s.wallpaper)
  const follows = useRadio((s) => s.wallFollows)
  const t = useT()
  const L = useLoc()
  const shown = resolveWall(sel)
  const [pool, setPool] = useState(() => {
    const id = shown?.id.split('/')[0]
    return theme.pools[id] ? id : theme.poolOrder[0]
  })
  const p = theme.pools[pool]
  const st = theme.stationMap[p.station]

  // 标准四个场景位 + 额外放入的图；史实转绘的图用配对到的照片标题作场景名
  // 场景名一律按当前语言解析：登记照片取 entryTitle，占位槽取 sceneEn，池名取 nameEn
  const named = new Map(p.walls.map((w) => [w.name, w]))
  const slots = theme.poolSlots.map((s) => ({ ...s, scene: L(s, 'scene'), wall: named.get(s.name) }))
  const extra = p.walls.filter((w) => !theme.poolSlots.some((s) => s.name === w.name))
    .map((w) => {
      const e = theme.photoMap[`${pool}/${w.name}`]
      const scene = e ? entryTitle(e) : theme.wallName?.(w.name) ?? w.scene ?? t('第 {n} 幅', { n: w.name })
      return { name: w.name, scene, wall: w }
    })
  const pending = theme.photos.filter((e) => e.pool === pool && !e.wall)
  const hasHistory = theme.photos.some((e) => e.pool === pool)

  return (
    <Panel
      title={t('画廊')}
      sub={`Gallery · ${L(theme, 'name')}`}
      width={780}
      footer={
        <>
          <span>{t('新壁纸放入 {dir} 即自动上架', { dir: `Resources/${theme.wallRoot}/${theme.pools[pool].id}/` })}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {t('随频道联动')}
            <Toggle on={follows} onChange={(v) => useRadio.setState({ wallFollows: v })} label={t('壁纸随频道联动')} />
          </span>
        </>
      }
    >
      <nav className="gal__tabs">
        {theme.poolOrder.map((id) => {
          const pp = theme.pools[id]
          const s = theme.stationMap[pp.station]
          return (
            <button key={id} className={`gal__tab ${id === pool ? 'is-on' : ''}`} onClick={() => setPool(id)} style={{ '--glow': s.glow }}>
              {theme.photos.some((e) => e.pool === id) && <i className="gal__pip" title={t('含{record}', { record: L(theme.terms, 'record') })} />}
              <Emblem kind={s.emblem} size={30} />
              <span>{L(pp, 'name')}</span>
              <em className="tnum">{pp.walls.length}</em>
            </button>
          )
        })}
      </nav>

      {hasHistory && (
        <p className="gal__legend">
          <i />
          {L(theme.terms, 'legend')}
        </p>
      )}

      <div className="gal__grid" style={{ '--accent': st.accent, '--glow': st.glow }}>
        {[...slots, ...extra].map((slot) => {
          const w = slot.wall
          const cur = w && shown?.id === w.id
          if (!w) {
            return (
              <div key={slot.name} className="gal__card is-missing">
                <Pattern kind={st.pattern} color={st.accent} height={14} opacity={0.12} className="gal__pat" style={{ height: '100%' }} />
                <div className="gal__ph">
                  <Emblem kind={st.emblem} size={34} style={{ opacity: 0.35 }} />
                  <strong>{t('底片待冲洗')}</strong>
                  <span>{slot.scene}</span>
                </div>
              </div>
            )
          }
          const pick = () => useRadio.setState({ wallpaper: { pool, name: w.name } })
          const entry = theme.photoMap[`${pool}/${w.name}`]
          if (entry) return <HistoryCard key={w.id} entry={entry} wall={w} scene={slot.scene} cur={cur} onPick={pick} />
          return (
            <button key={w.id} className={`gal__card ${cur ? 'is-cur' : ''}`} onClick={pick}>
              <img src={w.thumb ?? w.url} alt={slot.scene} loading="lazy" decoding="async" draggable={false} />
              <div className="gal__cap">
                <span>{slot.scene}</span>
                {cur && <em>{t('正在展出')}</em>}
              </div>
            </button>
          )
        })}
        {pending.map((e) => <PendingCard key={e.id} entry={e} station={st} />)}
      </div>
    </Panel>
  )
}

// 史实转绘：原照到第一次悬停时才加载，停留时转绘渐隐、原照浮现
function HistoryCard({ entry, wall, scene, cur, onPick }) {
  const [peek, setPeek] = useState(false)
  const [peekReady, setPeekReady] = useState(false)
  const t = useT()
  const L = useLoc()
  const record = L(theme.terms, 'record')
  return (
    <div className={`gal__card is-history ${cur ? 'is-cur' : ''} ${peekReady ? 'can-peek' : ''}`} onPointerEnter={() => setPeek(true)}>
      <button className="gal__pick" onClick={onPick} onDoubleClick={() => openDossier(entry)} aria-label={t('设为壁纸：{scene}', { scene })}>
        <img src={wall.thumb ?? wall.url} alt={scene} loading="lazy" decoding="async" draggable={false} />
        {peek && entry.photo && (
          <img className="gal__orig" src={entry.photo} alt="" decoding="async" draggable={false} onLoad={() => setPeekReady(true)} />
        )}
      </button>
      <button className="gal__fold" onClick={() => openDossier(entry)} title={t('查看{record}', { record })} aria-label={t('查看{record}：{scene}', { record, scene })} />
      <div className="gal__cap">
        <span className="gal__swap">
          <b>{scene}</b>
          {entry.photo && <b>{t('历史{photo}', { photo: L(theme.terms, 'photo') })}</b>}
        </span>
        {cur && <em>{t('正在展出')}</em>}
      </div>
    </div>
  )
}

// 已登记、尚未转绘：以原照陈列在红灯暗房里；原照也未收录时只留一张空相纸
function PendingCard({ entry, station }) {
  const t = useT()
  const L = useLoc()
  return (
    <button className="gal__card is-history is-pending" onClick={() => openDossier(entry)} title={t('查看{record}', { record: L(theme.terms, 'record') })}>
      {entry.photo
        ? <img src={entry.photo} alt={entry.title} loading="lazy" decoding="async" draggable={false} />
        : (
          <>
            <Pattern kind={station.pattern} color={station.accent} height={14} opacity={0.12} className="gal__pat" style={{ height: '100%' }} />
            <div className="gal__ph">
              <Emblem kind={station.emblem} size={34} style={{ opacity: 0.35 }} />
              <strong>{t('档案待补')}</strong>
            </div>
          </>
        )}
      <i className="gal__fold" aria-hidden="true" />
      <div className="gal__cap">
        <span>{entryTitle(entry)}</span>
        <em>{t('转绘待绘制')}</em>
      </div>
    </button>
  )
}

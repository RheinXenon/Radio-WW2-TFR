// 设置：语言、播放控件、时钟、画面、频道启停、主题
import { useRadio, isOn } from '../store.js'
import { songsOf } from '../audio/radio.js'
import { theme, MAX_STATIONS } from '../themes/index.js'
import { STYLES, CLOCKS } from '../skins.js'
import { useT, useLoc } from '../i18n/index.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import { Panel, Section, Toggle, Slider, StepSlider } from './Panel.jsx'
import { STYLE_ART, CLOCK_ART } from './ChoiceArt.jsx'

// 壁纸轮换间隔档位与文案
const ROTATE_STEPS = [15, 30, 60, 300, 900]

// 频道歌曲数；有分组关闭或歌曲跳过时写成“可播 / 总数”
function countLabel(st, s, t) {
  const n = songsOf(st, s).length
  return n === st.songs.length ? t('{n} 首', { n }) : t('{n} / {total} 首', { n, total: st.songs.length })
}

// 风格卡片：播放控件与时钟共用同一种卡片
function Choices({ list, art, value, onPick }) {
  const t = useT()
  const L = useLoc()
  return (
    <div className="choices">
      {list.map((x) => {
        const Art = art[x.id]
        return (
          <button key={x.id} className={`choice ${value === x.id ? 'is-on' : ''}`} onClick={() => onPick(x.id)}>
            <div className="choice__art"><Art /></div>
            <div className="choice__name">{L(x, 'name')}</div>
            <div className="choice__desc">{L(x, 'desc')}</div>
          </button>
        )
      })}
    </div>
  )
}

export default function Settings({ onReplay }) {
  const s = useRadio()
  const t = useT()
  const L = useLoc()
  const set = (patch) => useRadio.setState(patch)
  const enabledCount = theme.stations.filter((st) => isOn(s, st.id)).length
  const fmtRotate = (sec) => (sec < 60 ? t('{s} 秒', { s: sec }) : t('{s} 分', { s: sec / 60 }))

  return (
    <Panel title={t('设置')} sub={t('Settings · 机内调整')} width={540}>
      <Section title={t('语言')}>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">语言 · Language</div>
            <div className="prow__desc">界面与档案文案的显示语言 · Display language for UI and records</div>
          </div>
          <div className="prow__val" style={{ display: 'flex', gap: 8 }}>
            <button className={`pbtn ${s.lang !== 'en' ? 'is-on' : ''}`} onClick={() => set({ lang: 'zh-CN' })}>中文</button>
            <button className={`pbtn ${s.lang === 'en' ? 'is-on' : ''}`} onClick={() => set({ lang: 'en' })}>EN</button>
          </div>
        </div>
      </Section>

      <Section title={t('播放控件')} hint={t('按 V 轮换 · 每个主题各自记住')}>
        <Choices list={STYLES} art={STYLE_ART} value={s.style} onPick={(id) => set({ style: id })} />
      </Section>

      <Section title={t('时钟')} hint={t('按 C 轮换 · 每个主题各自记住')}>
        <Choices list={CLOCKS} art={CLOCK_ART} value={s.clock} onPick={(id) => set({ clock: id })} />
      </Section>

      <Section title={t('画面')}>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('旋转唱片')}</div>
            <div className="prow__desc">{t('歌名行尾缀一张缓缓旋转的黑胶唱片，封面作盘面')}</div>
          </div>
          <Toggle on={s.disc} onChange={(v) => set({ disc: v })} label={t('旋转唱片')} />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('随乐律动')}</div>
            <div className="prow__desc">{t('光束、泛光与粒子随低音脉动')}</div>
          </div>
          <Toggle on={s.reactive} onChange={(v) => set({ reactive: v })} label={t('随乐律动')} />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('视差深度')}</div>
            <div className="prow__desc">{t('画面随鼠标转动的立体程度')}</div>
          </div>
          <div className="prow__val"><Slider value={s.parallax} min={0} max={1.8} onChange={(v) => set({ parallax: v })} label={t('视差深度')} /></div>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('滚轮移动画面')}</div>
            <div className="prow__desc">{t('非 16:9 的画作用滚轮上下平移看全貌；关闭后纵向改由鼠标指针带动')}</div>
          </div>
          <Toggle on={s.panMode !== 'pointer'} onChange={(v) => set({ panMode: v ? 'wheel' : 'pointer' })} label={t('滚轮移动画面')} />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('壁纸随频道联动')}</div>
            <div className="prow__desc">{t('调到某个频道时换上它的壁纸；关闭时只在画廊中手动更换')}</div>
          </div>
          <Toggle on={s.wallFollows} onChange={(v) => set({ wallFollows: v })} label={t('壁纸随频道联动')} />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('壁纸自动轮换')}</div>
            <div className="prow__desc">{t('每隔一段时间按随机牌序换同一壁纸池的下一幅，一轮看完才重复；换到别的池时重新洗牌')}</div>
          </div>
          <Toggle on={s.wallRotate} onChange={(v) => set({ wallRotate: v })} label={t('壁纸自动轮换')} />
        </div>
        {s.wallRotate && (
          <div className="prow">
            <div className="prow__main">
              <div className="prow__name">{t('轮换间隔')}</div>
              <div className="prow__desc">{t('时间一到便换下一幅，手动换壁纸后重新计时')}</div>
            </div>
            <div className="prow__val prow__stack" style={{ width: 200 }}>
              <span className="prow__steplabel latin tnum">{fmtRotate(s.wallRotateSec)}</span>
              <StepSlider steps={ROTATE_STEPS} value={s.wallRotateSec} onChange={(v) => set({ wallRotateSec: v })} label={t('轮换间隔')} />
            </div>
          </div>
        )}
      </Section>

      <Section title={t('频道')} hint={t('{on} / {total} 启用 · 停用的频道只剩静电', { on: enabledCount, total: theme.stations.length })}>
        {theme.stations.map((st) => (
          <div className="prow" key={st.id} style={{ opacity: isOn(s, st.id) ? 1 : 0.55, transition: 'opacity .3s' }}>
            <Emblem kind={st.emblem} size={30} />
            <div className="prow__main">
              <div className="prow__name">{L(st, 'name')}<span style={{ color: 'var(--cream-faint)', marginLeft: 10, fontSize: 12.5 }}>{L(st, 'city')} · {L(st, 'genre')}</span></div>
              <Pattern kind={st.pattern} color={st.accent} height={5} opacity={0.5} style={{ width: 120, marginTop: 6 }} />
            </div>
            <span className="latin tnum" style={{ fontSize: 13, color: 'var(--cream-faint)' }}>{countLabel(st, s, t)}</span>
            <Toggle on={isOn(s, st.id)} onChange={(v) => set({ enabled: { ...s.enabled, [st.id]: v } })} label={t('启用{name}', { name: L(st, 'name') })} />
          </div>
        ))}
      </Section>

      <Section title={t('主题')} hint={t('{name} · {n} / {max} 个频道', { name: L(theme, 'name'), n: theme.stations.length, max: MAX_STATIONS })}>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('换一个主题')}</div>
            <div className="prow__desc">{t('回到主题页，上下滚动挑选；每个主题记得自己上次停在哪个频道、哪幅壁纸')}</div>
          </div>
          <button className="pbtn" onClick={() => window.dispatchEvent(new CustomEvent('radio:themes'))}>{t('主题页')}</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{theme.custom ? t('编辑这个主题') : t('添加频道')}</div>
            <div className="prow__desc">{theme.custom ? t('名称、配色、画面风格与全部频道都可以改') : t('在内置频道之外再添几个自己的频道，总数不超过 {max} 个', { max: MAX_STATIONS })}</div>
          </div>
          <button className="pbtn" onClick={() => set({ editing: theme.id, panel: null })}>{theme.custom ? t('编辑') : t('管理')}</button>
        </div>
      </Section>

      <Section title={t('其他')}>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('歌单')}</div>
            <div className="prow__desc">{t('珍藏 {n} 首，自建歌单 {m} 张；分组开关与逐首跳过也在这里', { n: s.favorites.length, m: s.playlists.length })}</div>
          </div>
          <button className="pbtn" onClick={() => set({ panel: 'playlist' })}>{t('打开')}</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('云音乐')}</div>
            <div className="prow__desc">{t('扫码登录网易云，把单曲或歌单加进当前主题各频道的子歌单，在线播放不占磁盘')}</div>
          </div>
          <button className="pbtn" onClick={() => set({ panel: 'netease' })}>{t('打开')}</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('跳过会员歌曲')}</div>
            <div className="prow__desc">{t('未登录云音乐或账号无会员时，本台与全频段轮播自动跳过会员歌曲（列表中灰显）；点播与歌单波段不受影响')}</div>
          </div>
          <Toggle on={s.skipVipWithoutMember} onChange={(v) => set({ skipVipWithoutMember: v })} label={t('跳过会员歌曲')} />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('开场')}</div>
            <div className="prow__desc">{t('再看一次开机与主题开场')}</div>
          </div>
          <button className="pbtn" onClick={onReplay}>{t('重播')}</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{t('快捷键')}</div>
            <div className="prow__desc">{t('按 ? 随时查看')}</div>
          </div>
          <button className="pbtn" onClick={() => set({ panel: 'help' })}>{t('查看')}</button>
        </div>
      </Section>
    </Panel>
  )
}

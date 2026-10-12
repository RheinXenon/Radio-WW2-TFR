// 设置：播放控件、时钟、画面、频道启停、主题
import { useRadio, isOn } from '../store.js'
import { songsOf } from '../audio/radio.js'
import { theme, MAX_STATIONS } from '../themes/index.js'
import { STYLES, CLOCKS } from '../skins.js'
import { Emblem, Pattern } from '../themes/marks.jsx'
import { Panel, Section, Toggle, Slider, StepSlider } from './Panel.jsx'
import { STYLE_ART, CLOCK_ART } from './ChoiceArt.jsx'

// 壁纸轮换间隔档位与文案
const ROTATE_STEPS = [15, 30, 60, 300, 900]
const fmtRotate = (s) => (s < 60 ? `${s} 秒` : `${s / 60} 分`)

// 频道歌曲数；有分组关闭或歌曲跳过时写成“可播 / 总数”
function countLabel(st, s) {
  const n = songsOf(st, s).length
  return n === st.songs.length ? `${n} 首` : `${n} / ${st.songs.length} 首`
}

// 风格卡片：播放控件与时钟共用同一种卡片
function Choices({ list, art, value, onPick }) {
  return (
    <div className="choices">
      {list.map((x) => {
        const Art = art[x.id]
        return (
          <button key={x.id} className={`choice ${value === x.id ? 'is-on' : ''}`} onClick={() => onPick(x.id)}>
            <div className="choice__art"><Art /></div>
            <div className="choice__name">{x.name}</div>
            <div className="choice__desc">{x.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

export default function Settings({ onReplay }) {
  const s = useRadio()
  const set = (patch) => useRadio.setState(patch)
  const enabledCount = theme.stations.filter((st) => isOn(s, st.id)).length

  return (
    <Panel title="设置" sub="Settings · 机内调整" width={540}>
      <Section title="播放控件" hint="按 V 轮换 · 每个主题各自记住">
        <Choices list={STYLES} art={STYLE_ART} value={s.style} onPick={(id) => set({ style: id })} />
      </Section>

      <Section title="时钟" hint="按 C 轮换 · 每个主题各自记住">
        <Choices list={CLOCKS} art={CLOCK_ART} value={s.clock} onPick={(id) => set({ clock: id })} />
      </Section>

      <Section title="画面">
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">旋转唱片</div>
            <div className="prow__desc">歌名行尾缀一张缓缓旋转的黑胶唱片，封面作盘面</div>
          </div>
          <Toggle on={s.disc} onChange={(v) => set({ disc: v })} label="旋转唱片" />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">随乐律动</div>
            <div className="prow__desc">光束、泛光与粒子随低音脉动</div>
          </div>
          <Toggle on={s.reactive} onChange={(v) => set({ reactive: v })} label="随乐律动" />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">视差深度</div>
            <div className="prow__desc">画面随鼠标转动的立体程度</div>
          </div>
          <div className="prow__val"><Slider value={s.parallax} min={0} max={1.8} onChange={(v) => set({ parallax: v })} label="视差深度" /></div>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">滚轮移动画面</div>
            <div className="prow__desc">非 16:9 的画作用滚轮上下平移看全貌；关闭后纵向改由鼠标指针带动</div>
          </div>
          <Toggle on={s.panMode !== 'pointer'} onChange={(v) => set({ panMode: v ? 'wheel' : 'pointer' })} label="滚轮移动画面" />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">壁纸随频道联动</div>
            <div className="prow__desc">调到某个频道时换上它的壁纸；关闭时只在画廊中手动更换</div>
          </div>
          <Toggle on={s.wallFollows} onChange={(v) => set({ wallFollows: v })} label="壁纸随频道联动" />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">壁纸自动轮换</div>
            <div className="prow__desc">每隔一段时间按随机牌序换同一壁纸池的下一幅，一轮看完才重复；换到别的池时重新洗牌</div>
          </div>
          <Toggle on={s.wallRotate} onChange={(v) => set({ wallRotate: v })} label="壁纸自动轮换" />
        </div>
        {s.wallRotate && (
          <div className="prow">
            <div className="prow__main">
              <div className="prow__name">轮换间隔</div>
              <div className="prow__desc">时间一到便换下一幅，手动换壁纸后重新计时</div>
            </div>
            <div className="prow__val prow__stack" style={{ width: 200 }}>
              <span className="prow__steplabel latin tnum">{fmtRotate(s.wallRotateSec)}</span>
              <StepSlider steps={ROTATE_STEPS} value={s.wallRotateSec} onChange={(v) => set({ wallRotateSec: v })} label="轮换间隔" />
            </div>
          </div>
        )}
      </Section>

      <Section title="频道" hint={`${enabledCount} / ${theme.stations.length} 启用 · 停用的频道只剩静电`}>
        {theme.stations.map((st) => (
          <div className="prow" key={st.id} style={{ opacity: isOn(s, st.id) ? 1 : 0.55, transition: 'opacity .3s' }}>
            <Emblem kind={st.emblem} size={30} />
            <div className="prow__main">
              <div className="prow__name">{st.name}<span style={{ color: 'var(--cream-faint)', marginLeft: 10, fontSize: 12.5 }}>{st.city} · {st.genre}</span></div>
              <Pattern kind={st.pattern} color={st.accent} height={5} opacity={0.5} style={{ width: 120, marginTop: 6 }} />
            </div>
            <span className="latin tnum" style={{ fontSize: 13, color: 'var(--cream-faint)' }}>{countLabel(st, s)}</span>
            <Toggle on={isOn(s, st.id)} onChange={(v) => set({ enabled: { ...s.enabled, [st.id]: v } })} label={`启用${st.name}`} />
          </div>
        ))}
      </Section>

      <Section title="主题" hint={`${theme.name} · ${theme.stations.length} / ${MAX_STATIONS} 个频道`}>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">换一个主题</div>
            <div className="prow__desc">回到主题页，上下滚动挑选；每个主题记得自己上次停在哪个频道、哪幅壁纸</div>
          </div>
          <button className="pbtn" onClick={() => window.dispatchEvent(new CustomEvent('radio:themes'))}>主题页</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">{theme.custom ? '编辑这个主题' : '添加频道'}</div>
            <div className="prow__desc">{theme.custom ? '名称、配色、画面风格与全部频道都可以改' : `在内置频道之外再添几个自己的频道，总数不超过 ${MAX_STATIONS} 个`}</div>
          </div>
          <button className="pbtn" onClick={() => set({ editing: theme.id, panel: null })}>{theme.custom ? '编辑' : '管理'}</button>
        </div>
      </Section>

      <Section title="其他">
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">歌单</div>
            <div className="prow__desc">珍藏 {s.favorites.length} 首，自建歌单 {s.playlists.length} 张；分组开关与逐首跳过也在这里</div>
          </div>
          <button className="pbtn" onClick={() => set({ panel: 'playlist' })}>打开</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">云音乐</div>
            <div className="prow__desc">扫码登录网易云，把单曲或歌单加进当前主题各频道的子歌单，在线播放不占磁盘</div>
          </div>
          <button className="pbtn" onClick={() => set({ panel: 'netease' })}>打开</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">跳过会员歌曲</div>
            <div className="prow__desc">未登录云音乐或账号无会员时，本台与全频段轮播自动跳过会员歌曲（列表中灰显）；点播与歌单波段不受影响</div>
          </div>
          <Toggle on={s.skipVipWithoutMember} onChange={(v) => set({ skipVipWithoutMember: v })} label="跳过会员歌曲" />
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">开场</div>
            <div className="prow__desc">再看一次开机与主题开场</div>
          </div>
          <button className="pbtn" onClick={onReplay}>重播</button>
        </div>
        <div className="prow">
          <div className="prow__main">
            <div className="prow__name">快捷键</div>
            <div className="prow__desc">按 ? 随时查看</div>
          </div>
          <button className="pbtn" onClick={() => set({ panel: 'help' })}>查看</button>
        </div>
      </Section>
    </Panel>
  )
}

// 外围：台标、工具按钮列、快捷键说明、轻提示
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRadio } from '../store.js'
import { theme } from '../themes/index.js'
import { useT, useLoc } from '../i18n/index.js'
import { Icon } from './Icon.jsx'
import './chrome.css'

export function Brand() {
  const t = useT()
  const L = useLoc()
  return (
    <div className="brand">
      <div className="brand__name">{t('沉浸式电台')}</div>
      <div className="brand__theme">
        <span>{L(theme, 'name')}</span>
        {theme.years && <><i /><span className="latin tnum">{theme.years[0]}—{theme.years[1]}</span></>}
      </div>
    </div>
  )
}

const RAIL = [
  ['playlist', 'list', '歌单', 'L'],
  ['netease', 'disc', '云音乐', 'N'],
  ['gallery', 'gallery', '画廊', 'G'],
  ['mixer', 'mixer', '环境声', 'E'],
  ['settings', 'settings', '设置', 'O'],
]

// 回到主题页
const openThemes = () => window.dispatchEvent(new CustomEvent('radio:themes'))

export function Rail() {
  const t = useT()
  const panel = useRadio((s) => s.panel)
  const toggle = useRadio((s) => s.togglePanel)
  return (
    <nav className="rail">
      {RAIL.map(([id, icon, label, key]) => (
        <button key={id} className={`rail__btn ${panel === id ? 'is-on' : ''}`} onClick={() => toggle(id)} aria-label={t(label)}>
          <Icon name={icon} size={19} />
          <span className="rail__tip">{t(label)}<kbd>{key}</kbd></span>
        </button>
      ))}
      <button className="rail__btn" onClick={openThemes} aria-label={t('主题')}>
        <Icon name="themes" size={19} />
        <span className="rail__tip">{t('主题')}<kbd>T</kbd></span>
      </button>
      <span className="rail__sep" />
      <button className="rail__btn" onClick={() => useRadio.setState({ uiHidden: true, panel: null })} aria-label={t('隐藏界面')}>
        <Icon name="hide" size={19} />
        <span className="rail__tip">{t('只看壁纸')}<kbd>H</kbd></span>
      </button>
      <button className={`rail__btn ${panel === 'help' ? 'is-on' : ''}`} onClick={() => toggle('help')} aria-label={t('快捷键')}>
        <Icon name="help" size={19} />
        <span className="rail__tip">{t('快捷键')}<kbd>?</kbd></span>
      </button>
    </nav>
  )
}

const KEYS = [
  ['空格', '播放 / 暂停'],
  ['← →', '上一首 / 下一首'],
  ['↑ ↓', '音量'],
  ['M', '静音'],
  ['[ ]', '调到相邻频道'],
  ['1 2 3', '本台 / 全频段 / 歌单'],
  ['S', '切换播放顺序'],
  ['F', '收入或移出珍藏'],
  ['Q W', '同一壁纸池的上一幅 / 下一幅'],
  ['档案内', '← → 翻阅档案，Esc 返回画廊'],
  ['L', '歌单'],
  ['N', '云音乐导入'],
  ['G', '画廊'],
  ['E', '环境声混音台'],
  ['O', '设置'],
  ['V', '轮换播放控件'],
  ['C', '轮换时钟样式'],
  ['T', '回到主题页，换一个主题'],
  ['H', '只看壁纸'],
  ['Esc', '关闭面板'],
]

export function Help() {
  const t = useT()
  return (
    <motion.div
      className="help"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      onPointerDown={() => useRadio.setState({ panel: null })}
    >
      <motion.div
        className="help__card"
        initial={{ y: 16, filter: 'blur(6px)' }}
        animate={{ y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="panel__sub sc">Keyboard</div>
        <h2 className="panel__title">{t('快捷键')}</h2>
        <div className="hairline" style={{ margin: '18px 0 8px' }} />
        <dl>
          {KEYS.map(([k, v]) => (
            <div key={k} className="help__row">
              <dt>{k.split(' ').map((x) => <kbd key={x}>{t(x)}</kbd>)}</dt>
              <dd>{t(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="help__foot">{t('鼠标静止片刻，控件会自动隐去；歌曲信息与时钟常驻')}</p>
      </motion.div>
    </motion.div>
  )
}

export function Toast() {
  const notice = useRadio((s) => s.notice)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => useRadio.setState({ notice: null }), 3200)
    return () => clearTimeout(t)
  }, [notice])
  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.at}
          className="toast"
          initial={{ opacity: 0, y: -10, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -6, x: '-50%' }}
          transition={{ duration: 0.4 }}
        >
          {notice.text}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const notify = (text) => useRadio.setState({ notice: { text, at: performance.now() } })

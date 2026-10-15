// 电台开场：待机 → 开机预热
// 待机时铭牌是未点亮的玻璃；按下电源，灯丝加热、刻度灯逐字点亮台名、魔眼睁开
import { useEffect } from 'react'
import { useRadio } from '../store.js'
import { useT } from '../i18n/index.js'
import './boot.css'

export default function Boot({ on, onPower, onDone }) {
  const t = useT()
  const lang = useRadio((s) => s.lang)

  useEffect(() => {
    if (!on) {
      const go = (e) => {
        if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return
        onPower()
      }
      window.addEventListener('keydown', go)
      return () => window.removeEventListener('keydown', go)
    }
    const end = setTimeout(onDone, 4700)
    const skip = () => onDone()
    const arm = setTimeout(() => {
      window.addEventListener('pointerdown', skip)
      window.addEventListener('keydown', skip)
    }, 400)
    return () => {
      clearTimeout(end); clearTimeout(arm)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [on])

  return (
    <div className={`boot ${on ? 'is-on' : ''}`} onClick={on ? undefined : onPower}>
      <div className="boot__warm" />
      <div className="boot__plate">
        <div className="boot__eye"><i /></div>
        <h1 className="boot__name" aria-label={t('沉浸式电台')}>
          {[...t('沉浸式电台')].map((c, i) => (
            <span key={i} style={{ '--i': i }}>{c}</span>
          ))}
        </h1>
        <div className="boot__filament" />
        <div className="boot__meta">
          <span>{t('中波')}</span><i>·</i><span>{t('短波')}</span><i>·</i><span>{t('拾音')}</span>
        </div>
      </div>
      {/* 待机页的语言快捷切换：开机钮上方两个极简文字钮 */}
      <div className="boot__lang">
        <button
          className={lang !== 'en' ? 'is-on' : ''}
          onClick={(e) => { e.stopPropagation(); useRadio.setState({ lang: 'zh-CN' }) }}
        >中文</button>
        <i />
        <button
          className={lang === 'en' ? 'is-on' : ''}
          onClick={(e) => { e.stopPropagation(); useRadio.setState({ lang: 'en' }) }}
        >EN</button>
      </div>
      <button className="boot__switch" aria-label={t('开机')} onClick={(e) => { e.stopPropagation(); if (!on) onPower() }}>
        <span className="boot__knob" />
        <span className="boot__hint">{t('轻触 · 开机')}</span>
      </button>
      <div className="boot__grain" />
    </div>
  )
}

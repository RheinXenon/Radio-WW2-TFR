// 霓虹终端：烈焰升腾世界里的全息时钟面板
// 磨砂紫玻璃上压着扫描线，四角是定位框；霓虹灯管写出时与分，红青两道残影错开一像素，
// 秒数以青色小字缀在一旁，下方 60 格秒条逐格点亮；每隔几秒，读数被信号干扰撕开一下又归位
// 底部日期、星期、纪年各占一组上下两行的分区，隔以渐隐竖线，分别用青、品红、紫点亮
import { useEffect, useState } from 'react'
import { useRadio } from '../store.js'
import { useT } from '../i18n/index.js'
import { useNow, pad2, weekChar, fullStamp } from './clockTime.js'
import './neonclock.css'

const SLOTS = Array.from({ length: 60 }, (_, i) => i)

function utcLabel(d) {
  const o = -d.getTimezoneOffset()
  const a = Math.abs(o)
  return `UTC${o < 0 ? '−' : '+'}${pad2(Math.floor(a / 60))}:${pad2(a % 60)}`
}

// 每隔 5~11 秒发作一次、持续约 0.3 秒的信号干扰
function useGlitch() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let t
    const arm = () => {
      t = setTimeout(() => {
        setOn(true)
        t = setTimeout(() => { setOn(false); arm() }, 300)
      }, 5000 + Math.random() * 6000)
    }
    arm()
    return () => clearTimeout(t)
  }, [])
  return on
}

export default function NeonClock() {
  const date = useNow(1000)
  const glitch = useGlitch()
  const lang = useRadio((s) => s.lang)
  const t = useT()
  const hm = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
  const sec = date.getSeconds()

  return (
    <div className={`nclk ${glitch ? 'is-glitch' : ''}`} title={fullStamp(date, lang)}>
      <div className="nclk__head">
        <span><i className="nclk__rec" />TFR//LOCAL</span>
        <span>{utcLabel(date)}</span>
      </div>
      <div className="nclk__time">
        <span className="nclk__hm tnum" data-text={hm}>{hm}</span>
        <span className="nclk__sec tnum">{pad2(sec)}</span>
      </div>
      <div className="nclk__secs" aria-hidden>
        {SLOTS.map((i) => <i key={i} className={i < sec ? 'on' : i === sec ? 'head' : ''} style={{ '--k': i / 59 }} />)}
      </div>
      <div className="nclk__foot">
        <span className="nclk__cell nclk__cell--date">
          <em className="tnum">{date.getFullYear()}</em>
          <b className="tnum">{pad2(date.getMonth() + 1)}.{pad2(date.getDate())}</b>
        </span>
        <i className="nclk__sep" />
        <span className="nclk__cell nclk__cell--week">
          <em>{t('星期')}</em>
          <b>{weekChar(date, lang)}</b>
        </span>
        <i className="nclk__sep" />
        <span className="nclk__cell nclk__cell--era">
          <em>{t('新世界')}</em>
          <b>{t('第 {n} 年', { n: date.getFullYear() - 2019 })}</b>
        </span>
      </div>
    </div>
  )
}

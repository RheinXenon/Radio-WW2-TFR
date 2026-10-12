// 极简时钟：扁平的磨砂圆盘配细体数字，颜色取主题主色
// 圆盘上只有两根圆头指针与十二个小点，秒数画成沿边缘的一道细环：偶数分钟从零长满，奇数分钟从起点收尽，首尾相接不跳变
import { useRef } from 'react'
import { useNow, useFrame, handAngles, rotate, pad2, WEEK } from './clockTime.js'
import './flatclock.css'

const R = 28.5
const C = 2 * Math.PI * R

export default function FlatClock() {
  const h = useRef(), m = useRef(), ring = useRef()
  const date = useNow()

  useFrame((now) => {
    const a = handAngles(now)
    rotate(m, a.m); rotate(h, a.h)
    const p = a.sec / 60
    const grow = now.getMinutes() % 2 === 0
    ring.current?.setAttribute('stroke-dasharray', `${(grow ? p : 1 - p) * C} ${C}`)
    ring.current?.setAttribute('stroke-dashoffset', grow ? 0 : -p * C)
  })

  return (
    <div className="fclk" title={date.toLocaleString('zh-CN')}>
      <div className="fclk__dial">
        <svg viewBox="-32 -32 64 64" aria-hidden>
          <circle r={R} className="fclk__track" />
          <circle ref={ring} r={R} className="fclk__ring" transform="rotate(-90)" />
          {Array.from({ length: 12 }, (_, i) => (
            <circle key={i} cy={-22} r={i % 3 ? 0.9 : 1.4} className="fclk__dot" transform={`rotate(${i * 30})`} />
          ))}
          <g ref={h}><line y1="0" y2="-13" className="fclk__hand fclk__hand--h" /></g>
          <g ref={m}><line y1="0" y2="-19.5" className="fclk__hand fclk__hand--m" /></g>
          <circle r="2.6" className="fclk__pin" />
          <circle r="1" fill="#fff" />
        </svg>
      </div>
      <div className="fclk__text">
        <span className="fclk__time tnum">{pad2(date.getHours())}<i className="fclk__colon" />{pad2(date.getMinutes())}</span>
        <span className="fclk__date">
          <b>周{WEEK[date.getDay()]}</b>
          <span className="tnum">{date.getMonth() + 1} 月 {date.getDate()} 日</span>
        </span>
      </div>
    </div>
  )
}

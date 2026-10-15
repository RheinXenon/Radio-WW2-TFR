// 腕表时钟：以二战飞行员观测表为原型
// 黑色哑光表盘、夜光数字、12 点三角标、洋葱头表冠；秒针每秒 6 跳，如同 21600 次/时的机芯
import { useRef } from 'react'
import { useRadio } from '../store.js'
import { useNow, useFrame, handAngles, rotate, dateLine, fullStamp, pad2 } from './clockTime.js'
import './watch.css'

function Hand({ len, w, tail = 0, lume, color, r }) {
  // 剑形指针：中段收窄成尖
  const d = `M ${-w / 2} ${tail} L ${-w / 2} ${-len * 0.72} L 0 ${-len} L ${w / 2} ${-len * 0.72} L ${w / 2} ${tail} Z`
  return (
    <g ref={r}>
      <path d={d} fill={color} />
      {lume && <path d={`M ${-w / 2 + 1.1} ${-len * 0.18} L ${-w / 2 + 1.1} ${-len * 0.7} L 0 ${-len + 3} L ${w / 2 - 1.1} ${-len * 0.7} L ${w / 2 - 1.1} ${-len * 0.18} Z`} fill="url(#lume)" />}
    </g>
  )
}

export default function Watch() {
  const h = useRef(), m = useRef(), s = useRef()
  const date = useNow()
  const lang = useRadio((s) => s.lang)

  useFrame((now) => {
    const a = handAngles(now, 6)
    rotate(s, a.s); rotate(m, a.m); rotate(h, a.h)
  })

  return (
    <div className="watch" title={fullStamp(date, lang)}>
      <svg viewBox="-60 -60 132 120" className="watch__face" aria-hidden>
        <defs>
          <radialGradient id="dial" cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#25221e" /><stop offset="0.7" stopColor="#12100e" /><stop offset="1" stopColor="#090807" />
          </radialGradient>
          <linearGradient id="case" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f2e3bd" /><stop offset="0.3" stopColor="#9c8350" />
            <stop offset="0.55" stopColor="#e8d4a2" /><stop offset="0.8" stopColor="#6d5730" /><stop offset="1" stopColor="#c7ab6e" />
          </linearGradient>
          <linearGradient id="lume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3f0d2" /><stop offset="1" stopColor="#d6dcb4" />
          </linearGradient>
          <linearGradient id="blued" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1d2c55" /><stop offset="0.5" stopColor="#4a6cb3" /><stop offset="1" stopColor="#1d2c55" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.9" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 洋葱头表冠 */}
        <g transform="translate(55 0)">
          <rect x="-4" y="-3.2" width="5" height="6.4" fill="#8f7746" />
          <path d="M1 -6 C 9 -6 11 -2.5 11 0 C 11 2.5 9 6 1 6 Z" fill="url(#case)" />
          {[-4, -2, 0, 2, 4].map((y) => <line key={y} x1="2" x2="10" y1={y} y2={y} stroke="#5b4826" strokeWidth="0.5" />)}
        </g>
        <circle r="56" fill="url(#case)" />
        <circle r="53.2" fill="#14110d" />
        <circle r="52" fill="url(#dial)" />

        {/* 分钟刻度 */}
        {Array.from({ length: 60 }, (_, i) => (
          <line key={i} y1={-50} y2={i % 5 ? -47.2 : -45.5} stroke="#e9e3c8" strokeWidth={i % 5 ? 0.6 : 1.3}
            transform={`rotate(${i * 6})`} opacity={i % 5 ? 0.7 : 0.95} />
        ))}
        {/* 小时数字 */}
        {Array.from({ length: 11 }, (_, i) => {
          const n = i + 1
          const a = (n * 30 - 90) * (Math.PI / 180)
          return (
            <text key={n} x={Math.cos(a) * 36.5} y={Math.sin(a) * 36.5 + 4.6} textAnchor="middle"
              className="watch__num" filter="url(#glow)">{n}</text>
          )
        })}
        {/* 12 点三角与双点 */}
        <path d="M -5.6 -45 L 5.6 -45 L 0 -33 Z" fill="url(#lume)" filter="url(#glow)" />
        <circle cx="-8.6" cy="-44" r="1.4" fill="#f3f0d2" />
        <circle cx="8.6" cy="-44" r="1.4" fill="#f3f0d2" />

        <g className="watch__hands">
          <Hand r={h} len={25} w={5.2} tail={5} lume color="url(#blued)" />
          <Hand r={m} len={38} w={4.2} tail={6} lume color="url(#blued)" />
          <g ref={s}>
            <line y1="10" y2="-44" stroke="#c7d3ef" strokeWidth="0.75" />
            <circle cy="10" r="1.6" fill="#c7d3ef" />
          </g>
          <circle r="2.4" fill="url(#case)" />
          <circle r="0.9" fill="#2b2216" />
        </g>
        <circle r="52" fill="url(#glass)" />
      </svg>
      <div className="watch__date">
        <span className="watch__time latin tnum">{pad2(date.getHours())}<i>:</i>{pad2(date.getMinutes())}</span>
        <span className="watch__day">{dateLine(date, lang)}</span>
      </div>
    </div>
  )
}

// 鎏金怀表：以十九世纪的金壳怀表为原型
// 金壳硬币边、12 点处的柄头与提环；银色表盘中央是玑镂玫瑰纹，外圈放射状罗马数字与铁轨式分钟圈；
// 蓝钢苹果针、6 点处的小秒针（每秒 5 跳，如同 18000 次/时的老机芯），12 点下方开一扇月相窗
import { useRef } from 'react'
import { useNow, useFrame, handAngles, rotate, zhDate, pad2 } from './clockTime.js'
import './pocketwatch.css'

const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
const SYNODIC = 29.530588853
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14) // 2000 年 1 月 6 日的新月，作为月相推算的起点

// 月龄在朔望月中的位置：0 新月，0.5 满月
const moonPhase = (d) => ((((d - NEW_MOON) / 86400000) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC

// 一天里的时段写成乐章速度
function tempoOf(h) {
  if (h < 5) return ['Lento', '慢板']
  if (h < 8) return ['Aubade', '晨曲']
  if (h < 12) return ['Allegro', '快板']
  if (h < 14) return ['Andante', '行板']
  if (h < 18) return ['Moderato', '中板']
  if (h < 21) return ['Serenata', '小夜曲']
  return ['Notturno', '夜曲']
}

// 苹果针：细杆穿过一枚空心圆环，环外收成尖。ring 为圆环圆心到轴心的距离，rr 为圆环半径
function PommeHand({ len, ring, rr, w, r }) {
  return (
    <g ref={r}>
      <path d={`M ${-w} 4.5 L ${-w * 0.9} 0 L ${-w * 0.45} ${-ring + rr} L ${w * 0.45} ${-ring + rr} L ${w * 0.9} 0 L ${w} 4.5 Z`} fill="url(#pw-blued)" />
      <circle cy={-ring} r={rr} fill="none" stroke="url(#pw-blued)" strokeWidth={w * 1.05} />
      <path d={`M ${-w * 0.95} ${-ring - rr + 0.2} L 0 ${-len} L ${w * 0.95} ${-ring - rr + 0.2} Z`} fill="url(#pw-blued)" />
    </g>
  )
}

// 玑镂玫瑰纹：一圈错开的圆叠出的波纹，只在表盘中央显出
const ROSETTE = Array.from({ length: 40 }, (_, i) => i * 9)

export default function PocketWatch() {
  const h = useRef(), m = useRef(), s = useRef()
  const date = useNow()

  useFrame((now) => {
    const a = handAngles(now, 5)
    rotate(s, a.s); rotate(m, a.m); rotate(h, a.h)
  })

  const moonX = -20 + moonPhase(date.getTime()) * 40
  const [tempo, tempoZh] = tempoOf(date.getHours())

  return (
    <div className="pw" title={date.toLocaleString('zh-CN')}>
      <svg viewBox="-60 -88 120 148" className="pw__face" aria-hidden>
        <defs>
          <linearGradient id="pw-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fdedbb" /><stop offset="0.26" stopColor="#c99f4f" />
            <stop offset="0.5" stopColor="#f5dc9c" /><stop offset="0.76" stopColor="#86621f" /><stop offset="1" stopColor="#d9b565" />
          </linearGradient>
          <linearGradient id="pw-gold2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbe6a8" /><stop offset="0.45" stopColor="#a47c35" /><stop offset="1" stopColor="#efd18a" />
          </linearGradient>
          <radialGradient id="pw-silver" cx="0.44" cy="0.36" r="0.78">
            <stop offset="0" stopColor="#fcfaf4" /><stop offset="0.55" stopColor="#ece5d5" /><stop offset="1" stopColor="#cfc5ae" />
          </radialGradient>
          <linearGradient id="pw-blued" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#141f52" /><stop offset="0.5" stopColor="#3d5fb6" /><stop offset="1" stopColor="#141f52" />
          </linearGradient>
          <linearGradient id="pw-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b1640" /><stop offset="1" stopColor="#253a7c" />
          </linearGradient>
          <radialGradient id="pw-moon" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fff3c8" /><stop offset="1" stopColor="#cfa54c" />
          </radialGradient>
          <linearGradient id="pw-glass" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.34" /><stop offset="0.42" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="pw-guil"><circle r="29.6" /></clipPath>
          <clipPath id="pw-sub"><circle cy="19" r="10" /></clipPath>
          <clipPath id="pw-win"><path d="M -10 -12 A 10 10 0 0 1 10 -12 Z" /></clipPath>
          <filter id="pw-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0.5" dy="1.1" stdDeviation="0.55" floodColor="#2a1d08" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* 提环、柄颈与表冠 */}
        <ellipse cy="-73" rx="12.6" ry="11.2" fill="none" stroke="url(#pw-gold)" strokeWidth="2.8" />
        <ellipse cy="-73" rx="11.2" ry="9.8" fill="none" stroke="#5b4116" strokeWidth="0.45" opacity="0.7" />
        <path d="M -3.6 -55 L -2.7 -62.5 L 2.7 -62.5 L 3.6 -55 Z" fill="url(#pw-gold2)" />
        <rect x="-5.6" y="-70.5" width="11.2" height="8.6" rx="1.8" fill="url(#pw-gold)" />
        {[-4, -2.4, -0.8, 0.8, 2.4, 4].map((x) => <line key={x} x1={x} x2={x} y1="-69.6" y2="-62.8" stroke="#6b4c19" strokeWidth="0.45" />)}

        {/* 金壳：硬币边、抛光内圈与表盘边沿的暗线 */}
        <circle r="56" fill="url(#pw-gold)" />
        {Array.from({ length: 144 }, (_, i) => (
          <line key={i} y1="-53.7" y2="-56" stroke="#6b4c19" strokeWidth="0.38" opacity="0.6" transform={`rotate(${i * 2.5})`} />
        ))}
        <circle r="53.5" fill="none" stroke="#4a3410" strokeWidth="0.5" />
        <circle r="53.2" fill="url(#pw-gold2)" />
        <circle r="51.8" fill="#3c2b0e" />
        <circle r="51.3" fill="url(#pw-silver)" />

        {/* 中央的玑镂玫瑰纹 */}
        <g clipPath="url(#pw-guil)" stroke="#8a806b" strokeWidth="0.22" fill="none" opacity="0.6">
          {ROSETTE.map((a) => <circle key={a} cx="11.5" r="17" transform={`rotate(${a})`} />)}
        </g>
        <circle r="30.2" fill="none" stroke="#8a806b" strokeWidth="0.35" />
        <circle r="31" fill="none" stroke="#8a806b" strokeWidth="0.2" />

        {/* 铁轨式分钟圈，逢五分一颗圆点 */}
        <circle r="47.2" fill="none" stroke="#2a2520" strokeWidth="0.35" />
        <circle r="50.2" fill="none" stroke="#2a2520" strokeWidth="0.35" />
        {Array.from({ length: 60 }, (_, i) => (i % 5
          ? <line key={i} y1="-47.2" y2="-50.2" stroke="#2a2520" strokeWidth="0.3" transform={`rotate(${i * 6})`} />
          : <circle key={i} cy="-48.7" r="0.95" fill="#2a2520" transform={`rotate(${i * 6})`} />
        ))}
        {/* 放射状罗马数字：字脚朝向表心 */}
        {ROMAN.map((n, i) => (
          <text key={n} className="pw__num" transform={`rotate(${i * 30}) translate(0 -40.2) scale(0.82 1)`} textAnchor="middle" dominantBaseline="central">{n}</text>
        ))}
        <text className="pw__sign" y="-27.6" textAnchor="middle">Écho</text>

        {/* 月相窗：夜空里的金月随朔望月从左向右走过，两侧的弧肩遮住新月 */}
        <g clipPath="url(#pw-win)">
          <rect x="-10" y="-22" width="20" height="10" fill="url(#pw-night)" />
          {[[-6.5, -18.6], [-2.2, -20.4], [4.4, -19.6], [7.4, -14.6], [-7.8, -14.2], [1.2, -15.2]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 2 ? 0.35 : 0.5} fill="#f6dc9a" />
          ))}
          <circle cx={moonX} cy="-16.4" r="4.4" fill="url(#pw-moon)" />
          <circle cx="-5" cy="-12" r="5" fill="url(#pw-silver)" />
          <circle cx="5" cy="-12" r="5" fill="url(#pw-silver)" />
        </g>
        <path d="M -10 -12 A 10 10 0 0 1 10 -12" fill="none" stroke="#6e6452" strokeWidth="0.45" />

        {/* 小秒针盘 */}
        <g clipPath="url(#pw-sub)" stroke="#8a806b" strokeWidth="0.18" fill="none" opacity="0.55">
          {Array.from({ length: 13 }, (_, i) => <circle key={i} cy="19" r={1 + i * 0.72} />)}
        </g>
        <circle cy="19" r="10" fill="none" stroke="#3a332a" strokeWidth="0.45" />
        <g transform="translate(0 19)">
          {Array.from({ length: 60 }, (_, i) => (
            <line key={i} y1={i % 5 ? -8.3 : -7.4} y2="-9.6" stroke="#2a2520" strokeWidth={i % 5 ? 0.18 : 0.34} transform={`rotate(${i * 6})`} />
          ))}
          {[['60', 0], ['20', 120], ['40', 240]].map(([t, a]) => {
            const r = (a - 90) * (Math.PI / 180)
            return <text key={t} className="pw__subnum" x={Math.cos(r) * 5.2} y={Math.sin(r) * 5.2} textAnchor="middle" dominantBaseline="central">{t}</text>
          })}
          <g ref={s} filter="url(#pw-shadow)">
            <line y1="2.6" y2="-9.2" stroke="url(#pw-blued)" strokeWidth="0.55" />
            <circle cy="2.2" r="1" fill="#1d2c63" />
          </g>
          <circle r="0.9" fill="#1d2c63" />
        </g>

        {/* 时针与分针 */}
        <g filter="url(#pw-shadow)">
          <PommeHand r={h} len={27} ring={19.6} rr={3.3} w={1.2} />
          <PommeHand r={m} len={45} ring={37.2} rr={2.5} w={0.95} />
          <circle r="2.3" fill="url(#pw-blued)" />
          <circle r="0.8" fill="#e8cf8c" />
        </g>

        {/* 水晶玻璃的反光 */}
        <circle r="51.3" fill="url(#pw-glass)" />
        <path d="M -40 -26 A 47 47 0 0 1 -14 -45" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <div className="pw__text">
        <span className="pw__time tnum">{pad2(date.getHours())}<i>:</i>{pad2(date.getMinutes())}</span>
        <span className="pw__day">{zhDate(date)}</span>
        <span className="pw__tempo"><em>{tempo}</em><b />{tempoZh}</span>
      </div>
    </div>
  )
}

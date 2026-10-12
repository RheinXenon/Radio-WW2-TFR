// 古典回音的徽记与纹样：鎏金圆章，乌漆底上以金线刻出各时期的母题
import { useId } from 'react'
import { TilePattern } from '../marks.jsx'

function Art({ kind, gold }) {
  switch (kind) {
    case 'lyre':
      // 里拉琴：两道弯臂、横梁与五根琴弦
      return (
        <g fill="none" stroke={gold} strokeWidth="2.4" strokeLinecap="round">
          <path d="M36 28 C26 34 28 52 38 60 C42 64 42 70 40 74 H60 C58 70 58 64 62 60 C72 52 74 34 64 28" />
          <path d="M33 30 Q50 24 67 30" />
          {[42, 46, 50, 54, 58].map((x) => <line key={x} x1={x} x2={x} y1="29" y2="72" strokeWidth="1.1" />)}
          <circle cx="36" cy="27" r="2.6" fill={gold} />
          <circle cx="64" cy="27" r="2.6" fill={gold} />
        </g>
      )
    case 'rose':
      return (
        <g fill="none" stroke={gold} strokeWidth="2" strokeLinecap="round">
          <path d="M50 44 C46 40 50 36 54 39 C58 42 55 49 49 49 C42 49 40 40 46 35 C52 30 62 34 62 43 C62 53 52 57 45 55 C36 52 34 40 40 33" />
          <path d="M50 57 C49 64 50 70 52 78" />
          <path d="M51 66 C44 62 38 64 35 68 C41 71 47 70 51 66 Z" fill={gold} fillOpacity="0.35" />
          <path d="M70 26 A10 10 0 1 0 76 40 A8 8 0 1 1 70 26 Z" fill={gold} stroke="none" opacity="0.75" />
        </g>
      )
    case 'lily':
      return (
        <g fill="none" stroke={gold} strokeWidth="2" strokeLinejoin="round">
          <path d="M50 66 m-26 0 a26 9 0 1 0 52 0 a26 9 0 1 0 -52 0" opacity="0.6" />
          <path d="M50 64 C44 56 40 48 42 38 C46 44 49 50 50 56 C51 50 54 44 58 38 C60 48 56 56 50 64 Z" />
          <path d="M50 64 C40 62 32 56 30 48 C38 50 44 54 48 60" />
          <path d="M50 64 C60 62 68 56 70 48 C62 50 56 54 52 60" />
          <path d="M50 56 C49 46 50 38 50 32" />
          <path d="M30 76 Q50 72 70 76" opacity="0.5" />
        </g>
      )
    case 'bauhaus':
    default:
      return (
        <g>
          <circle cx="42" cy="44" r="15" fill="#c8463a" opacity="0.92" />
          <polygon points="50,30 70,66 30,66" fill="none" stroke={gold} strokeWidth="2.4" />
          <rect x="52" y="50" width="16" height="16" fill="#2f5f9e" opacity="0.9" />
          <line x1="26" y1="72" x2="74" y2="28" stroke={gold} strokeWidth="1.4" />
          <circle cx="66" cy="34" r="3" fill={gold} />
        </g>
      )
  }
}

export function Emblem({ kind, size = 34, ring = true }) {
  const id = 'cl' + useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="0.35" stopColor="#d6ad5c" />
          <stop offset="0.7" stopColor="#8a6424" />
          <stop offset="1" stopColor="#e9c97c" />
        </linearGradient>
        <radialGradient id={`${id}b`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="#2a1d14" /><stop offset="1" stopColor="#0d0906" />
        </radialGradient>
      </defs>
      {ring && (
        <>
          <circle cx="50" cy="50" r="47" fill={`url(#${id}b)`} stroke={`url(#${id}g)`} strokeWidth="4" />
          <circle cx="50" cy="50" r="41" fill="none" stroke={`url(#${id}g)`} strokeWidth="0.8" opacity="0.7" />
          {Array.from({ length: 36 }, (_, i) => (
            <line key={i} x1="50" y1="5.5" x2="50" y2="8.5" stroke="#e9c97c" strokeWidth="0.8" opacity="0.6" transform={`rotate(${i * 10} 50 50)`} />
          ))}
        </>
      )}
      <Art kind={kind} gold={`url(#${id}g)`} />
    </svg>
  )
}

const TILES = {
  // 希腊回纹
  meander: { w: 16, h: 12, d: 'M0 11 H12 V1 H4 V7 H8 V4 M12 11 H16', stroke: 1 },
  // 卷草
  vine: { w: 24, h: 12, d: 'M0 6 C6 0 10 0 12 6 S18 12 24 6 M6 3 C5 5 7 6 8 5 M18 9 C17 7 19 6 20 7', stroke: 0.9 },
  // 水纹
  ripple: { w: 20, h: 10, d: 'M0 8 Q5 3 10 8 T20 8 M0 4 Q5 -1 10 4 T20 4', stroke: 0.8 },
  // 圆、三角、方的构成
  bauhaus: { w: 30, h: 10, fill: 'M5 1 A4 4 0 1 1 4.99 1 Z M12 9 L16 1 L20 9 Z M23 1 H29 V9 H23 Z' },
}

export const Pattern = (props) => <TilePattern tiles={TILES} {...props} />

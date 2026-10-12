// 烈焰升腾的徽记与纹样：霓虹灯管勾出的线稿，嵌在六角铭牌里
import { useId } from 'react'
import { TilePattern } from '../marks.jsx'

const COLORS = {
  stars: '#8f7bff', eastStar: '#ff4f9a', sun: '#ff7ad9', flake: '#b45cff', tower: '#45e0ff', flame: '#ff5bd1',
}

const hexagon = (r) => Array.from({ length: 6 }, (_, i) => {
  const a = (Math.PI / 3) * i - Math.PI / 2
  return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`
}).join(' ')

const sparkle = (cx, cy, r) => `M${cx} ${cy - r} L${cx + r * 0.28} ${cy} L${cx} ${cy + r} L${cx - r * 0.28} ${cy} Z M${cx - r} ${cy} L${cx} ${cy - r * 0.28} L${cx + r} ${cy} L${cx} ${cy + r * 0.28} Z`

function Art({ kind, c, id }) {
  switch (kind) {
    case 'stars':
      return (
        <g>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            return <path key={i} d={sparkle(50 + 24 * Math.cos(a), 50 + 24 * Math.sin(a), 4.2)} fill={c} />
          })}
          <path d="M50 40 L56 50 L50 60 L44 50 Z" fill="none" stroke={c} strokeWidth="2.2" />
        </g>
      )
    case 'eastStar': {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = ((-90 + i * 36) * Math.PI) / 180
        const r = i % 2 ? 7.5 : 18
        return `${50 + r * Math.cos(a)},${44 + r * Math.sin(a)}`
      }).join(' ')
      return (
        <g fill="none" stroke={c} strokeWidth="2.4" strokeLinejoin="round">
          <polygon points={pts} />
          <path d="M24 72 h7 v-6 h6 v6 h7 v-6 h6 v6 h7 v-6 h6 v6 h7" />
        </g>
      )
    }
    case 'sun':
      return (
        <g>
          <defs>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffd36b" /><stop offset="1" stopColor={c} />
            </linearGradient>
            <clipPath id={`${id}c`}><circle cx="50" cy="50" r="22" /></clipPath>
          </defs>
          <g clipPath={`url(#${id}c)`}>
            <rect x="20" y="20" width="60" height="60" fill={`url(#${id}s)`} />
            {[52, 58, 63.5, 68.5, 73].map((y, i) => <rect key={y} x="20" y={y} width="60" height={1.4 + i * 0.7} fill="#120a24" />)}
          </g>
          <line x1="22" x2="78" y1="74" y2="74" stroke={c} strokeWidth="1.6" opacity="0.8" />
        </g>
      )
    case 'flake':
      return (
        <g stroke={c} strokeWidth="2.3" strokeLinecap="round" fill="none">
          {[0, 60, 120].map((r) => (
            <g key={r} transform={`rotate(${r} 50 50)`}>
              <line x1="50" y1="26" x2="50" y2="74" />
              <path d="M44 31 L50 37 L56 31 M44 69 L50 63 L56 69" />
            </g>
          ))}
          <circle cx="50" cy="50" r="4.5" fill={c} stroke="none" />
        </g>
      )
    case 'tower':
      return (
        <g fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M28 74 V48 H38 V74 M40 74 V30 H52 V74 M54 74 V40 H64 V74 M66 74 V56 H73 V74" />
          <line x1="46" y1="30" x2="46" y2="20" />
          <circle cx="46" cy="19" r="1.8" fill={c} />
          <line x1="24" x2="77" y1="74" y2="74" />
          {[36, 42, 48, 54, 60, 66].map((y) => <line key={y} x1="43" x2="49" y1={y} y2={y} strokeWidth="1.2" opacity="0.7" />)}
        </g>
      )
    case 'flame':
    default:
      return (
        <g fill="none" stroke={c} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M50 76 C34 76 28 62 34 50 C38 42 44 40 42 28 C52 34 54 42 52 50 C56 46 58 42 58 38 C66 46 68 58 64 66 C61 72 56 76 50 76 Z" />
          <path d="M50 70 C44 70 42 64 45 59 C47 56 49 54 49 50 C54 54 56 58 55 63 C54 67 52 70 50 70 Z" fill={c} opacity="0.55" />
        </g>
      )
  }
}

export function Emblem({ kind, size = 34, ring = true }) {
  const id = 'tf' + useId().replace(/:/g, '')
  const c = COLORS[kind] ?? COLORS.flame
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
      <defs>
        <filter id={`${id}g`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9b8ff" /><stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      {ring && (
        <>
          <polygon points={hexagon(47)} fill="#0e0820" fillOpacity="0.88" stroke={`url(#${id}r)`} strokeWidth="2.6" />
          <polygon points={hexagon(41)} fill="none" stroke={c} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4" />
        </>
      )}
      <g filter={`url(#${id}g)`}>
        <Art kind={kind} c={c} id={id} />
      </g>
    </svg>
  )
}

const TILES = {
  circuit: { w: 24, h: 12, d: 'M0 6 H7 L10 3 H16 L19 6 H24 M10 3 V0 M16 9 V12', dots: [[19, 6, 1.4], [7, 6, 1.4]], stroke: 1 },
  lattice: { w: 14, h: 14, d: 'M0 7 H14 M7 0 V14 M3 3 L11 11', stroke: 0.9 },
  scanlines: { w: 10, h: 8, d: 'M0 1.5 H10 M0 4 H10 M0 6.5 H6', stroke: 0.8 },
  blocks: { w: 16, h: 12, fill: 'M1 2 H7 V5 H1 Z M9 2 H15 V5 H9 Z M1 7 H7 V10 H1 Z M9 7 H11 V10 H9 Z M13 7 H15 V10 H13 Z' },
  chevrons: { w: 14, h: 10, d: 'M0 2 L5 5 L0 8 M7 2 L12 5 L7 8', stroke: 1.2 },
  flames: { w: 14, h: 14, d: 'M7 13 C2 13 2 8 4 6 C5 8 6 8 6 6 C6 3 8 2 9 1 C9 4 12 6 12 9 C12 12 10 13 7 13 Z', stroke: 1 },
}

export const Pattern = (props) => <TilePattern tiles={TILES} {...props} />

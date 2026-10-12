// 各频道徽记：以珐琅徽章为母题绘制，统一 100×100 画布
// 徽记选用各国历史上的非政治性标识：国花、空军圆标、星徽、铁十字等
import { useId } from 'react'

const star = (cx, cy, R, r, rot = -90) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = ((rot + i * 36) * Math.PI) / 180
    const rad = i % 2 ? r : R
    return `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`
  }).join(' ')

// 立体五角星：每个角分成明暗两半，形成刻面
function FacetStar({ cx, cy, R, r, light, dark }) {
  const pt = (rad, deg) => {
    const a = (deg * Math.PI) / 180
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]
  }
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => {
        const tip = pt(R, -90 + i * 72)
        const l = pt(r, -90 + i * 72 - 36)
        const rr = pt(r, -90 + i * 72 + 36)
        return (
          <g key={i}>
            <polygon points={`${cx},${cy} ${l} ${tip}`} fill={light} />
            <polygon points={`${cx},${cy} ${tip} ${rr}`} fill={dark} />
          </g>
        )
      })}
    </g>
  )
}

// 铁十字：四臂外展，银缘为同一臂形放大的衬底，R 为整体缩放
function IronCross({ R = 1 }) {
  const arm = 'M45 45 L41 12 Q50 15 59 12 L55 45 Z'
  return (
    <g transform={`translate(50 50) scale(${R}) translate(-50 -50)`}>
      {[0, 90, 180, 270].map((r) => (
        <path key={r} d={arm} transform={`rotate(${r} 50 50) translate(50 50) scale(1.12) translate(-50 -50)`} fill="#d7dde0" />
      ))}
      {[0, 90, 180, 270].map((r) => <path key={'b' + r} d={arm} transform={`rotate(${r} 50 50)`} fill="#121314" />)}
      <rect x="44" y="44" width="12" height="12" fill="#121314" />
    </g>
  )
}

const ART = {
  plum: ({ u }) => (
    <g>
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx="50" cy="31" r="16" fill={`url(#${u}enamelRed)`} stroke="#7d1d18" strokeWidth="0.8"
          transform={`rotate(${i * 72} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="10" fill="#f3d38b" />
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 36} 50 50)`}>
          <line x1="50" y1="46" x2="50" y2="37" stroke="#8a5a1c" strokeWidth="0.9" />
          <circle cx="50" cy="36" r="1.6" fill="#b37a24" />
        </g>
      ))}
    </g>
  ),
  sakura: ({ u }) => (
    <g>
      <circle cx="50" cy="50" r="45" fill="#2a1418" />
      {Array.from({ length: 5 }, (_, i) => (
        <path key={i} transform={`rotate(${i * 72} 50 50)`}
          d="M50 50 C 35 42 32 22 43 12 L50 18 L57 12 C 68 22 65 42 50 50 Z"
          fill={`url(#${u}enamelPink)`} stroke="#a5465a" strokeWidth="0.8" />
      ))}
      <circle cx="50" cy="50" r="6" fill="#fff4f2" />
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx="50" cy="40" r="1.4" fill="#d9667a" transform={`rotate(${i * 72 + 36} 50 50)`} />
      ))}
    </g>
  ),
  star: () => (
    <g>
      <polygon points={star(50, 53, 47, 19)} fill="#e6c36a" />
      <FacetStar cx={50} cy={53} R={42} r={16.5} light="#e2493a" dark="#a8251b" />
    </g>
  ),
  ironcross: () => (
    <g>
      <circle cx="50" cy="50" r="45" fill="#c8393a" />
      <circle cx="50" cy="50" r="36" fill="#f4efe4" />
      <IronCross R={0.78} />
    </g>
  ),
  cocardeIT: () => (
    <g>
      <circle cx="50" cy="50" r="45" fill="#c73a32" />
      <circle cx="50" cy="50" r="30" fill="#f4efe4" />
      <circle cx="50" cy="50" r="15" fill="#2f8a52" />
    </g>
  ),
  cocardeFR: () => (
    <g>
      <circle cx="50" cy="50" r="45" fill="#c8393a" />
      <circle cx="50" cy="50" r="30" fill="#f4efe4" />
      <circle cx="50" cy="50" r="15" fill="#2c4f9e" />
    </g>
  ),
  roundel: () => (
    <g>
      <circle cx="50" cy="50" r="46" fill="#e2b93b" />
      <circle cx="50" cy="50" r="39" fill="#25418a" />
      <circle cx="50" cy="50" r="25" fill="#f4efe4" />
      <circle cx="50" cy="50" r="13" fill="#c23a33" />
    </g>
  ),
  usstar: () => (
    <g>
      <circle cx="50" cy="50" r="45" fill="#26408a" />
      <polygon points={star(50, 52, 42, 16.5)} fill="#f4efe4" />
      <circle cx="50" cy="51" r="9" fill="#c23a33" />
    </g>
  ),
}

// 珐琅质感的共用渐变；徽记外圈为一道黄铜边
export function Emblem({ kind, size = 28, ring = true, className, style }) {
  const uid = useId().replace(/:/g, '')
  const Art = ART[kind] ?? ART.star
  return (
    <svg viewBox="-4 -4 108 108" width={size} height={size} className={className} style={style} aria-hidden>
      <defs>
        <radialGradient id={`${uid}enamelRed`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ef6a55" /><stop offset="1" stopColor="#a8251b" />
        </radialGradient>
        <radialGradient id={`${uid}enamelPink`} cx="0.4" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#ffd6de" /><stop offset="1" stopColor="#e58aa0" />
        </radialGradient>
        <linearGradient id={`${uid}enamelGold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6dd96" /><stop offset="0.55" stopColor="#c9a45c" /><stop offset="1" stopColor="#8a6a2e" />
        </linearGradient>
        <linearGradient id={`rim${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbe7b0" /><stop offset="0.5" stopColor="#a8823e" /><stop offset="1" stopColor="#f0d48e" />
        </linearGradient>
        <radialGradient id={`gloss${uid}`} cx="0.32" cy="0.22" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {ring && <circle cx="50" cy="50" r="50" fill={`url(#rim${uid})`} />}
      {ring && <circle cx="50" cy="50" r="47" fill="#14100b" />}
      <Art u={uid} />
      <circle cx="50" cy="50" r="47" fill={`url(#gloss${uid})`} />
    </svg>
  )
}

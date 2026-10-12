// 各频道的装饰纹样，用作细窄的纹饰带
import { useId } from 'react'

const TILES = {
  // 回纹
  fret: { w: 16, h: 16, d: 'M-2 14 H14 V2 H4 V10 H10 V6 H7' },
  // 青海波
  seigaiha: {
    w: 20, h: 10, fill: true,
    svg: (c, bg) => (
      <>
        {[[10, 0], [0, 5], [20, 5], [10, 10]].map(([x, y], i) => (
          <g key={i}>
            {[10, 7, 4].map((r) => <circle key={r} cx={x} cy={y} r={r} fill={bg} stroke={c} strokeWidth="0.9" />)}
          </g>
        ))}
      </>
    ),
  },
  // 俄罗斯民间菱形纹
  folk: { w: 16, h: 16, d: 'M8 1 L15 8 L8 15 L1 8 Z M8 5 L11 8 L8 11 L5 8 Z M0 0 L2 2 M16 0 L14 2 M0 16 L2 14 M16 16 L14 14' },
  // 斜格与菱点
  lattice: { w: 12, h: 12, d: 'M0 0 L12 12 M12 0 L0 12', dots: [[6, 0], [0, 6], [12, 6], [6, 12]] },
  // 古罗马波涛卷纹
  scroll: { w: 20, h: 12, d: 'M0 10 C 6 10 8 3 13 3 C 17 3 18 8 14.5 8 C 12 8 12 5.5 14 5.5 M13 3 C 16 3 20 6 20 10' },
  // 装饰艺术扇贝
  fan: { w: 20, h: 10, d: 'M0 10 A10 10 0 0 1 20 10 M10 10 L10 1 M10 10 L3.5 3.5 M10 10 L16.5 3.5 M10 10 L1 7 M10 10 L19 7' },
  // 苏格兰格纹
  tartan: { w: 16, h: 16, d: 'M0 4 H16 M0 5.5 H16 M0 12 H16 M4 0 V16 M5.5 0 V16 M12 0 V16', wide: 'M0 8.5 H16 M8.5 0 V16' },
  // 星条
  stripes: { w: 28, h: 12, d: 'M0 2 H28 M0 10 H28', stars: [[14, 6]] },
}

const smallStar = (cx, cy, R) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = ((-90 + i * 36) * Math.PI) / 180
    const r = i % 2 ? R * 0.4 : R
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')

export function Pattern({ kind, color = 'currentColor', bg = 'transparent', height = 12, opacity = 1, className, style }) {
  const id = 'pt' + useId().replace(/:/g, '')
  const t = TILES[kind] ?? TILES.lattice
  const scale = height / t.h
  return (
    <svg className={className} style={{ display: 'block', width: '100%', height, opacity, ...style }} aria-hidden>
      <defs>
        <pattern id={id} width={t.w} height={t.h} patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
          {bg !== 'transparent' && <rect width={t.w} height={t.h} fill={bg} />}
          {t.svg ? t.svg(color, bg === 'transparent' ? '#0d0b09' : bg) : (
            <>
              <path d={t.d} fill="none" stroke={color} strokeWidth={1.1 / Math.max(scale, 0.6)} strokeLinecap="square" />
              {t.wide && <path d={t.wide} fill="none" stroke={color} strokeWidth={2.6 / Math.max(scale, 0.6)} opacity="0.55" />}
              {t.dots?.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.3" fill={color} />)}
              {t.stars?.map(([x, y], i) => <polygon key={i} points={smallStar(x, y, 3.2)} fill={color} />)}
            </>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

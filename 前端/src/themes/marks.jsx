// 徽记与纹样的统一入口：按主题分派到各主题自己的构件。
// 用户自建的频道没有专门绘制的徽记，用“字徽”（一个字 + 主色，写作 glyph:字:#色），纹样取通用纹样
import { useId } from 'react'
import { theme } from './index.js'

// —— 字徽：双圈铭牌中一个字，配色取频道主色 ——
export function Glyph({ char = '音', color = '#c9a45c', size = 34, ring = true }) {
  const id = 'gl' + useId().replace(/:/g, '')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ display: 'block', flex: 'none' }}>
      <defs>
        <radialGradient id={id} cx="50%" cy="38%" r="62%">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {ring && <circle cx="50" cy="50" r="47" fill={`url(#${id})`} stroke={color} strokeOpacity="0.85" strokeWidth="2.4" />}
      {ring && <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeOpacity="0.4" strokeWidth="1" />}
      <text
        x="50" y="51" textAnchor="middle" dominantBaseline="central"
        fontSize={ring ? 44 : 62} fill={color}
        style={{ fontFamily: 'var(--zh)', fontWeight: 600, filter: `drop-shadow(0 0 4px ${color})` }}
      >{char}</text>
    </svg>
  )
}

export function Emblem({ kind, of = theme, ...props }) {
  if (typeof kind === 'string' && kind.startsWith('glyph:')) {
    const [, char, color] = kind.split(':')
    return <Glyph char={char} color={color} {...props} />
  }
  const E = of.Emblem
  return E ? <E kind={kind} {...props} /> : <Glyph {...props} />
}

// —— 纹样 ——
// 平铺纹样的通用画法：每种纹样是一块 w×h 的贴片，d 为描边路径，dots 为圆点，fill 为实心路径
export function TilePattern({ tiles, kind, color = 'currentColor', height = 12, opacity = 1, className, style }) {
  const id = 'tp' + useId().replace(/:/g, '')
  const t = tiles[kind] ?? Object.values(tiles)[0]
  const scale = height / t.h
  const sw = (t.stroke ?? 1.1) / Math.max(scale, 0.6)
  return (
    <svg className={className} style={{ display: 'block', width: '100%', height, opacity, ...style }} aria-hidden>
      <defs>
        <pattern id={id} width={t.w} height={t.h} patternUnits="userSpaceOnUse" patternTransform={`scale(${scale})`}>
          {t.d && <path d={t.d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />}
          {t.fill && <path d={t.fill} fill={color} />}
          {t.dots?.map(([x, y, r = 1.2], i) => <circle key={i} cx={x} cy={y} r={r} fill={color} />)}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

// 通用纹样：自建频道可选，任何主题都能用
export const GENERIC_TILES = {
  dots: { w: 10, h: 10, dots: [[5, 5, 1.4]] },
  wave: { w: 24, h: 10, d: 'M0 5 C 6 0 6 0 12 5 S 18 10 24 5' },
  grid: { w: 12, h: 12, d: 'M0 6 H12 M6 0 V12', stroke: 0.8 },
  chevron: { w: 16, h: 10, d: 'M0 9 L8 2 L16 9' },
  diamond: { w: 14, h: 14, d: 'M7 1 L13 7 L7 13 L1 7 Z' },
  scan: { w: 8, h: 8, d: 'M0 2 H8 M0 6 H5', stroke: 0.9 },
}
export const GENERIC_PATTERNS = [
  ['dots', '圆点'], ['wave', '波纹'], ['grid', '方格'], ['chevron', '人字'], ['diamond', '菱格'], ['scan', '扫描线'],
]

export function Pattern({ kind, of = theme, ...props }) {
  if (GENERIC_TILES[kind]) return <TilePattern tiles={GENERIC_TILES} kind={kind} {...props} />
  const P = of.Pattern
  return P ? <P kind={kind} {...props} /> : <TilePattern tiles={GENERIC_TILES} kind="dots" {...props} />
}

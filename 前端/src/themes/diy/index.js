// 自建（DIY）主题：编辑器里保存的是一份精简的定义，这里补齐成与内置主题相同的结构。
// 默认采用最现代的视觉：现代控制条与时钟；壁纸与音乐来自用户放入的本地目录，
// 画面风格（极光 / 流光 / 地平线 / 几何）在主题工坊里作预览，配色由主色与辅色派生
import { PRESETS } from '../../scene/presets.js'
import { MOODS } from './paint.js'
import Intro from './Intro.jsx'

export { MOODS }

export const DIAL = {
  min: 87.5, max: 108.3, step: 0.2, major: 1, band: 'FM', unit: 'MHz',
  fmt: (f) => f.toFixed(1),
}

// 配色预设：主色 + 辅色（nameEn 供界面切换英文时显示）
export const PALETTES = [
  { id: 'aurora', name: '极光', nameEn: 'Aurora', accent: '#7c8cff', accent2: '#3ee6c4' },
  { id: 'dusk', name: '暮色', nameEn: 'Dusk', accent: '#ff7a8a', accent2: '#ffb36b' },
  { id: 'sea', name: '海盐', nameEn: 'Sea Salt', accent: '#4fb3ff', accent2: '#a8f0ff' },
  { id: 'forest', name: '森屿', nameEn: 'Forest Isle', accent: '#5fd08a', accent2: '#d6f07a' },
  { id: 'ink', name: '墨白', nameEn: 'Ink & White', accent: '#e8e6e1', accent2: '#8c8a86' },
  { id: 'violet', name: '紫雾', nameEn: 'Violet Mist', accent: '#b07cff', accent2: '#ff7ad9' },
]

const ATMOS = {
  aurora: { layers: [{ kind: 'stars', count: 150, z: [0, 0.02] }, { kind: 'dust', count: 60, z: [0.3, 0.9], tone: 'light' }] },
  mesh: { layers: [{ kind: 'bokeh', count: 20, z: [0.05, 0.5], tone: 'accent' }, { kind: 'dust', count: 80, z: [0.2, 0.9], tone: 'light' }] },
  horizon: { layers: [{ kind: 'dust', count: 90, z: [0.2, 0.9], tone: 'light' }], shafts: 0.5 },
  grid: { layers: [{ kind: 'dust', count: 110, z: [0.1, 0.95], tone: 'accent' }] },
}

let uid = 0
export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${(uid++).toString(36)}`

export function newStation(i = 0, accent = '#7c8cff') {
  const presets = [['晨光', '晨'], ['午后', '午'], ['夜航', '夜'], ['雨声', '雨'], ['远方', '远'], ['心流', '流'], ['旧梦', '梦'], ['星野', '星']]
  const [name, glyph] = presets[i % presets.length]
  return { id: newId('st'), name, glyph, call: `这里是${name}`, city: '', latin: '', genre: '', accent, pattern: 'dots' }
}

export function newDiyTheme(n = 1) {
  const pal = PALETTES[0]
  return {
    id: newId('diy'),
    custom: true,
    name: n > 1 ? `我的电台 ${n}` : '我的电台',
    latin: 'My Station',
    subtitle: '自己调制的频率',
  subtitleEn: 'A frequency of your own',
    years: ['', ''],
    blurb: '',
    accent: pal.accent,
    accent2: pal.accent2,
    mood: 'aurora',
    style: 'modern',
    stations: [0, 1, 2].map((i) => newStation(i, i % 2 ? pal.accent2 : pal.accent)),
  }
}

export function diyTheme(raw) {
  return {
    ...raw,
    years: raw.years?.[0] ? raw.years : null,
    blurb: raw.blurb || '由你命名、由你配色的电台。把音乐放进本地目录，或从云音乐导入歌单，这里就是你自己的频率。',
  blurbEn: raw.blurb ? raw.blurbEn : 'Your radio, your name, your colors. Put music in a local folder or import from NetEase Cloud — this frequency is yours.',
    radioRoot: `${raw.name} Radio`,
    wallRoot: `${raw.name} Wallpapers`,
    groups: {},
    dial: DIAL,
    style: raw.style ?? 'modern',
    clock: raw.clock ?? 'flat',
    frame: 'glass',
    atmosphereFor: () => ({ ...PRESETS.calm, ...ATMOS[raw.mood] ?? ATMOS.mesh }),
    Intro,
  }
}

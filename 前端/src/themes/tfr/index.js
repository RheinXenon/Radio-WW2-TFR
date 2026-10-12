// 第二主题：烈焰升腾（The Fire Rises）
// 取材自《钢铁雄心 4》模组 The Fire Rises：故事始于 2020 年，疫情、油价与内乱让八十年的和平摇摇欲坠，
// “新世界将在战火中锻造”。模组的音乐扩展把世界各地的电台装进了游戏，这里取其中六台。
// 视觉取紫色调为主的赛博朋克：霓虹、扫描线、雨夜与燃烧的天际线
import { PRESETS } from '../../scene/presets.js'
import { Emblem, Pattern } from './marks.jsx'
import Intro from './Intro.jsx'
import { STATIONS, DIAL } from './stations.js'

// 每台的壁纸氛围，按池名登记
const ATMOS = {
  europe: { layers: [{ kind: 'bokeh', count: 26, z: [0.05, 0.4], tint: '#b9a6ff' }, { kind: 'dust', count: 70, z: [0.3, 0.9], tint: '#d8c8ff' }], mist: 0.18 },
  east: { layers: [{ kind: 'bokeh', count: 30, z: [0.05, 0.35], tint: '#ff7ab8', tint2: '#7ae8ff' }, { kind: 'rain', count: 380, z: [0.1, 1.0], wind: 0.25, tint: '#e6c8ff' }], mist: 0.22 },
  moshi: { layers: [{ kind: 'bokeh', count: 24, z: [0.05, 0.4], tint: '#ff9ce4' }, { kind: 'dust', count: 60, z: [0.3, 0.9], tint: '#ffd0f4' }] },
  dekabr: { layers: [{ kind: 'snow', count: 340, z: [0.05, 1.0], wind: 0.2, tint: '#efe4ff' }, { kind: 'bokeh', count: 14, z: [0.05, 0.3], tint: '#c58cff' }], mist: 0.15 },
  urban: { layers: [{ kind: 'streaks', count: 18, z: [0.6, 1.0], tint: '#7ae8ff' }, { kind: 'bokeh', count: 22, z: [0.05, 0.4], tint: '#ff8fd8', tint2: '#7ae8ff' }] },
  fire: { layers: [{ kind: 'embers', count: 120, z: [0.2, 0.95], tint: '#ff7ae0', tint2: '#ffb36b' }, { kind: 'ash', count: 120, z: [0.1, 1.0], tint: '#5a3f7a' }], shafts: 0.3, mist: 0.2 },
}

function atmosphereFor(id) {
  const pool = id.split('/')[0]
  const spec = ATMOS[pool] ?? 'nightCity'
  const atm = typeof spec === 'string' ? { preset: spec } : spec
  return { ...PRESETS.calm, ...PRESETS[atm.preset], ...atm }
}

// 档案用语：这里的壁纸是模组的超级事件插画与加载屏，走事件弹窗而非史实档案卡
// dossier: 'event' 让打开详情时渲染 SuperEvent 弹窗（App 分流），wallName 给未登记的加载屏起画廊名
const terms = {
  record: '事件档案',
  recordLatin: 'Super Event',
  story: '引语',
  nation: '电台',
  wall: '原画',
  legend: '带霓虹光晕的是超级事件插画：双击或掀开折角查看事件与引语',
}

const wallName = (name) => {
  if (name === 'main_menu') return '主菜单'
  const m = /^load_(.+)$/.exec(name)
  if (!m) return name
  return /^\d+$/.test(m[1]) ? `加载屏 ${Number(m[1])}` : `加载屏 ${m[1].replace(/_/g, ' ').toUpperCase()}`
}

export default {
  id: 'tfr',
  name: '烈焰升腾',
  latin: 'The Fire Rises',
  subtitle: '《钢铁雄心 4》模组世界 · 新世界电台',
  years: ['2020', '20XX'],
  blurb: '2020 年，旧秩序在疫情与动荡里崩裂，“新世界将在战火中锻造”。霓虹照着雨夜，六座电台仍在播：欧陆迪斯科、华语金曲、城市流行、俄语摇滚，还有为这个世界写下的原声。',
  radioRoot: 'TFR Radio',
  wallRoot: 'TFR Wallpapers',
  stations: STATIONS,
  groups: {},
  dial: DIAL,
  style: 'neon',
  clock: 'neon',
  accent: '#c06bff', // 主题页与界面的主色
  frame: 'neon',
  atmosphereFor,
  Emblem,
  Pattern,
  Intro,
  terms,
  dossier: 'event',
  wallName,
}

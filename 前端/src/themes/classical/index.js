// 第三主题：古典回音
// 从维也纳古典乐派到二十世纪，四个时期四座电台，壁纸用各时期的名画原作
import { PRESETS } from '../../scene/presets.js'
import { Emblem, Pattern } from './marks.jsx'
import Intro from './Intro.jsx'
import { STATIONS, DIAL } from './stations.js'

// 按池登记氛围（名画随池走），未登记的套用 interior
const ATMOS = {
  classicism: { layers: [{ kind: 'dust', count: 170, z: [0.3, 0.95], tint: '#ffd9a0' }, { kind: 'bokeh', count: 16, z: [0.05, 0.3], tint: '#ffcf7a' }], shafts: 0.5 },
  romanticism: { preset: 'dawnMist', mist: 0.3, layers: [{ kind: 'haze', count: 8, z: [0.05, 0.4], wind: 0.3 }] },
  impressionism: { layers: [{ kind: 'petals', count: 18, z: [0.4, 1.0], tint: '#ffd6e6' }, { kind: 'dust', count: 90, z: [0.2, 0.9], tint: '#f4ffe0' }] },
  modernism: { layers: [{ kind: 'bokeh', count: 24, z: [0.05, 0.35], tint: '#ffcf6b' }, { kind: 'dust', count: 80, z: [0.3, 0.9], tint: '#ffe2a0' }], shafts: 0.4 },
}

function atmosphereFor(id) {
  const spec = ATMOS[id.split('/')[0]] ?? 'interior'
  const atm = typeof spec === 'string' ? { preset: spec } : spec
  return { ...PRESETS.calm, ...PRESETS[atm.preset], ...atm }
}

export { STATIONS }

export default {
  id: 'classical',
  name: '古典回音',
  nameEn: 'Classical Echoes',
  latin: 'Echoes of the Classics',
  subtitle: '从维也纳到二十世纪 · 四个时期的音乐',
  subtitleEn: 'From Vienna to the Twentieth Century · Music of Four Eras',
  years: ['1750', '1950'],
  blurb: '烛光下的维也纳，雾海与月色里的浪漫派，巴黎水面上的光影，再到二十世纪的节奏与几何。指针停在哪里，音乐厅的灯就为哪个时代亮起。',
  blurbEn: 'Vienna by candlelight, the Romantics in mist and moonlight, light rippling on the water of Paris, then the rhythm and geometry of the twentieth century. Wherever the needle stops, the concert hall lights up for that era.',
  radioRoot: 'Classical Radio',
  wallRoot: 'Classical Wallpapers',
  stations: STATIONS,
  groups: {},
  dial: DIAL,
  style: 'gilded',
  clock: 'pocket',
  accent: '#d9b56a', // 主题页与界面的主色
  frame: 'gilded',
  // 壁纸即名画原作，没有另一张“转绘”，档案里也不出现原照档位
  terms: {
    record: '名画档案',
    recordEn: 'Masterpiece Archive',
    recordLatin: 'Masterpieces',
    stamp: '名画',
    stampEn: 'MASTERPIECE',
    story: '鉴赏',
    storyEn: 'Appreciation',
    nation: '画派',
    nationEn: 'School',
    wall: '原作',
    wallEn: 'Original',
    legend: '带黄铜光晕的是馆藏名画：双击或掀开纸角，查看出处与鉴赏',
    legendEn: 'Brass-haloed entries are masterpieces from the collection: double-click or lift the corner for provenance and appreciation',
  },
  atmosphereFor,
  Emblem,
  Pattern,
  Intro,
}

// 二战主题：烽火电波
import { STATIONS, POOLS, POOL_SLOTS, GROUPS, DIAL } from './stations.js'
import { atmosphereFor } from './atmospheres.js'
import { Emblem } from './Emblem.jsx'
import { Pattern } from './Pattern.jsx'
import Intro from './Intro.jsx'

export default {
  id: 'wwii',
  name: '烽火电波',
  nameEn: 'Signals of WWII',
  latin: 'Wireless at War',
  subtitle: '第二次世界大战 · 广播年代',
  subtitleEn: 'World War II · The Broadcasting Years',
  years: ['1939', '1945'],
  blurb: '八国的电波在乌玻璃刻度盘后流转：上海的时代曲、柏林的流行歌、伦敦的战时金曲。穿过静电与啸叫，回到收音机就是全家人的年代。',
  blurbEn: 'Radio waves of eight nations drift behind the smoked-glass dial: period songs from Shanghai, popular tunes from Berlin, wartime hits from London. Through the static and the whistles, back to the years when the radio was the whole family.',
  radioRoot: 'WWII Radio',
  wallRoot: 'WWII Wallpapers',
  stations: STATIONS,
  pools: POOLS,
  groups: GROUPS,
  poolSlots: POOL_SLOTS,
  dial: DIAL,
  style: 'vintage',
  clock: 'pilot',
  accent: '#c9a45c', // 主题页与界面的主色
  frame: 'film',
  dialLabel: 'city', // 刻度盘上写城市名（各台以国家命名，城市更像电台）
  atmosphereFor,
  Emblem,
  Pattern,
  Intro,
}

// 古典回音的频道表。folder 为歌单目录与壁纸池名（Resources/Classical Radio|Wallpapers/<目录>/）
// call 为锁台时浮现的呼号，这里用各时期气质相符的演奏术语

// 刻度盘：长波；台位由 themes/index.js 按频道数量均分刻度盘并对齐刻度格
export const DIAL = {
  min: 144.5, max: 280.5, step: 5, major: 25, band: 'LW', unit: 'kHz',
  fmt: (f) => String(f),
}

export const STATIONS = [
  {
    id: 'cl-classic', call: 'Allegro con brio', folder: 'classicism',
    name: '古典主义', city: '维也纳', latin: 'WIEN', genre: '交响曲与奏鸣曲', years: '1750—1820',
    blurb: '海顿、莫扎特、贝多芬：均衡、明晰、秩序井然', accent: '#d8b46a', glow: '#ffe2a8',
    emblem: 'lyre', pattern: 'meander',
  },
  {
    id: 'cl-romantic', call: 'Con fuoco', folder: 'romanticism',
    name: '浪漫主义', city: '莱比锡', latin: 'LEIPZIG', genre: '艺术歌曲与钢琴诗', years: '1820—1900',
    blurb: '舒伯特、肖邦、勃拉姆斯：激情、幻想与远方', accent: '#c0566a', glow: '#ffa3b1',
    emblem: 'rose', pattern: 'vine',
  },
  {
    id: 'cl-impression', call: 'Doux et rêveur', folder: 'impressionism',
    name: '印象派', city: '巴黎', latin: 'PARIS', genre: '印象主义', years: '1890—1920',
    blurb: '德彪西、拉威尔、萨蒂：光影、水波与朦胧的和声', accent: '#86aed0', glow: '#d3e8ff',
    emblem: 'lily', pattern: 'ripple',
  },
  {
    id: 'cl-modern', call: 'Molto ritmico', folder: 'modernism',
    name: '近现代', city: '纽约', latin: 'NEW YORK', genre: '二十世纪音乐', years: '1910—',
    blurb: '斯特拉文斯基、肖斯塔科维奇、格什温：节奏、色彩与新的语法', accent: '#e3a63e', glow: '#ffd27a',
    emblem: 'bauhaus', pattern: 'bauhaus',
  },
]

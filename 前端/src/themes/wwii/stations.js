// 二战主题的频道表。顺序即刻度盘上自东向西的排布
// 频率不在此指定：组装时按频道数量均分刻度盘并对齐刻度格，八台恰为 600—1300 kHz（逢百 kHz）
// folder 为歌单所在的国家目录；call 为锁定电台后浮现的呼号，取各地广播当年的开场语
// 云音乐导入的歌曲不占频道，而是并入各台下的分组（含自建子歌单），见 themes/index.js
export const STATIONS = [
  {
    id: 'CHI', call: '这里是上海', callEn: 'This is Shanghai', folder: 'CHI', pool: 'CHI',
    name: '中国', nameEn: 'China', city: '上海', cityEn: 'Shanghai', latin: 'SHANGHAI', genre: '时代曲', genreEn: 'Period Songs',
    years: '1937', accent: '#c8423b', glow: '#ff8a6b',
    emblem: 'plum', pattern: 'fret',
  },
  {
    id: 'JPA', call: 'JOAK · 東京放送局', callEn: 'JOAK · Tokyo Broadcasting Station', folder: 'JPA', pool: 'JPA',
    name: '日本', nameEn: 'Japan', city: '东京', cityEn: 'Tokyo', latin: 'TŌKYŌ', genre: '歌谣曲', genreEn: 'Kayōkyoku',
    years: '1941', accent: '#d9667a', glow: '#ffb3c1',
    emblem: 'sakura', pattern: 'seigaiha',
  },
  {
    id: 'USSR', call: 'Говорит Москва', callEn: 'This is Moscow speaking', folder: 'USSR', pool: 'USSR',
    name: '苏联', nameEn: 'USSR', city: '莫斯科', cityEn: 'Moscow', latin: 'МОСКВА', genre: '苏联歌曲', genreEn: 'Soviet Songs',
    years: '1943', accent: '#d23a2c', glow: '#ff7a5c',
    emblem: 'star', pattern: 'folk',
  },
  {
    id: 'GER', call: 'Hier ist Berlin', folder: 'GER', pool: 'GER',
    name: '德国', nameEn: 'Germany', city: '柏林', cityEn: 'Berlin', latin: 'BERLIN', genre: '流行歌曲', genreEn: 'Popular Songs',
    years: '1938', accent: '#c9a45c', glow: '#ffd98a',
    emblem: 'ironcross', pattern: 'lattice',
  },
  {
    id: 'ITA', call: 'Qui Radio Roma', folder: 'ITA', pool: 'ITA',
    name: '意大利', nameEn: 'Italy', city: '罗马', cityEn: 'Rome', latin: 'ROMA', genre: '意大利歌曲', genreEn: 'Italian Songs',
    years: '1940', accent: '#3f9a63', glow: '#9fe3b5',
    emblem: 'cocardeIT', pattern: 'scroll',
  },
  {
    id: 'FRA', call: 'Ici Paris', folder: 'FRA', pool: 'FRA',
    name: '法国', nameEn: 'France', city: '巴黎', cityEn: 'Paris', latin: 'PARIS', genre: '香颂', genreEn: 'Chanson',
    years: '1939', accent: '#4a6fc0', glow: '#a9c1ff',
    emblem: 'cocardeFR', pattern: 'fan',
  },
  {
    id: 'ENG', call: 'This is London', folder: 'ENG', pool: 'ENG',
    name: '英国', nameEn: 'Britain', city: '伦敦', cityEn: 'London', latin: 'LONDON', genre: '战时歌曲', genreEn: 'Wartime Songs',
    years: '1940', accent: '#3b5aa8', glow: '#e7c35a',
    emblem: 'roundel', pattern: 'tartan',
  },
  {
    id: 'USA', call: 'This is New York', folder: 'USA', pool: 'USA',
    name: '美国', nameEn: 'USA', city: '纽约', cityEn: 'New York', latin: 'NEW YORK', genre: '摇摆乐', genreEn: 'Swing',
    years: '1942', accent: '#3d63b8', glow: '#9fc0ff',
    emblem: 'usstar', pattern: 'stripes',
  },
]

// 刻度盘：中波，每 10 kHz 一格、50 kHz 一大格；台位由 themes/index.js 按频道数量均分
export const DIAL = {
  min: 550, max: 1350, step: 10, major: 50, band: 'MW', unit: 'kHz',
  fmt: (f) => String(f),
}

// 歌单分组（国家目录下的子文件夹）的显示名，未登记的分组直接显示文件夹名
export const GROUPS = {
  radio: { name: '广播歌曲', nameEn: 'Broadcast Songs' },
  military: { name: '军乐', nameEn: 'Marches' },
}

// 壁纸池（国家）在画廊中的显示顺序与名称，与频道无关
export const POOLS = [
  { id: 'CHI', name: '中国', nameEn: 'China', station: 'CHI' },
  { id: 'JPA', name: '日本', nameEn: 'Japan', station: 'JPA' },
  { id: 'USSR', name: '苏联', nameEn: 'USSR', station: 'USSR' },
  { id: 'GER', name: '德国', nameEn: 'Germany', station: 'GER' },
  { id: 'ITA', name: '意大利', nameEn: 'Italy', station: 'ITA' },
  { id: 'FRA', name: '法国', nameEn: 'France', station: 'FRA' },
  { id: 'ENG', name: '英国', nameEn: 'Britain', station: 'ENG' },
  { id: 'USA', name: '美国', nameEn: 'USA', station: 'USA' },
]

// 每个国家池的标准张数（对应提示词文档中的四个场景），缺图显示占位
export const POOL_SLOTS = [
  { name: '1', nameEn: '1', scene: '时代城市街景', sceneEn: 'Period city street' },
  { name: '2', nameEn: '2', scene: '后方生活', sceneEn: 'Home front life' },
  { name: '3', nameEn: '3', scene: '战场与远方', sceneEn: 'Battlefield and beyond' },
  { name: '4', nameEn: '4', scene: '近景战场', sceneEn: 'Close-quarters battle' },
]

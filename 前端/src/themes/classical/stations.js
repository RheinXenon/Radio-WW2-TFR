// 古典回音的频道表。folder 为歌单目录与壁纸池名（Resources/Classical Radio|Wallpapers/<目录>/）
// call 为锁台时浮现的呼号，这里用各时期气质相符的演奏术语

// 刻度盘：长波；台位由 themes/index.js 按频道数量均分刻度盘并对齐刻度格
export const DIAL = {
  min: 144.5, max: 280.5, step: 5, major: 25, band: 'LW', unit: 'kHz',
  fmt: (f) => String(f),
}

export const STATIONS = [
  {
    id: 'cl-classic', call: 'Allegro con brio', callEn: 'Allegro con brio', folder: 'classicism',
    name: '古典主义', nameEn: 'Classicism', labelEn: 'Classical', city: '维也纳', cityEn: 'Vienna', latin: 'WIEN', genre: '交响曲与奏鸣曲', genreEn: 'Symphonies & Sonatas', years: '1750—1820',
    blurb: '海顿、莫扎特、贝多芬：均衡、明晰、秩序井然', blurbEn: 'Haydn, Mozart, Beethoven: balance, clarity and perfect order',
    accent: '#d8b46a', glow: '#ffe2a8',
    emblem: 'lyre', pattern: 'meander',
  },
  {
    id: 'cl-romantic', call: 'Con fuoco', callEn: 'Con fuoco', folder: 'romanticism',
    name: '浪漫主义', nameEn: 'Romanticism', labelEn: 'Romantic', city: '莱比锡', cityEn: 'Leipzig', latin: 'LEIPZIG', genre: '艺术歌曲与钢琴诗', genreEn: 'Lieder & Piano Poetry', years: '1820—1900',
    blurb: '舒伯特、肖邦、勃拉姆斯：激情、幻想与远方', blurbEn: 'Schubert, Chopin, Brahms: passion, fantasy and distant lands',
    accent: '#c0566a', glow: '#ffa3b1',
    emblem: 'rose', pattern: 'vine',
  },
  {
    id: 'cl-impress', call: 'Doux et rêveur', callEn: 'Doux et rêveur', folder: 'impressionism',
    name: '印象派', nameEn: 'Impressionism', labelEn: 'Impression', city: '巴黎', cityEn: 'Paris', latin: 'PARIS', genre: '印象主义', genreEn: 'Impressionism', years: '1890—1920',
    blurb: '德彪西、拉威尔、萨蒂：光影、水波与朦胧的和声', blurbEn: 'Debussy, Ravel, Satie: light, water and hazy harmonies',
    accent: '#86aed0', glow: '#d3e8ff',
    emblem: 'lily', pattern: 'ripple',
  },
  {
    id: 'cl-modern', call: 'Molto ritmico', callEn: 'Molto ritmico', folder: 'modernism',
    name: '近现代', nameEn: 'Modernism', labelEn: 'Modern', city: '纽约', cityEn: 'New York', latin: 'NEW YORK', genre: '二十世纪音乐', genreEn: 'Twentieth-Century Music', years: '1910—',
    blurb: '斯特拉文斯基、肖斯塔科维奇、格什温：节奏、色彩与新的语法', blurbEn: 'Stravinsky, Shostakovich, Gershwin: rhythm, colour and a new grammar',
    accent: '#e3a63e', glow: '#ffd27a',
    emblem: 'bauhaus', pattern: 'bauhaus',
  },
]

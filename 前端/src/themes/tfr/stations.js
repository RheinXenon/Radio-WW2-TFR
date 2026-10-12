// 烈焰升腾的频道表。folder 为歌单目录与壁纸池名（Resources/TFR Radio|Wallpapers/<目录>/）
// 频率不在此指定：组装时按频道数量均分刻度盘并对齐刻度格
export const DIAL = {
  min: 87.5, max: 108.3, step: 0.2, major: 1, band: 'FM', unit: 'MHz',
  fmt: (f) => f.toFixed(1),
}

export const STATIONS = [
  {
    id: 'tfr-europe', call: 'Radio Majestic Europe', folder: 'europe',
    name: '雄伟欧洲', city: '布鲁塞尔', latin: 'MAJESTIC EUROPE', genre: '欧陆迪斯科',
    blurb: '欧罗巴花园里的热门与遗珠', accent: '#8f7bff', glow: '#c7bcff',
    emblem: 'stars', pattern: 'circuit',
  },
  {
    id: 'tfr-east', call: '东方之星 · Eastern Star', folder: 'east',
    name: '东方之星', city: '上海', latin: 'EASTERN STAR', genre: '华语金曲',
    blurb: '穿过长城运来的歌', accent: '#ff4f9a', glow: '#ff9cc8',
    emblem: 'eastStar', pattern: 'lattice',
  },
  {
    id: 'tfr-moshi', call: 'もしもし、こちらラジオ', folder: 'moshi',
    name: '嗨，日本', city: '东京', latin: 'MOSHI MOSHI', genre: '城市流行',
    blurb: '旭日之国与加班族的音乐', accent: '#ff7ad9', glow: '#ffc2ef',
    emblem: 'sun', pattern: 'scanlines',
  },
  {
    id: 'tfr-dekabr', call: 'Говорит «Дети Декабря»', folder: 'dekabr',
    name: '十二月春日', city: '莫斯科', latin: 'DEKABR · VESNA', genre: '俄语摇滚与流行',
    blurb: '地下摇滚的十二月，流行金曲的春天', accent: '#b45cff', glow: '#e0b8ff',
    emblem: 'flake', pattern: 'blocks',
  },
  {
    id: 'tfr-urban', call: 'Urban Currents FM', folder: 'urban',
    name: '都市潮流', city: '洛杉矶', latin: 'URBAN CURRENTS', genre: '潮流金曲',
    blurb: '给爱赶时髦、爱一切流行的人', accent: '#45e0ff', glow: '#b5f4ff',
    emblem: 'tower', pattern: 'chevrons',
  },
  {
    id: 'tfr-fire', call: 'The Fire Rises', folder: 'fire',
    name: '烈焰升腾', city: '新世界', latin: 'THE FIRE RISES', genre: '原声与氛围',
    blurb: '模组原声与从世界各处搜罗来的氛围音乐', accent: '#ff5bd1', glow: '#ffb0ec',
    emblem: 'flame', pattern: 'flames',
  },
]

// 烈焰升腾的频道表。folder 为歌单目录与壁纸池名（Resources/TFR Radio|Wallpapers/<目录>/）
// 频率不在此指定：组装时按频道数量均分刻度盘并对齐刻度格
export const DIAL = {
  min: 87.5, max: 108.3, step: 0.2, major: 1, band: 'FM', unit: 'MHz',
  fmt: (f) => f.toFixed(1),
}

export const STATIONS = [
  {
    id: 'tfr-europe', labelEn: 'EUR', call: 'Radio Majestic Europe', callEn: 'Radio Majestic Europe', folder: 'europe',
    name: '雄伟欧洲', nameEn: 'Majestic Europe', city: '布鲁塞尔', cityEn: 'Brussels', latin: 'MAJESTIC EUROPE', genre: '欧陆迪斯科', genreEn: 'Euro Disco',
    blurb: '欧罗巴花园里的热门与遗珠', blurbEn: 'Hits and hidden gems from the gardens of Europa',
    accent: '#8f7bff', glow: '#c7bcff',
    emblem: 'stars', pattern: 'circuit',
  },
  {
    id: 'tfr-east', labelEn: 'PRC', call: '东方之星 · Eastern Star', callEn: 'Eastern Star', folder: 'east',
    name: '东方之星', nameEn: 'Eastern Star', city: '上海', cityEn: 'Shanghai', latin: 'EASTERN STAR', genre: '华语金曲', genreEn: 'Chinese Golden Hits',
    blurb: '穿过长城运来的歌', blurbEn: 'Songs carried over the Great Wall',
    accent: '#ff4f9a', glow: '#ff9cc8',
    emblem: 'eastStar', pattern: 'lattice',
  },
  {
    id: 'tfr-moshi', labelEn: 'JAP', call: 'もしもし、こちらラジオ', callEn: 'Moshi Moshi, This Is Radio', folder: 'moshi',
    name: '嗨，日本', nameEn: 'Hi, Japan', city: '东京', cityEn: 'Tokyo', latin: 'MOSHI MOSHI', genre: '城市流行', genreEn: 'City Pop',
    blurb: '旭日之国与加班族的音乐', blurbEn: 'Music for the land of the rising sun and its overtime workers',
    accent: '#ff7ad9', glow: '#ffc2ef',
    emblem: 'sun', pattern: 'scanlines',
  },
  {
    id: 'tfr-dekabr', labelEn: 'RUS', call: 'Говорит «Дети Декабря»', callEn: 'Children of December Speaking', folder: 'dekabr',
    name: '十二月春日', nameEn: 'December Spring', city: '莫斯科', cityEn: 'Moscow', latin: 'DEKABR · VESNA', genre: '俄语摇滚与流行', genreEn: 'Russian Rock & Pop',
    blurb: '地下摇滚的十二月，流行金曲的春天', blurbEn: 'The December of underground rock, the spring of pop hits',
    accent: '#b45cff', glow: '#e0b8ff',
    emblem: 'flake', pattern: 'blocks',
  },
  {
    id: 'tfr-urban', labelEn: 'USA', call: 'Urban Currents FM', callEn: 'Urban Currents FM', folder: 'urban',
    name: '都市潮流', nameEn: 'Urban Currents', city: '洛杉矶', cityEn: 'Los Angeles', latin: 'URBAN CURRENTS', genre: '潮流金曲', genreEn: 'Trendsetting Hits',
    blurb: '给爱赶时髦、爱一切流行的人', blurbEn: 'For those who chase every trend and love all things pop',
    accent: '#45e0ff', glow: '#b5f4ff',
    emblem: 'tower', pattern: 'chevrons',
  },
  {
    id: 'tfr-fire', labelEn: 'TFR', call: 'The Fire Rises', callEn: 'The Fire Rises', folder: 'fire',
    name: '烈焰升腾', nameEn: 'The Fire Rises', city: '新世界', cityEn: 'New World', latin: 'THE FIRE RISES', genre: '原声与氛围', genreEn: 'Soundtrack & Ambience',
    blurb: '模组原声与从世界各处搜罗来的氛围音乐', blurbEn: 'The mod\'s soundtrack and ambience gleaned from every corner of the world',
    accent: '#ff5bd1', glow: '#ffb0ec',
    emblem: 'flame', pattern: 'flames',
  },
]

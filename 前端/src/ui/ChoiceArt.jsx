// 设置页“播放控件”与“时钟”卡片上的小示意图，统一 200×54
const Frame = ({ children, bg }) => (
  <svg viewBox="0 0 200 54" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    {bg}
    {children}
  </svg>
)

// —— 播放控件 ——
const VintageArt = () => (
  <Frame bg={<rect width="200" height="54" fill="#120d09" />}>
    <rect x="34" y="12" width="132" height="30" rx="4" fill="#1d150e" stroke="#c9a45c" strokeOpacity="0.6" />
    {Array.from({ length: 27 }, (_, i) => <line key={i} x1={40 + i * 4.6} x2={40 + i * 4.6} y1="26" y2={i % 5 ? 30 : 33} stroke="#efe3c6" strokeOpacity="0.55" />)}
    <line x1="112" x2="112" y1="14" y2="40" stroke="#ff5a36" strokeWidth="1.5" />
    <circle cx="17" cy="27" r="11" fill="#1b130c" stroke="#c9a45c" strokeOpacity="0.5" />
    <circle cx="183" cy="27" r="11" fill="#1b130c" stroke="#c9a45c" strokeOpacity="0.5" />
    <circle cx="17" cy="27" r="4" fill="#c9a45c" />
    <circle cx="183" cy="27" r="4" fill="#c9a45c" />
  </Frame>
)

const NeonArt = () => (
  <Frame bg={<>
    <defs>
      <linearGradient id="ca-neo" x1="0" x2="1"><stop offset="0" stopColor="#ff3ea5" /><stop offset="0.5" stopColor="#b45cff" stopOpacity="0.4" /><stop offset="1" stopColor="#6af3ff" /></linearGradient>
      <linearGradient id="ca-hex" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff3ea5" /><stop offset="1" stopColor="#6af3ff" /></linearGradient>
    </defs>
    <rect width="200" height="54" fill="#0b0418" />
  </>}>
    <path d="M 14 12 H 192 V 36 L 186 42 H 8 V 18 Z" fill="#1c0a36" stroke="url(#ca-neo)" strokeWidth="1" />
    <path d="M 20 21 h 10 l 5 6 l -5 6 h -10 l -5 -6 Z" fill="#2a0d48" stroke="url(#ca-hex)" strokeWidth="1.2" />
    <text x="44" y="30" fontSize="9" fill="#e6fcff" fontFamily="Bahnschrift, sans-serif" style={{ filter: 'drop-shadow(0 0 2px #6af3ff)' }}>101.8</text>
    {Array.from({ length: 10 }, (_, i) => <rect key={i} x={44 + i * 2.6} y={38 - [3, 5, 4, 6, 3, 2, 4, 3, 2, 1][i]} width="1.6" height={[3, 5, 4, 6, 3, 2, 4, 3, 2, 1][i]} fill="#ff3ea5" />)}
    {[80, 104, 128].map((x, i) => (
      <path key={x} d={`M ${x + 3} 20 h 20 l -3 14 h -20 Z`} fill={i === 1 ? 'rgba(255,62,165,.35)' : 'none'} stroke={i === 1 ? '#ff9cc8' : 'rgba(185,140,255,.35)'} />
    ))}
    {Array.from({ length: 6 }, (_, i) => <rect key={i} x={160 + i * 4} y={34 - i * 2.4} width="2.4" height={4 + i * 2.4} fill={i < 4 ? '#b45cff' : 'rgba(185,140,255,.25)'} />)}
  </Frame>
)

const GildedArt = () => (
  <Frame bg={<>
    <defs>
      <linearGradient id="ca-gold" x1="0" x2="1"><stop offset="0" stopColor="#8a6526" /><stop offset="0.5" stopColor="#fbe9b4" /><stop offset="1" stopColor="#8a6526" /></linearGradient>
      <radialGradient id="ca-ivory" cx="0.5" cy="1" r="1"><stop offset="0" stopColor="#f3e6c6" /><stop offset="1" stopColor="#c7ab72" /></radialGradient>
    </defs>
    <rect width="200" height="54" fill="#100a06" />
  </>}>
    <rect x="6" y="32" width="188" height="18" rx="3" fill="#1e140b" stroke="#d9b56a" strokeOpacity="0.6" />
    <path d="M 64 48 A 36 38 0 0 1 136 48 Z" fill="url(#ca-ivory)" stroke="url(#ca-gold)" strokeWidth="2.4" />
    {Array.from({ length: 13 }, (_, i) => {
      const t = ((-60 + i * 10) * Math.PI) / 180
      return <line key={i} x1={100 + 30 * Math.sin(t)} y1={48 - 31.5 * Math.cos(t)} x2={100 + 33 * Math.sin(t)} y2={48 - 34.6 * Math.cos(t)} stroke="#4a3418" strokeWidth="0.7" />
    })}
    <line x1="100" y1="48" x2="113" y2="16" stroke="#2a3f8a" strokeWidth="1.3" />
    <circle cx="100" cy="48" r="4" fill="#d9b56a" />
    {[22, 36, 50].map((x, i) => <circle key={x} cx={x} cy="41" r={i === 1 ? 5.5 : 4} fill={i === 1 ? '#e6c47c' : '#1a1009'} stroke="#d9b56a" strokeWidth="1" />)}
    <text x="160" y="45" fontSize="10" fontStyle="italic" fontWeight="600" fill="#f1d79a" fontFamily="'Cormorant Garamond', serif">mf</text>
  </Frame>
)

const ModernArt = () => (
  <Frame bg={<>
    <defs><linearGradient id="ca-mg" x1="0" x2="1"><stop offset="0" stopColor="#2a3550" /><stop offset="1" stopColor="#4d3a2c" /></linearGradient></defs>
    <rect width="200" height="54" fill="url(#ca-mg)" />
  </>}>
    <rect x="12" y="17" width="176" height="20" rx="10" fill="#fff" fillOpacity="0.14" stroke="#fff" strokeOpacity="0.2" />
    <circle cx="26" cy="27" r="6" fill="#fff" fillOpacity="0.9" />
    <rect x="66" y="21" width="34" height="12" rx="6" fill="#fff" fillOpacity="0.22" />
    {[108, 130, 152].map((x) => <rect key={x} x={x} y="25" width="14" height="4" rx="2" fill="#fff" fillOpacity="0.45" />)}
  </Frame>
)

// —— 时钟 ——
const PilotArt = () => (
  <Frame bg={<rect width="200" height="54" fill="#14100c" />}>
    <circle cx="150" cy="27" r="20" fill="#c9a45c" />
    <circle cx="150" cy="27" r="17.5" fill="#12100e" />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1="150" x2="150" y1="10.5" y2={i % 3 ? 12.5 : 14} stroke="#efe9cc" strokeWidth={i % 3 ? 0.8 : 1.4} transform={`rotate(${i * 30} 150 27)`} />)}
    <path d="M 148 12 L 152 12 L 150 16 Z" fill="#f3f0d2" />
    <line x1="150" y1="27" x2="150" y2="17" stroke="#4a6cb3" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="150" y1="27" x2="160" y2="31" stroke="#4a6cb3" strokeWidth="1.8" strokeLinecap="round" />
    <text x="122" y="31" textAnchor="end" fontSize="14" fill="#efe3c6" fontFamily="'Cormorant Garamond', serif">10:47</text>
  </Frame>
)

const NeonClockArt = () => (
  <Frame bg={<rect width="200" height="54" fill="#0b0418" />}>
    <path d="M 58 8 h 8 M 58 8 v 8 M 142 46 h -8 M 142 46 v -8" stroke="#ff3ea5" strokeWidth="1.2" />
    <path d="M 142 8 h -8 M 142 8 v 8 M 58 46 h 8 M 58 46 v -8" stroke="#6af3ff" strokeWidth="1.2" />
    <text x="96" y="32" textAnchor="middle" fontSize="20" fill="#fff3fc" fontFamily="Bahnschrift, sans-serif"
      style={{ filter: 'drop-shadow(0 0 2px #ff3ea5) drop-shadow(0 0 5px #b45cff)' }}>10:47</text>
    <text x="126" y="22" fontSize="7" fill="#6af3ff" fontFamily="Bahnschrift, sans-serif">32</text>
    {Array.from({ length: 30 }, (_, i) => <rect key={i} x={66 + i * 2.3} y="38" width="1.6" height="3" fill={i < 16 ? (i < 8 ? '#b45cff' : '#ff3ea5') : 'rgba(185,140,255,.2)'} />)}
  </Frame>
)

const PocketArt = () => (
  <Frame bg={<>
    <defs>
      <linearGradient id="ca-pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdedbb" /><stop offset="0.5" stopColor="#b58a3c" /><stop offset="1" stopColor="#e8c77d" /></linearGradient>
      <radialGradient id="ca-ps" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stopColor="#fcfaf4" /><stop offset="1" stopColor="#cfc5ae" /></radialGradient>
    </defs>
    <rect width="200" height="54" fill="#120c07" />
  </>}>
    <ellipse cx="150" cy="7" rx="5" ry="4.4" fill="none" stroke="url(#ca-pg)" strokeWidth="1.4" />
    <rect x="148" y="9" width="4" height="4" fill="url(#ca-pg)" />
    <circle cx="150" cy="31" r="19" fill="url(#ca-pg)" />
    <circle cx="150" cy="31" r="16.5" fill="url(#ca-ps)" />
    {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={150 + 4 * Math.cos((i * Math.PI) / 12)} cy={31 + 4 * Math.sin((i * Math.PI) / 12)} r="6" fill="none" stroke="#8a806b" strokeWidth="0.2" opacity="0.6" />)}
    <circle cx="150" cy="37.5" r="3.4" fill="none" stroke="#3a332a" strokeWidth="0.4" />
    <line x1="150" y1="31" x2="150" y2="19" stroke="#2a3f8a" strokeWidth="1" />
    <circle cx="150" cy="22.5" r="1.4" fill="none" stroke="#2a3f8a" strokeWidth="0.6" />
    <line x1="150" y1="31" x2="157" y2="34" stroke="#2a3f8a" strokeWidth="1.2" />
    <text x="122" y="30" textAnchor="end" fontSize="14" fill="#f8ecd1" fontFamily="'Cormorant Garamond', serif">10:47</text>
    <text x="122" y="42" textAnchor="end" fontSize="7.5" fontStyle="italic" fill="#e9c97f" fontFamily="'Cormorant Garamond', serif">Allegro</text>
  </Frame>
)

const FlatArt = () => (
  <Frame bg={<>
    <defs><linearGradient id="ca-fg" x1="0" x2="1"><stop offset="0" stopColor="#1f2740" /><stop offset="1" stopColor="#2c2236" /></linearGradient></defs>
    <rect width="200" height="54" fill="url(#ca-fg)" />
  </>}>
    <circle cx="152" cy="27" r="16" fill="#fff" fillOpacity="0.12" />
    <circle cx="152" cy="27" r="14.5" fill="none" stroke="var(--accent-2, var(--accent))" strokeWidth="1.6" strokeLinecap="round"
      strokeDasharray="56 100" transform="rotate(-90 152 27)" />
    <line x1="152" y1="27" x2="152" y2="20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <line x1="152" y1="27" x2="161" y2="30" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="152" cy="27" r="1.6" fill="var(--accent)" />
    <text x="126" y="33" textAnchor="end" fontSize="17" fontWeight="200" fill="#fff" fontFamily="'Segoe UI Variable Display', 'Segoe UI', sans-serif">10:47</text>
  </Frame>
)

export const STYLE_ART = { vintage: VintageArt, neon: NeonArt, gilded: GildedArt, modern: ModernArt }
export const CLOCK_ART = { pilot: PilotArt, neon: NeonClockArt, pocket: PocketArt, flat: FlatArt }

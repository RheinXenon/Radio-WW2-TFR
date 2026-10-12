// 线描图标，统一 24×24、1.4 笔宽，风格贴近旧式仪器面板上的雕刻符号
const P = {
  play: <path d="M8 5.5 L18.5 12 L8 18.5 Z" fill="currentColor" stroke="none" />,
  pause: <g fill="currentColor" stroke="none"><rect x="7" y="5.5" width="3.4" height="13" rx="0.6" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="0.6" /></g>,
  prev: <g fill="currentColor" stroke="none"><rect x="5.5" y="6" width="2" height="12" rx="0.5" /><path d="M18.5 6 L9 12 L18.5 18 Z" /></g>,
  next: <g fill="currentColor" stroke="none"><rect x="16.5" y="6" width="2" height="12" rx="0.5" /><path d="M5.5 6 L15 12 L5.5 18 Z" /></g>,
  shuffle: <path d="M4 7h3.5c3 0 4.5 10 8 10H20M17.5 14.5 20 17l-2.5 2.5M4 17h3.5c1.4 0 2.4-2 3.3-4.2M13.2 9.2C14 8 14.8 7 16 7h4M17.5 4.5 20 7l-2.5 2.5" />,
  seq: <path d="M4 7h13M4 12h13M4 17h8M17 14.5l3 2.5-3 2.5" />,
  one: <g><path d="M5 12a6.5 6.5 0 0 1 11.2-4.5M19 12a6.5 6.5 0 0 1-11.2 4.5M16.5 4.5v3h-3M7.5 19.5v-3h3" /><path d="M11.2 10.4 12.3 9.6V14.6" /></g>,
  gallery: <g><rect x="3.5" y="5.5" width="17" height="13" rx="1" /><path d="M3.5 15.5l4.6-4.4 3.6 3.4 3-2.6 5.8 5" /><circle cx="15.6" cy="9.3" r="1.4" /></g>,
  mixer: <g><path d="M6 4v16M12 4v16M18 4v16" /><rect x="4" y="13" width="4" height="2.6" rx="0.6" fill="currentColor" /><rect x="10" y="7.5" width="4" height="2.6" rx="0.6" fill="currentColor" /><rect x="16" y="11" width="4" height="2.6" rx="0.6" fill="currentColor" /></g>,
  settings: <g><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /><circle cx="12" cy="12" r="6.3" /></g>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  help: <g><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.9v.5" /><circle cx="12" cy="16.9" r="0.6" fill="currentColor" /></g>,
  eye: <g><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></g>,
  rain: <g><path d="M6.5 14.5a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 17.4 8a3.3 3.3 0 0 1 .3 6.5" /><path d="M8 17l-1 2.5M12 16.5l-1 2.5M16 17l-1 2.5" /></g>,
  wind: <path d="M3.5 9h11a2.8 2.8 0 1 0-2.8-2.8M3.5 13h15a2.8 2.8 0 1 1-2.8 2.8M3.5 17h7" />,
  forest: <g><path d="M8 3.5 3.5 12h3l-2.5 4.5h8L9.5 12h3Z" /><path d="M8 16.5v4M16 6l-3.5 7h2.5l-2 4h6l-2-4h2.5Z" /><path d="M16 17v3.5" /></g>,
  fire: <g><path d="M12 3.5c1 3.3 4.8 5 4.8 9.6a4.8 4.8 0 0 1-9.6 0c0-2 1-3.3 2-4.3.2 1.4.9 2.3 1.9 2.6-.4-2.7.2-5.4.9-7.9Z" /><path d="M5 20.5h14M7.5 18.5l9 2.4M16.5 18.5l-9 2.4" /></g>,
  trench: <g><path d="M3 17.5h18M5 17.5l1.6-3h10.8l1.6 3" /><path d="M14 9.5l2.2-3.2M17.5 11l3-1.6M10.5 8.5l-.5-3.8" /><circle cx="12.5" cy="12" r="1.4" /></g>,
  distant: <g><path d="M2.5 18h19" /><path d="M5 18c1-3 2.3-4.2 3.5-4.2S11 15 12 18" /><path d="M14.5 10.5c.4-1.6 1.4-2.5 2.5-2.5s2 .9 2.4 2.5M15.5 6.5c.4-.6 1-1 1.5-1s1.1.4 1.5 1" /></g>,
  snow: <g><path d="M12 3.5v17M4.6 7.75l14.8 8.5M4.6 16.25l14.8-8.5" /><path d="M9.8 4.8 12 7l2.2-2.2M9.8 19.2 12 17l2.2 2.2" /></g>,
  radio: <g><rect x="3.5" y="8.5" width="17" height="11" rx="1.4" /><path d="M7 8.5 15.5 4" /><circle cx="15.5" cy="14" r="2.6" /><path d="M6.5 12h4M6.5 14.5h4M6.5 17h4" /></g>,
  clock: <g><path d="M8 3.5h8l1.5 3v12L16 20.5H8l-1.5-2v-12Z" /><circle cx="12" cy="10.5" r="3.3" /><path d="M12 9v1.6l1 .8M12 14v3.6" /><circle cx="12" cy="17.8" r="0.9" /></g>,
  wave: <path d="M2.5 12c2 0 2-5 4-5s2 10 4 10 2-10 4-10 2 10 4 10 2-5 3-5" />,
  volume: <g><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" /></g>,
  mute: <g><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4Z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></g>,
  hide: <g><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><path d="M4 4l16 16" /></g>,
  list: <g><path d="M4 6.5h11M4 11h11M4 15.5h6.5" /><circle cx="16" cy="17.5" r="2.2" /><path d="M18.2 17.5V9l2.3 1.2" /></g>,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5 9.5 17 19 7.5" />,
  search: <g><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></g>,
  grip: <g fill="currentColor" stroke="none"><circle cx="9" cy="7" r="1.2" /><circle cx="15" cy="7" r="1.2" /><circle cx="9" cy="12" r="1.2" /><circle cx="15" cy="12" r="1.2" /><circle cx="9" cy="17" r="1.2" /><circle cx="15" cy="17" r="1.2" /></g>,
  chevron: <path d="M7 10l5 5 5-5" />,
  back: <path d="M14.5 6 8.5 12l6 6" />,
  forward: <path d="M9.5 6l6 6-6 6" />,
  disc: <g><circle cx="12" cy="12" r="8.5" /><path d="M12 6.8a5.2 5.2 0 1 0 5.2 5.2M12 9a3 3 0 1 0 3 3" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /></g>,
  themes: <g><rect x="4" y="3.5" width="12" height="15" rx="1.2" /><path d="M8 20.5h10.8a1.2 1.2 0 0 0 1.2-1.2V7.5" /><path d="M6.5 14l2.8-3 2.2 2.2 1.5-1.4 1.5 1.6" /><circle cx="12.6" cy="7.6" r="1.1" /></g>,
  edit: <g><path d="M4.5 19.5h4l10-10a2.8 2.8 0 0 0-4-4l-10 10Z" /><path d="M13 7l4 4" /></g>,
  trash: <g><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5" /><path d="M10 10.5v6M14 10.5v6" /></g>,
  up: <path d="M7 14l5-5 5 5" />,
  down: <path d="M7 10l5 5 5-5" />,
}

export function Icon({ name, size = 20, className, style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      {P[name] ?? P.wave}
    </svg>
  )
}

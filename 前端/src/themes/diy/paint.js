// 自建主题的程序壁纸：四种现代抽象画面，配色取主题主色、辅色与频道主色
import { shade, hexToHsl } from '../../scene/paint.js'

// 每项为 [id, name, desc, nameEn, descEn]，前三位沿用数组解构读取
export const MOODS = [
  ['aurora', '极光', '夜空里流动的光幕与层叠山影', 'Aurora', 'Shimmering curtains of light over layered ridges'],
  ['mesh', '流光', '柔和的渐变光斑与悬浮的玻璃球', 'Streaming Light', 'Soft gradient glows and floating glass spheres'],
  ['horizon', '地平线', '极简的落日、海面与沙丘', 'Horizon', 'A minimalist sunset, sea and dunes'],
  ['grid', '几何', '暗场中漂浮的线框几何体', 'Geometry', 'Wireframe solids drifting in the dark'],
]

function aurora(p, a, b) {
  const { w, h, k, c } = p
  p.sky([[0, shade(a, { l: 0.03 })], [0.6, shade(a, { l: 0.09, s: 0.7 })], [1, shade(b, { l: 0.14, s: 0.6 })]])
  p.stars(220, h * 0.7, 0.85)
  c.save(); c.globalCompositeOperation = 'lighter'
  for (let band = 0; band < 4; band++) {
    const col = band % 2 ? b : a
    const y0 = h * (0.1 + band * 0.06)
    const ph = p.rand(0, 6)
    for (let x = 0; x < w; x += 2 * k) {
      const y = y0 + Math.sin(x / (260 * k) + ph) * 60 * k + Math.sin(x / (90 * k) + ph * 2) * 14 * k
      const len = (160 + 110 * Math.sin(x / (330 * k) + band)) * k
      const g = c.createLinearGradient(0, y, 0, y + len)
      g.addColorStop(0, shade(col, { a: 0 })); g.addColorStop(0.25, shade(col, { a: 0.07 })); g.addColorStop(1, shade(col, { a: 0 }))
      c.fillStyle = g; c.fillRect(x, y, 2 * k, len)
    }
  }
  c.restore()
  const ridges = [[0.62, 0.07, 0.14, 0.12], [0.7, 0.06, 0.09, 0.32], [0.8, 0.05, 0.05, 0.58], [0.9, 0.04, 0.025, 0.85]]
  for (const [y, amp, l, z] of ridges) p.ridge({ y: h * y, amp: h * amp, fill: shade(a, { l, s: 0.4 }), z, rough: 0.6, freq: 1.2 })
  p.finish({ vignette: 0.5, grain: 0.035 })
}

function mesh(p, a, b) {
  const { w, h, k, c } = p
  const [ha] = hexToHsl(a)
  p.sky([[0, shade(a, { l: 0.12, s: 0.6 })], [1, shade(b, { l: 0.08, s: 0.6 })]])
  for (let i = 0; i < 9; i++) {
    const col = i % 3 === 0 ? b : a
    const x = p.rand(0, w), y = p.rand(0, h), r = p.rand(300, 700) * k
    const g = c.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, shade(col, { a: 0.55, dl: 0.05, h: i % 3 === 2 ? 40 : 0 })); g.addColorStop(1, shade(col, { a: 0 }))
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // 悬浮的玻璃球：近大远小，近处的更亮
  const spheres = Array.from({ length: 7 }, () => ({ x: p.rand(0.08, 0.92) * w, y: p.rand(0.12, 0.88) * h, z: p.rand(0.1, 0.95) }))
  spheres.sort((m, n) => m.z - n.z)
  for (const s of spheres) {
    const r = (40 + s.z * 150) * k
    const g = c.createRadialGradient(s.x - r * 0.35, s.y - r * 0.4, r * 0.05, s.x, s.y, r)
    g.addColorStop(0, `hsla(${ha},80%,92%,0.9)`); g.addColorStop(0.35, shade(a, { a: 0.55, dl: 0.12 })); g.addColorStop(1, shade(b, { a: 0.25, dl: -0.1 }))
    p.circle(s.x, s.y, r, g, s.z)
    c.save(); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2 * k
    c.beginPath(); c.arc(s.x, s.y, r - 1, 0, Math.PI * 2); c.stroke(); c.restore()
  }
  p.finish({ vignette: 0.35, grain: 0.04 })
}

function horizon(p, a, b) {
  const { w, h, k } = p
  p.sky([[0, shade(a, { l: 0.2, s: 0.5 })], [0.55, shade(b, { l: 0.62, s: 0.8 })], [0.62, shade(b, { l: 0.78, s: 0.9 })]])
  const hz = h * 0.62
  p.glow(w * 0.5, hz, w * 0.45, shade(b, { a: 0.55, l: 0.7 }))
  p.circle(w * 0.5, hz - h * 0.05, h * 0.11, shade(b, { l: 0.88, s: 0.9 }), 0.05)
  p.ground(hz, [[0, shade(a, { l: 0.3, s: 0.5 })], [1, shade(a, { l: 0.08, s: 0.5 })]], 0.15, 0.4)
  // 海面上的落日倒影
  for (let i = 0; i < 18; i++) {
    const y = hz + i * 6 * k + i * i * 0.6 * k
    const ww = (180 - i * 7) * k
    p.c.fillStyle = shade(b, { l: 0.85, a: 0.5 - i * 0.025 })
    p.c.fillRect(w * 0.5 - ww / 2 + p.rand(-10, 10) * k, y, ww, 2.2 * k)
  }
  for (const [y, amp, l, z] of [[0.8, 0.03, 0.18, 0.55], [0.9, 0.035, 0.1, 0.8], [1.0, 0.04, 0.05, 0.95]]) {
    p.ridge({ y: h * y, amp: h * amp, fill: shade(a, { l, s: 0.45 }), z, rough: 0.1, freq: 0.7 })
  }
  p.finish({ vignette: 0.4, grain: 0.035 })
}

function grid(p, a, b) {
  const { w, h, k, c } = p
  p.sky([[0, '#06070b'], [1, shade(a, { l: 0.08, s: 0.5 })]])
  c.save(); c.strokeStyle = shade(a, { a: 0.08 }); c.lineWidth = 1 * k
  for (let x = 0; x < w; x += 60 * k) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke() }
  for (let y = 0; y < h; y += 60 * k) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke() }
  c.restore()
  const items = Array.from({ length: 11 }, () => ({ x: p.rand(0.05, 0.95) * w, y: p.rand(0.1, 0.9) * h, z: p.rand(0.1, 0.95), kind: p.pick(['ring', 'cube', 'tri']), rot: p.rand(0, Math.PI) }))
  items.sort((m, n) => m.z - n.z)
  for (const it of items) {
    const s = (30 + it.z * 120) * k
    const col = p.r() < 0.5 ? a : b
    p.circle(it.x, it.y, s * 1.1, 'rgba(0,0,0,0)', it.z)
    c.save(); c.translate(it.x, it.y); c.rotate(it.rot)
    c.strokeStyle = shade(col, { a: 0.4 + it.z * 0.6 }); c.lineWidth = (1 + it.z * 2.2) * k
    c.shadowColor = col; c.shadowBlur = 18 * k * it.z
    c.beginPath()
    if (it.kind === 'ring') { c.arc(0, 0, s, 0, Math.PI * 2); c.moveTo(s * 0.6, 0); c.arc(0, 0, s * 0.6, 0, Math.PI * 2) }
    if (it.kind === 'cube') { c.rect(-s / 2, -s / 2, s, s); c.rect(-s / 2 + s * 0.3, -s / 2 - s * 0.3, s, s); for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.moveTo((x * s) / 2, (y * s) / 2); c.lineTo((x * s) / 2 + s * 0.3, (y * s) / 2 - s * 0.3) } }
    if (it.kind === 'tri') { c.moveTo(0, -s); c.lineTo(s * 0.87, s / 2); c.lineTo(-s * 0.87, s / 2); c.closePath() }
    c.stroke(); c.restore()
  }
  p.glow(w * 0.5, h * 0.5, w * 0.5, shade(a, { a: 0.18 }))
  p.finish({ vignette: 0.55, grain: 0.03 })
}

const DRAW = { aurora, mesh, horizon, grid }

// 每个频道两幅：一幅用主题的画面风格，一幅换成下一种风格；配色在主题色与频道色之间互换
export function paint(st, raw) {
  const moods = MOODS.map(([id]) => id)
  const first = moods.includes(raw.mood) ? raw.mood : 'mesh'
  const second = moods[(moods.indexOf(first) + 1) % moods.length]
  const a = st.accent || raw.accent
  const b = raw.accent2 || raw.accent
  return [[first, a, b], [second, b, a]].map(([mood, c1, c2], i) => ({
    name: `${MOODS.find((m) => m[0] === mood)[1]} ${i + 1}`,
    scene: `${st.name} · ${MOODS.find((m) => m[0] === mood)[1]}`,
    draw: (p) => DRAW[mood](p, c1, c2),
    meta: { palette: { light: c2, accent: c1, mean: shade(c1, { l: 0.15 }), shadow: '#05060a' }, light: { x: 0.5, y: 0.4, strength: 0.3 } },
  }))
}

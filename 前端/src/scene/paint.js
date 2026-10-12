// 程序绘制的壁纸：主题还没有放入图片时，用画笔现场画出画面与对应的深度图，
// 接入与文件壁纸完全相同的舞台管线（深度视差、粒子遮挡、体积光、显影过渡）。
// 深度图白近黑远，与 derive.py 生成的约定一致。放入同名池的真实壁纸会排在前面
//
// draw(p) 里的 p 是一支同时落在颜色与深度两张画布上的画笔，坐标为像素，
// p.k 为相对 1920 宽的缩放，所有尺寸都应乘以它，保证缩略图与全尺寸画出同一幅画

const FULL = [1920, 1080]

// 可复现的伪随机：同一张壁纸在任何尺寸、任何时候都画成一样
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const hash = (str) => {
  let h = 2166136261
  for (const ch of str) h = Math.imul(h ^ ch.codePointAt(0), 16777619)
  return h >>> 0
}

const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })
const gray = (z) => {
  const v = Math.round(Math.max(0, Math.min(1, z)) * 255)
  return `rgb(${v},${v},${v})`
}

function painter(w, h, seed) {
  const cc = canvas(w, h)
  const dc = canvas(w, h)
  const c = cc.getContext('2d')
  const d = dc.getContext('2d')
  d.fillStyle = '#000'
  d.fillRect(0, 0, w, h)
  const r = rng(seed)
  const p = {
    c, d, w, h, cc, dc, r,
    k: w / FULL[0],
    rand: (a, b) => a + (b - a) * r(),
    pick: (xs) => xs[Math.floor(r() * xs.length)],

    // 同一条路径分别以颜色与深度填充；z 为空时只画颜色（光晕、光线等不占深度）
    shape(build, fill, z) {
      c.beginPath(); build(c); c.fillStyle = fill; c.fill()
      if (z != null) { d.beginPath(); build(d); d.fillStyle = gray(z); d.fill() }
    },
    rect(x, y, rw, rh, fill, z) { p.shape((g) => g.rect(x, y, rw, rh), fill, z) },
    circle(x, y, rad, fill, z) { p.shape((g) => g.arc(x, y, rad, 0, Math.PI * 2), fill, z) },

    // 竖向渐变铺满整幅（天空）
    sky(stops) {
      const g = c.createLinearGradient(0, 0, 0, h)
      stops.forEach(([o, col]) => g.addColorStop(o, col))
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
    },
    // 地面：颜色渐变，深度从地平线 z0 渐近到画面底部 z1
    ground(y, stops, z0 = 0.35, z1 = 1) {
      const g = c.createLinearGradient(0, y, 0, h)
      stops.forEach(([o, col]) => g.addColorStop(o, col))
      c.fillStyle = g
      c.fillRect(0, y, w, h - y)
      const dg = d.createLinearGradient(0, y, 0, h)
      dg.addColorStop(0, gray(z0)); dg.addColorStop(1, gray(z1))
      d.fillStyle = dg
      d.fillRect(0, y, w, h - y)
    },
    // 只画颜色的柔光
    glow(x, y, rad, color, alpha = 1) {
      const g = c.createRadialGradient(x, y, 0, x, y, rad)
      g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)')
      c.save(); c.globalAlpha = alpha; c.globalCompositeOperation = 'lighter'
      c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      c.restore()
    },
    // 起伏的山脊或云带：由几组正弦叠出的轮廓，向下填满到 base
    ridge({ y, amp, base = h, fill, z, freq = 1, rough = 0.35, step = 8 }) {
      const ph = [p.rand(0, 9), p.rand(0, 9), p.rand(0, 9)]
      p.shape((g) => {
        g.moveTo(0, base)
        for (let x = 0; x <= w + step * p.k; x += step * p.k) {
          const t = (x / w) * Math.PI * 2 * freq
          const v = Math.sin(t + ph[0]) * 0.55 + Math.sin(t * 2.3 + ph[1]) * 0.3 + Math.sin(t * 5.7 + ph[2]) * rough * 0.4
          g.lineTo(x, y - v * amp)
        }
        g.lineTo(w, base)
        g.closePath()
      }, fill, z)
    },
    stars(n, maxY, alpha = 0.9) {
      for (let i = 0; i < n; i++) {
        const x = p.rand(0, w), y = p.rand(0, maxY) * Math.pow(r(), 0.6)
        c.globalAlpha = alpha * p.rand(0.25, 1)
        c.fillStyle = '#fff'
        c.fillRect(x, y, p.k * p.rand(0.8, 2.2), p.k * p.rand(0.8, 2.2))
      }
      c.globalAlpha = 1
    },
    // 颗粒与暗角：让程序画面也带一点胶片的质感
    finish({ vignette = 0.55, grain = 0.06 } = {}) {
      const g = c.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 1.05)
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${vignette})`)
      c.fillStyle = g; c.fillRect(0, 0, w, h)
      if (!grain) return
      c.save()
      for (let i = 0; i < 1400; i++) {
        c.globalAlpha = grain * r()
        c.fillStyle = r() < 0.5 ? '#fff' : '#000'
        c.fillRect(r() * w, r() * h, p.k * 1.5, p.k * 1.5)
      }
      c.restore()
    },
  }
  return p
}

function render(draw, w, h, seed) {
  const p = painter(w, h, seed)
  draw(p)
  return p
}

// 深度图需要柔和的边缘，否则视差步进会在轮廓处撕裂
function softDepth(p) {
  const out = canvas(p.w, p.h)
  const g = out.getContext('2d')
  g.filter = `blur(${Math.max(1, 5 * p.k)}px)`
  g.drawImage(p.dc, 0, 0)
  return out
}

const toBlobUrl = (cv, type, q) => new Promise((ok, fail) =>
  cv.toBlob((b) => (b ? ok(URL.createObjectURL(b)) : fail(new Error('绘制失败'))), type, q))

// 程序壁纸对象，字段与清单里的文件壁纸一致：
// thumb 与 url 首次读取时才画（画廊与主题页用），paint() 供舞台加载全尺寸画面与深度
export function paintedWall(pool, name, draw, { meta = null, scene } = {}) {
  const id = `${pool}/${name}`
  const seed = hash(id)
  let thumb, poster
  return {
    id, name, scene: scene ?? name, meta, depth: null, painted: true,
    get thumb() { return (thumb ??= render(draw, 480, 270, seed).cc.toDataURL('image/jpeg', 0.86)) },
    get url() { return (poster ??= render(draw, 1280, 720, seed).cc.toDataURL('image/jpeg', 0.9)) },
    async paint() {
      const p = render(draw, FULL[0], FULL[1], seed)
      const [url, depth] = await Promise.all([toBlobUrl(p.cc, 'image/jpeg', 0.93), toBlobUrl(softDepth(p), 'image/png')])
      return { url, depth, revoke: () => { URL.revokeObjectURL(url); URL.revokeObjectURL(depth) } }
    },
  }
}

// 颜色工具：十六进制与 HSL 互转、调亮调暗，供程序画面按主题色派生整套配色
export function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const dd = max - min
  const s = l > 0.5 ? dd / (2 - max - min) : dd / (max + min)
  const h = max === r ? (g - b) / dd + (g < b ? 6 : 0) : max === g ? (b - r) / dd + 2 : (r - g) / dd + 4
  return [h * 60, s, l]
}
export const hsl = (h, s, l, a = 1) => `hsla(${((h % 360) + 360) % 360},${Math.round(s * 100)}%,${Math.round(l * 100)}%,${a})`
export function shade(hex, { h = 0, s = 1, l = null, dl = 0, a = 1 } = {}) {
  const [hh, ss, ll] = hexToHsl(hex)
  return hsl(hh + h, Math.min(1, ss * s), Math.max(0, Math.min(1, l ?? ll + dl)), a)
}

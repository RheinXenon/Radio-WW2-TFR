// 壁纸纹理加载：原画 RGB 与深度图合并为一张 RGBA 纹理（A 通道存深度）
// 这样着色器一次采样即可同时拿到颜色与深度，视差步进与体积光的开销减半
import * as THREE from 'three'

const cache = new Map()

async function pixels(url, w, h) {
  const blob = await (await fetch(url)).blob()
  const bmp = await createImageBitmap(blob)
  const cv = document.createElement('canvas')
  cv.width = w ?? bmp.width
  cv.height = h ?? bmp.height
  const g = cv.getContext('2d', { willReadFrequently: true })
  g.drawImage(bmp, 0, 0, cv.width, cv.height)
  return g.getImageData(0, 0, cv.width, cv.height)
}

async function build(wall) {
  // 程序绘制的壁纸先现场画出画面与深度，再走与文件壁纸相同的合并流程
  const src = wall.paint ? await wall.paint() : wall
  const img = await pixels(src.url)
  const { width: w, height: h } = img
  const depth = src.depth ? await pixels(src.depth, w, h).catch(() => null) : null
  src.revoke?.()
  const out = new Uint8Array(w * h * 4)
  // DataTexture 不翻转，这里逐行倒序写入，使纹理坐标原点在左下
  for (let y = 0; y < h; y++) {
    const src = y * w * 4
    const dst = (h - 1 - y) * w * 4
    for (let x = 0; x < w; x++) {
      const i = src + x * 4
      const o = dst + x * 4
      out[o] = img.data[i]
      out[o + 1] = img.data[i + 1]
      out[o + 2] = img.data[i + 2]
      // 缺少深度图时退化为“下近上远”的地面假设
      out[o + 3] = depth ? depth.data[i] : Math.round(255 * (0.12 + 0.7 * Math.pow(y / h, 1.6)))
    }
  }
  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return { tex, size: new THREE.Vector2(w, h), hasDepth: !!depth }
}

export function loadWallpaper(wall) {
  if (!cache.has(wall.id)) {
    cache.set(wall.id, build(wall))
    // 最多保留 6 张，按加入顺序淘汰
    if (cache.size > 6) {
      const [old] = cache.keys()
      cache.get(old).then((r) => r.tex.dispose()).catch(() => {})
      cache.delete(old)
    }
  }
  return cache.get(wall.id)
}

// 空闲预取：停留一段时间确认用户不再切台，再借浏览器空闲把纹理载入缓存
// 已发出的加载无法中途撤回，纹理进缓存后即使这次没用到，后续切换仍可命中
export function prefetchWallpaper(wall, after = 6000) {
  let stop = () => {}
  const timer = setTimeout(() => {
    const ric = window.requestIdleCallback
    if (ric) {
      const id = ric(() => loadWallpaper(wall), { timeout: 8000 })
      stop = () => window.cancelIdleCallback(id)
    } else {
      loadWallpaper(wall)
    }
  }, after)
  return () => { clearTimeout(timer); stop() }
}

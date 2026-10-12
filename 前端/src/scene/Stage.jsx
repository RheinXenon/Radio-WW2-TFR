// 壁纸舞台：深度视差壁纸 + 氛围粒子 + 泛光
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useRadio } from '../store.js'
import { theme } from '../themes/index.js'
import { engine } from '../audio/engine.js'
import { loadWallpaper, prefetchWallpaper } from './loader.js'
import {
  wallpaperVertex, wallpaperFragment, particleVertex, particleFragment,
  KINDS, ADDITIVE, KIND_COLORS, KIND_TONE,
} from './shaders.js'

const FOCUS = 0.42
const BASE_STRENGTH = 0.024

// 当前选择的壁纸；池里缺图时依次退到同池第一张、任意一张
export function resolveWall(sel) {
  const pool = theme.pools[sel.pool]
  return pool?.walls.find((w) => w.name === sel.name) ?? pool?.walls[0]
    ?? Object.values(theme.pools).flatMap((p) => p.walls)[0] ?? null
}

// 逐帧共享的舞台状态：平滑后的鼠标（视角差）、平移、节拍、推镜
const frame = { mouse: new THREE.Vector2(), pan: new THREE.Vector2(), beat: 0, zoom: 0, tex: null, size: new THREE.Vector2(1536, 864) }
const pointer = { x: 0, y: 0, at: -1e9 }
// 滚轮纵移壁纸的目标位置（-1 下缘 ~ 1 上缘）
const wheel = { y: 0 }
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    pointer.at = performance.now()
  })
  // 只认落在舞台画布上的滚动，界面元素上的滚轮各自处理；滚一下约移动四分之一可移范围
  window.addEventListener('wheel', (e) => {
    pointer.at = performance.now()
    if (useRadio.getState().panMode === 'pointer') return
    if (!(e.target instanceof Element) || !e.target.closest('.stage')) return
    const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1)
    wheel.y = Math.max(-1, Math.min(1, wheel.y - d / 400))
  }, { passive: true })
}

// 同池的下一张壁纸（循环到开头），供空闲预取；池里不足两张时为 null
function nextInPool(wall) {
  const walls = theme.pools[wall.id.split('/')[0]]?.walls ?? []
  const i = walls.findIndex((w) => w.id === wall.id)
  return walls.length > 1 ? walls[(i + 1) % walls.length] : null
}

const lightColor = (hex) => {
  const c = new THREE.Color(hex ?? '#ffe2b0')
  const hsl = {}
  c.getHSL(hsl)
  // 光的颜色取画面高光的色相，提亮并略降饱和
  return new THREE.Color().setHSL(hsl.h, Math.min(0.75, hsl.s * 0.9), 0.72)
}

function lightUniform(wall, atm) {
  const l = wall?.meta?.light ?? { x: 0.5, y: 0.1, strength: 0 }
  return new THREE.Vector4(l.x, 1 - l.y, l.strength, atm.shafts ?? 0)
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function Wallpaper({ wall, revealed, onFirstReveal }) {
  const { size } = useThree()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: wallpaperVertex,
    fragmentShader: wallpaperFragment,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uView: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: frame.mouse },
      uPan: { value: frame.pan },
      uStrength: { value: BASE_STRENGTH },
      uFocus: { value: FOCUS },
      uTime: { value: 0 },
      uBeat: { value: 0 },
      uTexA: { value: null }, uTexB: { value: null },
      uSizeA: { value: new THREE.Vector2(16, 9) }, uSizeB: { value: new THREE.Vector2(16, 9) },
      uLightA: { value: new THREE.Vector4() }, uLightB: { value: new THREE.Vector4() },
      uLightColA: { value: new THREE.Color() }, uLightColB: { value: new THREE.Color() },
      uMistA: { value: new THREE.Vector2() }, uMistB: { value: new THREE.Vector2() },
      uMix: { value: 0 },
      uZoom: { value: 0 },
      uEmptyA: { value: 1 },
      uExposure: { value: 1 },
    },
  }), [])

  const anim = useRef({ start: 0, dur: 0, active: false, pending: null, opening: false })
  // 纹理可能在揭幕之后才加载完，回调里要读到最新的揭幕状态
  const revealedRef = useRef(revealed)
  revealedRef.current = revealed

  // 把加载好的纹理放到 A 或 B 槽位
  const assign = (slot, wall, r) => {
    const u = mat.uniforms
    const atm = theme.atmosphereFor(wall.id)
    u[`uTex${slot}`].value = r.tex
    u[`uSize${slot}`].value.copy(r.size)
    u[`uLight${slot}`].value.copy(lightUniform(wall, atm))
    u[`uLightCol${slot}`].value.copy(lightColor(wall.meta?.palette?.light))
    u[`uMist${slot}`].value.set(atm.mist ?? 0, 0)
  }

  const settle = () => {
    const u = mat.uniforms
    for (const k of ['Tex', 'Size', 'Light', 'LightCol', 'Mist']) {
      const b = u[`u${k}B`].value
      if (k === 'Tex') u.uTexA.value = b
      else u[`u${k}A`].value.copy(b)
    }
    u.uMix.value = 0
    u.uEmptyA.value = 0
    anim.current.active = false
  }

  useEffect(() => {
    if (!wall) return
    let alive = true
    loadWallpaper(wall).then((r) => {
      if (!alive) return
      if (anim.current.active) settle()
      assign('B', wall, r)
      frame.size.copy(r.size)
      frame.tex = r.tex
      if (mat.uniforms.uEmptyA.value > 0.5 && !revealedRef.current) {
        anim.current.pending = true // 等开场揭幕
        return
      }
      anim.current = { start: performance.now(), dur: mat.uniforms.uEmptyA.value > 0.5 ? 4.2 : 2.6, active: true, opening: mat.uniforms.uEmptyA.value > 0.5 }
    })
    // 壁纸停留足够久后空闲预取同池下一张，切走即取消
    const stopPrefetch = prefetchWallpaper(nextInPool(wall))
    return () => { alive = false; stopPrefetch() }
  }, [wall?.id])

  useEffect(() => {
    if (revealed && anim.current.pending) {
      anim.current = { start: performance.now(), dur: 4.2, active: true, opening: true }
      onFirstReveal?.()
    }
  }, [revealed])

  useFrame((state, dt) => {
    const u = mat.uniforms
    const t = state.clock.elapsedTime
    u.uTime.value = t
    u.uView.value.set(size.width, size.height)
    const s = useRadio.getState()
    const wheelMode = s.panMode !== 'pointer'

    // 鼠标静止数秒后，视角自行缓慢漂移，画面始终是活的。
    // 视角差纵向始终跟鼠标；滚轮滑动途中再顺着滑动方向轻微俯仰，滑到位后回正
    const idle = performance.now() - pointer.at > 3500
    const dx = idle ? Math.sin(t * 0.11) * 0.42 + Math.sin(t * 0.037) * 0.2 : pointer.x
    const sway = wheelMode ? wheel.y - frame.pan.y : 0
    const dy = (idle ? Math.sin(t * 0.083 + 1.3) * 0.3 : pointer.y) + sway
    const km = 1 - Math.exp(-dt * (idle ? 0.6 : 2.4))
    frame.mouse.x += (dx - frame.mouse.x) * km
    frame.mouse.y += (dy - frame.mouse.y) * km

    // 平移与视角差分开：横向始终跟鼠标；纵向滚轮模式下只听滚轮、不参与漂移，停在哪就停在哪
    if (wheelMode) {
      frame.pan.x = frame.mouse.x
      frame.pan.y += (wheel.y - frame.pan.y) * (1 - Math.exp(-dt * 2.4))
    } else {
      frame.pan.copy(frame.mouse)
    }
    u.uStrength.value = BASE_STRENGTH * s.parallax

    const lv = engine.levels()
    const target = s.reactive && s.playing ? lv.beat : 0
    frame.beat += (target - frame.beat) * (1 - Math.exp(-dt * 14))
    u.uBeat.value = frame.beat

    const a = anim.current
    let zoom = 0.012 * Math.sin(t * 0.05) // 呼吸般的轻微推拉
    if (a.active) {
      const p = Math.min(1, (performance.now() - a.start) / (a.dur * 1000))
      u.uMix.value = a.opening ? p : ease(p)
      if (a.opening) zoom += 0.16 * Math.pow(1 - p, 2.4)
      if (p >= 1) settle()
    }
    u.uZoom.value = zoom
    frame.zoom = zoom
  })

  return (
    <mesh frustumCulled={false} renderOrder={0}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// —— 粒子 ——

// 粒子随壁纸变色：先把色板颜色调到与粒子本色相同的明度，再按比例混合。
// 明度不变，所以雪仍是白的、灰烬仍是灰的；冷暖相反的两色混合时趋于中性，不会绕出杂色
function toward(base, target, amount) {
  const c = new THREE.Color(base)
  if (!target || amount <= 0) return c
  const { l } = c.getHSL({}, THREE.SRGBColorSpace)
  const t = new THREE.Color(target).getHSL({}, THREE.SRGBColorSpace)
  return c.lerp(new THREE.Color().setHSL(t.h, t.s, l, THREE.SRGBColorSpace), amount)
}

// 一层粒子的两种颜色。写了 tint 就用固定颜色；否则取本色，按 tone / adapt 向壁纸色板靠拢，
// 整套氛围的 adapt 再乘在上面（设为 0 即关闭变色）
function layerColors(layer, palette, scale = 1) {
  if (layer.tint) return [new THREE.Color(layer.tint), new THREE.Color(layer.tint2 ?? layer.tint)]
  const [c1, c2] = KIND_COLORS[layer.kind] ?? KIND_COLORS.dust
  const [source, amount] = KIND_TONE[layer.kind] ?? KIND_TONE.dust
  const target = palette?.[layer.tone ?? source]
  const k = (layer.adapt ?? amount) * scale
  return [toward(c1, target, k), toward(c2, target, k)]
}

function ParticleLayer({ layer, wall, adapt, fade }) {
  const { size } = useThree()
  const { geo, mat } = useMemo(() => {
    const n = layer.count
    const seeds = new Float32Array(n * 4)
    const zs = new Float32Array(n)
    const [z0, z1] = layer.z ?? [0, 1]
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 4; j++) seeds[i * 4 + j] = Math.random()
      zs[i] = z0 + (z1 - z0) * Math.pow(Math.random(), 0.8)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    geo.setAttribute('aZ', new THREE.BufferAttribute(zs, 1))
    const [color, color2] = layerColors(layer, wall?.meta?.palette, adapt)
    const mat = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: ADDITIVE.has(layer.kind) ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uView: { value: new THREE.Vector2() },
        uMouse: { value: frame.mouse },
        uPan: { value: frame.pan },
        uStrength: { value: BASE_STRENGTH },
        uFocus: { value: FOCUS },
        uTime: { value: 0 },
        uBeat: { value: 0 },
        uTex: { value: null },
        uSize: { value: new THREE.Vector2(1536, 864) },
        uKind: { value: KINDS[layer.kind] ?? 0 },
        uWind: { value: layer.wind ?? 0.2 },
        uScale: { value: layer.size ?? 1 },
        uZoom: { value: 0 },
        uColor: { value: color },
        uColor2: { value: color2 },
        uOpacity: { value: 0 },
      },
    })
    return { geo, mat }
  }, [layer, wall, adapt])

  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  useFrame((state) => {
    const u = mat.uniforms
    u.uTime.value = state.clock.elapsedTime + 1000
    u.uView.value.set(size.width, size.height)
    u.uBeat.value = frame.beat
    u.uZoom.value = frame.zoom
    u.uStrength.value = BASE_STRENGTH * useRadio.getState().parallax
    u.uTex.value = frame.tex
    u.uSize.value.copy(frame.size)
    u.uOpacity.value = fade.current
  })

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={1} />
}

function Atmosphere({ wall, visible }) {
  const atm = useMemo(() => theme.atmosphereFor(wall.id), [wall.id])
  const fade = useRef(0)
  useFrame((_, dt) => {
    const target = visible ? 1 : 0
    fade.current += (target - fade.current) * (1 - Math.exp(-dt * (visible ? 0.7 : 2.2)))
  })
  return atm.layers.map((l, i) => <ParticleLayer key={i} layer={l} wall={wall} adapt={atm.adapt} fade={fade} />)
}

function Particles({ wall, revealed }) {
  // 换壁纸时旧粒子淡出、新粒子淡入
  const [items, setItems] = useState([])
  useEffect(() => {
    if (!wall) return
    setItems((xs) => [...xs.filter((x) => x.wall.id !== wall.id).map((x) => ({ ...x, dying: true })).slice(-1), { wall, dying: false }])
    const t = setTimeout(() => setItems((xs) => xs.filter((x) => !x.dying)), 2500)
    return () => clearTimeout(t)
  }, [wall?.id])
  return items.map((x) => <Atmosphere key={x.wall.id} wall={x.wall} visible={revealed && !x.dying} />)
}

function Glow() {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) ref.current.intensity = 0.55 + frame.beat * 0.9
  })
  return (
    // 泛光在半分辨率的缓冲上做：发光本是低频模糊，肉眼无差，GPU 带宽省一半
    <EffectComposer multisampling={0} enableNormalPass={false} resolutionScale={0.5}>
      <Bloom ref={ref} mipmapBlur intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.22} radius={0.75} />
    </EffectComposer>
  )
}

// demand 模式下的低频心跳：按约 30fps 请求重绘，漂移与呼吸仍在，只是刷新减半
function Heartbeat() {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    const t = setInterval(invalidate, 33)
    return () => clearInterval(t)
  }, [invalidate])
  return null
}

// paused 时停止逐帧渲染（主题页盖住舞台期间），画面定格在最后一帧；
// 鼠标静止数秒后（calm）降为低帧率渲染，显卡负担约减半，一有输入立即恢复满帧
export default function Stage({ revealed, paused }) {
  const sel = useRadio((s) => s.wallpaper)
  useRadio((s) => s.theme) // 换主题时即使选择相同也要重新解析壁纸
  const wall = resolveWall(sel)
  const [calm, setCalm] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      // 开场揭幕未完成时不降，保证揭幕动画全程满帧
      setCalm(!!revealed && performance.now() - pointer.at > 8000)
    }, 1000)
    return () => clearInterval(t)
  }, [revealed])

  return (
    <Canvas
      className="stage"
      frameloop={paused ? 'never' : calm ? 'demand' : 'always'}
      flat
      dpr={Math.min(window.devicePixelRatio || 1, 1.25)}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      orthographic
      camera={{ position: [0, 0, 1] }}
    >
      <color attach="background" args={['#000']} />
      {wall && <Wallpaper wall={wall} revealed={revealed} />}
      {wall && <Particles wall={wall} revealed={revealed} />}
      <Glow />
      {!paused && calm && <Heartbeat />}
    </Canvas>
  )
}

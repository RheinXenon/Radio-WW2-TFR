// 壁纸着色器
// 纹理约定：RGB 为原画，A 为深度（1 最近，0 最远），由 loader.js 在加载时合并
import * as THREE from 'three'

const common = /* glsl */ `
  uniform vec2 uView;
  uniform vec2 uMouse;
  uniform vec2 uPan;
  uniform float uStrength;
  uniform float uFocus;
  uniform float uTime;
  uniform float uBeat;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }
  // 画面“覆盖”铺满视口时，屏幕 uv 到图像 uv 的缩放；略微放大留出视差余量
  vec2 coverScale(float imgAsp) {
    float viewAsp = uView.x / uView.y;
    vec2 s = viewAsp > imgAsp ? vec2(1.0, imgAsp / viewAsp) : vec2(viewAsp / imgAsp, 1.0);
    return s / 1.07;
  }
  // 覆盖铺满后藏在视口边上的余量，扣除视差自身的位移量，剩下的交给鼠标平移
  // 图片与视口同比例时余量本来就小，平移自然退化为原有的轻微浮动
  vec2 panRoom(vec2 s) {
    vec2 margin = max(vec2(1.0) - s, vec2(0.0)) * 0.5;
    return max(margin - vec2(uStrength * 0.6 + 0.004), vec2(0.0));
  }
`

export const wallpaperVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const wallpaperFragment = /* glsl */ `
  ${common}
  varying vec2 vUv;

  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform vec2 uSizeA;
  uniform vec2 uSizeB;
  uniform vec4 uLightA;   // xy 光源位置，z 强度，w 体积光系数
  uniform vec4 uLightB;
  uniform vec3 uLightColA;
  uniform vec3 uLightColB;
  uniform vec2 uMistA;    // x 雾量
  uniform vec2 uMistB;
  uniform float uMix;     // 0 只显示 A，1 只显示 B
  uniform float uZoom;    // 推镜，>0 向画面内推进
  uniform float uEmptyA;  // A 为空（开场从黑场显影）
  uniform float uExposure;

  // 视差遮挡映射：从近到远逐层步进，找到视线第一次碰到的表面
  vec2 parallax(sampler2D tex, vec2 uv, float zoom) {
    vec2 shift = uMouse * uStrength;
    const int N = 26;
    vec2 prevP = uv;
    float prevDiff = -1.0;
    for (int i = 0; i < N; i++) {
      float h = 1.0 - float(i) / float(N - 1);
      float k = h - uFocus;
      vec2 p = uv + shift * k - (uv - 0.5) * zoom * k;
      float diff = texture2D(tex, p).a - h;
      if (diff >= 0.0) {
        if (i == 0) return p;
        return mix(prevP, p, prevDiff / (prevDiff - diff));
      }
      prevP = p;
      prevDiff = diff;
    }
    return prevP;
  }

  // 体积光：沿像素到光源的连线采样远处的亮部
  vec3 shafts(sampler2D tex, vec2 p, vec4 light, vec3 col) {
    if (light.w <= 0.001) return vec3(0.0);
    const int S = 28;
    vec2 delta = (p - light.xy) * (0.85 / float(S));
    vec2 q = p;
    float decay = 1.0;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < S; i++) {
      q -= delta;
      vec4 s = texture2D(tex, q);
      float b = max(0.0, dot(s.rgb, vec3(0.299, 0.587, 0.114)) - 0.55) * (1.0 - s.a);
      acc += s.rgb * b * decay;
      decay *= 0.94;
    }
    float falloff = 1.0 / (1.0 + 2.5 * length((p - light.xy) * vec2(1.6, 1.0)));
    return acc * col * light.w * light.z * falloff * (0.55 + uBeat * 0.9) * 0.55;
  }

  vec4 shade(sampler2D tex, vec2 size, vec4 light, vec3 lightCol, vec2 mist, float zoom) {
    vec2 s = coverScale(size.x / size.y);
    // 比例与视口不同的画，靠平移把藏在视口外的部分带进来，到屏幕边缘刚好看到画的边缘
    vec2 uv = (vUv - 0.5) * s + 0.5 + panRoom(s) * uPan;
    vec2 p = parallax(tex, uv, zoom);
    vec4 c = texture2D(tex, p);
    // 轻度锐化：原画分辨率低于屏幕时找回线稿的利落
    vec2 px = 1.0 / size;
    vec3 blur = (texture2D(tex, p + vec2(px.x, 0.0)).rgb + texture2D(tex, p - vec2(px.x, 0.0)).rgb
               + texture2D(tex, p + vec2(0.0, px.y)).rgb + texture2D(tex, p - vec2(0.0, px.y)).rgb) * 0.25;
    vec3 col = c.rgb + (c.rgb - blur) * 0.45;
    // 雾：只在中远景，缓慢横向流动
    if (mist.x > 0.0) {
      float band = smoothstep(0.62, 0.18, c.a) * smoothstep(-0.05, 0.12, c.a);
      float n = fbm(p * vec2(3.2, 7.0) + vec2(uTime * 0.018, uTime * 0.004));
      float f = mist.x * band * smoothstep(0.38, 0.82, n);
      col = mix(col, mix(lightCol, vec3(0.92, 0.94, 0.97), 0.55), f * 0.55);
    }
    col += shafts(tex, p, light, lightCol);
    return vec4(col, c.a);
  }

  void main() {
    vec4 a = uEmptyA > 0.5 ? vec4(0.0) : shade(uTexA, uSizeA, uLightA, uLightColA, uMistA, uZoom);
    vec3 col = a.rgb;
    if (uMix > 0.0) {
      float zb = uZoom + (1.0 - uMix) * 0.09;
      vec4 b = shade(uTexB, uSizeB, uLightB, uLightColB, uMistB, zb);
      // 由远及近显影：远景先浮现，前景最后到场，交界处一道暖光
      float t = uMix * 1.4 - 0.22;
      float edge = b.a + (fbm(vUv * vec2(9.0, 5.0) + uTime * 0.05) - 0.5) * 0.16;
      float m = smoothstep(edge - 0.03, edge + 0.11, t);
      float glow = m * (1.0 - m) * 4.0;
      col = mix(col, b.rgb, m) + uLightColB * glow * 0.5 * (1.0 - uMix * 0.5);
    }

    col *= uExposure;
    // 随乐律动：低音来时画面整体微微升温提亮
    col *= 1.0 + uBeat * vec3(0.075, 0.05, 0.022);

    // 暗角
    vec2 q = (vUv - 0.5) * vec2(uView.x / uView.y * 0.62, 1.0);
    col *= mix(1.0, smoothstep(1.05, 0.28, length(q)), 0.5);

    // 画布肌理：低频笔触起伏与细密的布纹，模拟油画底材
    vec2 fc = gl_FragCoord.xy;
    float h0 = vnoise(fc * 0.42);
    float emb = (h0 - vnoise((fc + vec2(1.0, 1.0)) * 0.42));
    float weave = sin(fc.x * 1.9) * sin(fc.y * 1.9);
    float stroke = fbm(vUv * vec2(60.0, 22.0)) - 0.5;
    col *= 1.0 + emb * 0.07 + weave * 0.012 + stroke * 0.035;

    // 胶片颗粒
    float g = hash12(fc + fract(uTime * 7.31) * 913.0) - 0.5;
    col += g * 0.028 * (1.0 - dot(col, vec3(0.33)) * 0.5);

    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`

export const particleVertex = /* glsl */ `
  ${common}
  attribute vec4 aSeed;
  attribute float aZ;
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform float uKind;
  uniform float uWind;
  uniform float uScale;
  uniform float uZoom;
  varying float vAlpha;
  varying float vRot;
  varying float vBlur;
  varying float vVar;

  void main() {
    float z = aZ;
    vec4 sd = aSeed;
    float t = uTime;
    vec2 pos;
    float alpha = 1.0;
    float rot = 0.0;
    float size = 1.0;
    int k = int(uKind + 0.5);

    if (k == 0) { // 浮尘
      pos = sd.xy + vec2(sin(t * 0.07 + sd.z * 6.28) * 0.04 + t * 0.0025, cos(t * 0.05 + sd.w * 6.28) * 0.035 + t * 0.0012);
      alpha = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (0.6 + sd.z) + sd.w * 40.0), 3.0);
      size = 0.55 + sd.z * 0.6;
    } else if (k == 1) { // 雪
      float v = 0.018 + 0.05 * z + sd.z * 0.02;
      pos = vec2(sd.x + sin(t * (0.4 + sd.w * 0.5) + sd.z * 6.28) * 0.012 + t * uWind * 0.03 * (0.3 + z), sd.y - t * v);
      size = 0.6 + sd.w * 0.7;
    } else if (k == 2 || k == 3) { // 落叶 / 花瓣
      float v = 0.012 + 0.024 * z + sd.z * 0.012;
      pos = vec2(sd.x + sin(t * 0.35 + sd.w * 6.28) * 0.05 + t * (0.008 + uWind * 0.02), sd.y - t * v);
      rot = t * (0.6 + sd.z * 1.6) * (sd.w > 0.5 ? 1.0 : -1.0) + sd.x * 6.28;
      size = k == 2 ? 1.6 + sd.z : 0.9 + sd.z * 0.5;
      alpha = 0.92;
    } else if (k == 4) { // 火星
      float v = 0.02 + 0.045 * sd.z;
      pos = vec2(sd.x + sin(t * 1.3 + sd.w * 20.0) * 0.008 + t * 0.006, sd.y + t * v);
      float life = fract(sd.y + t * v);
      alpha = smoothstep(0.0, 0.1, life) * (1.0 - life) * (0.6 + 0.4 * sin(t * 12.0 + sd.w * 50.0));
      size = 0.4 + sd.z * 0.5;
    } else if (k == 5) { // 灰烬
      pos = vec2(sd.x + sin(t * 0.25 + sd.w * 6.28) * 0.04 + t * 0.006, sd.y - t * (0.006 + 0.012 * sd.z));
      rot = t * (0.8 + sd.z) + sd.w * 6.28;
      size = 0.6 + sd.z * 0.7;
      alpha = 0.75;
    } else if (k == 6) { // 风沙
      float v = (0.05 + 0.12 * z) * (0.4 + uWind);
      pos = vec2(sd.x + t * v, sd.y + sin(t * 0.9 + sd.z * 9.0) * 0.01);
      alpha = 0.5 + 0.5 * sd.w;
      size = 0.35 + sd.z * 0.35;
    } else if (k == 7) { // 飞行气流
      pos = vec2(sd.x - t * (0.25 + 0.4 * z), sd.y);
      alpha = 0.35 * sd.w;
      size = 3.0 + sd.z * 3.0;
    } else if (k == 8) { // 水花
      float ph = fract(t * (0.35 + sd.z * 0.4) + sd.w);
      pos = vec2(sd.x + ph * 0.06 * (sd.z - 0.5), 0.02 + sd.y * 0.3 + sin(ph * 3.1416) * (0.08 + sd.z * 0.18));
      alpha = sin(ph * 3.1416);
      size = 0.35 + sd.z * 0.4;
    } else if (k == 9) { // 飞絮
      pos = sd.xy + vec2(t * 0.01 + sin(t * 0.21 + sd.z * 6.28) * 0.05, sin(t * 0.17 + sd.w * 6.28) * 0.04 + t * 0.003);
      alpha = 0.5 + 0.5 * sin(t * (0.8 + sd.z) + sd.w * 30.0);
      size = 0.6 + sd.z * 0.5;
    } else if (k == 10) { // 雨丝：斜落的细长亮线，越近落得越快，风越大越斜
      float v = 0.55 + 0.7 * z + sd.z * 0.25;
      float slant = uWind * 0.35;
      pos = vec2(sd.x + t * v * slant, sd.y - t * v);
      rot = atan(slant);
      alpha = 0.25 + 0.35 * sd.w;
      size = 2.2 + sd.z * 1.6;
    } else if (k == 11) { // 萤火：缓慢游走，忽明忽灭
      pos = sd.xy * vec2(1.0, 0.75) + vec2(
        sin(t * 0.13 + sd.z * 6.28) * 0.05 + sin(t * 0.37 + sd.w * 9.0) * 0.015,
        cos(t * 0.11 + sd.w * 6.28) * 0.04 + sin(t * 0.29 + sd.z * 7.0) * 0.015);
      alpha = pow(0.5 + 0.5 * sin(t * (0.6 + sd.z * 0.9) + sd.w * 30.0), 4.0);
      size = 0.45 + sd.z * 0.35;
    } else if (k == 12) { // 烟雾团：在画面下半部缓缓横移的大团柔雾
      pos = vec2(sd.x + t * (0.003 + uWind * 0.012) * (0.6 + sd.z), 0.04 + sd.y * 0.6 + sin(t * 0.05 + sd.w * 6.28) * 0.03);
      alpha = 0.08 + 0.1 * sd.w;
      size = 26.0 + sd.z * 22.0;
    } else if (k == 13) { // 灯火光斑：失焦的远处灯光，轻轻呼吸
      pos = sd.xy + vec2(sin(t * 0.03 + sd.z * 6.28) * 0.01, cos(t * 0.025 + sd.w * 6.28) * 0.008);
      alpha = 0.35 + 0.25 * sin(t * (0.3 + sd.z * 0.4) + sd.w * 20.0);
      size = 2.5 + sd.z * 2.5;
    } else { // 星光：只在画面上部，细小闪烁
      pos = vec2(sd.x + t * 0.0008, 0.45 + sd.y * 0.55);
      alpha = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(t * (1.5 + sd.z * 2.5) + sd.w * 40.0), 3.0);
      size = 0.25 + sd.z * 0.3;
    }
    pos = fract(pos);
    // 大团烟雾在左右边缘淡出，免得折返到另一侧时突然跳变
    if (k == 12) alpha *= smoothstep(0.0, 0.18, pos.x) * smoothstep(1.0, 0.82, pos.x);

    // 与壁纸一致的视差：粒子按自身深度位移
    vec2 s = coverScale(uSize.x / uSize.y);
    float kk = z - uFocus;
    pos -= (uMouse * uStrength * kk) / s;
    pos = 0.5 + (pos - 0.5) * (1.0 + uZoom * kk);

    // 被更近的画面内容遮挡：粒子可以飘到人物身后。烟雾团太大，按中心点判断会整团闪现，不做遮挡
    vec2 iuv = (pos - 0.5) * s + 0.5 + panRoom(s) * uPan;
    float d = texture2D(uTex, iuv).a;
    float vis = k == 12 ? 1.0 : smoothstep(d - 0.05, d + 0.01, z);

    float near = smoothstep(0.82, 1.0, z);
    vBlur = near;
    vAlpha = alpha * vis * (1.0 - near * 0.45);
    vRot = rot;
    vVar = sd.w;
    gl_PointSize = uScale * size * (2.0 + z * z * 13.0) * (uView.y / 1000.0) * (1.0 + uBeat * 0.18);
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  }
`

export const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uKind;
  uniform float uOpacity;
  uniform float uBeat;
  varying float vAlpha;
  varying float vRot;
  varying float vBlur;
  varying float vVar;

  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float cs = cos(vRot), sn = sin(vRot);
    vec2 r = vec2(c.x * cs - c.y * sn, c.x * sn + c.y * cs);
    int k = int(uKind + 0.5);
    float a;
    // 每颗粒子在本层的两种颜色之间取一个，叶色深浅、灰烬明暗由此而来
    vec3 col = mix(uColor, uColor2, vVar);
    if (k == 2 || k == 3) {
      // 叶片：两头尖的椭圆，落叶中间一道叶脉
      float w = k == 2 ? 2.3 : 1.6;
      float leaf = length(vec2(r.x * w / (1.15 - abs(r.y) * 0.35), r.y));
      a = smoothstep(1.0, 0.82, leaf);
      if (k == 2) col *= 1.0 - smoothstep(0.08, 0.0, abs(r.x)) * 0.25;
    } else if (k == 5) {
      // 灰烬：不规则的薄片
      float flake = length(vec2(r.x * 1.8, r.y)) + sin(atan(r.y, r.x) * 3.0 + vVar * 10.0) * 0.12;
      a = smoothstep(0.9, 0.7, flake);
    } else if (k == 7) {
      a = smoothstep(1.0, 0.0, abs(c.y) * 9.0) * (1.0 - abs(c.x));
    } else if (k == 10) {
      // 雨丝：沿下落方向的一道细线，两端渐隐
      a = smoothstep(1.0, 0.0, abs(r.x) * 9.0) * smoothstep(1.0, 0.2, abs(r.y));
    } else if (k == 12) {
      float d = length(c);
      a = exp(-d * d * 3.5) * smoothstep(1.0, 0.7, d);
    } else if (k == 13) {
      // 光斑：边缘略亮的失焦圆盘
      float d = length(c);
      a = smoothstep(1.0, 0.86, d) * (0.55 + 0.45 * smoothstep(0.55, 0.92, d));
    } else {
      float d = length(c);
      float hard = mix(0.15, 0.85, vBlur);
      a = 1.0 - smoothstep(hard, 1.0, d);
      if (k == 0 || k == 4 || k == 9 || k == 11 || k == 14) a = pow(a, 1.6);
    }
    float glow = (k == 0 || k == 4 || k == 6 || k == 9 || k == 11 || k == 13) ? 1.0 + uBeat * 0.9 : 1.0;
    float alpha = a * vAlpha * uOpacity;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col * glow, alpha);
    #include <colorspace_fragment>
  }
`

export const KINDS = {
  dust: 0, snow: 1, leaves: 2, petals: 3, embers: 4, ash: 5, sand: 6, streaks: 7, spray: 8, seeds: 9,
  rain: 10, fireflies: 11, haze: 12, bokeh: 13, stars: 14,
}
export const ADDITIVE = new Set(['dust', 'embers', 'sand', 'streaks', 'seeds', 'spray', 'rain', 'fireflies', 'bokeh', 'stars'])

// 各种粒子的本色：一层里的粒子在这两种颜色之间随机取色
export const KIND_COLORS = {
  dust: ['#ffe7b8', '#fff4dc'], snow: ['#f4f8ff', '#f4f8ff'], leaves: ['#f9ce76', '#e59559'],
  petals: ['#ffeff3', '#fddde7'], embers: ['#ffc46c', '#ffe7aa'], ash: ['#adaaa6', '#e1ddd7'],
  sand: ['#f0d8a0', '#f0d8a0'], streaks: ['#ffffff', '#ffffff'], spray: ['#e8f4ff', '#e8f4ff'],
  seeds: ['#fff3d6', '#fff3d6'], rain: ['#c9d6e3', '#eef3f8'], fireflies: ['#d9ff8c', '#fff1a6'],
  haze: ['#a39d95', '#7d7770'], bokeh: ['#ffd08a', '#ffe9c4'], stars: ['#eef3ff', '#fff4dc'],
}

// 各种粒子默认随壁纸变色的方式：[取色板里的哪种颜色, 靠拢程度 0~1]
// 色板由 scripts/derive.py 预先从壁纸提取：light 高光、accent 最鲜明的强调色、mean 平均色、shadow 暗部
// 雪与萤火本身颜色鲜明，只略微染色；浮尘、烟雾、风沙本无定色，大幅跟随画面
export const KIND_TONE = {
  dust: ['light', 0.6], snow: ['light', 0.15], leaves: ['accent', 0.25], petals: ['accent', 0.2],
  embers: ['light', 0.2], ash: ['mean', 0.35], sand: ['mean', 0.5], streaks: ['light', 0.3],
  spray: ['light', 0.3], seeds: ['light', 0.5], rain: ['light', 0.35], fireflies: ['light', 0.1],
  haze: ['mean', 0.6], bokeh: ['accent', 0.45], stars: ['light', 0.2],
}

export const toLinear = (hex) => new THREE.Color(hex)

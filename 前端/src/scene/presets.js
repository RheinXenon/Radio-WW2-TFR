// 预制的氛围模板：按场景类型而不是按某一张壁纸写成，新壁纸挑一个最接近的场景套用即可
//
// 模板字段
//   layers  粒子层，从远到近叠加
//   shafts  体积光强度（0 关闭），光源位置由 derive.py 自动检测
//   mist    贴地雾气浓度（0 关闭）
//   adapt   粒子随壁纸变色的总开关与倍数，默认 1，设为 0 则全部用粒子本色
//
// 粒子层字段
//   kind    种类：dust 浮尘 / snow 雪 / leaves 落叶 / petals 花瓣 / embers 火星 / ash 灰烬 / sand 风沙 /
//           streaks 飞行气流 / spray 水花 / seeds 飞絮 / rain 雨丝 / fireflies 萤火 / haze 烟雾团 /
//           bokeh 灯火光斑 / stars 星光
//   count   数量
//   z       深度范围，0 最远、1 最近；粒子会被比它更近的画面内容遮挡，可借此把雪限制在窗外等远处
//   size    尺寸倍数，默认 1
//   wind    风力，影响雪、落叶、风沙的横向漂移与雨丝的倾斜，默认 0.2
//   tone    变色时取色板里的哪种颜色：light 高光 / accent 强调色 / mean 平均色 / shadow 暗部
//   adapt   本层向壁纸色调靠拢的程度 0~1；两项都有按种类给出的默认值（见 scene/shaders.js 的 KIND_TONE）
//   tint    写死的颜色（可再给 tint2 作第二种颜色），写了就不再随壁纸变色
export const PRESETS = {
  // ———— 通用 ————

  // 静谧浮尘：适合任何画面，未登记的壁纸默认用它
  calm: {
    layers: [{ kind: 'dust', count: 110, z: [0.15, 0.95] }],
    shafts: 0.55,
    mist: 0,
  },
  // 晴日街景：明亮午后，光柱里浮尘闪烁
  sunlit: {
    layers: [{ kind: 'dust', count: 140, z: [0.15, 0.9] }],
    shafts: 0.85,
  },
  // 黄昏斜阳：金色暮光，浮尘之外飘着几缕飞絮
  goldenHour: {
    layers: [
      { kind: 'dust', count: 120, z: [0.2, 0.9], tone: 'light', adapt: 0.8 },
      { kind: 'seeds', count: 30, z: [0.4, 1.0] },
    ],
    shafts: 0.9,
  },
  // 清晨薄雾：雾气从低处升起，光线柔和
  dawnMist: {
    layers: [
      { kind: 'haze', count: 10, z: [0.05, 0.45], wind: 0.15 },
      { kind: 'dust', count: 80, z: [0.25, 0.85] },
    ],
    shafts: 0.7,
    mist: 0.45,
  },

  // ———— 四季 ————

  // 春日花瓣：花瓣斜斜飘落
  spring: {
    layers: [
      { kind: 'petals', count: 36, z: [0.35, 1.0] },
      { kind: 'dust', count: 90, z: [0.2, 0.8] },
    ],
    shafts: 0.6,
  },
  // 夏日原野：麦田、草地上空的金色飞絮
  summerField: {
    layers: [
      { kind: 'seeds', count: 90, z: [0.3, 1.0] },
      { kind: 'dust', count: 70, z: [0.1, 0.6] },
    ],
    shafts: 0.85,
  },
  // 夏夜萤火：庭院、林边、河岸的夜晚
  summerNight: {
    layers: [
      { kind: 'fireflies', count: 60, z: [0.2, 0.9] },
      { kind: 'dust', count: 40, z: [0.1, 0.6], adapt: 0.9 },
    ],
    shafts: 0,
  },
  // 秋日落叶：林荫道、公园里打着旋的落叶
  autumn: {
    layers: [
      { kind: 'leaves', count: 46, z: [0.3, 1.0] },
      { kind: 'dust', count: 110, z: [0.2, 0.8] },
    ],
    shafts: 0.8,
  },
  // 小雪：无风的雪天街景
  lightSnow: {
    layers: [
      { kind: 'snow', count: 220, z: [0.05, 1.0], wind: 0.1, size: 0.85 },
    ],
    shafts: 0.3,
  },
  // 风雪：雪原、山地上斜扫的大雪
  blizzard: {
    layers: [
      { kind: 'snow', count: 480, z: [0.05, 1.0], wind: 0.6 },
      { kind: 'haze', count: 8, z: [0.05, 0.4], wind: 0.6, adapt: 0.3 },
    ],
    shafts: 0.3,
    mist: 0.3,
  },

  // ———— 雨与水 ————

  // 雨夜街巷：斜落的雨丝，失焦的街灯与橱窗光斑
  rainStreet: {
    layers: [
      { kind: 'bokeh', count: 22, z: [0.05, 0.35] },
      { kind: 'rain', count: 320, z: [0.1, 1.0], wind: 0.3 },
    ],
    shafts: 0.2,
    mist: 0.3,
  },
  // 暴雨：风大雨急，水汽弥漫
  storm: {
    layers: [
      { kind: 'rain', count: 600, z: [0.05, 1.0], wind: 0.9 },
      { kind: 'haze', count: 10, z: [0.05, 0.5], wind: 0.8 },
    ],
    shafts: 0,
    mist: 0.4,
  },
  // 雨后雨林：叶尖滴水、潮湿的水雾，林间浮着微光
  jungle: {
    layers: [
      { kind: 'rain', count: 70, z: [0.3, 1.0], wind: 0, size: 0.8 },
      { kind: 'haze', count: 9, z: [0.05, 0.45], wind: 0.1 },
      { kind: 'dust', count: 70, z: [0.2, 0.8], tone: 'accent', adapt: 0.4 },
    ],
    shafts: 0.6,
    mist: 0.35,
  },
  // 海岸浪花：近处溅起的水花，海风里的盐雾
  seaShore: {
    layers: [
      { kind: 'spray', count: 90, z: [0.7, 1.0] },
      { kind: 'dust', count: 70, z: [0.1, 0.7], adapt: 0.8 },
    ],
    shafts: 0.6,
  },
  // 雾港：码头、河岸与海上的浓雾
  harborFog: {
    layers: [
      { kind: 'haze', count: 14, z: [0.05, 0.6], wind: 0.25 },
      { kind: 'dust', count: 50, z: [0.3, 0.8] },
    ],
    shafts: 0.4,
    mist: 0.6,
  },

  // ———— 室内 ————

  // 灯下室内：台灯、窗光里静静浮动的微尘
  interior: {
    layers: [{ kind: 'dust', count: 150, z: [0.3, 0.95], adapt: 0.8 }],
    shafts: 0,
  },
  // 炉火室内：壁炉、炭盆、灶台边，偶有火星升起
  hearth: {
    layers: [
      { kind: 'dust', count: 120, z: [0.3, 0.95], adapt: 0.8 },
      { kind: 'embers', count: 14, z: [0.4, 0.85], size: 0.7 },
    ],
    shafts: 0,
  },
  // 雪夜窗内：雪只在远处窗外，室内灯下浮尘
  snowWindow: {
    layers: [
      { kind: 'snow', count: 260, z: [0.0, 0.18], size: 0.7 },
      { kind: 'dust', count: 70, z: [0.45, 0.85], adapt: 0.8 },
    ],
    shafts: 0,
  },
  // 雨夜窗内：雨只在远处窗外，室内暖光
  rainWindow: {
    layers: [
      { kind: 'rain', count: 220, z: [0.0, 0.2], wind: 0.2, size: 0.8 },
      { kind: 'dust', count: 70, z: [0.45, 0.85], adapt: 0.8 },
    ],
    shafts: 0,
  },

  // ———— 夜色 ————

  // 夜色都市：霓虹与街灯化作远处的光斑
  nightCity: {
    layers: [
      { kind: 'bokeh', count: 30, z: [0.05, 0.4] },
      { kind: 'dust', count: 60, z: [0.3, 0.9] },
    ],
    shafts: 0.3,
  },
  // 月夜：星光闪烁，月光下的银色浮尘
  moonlit: {
    layers: [
      { kind: 'stars', count: 140, z: [0.0, 0.02] },
      { kind: 'dust', count: 60, z: [0.3, 0.9], tone: 'light', adapt: 0.9 },
    ],
    shafts: 0.5,
  },

  // ———— 远方 ————

  // 云海高山：山谷云雾翻涌，光柱斜照
  cloudSea: {
    layers: [{ kind: 'dust', count: 90, z: [0.3, 0.95] }],
    shafts: 0.9,
    mist: 0.55,
  },
  // 空中：高速掠过的气流线，云间阳光
  airborne: {
    layers: [
      { kind: 'streaks', count: 26, z: [0.55, 1.0] },
      { kind: 'dust', count: 60, z: [0.2, 0.7], adapt: 0.3 },
    ],
    shafts: 0.5,
  },
  // 沙漠风沙：贴地卷起的沙尘
  desert: {
    layers: [
      { kind: 'sand', count: 180, z: [0.4, 1.0], wind: 0.6 },
      { kind: 'haze', count: 8, z: [0.05, 0.4], wind: 0.5 },
    ],
    shafts: 0.5,
  },

  // ———— 战火 ————

  // 硝烟战场：飘散的灰烬与低垂的硝烟
  battlefield: {
    layers: [
      { kind: 'haze', count: 10, z: [0.05, 0.5], wind: 0.3 },
      { kind: 'ash', count: 100, z: [0.1, 1.0] },
      { kind: 'dust', count: 70, z: [0.2, 0.7] },
    ],
    shafts: 0.6,
  },
  // 火场废墟：火星升腾，灰烬纷落
  fireRuins: {
    layers: [
      { kind: 'haze', count: 8, z: [0.05, 0.45], wind: 0.2, tone: 'shadow' },
      { kind: 'embers', count: 90, z: [0.2, 0.95] },
      { kind: 'ash', count: 120, z: [0.1, 1.0] },
    ],
    shafts: 0.25,
  },
  // 雪地战场：风雪里夹着灰烬与炮烟
  snowBattle: {
    layers: [
      { kind: 'snow', count: 300, z: [0.05, 1.0], wind: 0.4 },
      { kind: 'ash', count: 50, z: [0.1, 0.8] },
      { kind: 'haze', count: 8, z: [0.05, 0.4], wind: 0.4 },
    ],
    shafts: 0.35,
    mist: 0.3,
  },
  // 海上激战：水花、硝烟与远处的火光
  seaBattle: {
    layers: [
      { kind: 'spray', count: 80, z: [0.7, 1.0] },
      { kind: 'ash', count: 70, z: [0.05, 0.7] },
      { kind: 'embers', count: 20, z: [0.1, 0.5] },
    ],
    shafts: 0.6,
  },
}

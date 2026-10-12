// 每张壁纸的氛围：粒子层、雾气、光束。键为 “国家/文件名”，值有三种写法：
//   'rainStreet'                        直接套用模板，模板见 src/scene/presets.js
//   { preset: 'autumn', shafts: 0.9 }   在模板基础上改几项
//   { layers: [...], shafts, mist }     为这一张专门定制，字段含义同模板
// 未登记的壁纸套用 calm 模板。粒子默认随壁纸色板变色，写了 tint 的层保持固定颜色
import { PRESETS } from '../../scene/presets.js'

export const ATMOSPHERES = {
  // 柏林菩提树下大街，秋日斜阳
  'GER/1': {
    layers: [
      { kind: 'leaves', count: 46, z: [0.3, 1.0] },
      { kind: 'dust', count: 120, z: [0.2, 0.8], tint: '#ffd9a0' },
    ],
    shafts: 0.85,
  },
  // 雪夜公寓：雪只在远处，透过窗户可见；室内灯下浮尘
  'GER/2': {
    layers: [
      { kind: 'snow', count: 260, z: [0.0, 0.18], size: 0.7 },
      { kind: 'dust', count: 70, z: [0.45, 0.85], tint: '#ffc27a' },
    ],
    shafts: 0,
  },
  // 东线雪原暮色
  'GER/3': {
    layers: [{ kind: 'snow', count: 420, z: [0.05, 1.0], wind: 0.35 }],
    shafts: 0.4,
    mist: 0.25,
  },
  // 柏林废墟火光
  'GER/4': {
    layers: [
      { kind: 'embers', count: 90, z: [0.2, 0.95] },
      { kind: 'ash', count: 120, z: [0.1, 1.0] },
    ],
    shafts: 0.25,
  },
  // 罗马春日街角
  'ITA/1': {
    layers: [
      { kind: 'petals', count: 34, z: [0.35, 1.0] },
      { kind: 'dust', count: 90, z: [0.2, 0.8] },
    ],
    shafts: 0.6,
  },
  // 那不勒斯黄昏厨房，炉火与面粉浮尘
  'ITA/2': {
    layers: [{ kind: 'dust', count: 160, z: [0.3, 0.95], tint: '#ffcf8f' }],
    shafts: 0,
  },
  // 利比亚海岸月夜，海风卷沙
  'ITA/3': {
    layers: [{ kind: 'sand', count: 160, z: [0.4, 1.0], wind: 0.6 }],
    shafts: 0.45,
  },
  // 那不勒斯巷战
  'ITA/4': {
    layers: [
      { kind: 'ash', count: 110, z: [0.1, 1.0] },
      { kind: 'embers', count: 40, z: [0.3, 0.9] },
      { kind: 'dust', count: 80, z: [0.2, 0.7] },
    ],
    shafts: 0.7,
  },
  // 多佛白崖上空的喷火战斗机
  'ENG/3': {
    layers: [
      { kind: 'streaks', count: 26, z: [0.55, 1.0] },
      { kind: 'dust', count: 60, z: [0.2, 0.7], tint: '#ffffff' },
    ],
    shafts: 0.5,
    drift: 0.5,
  },
  // 敦刻尔克海滩落日
  'FRA/3': {
    layers: [
      { kind: 'ash', count: 90, z: [0.05, 0.9] },
      { kind: 'embers', count: 30, z: [0.1, 0.6] },
    ],
    shafts: 0.65,
  },
  // 航母甲板落日
  'JPA/3': {
    layers: [{ kind: 'dust', count: 120, z: [0.2, 0.9], tint: '#ffc48a' }],
    shafts: 0.8,
  },
  // 诺曼底登陆艇，水花与硝烟
  'USA/3': {
    layers: [
      { kind: 'spray', count: 90, z: [0.7, 1.0] },
      { kind: 'ash', count: 70, z: [0.05, 0.7] },
    ],
    shafts: 0.6,
  },
  // 库尔斯克麦田，金色飞絮
  'USSR/3': {
    layers: [
      { kind: 'seeds', count: 90, z: [0.3, 1.0] },
      { kind: 'dust', count: 70, z: [0.1, 0.6], tint: '#ffe2a8' },
    ],
    shafts: 0.85,
  },
  // 滇缅公路云海
  'CHI/3': {
    layers: [{ kind: 'dust', count: 90, z: [0.3, 0.95], tint: '#fff1d0' }],
    shafts: 0.9,
    mist: 0.55,
  },

  // ———— 英国 ————
  // 雨雾伦敦街头的红伞背影
  'ENG/1': 'rainStreet',
  // 夜雨敲窗，壁炉边的公寓客厅
  'ENG/2': 'rainWindow',
  // 大轰炸之夜，火星漫天的消防水线
  'ENG/4': 'fireRuins',
  // 敦刻尔克海滩：坐等撤离，海面烟霭沉沉
  'ENG/dunkirk-bray-dunes': 'seaShore',
  // 紧急起飞：晴日草地上的冲刺
  'ENG/raf-87-squadron-scramble': 'sunlit',
  // 地铁站之夜：站台灯下避难者入睡
  'ENG/aldwych-shelter-night': 'interior',
  // 废墟书店：天光从焚毁的屋顶豁口斜射
  'ENG/holland-house-readers': 'sunlit',
  // 救火之夜：火舌翻卷、浓烟蔽空
  'ENG/london-blitz-firemen': 'fireRuins',
  // 废墟上的茶水车：炉火烧水的热气
  'ENG/wvs-blitz-canteen': 'hearth',
  // 搜救现场：瓦砾间未散的浮灰
  'ENG/rip-the-rescue-dog': {
    layers: [
      { kind: 'haze', count: 7, z: [0.05, 0.45], wind: 0.2 },
      { kind: 'ash', count: 45, z: [0.1, 0.8] },
      { kind: 'dust', count: 90, z: [0.2, 0.75] },
    ],
    shafts: 0.5,
  },
  // 战列舰砰砰炮组：海风里的浪花水汽
  'ENG/hms-howe-pom-pom-crew': 'seaShore',

  // ———— 法国 ————
  // 初夏午后的塞纳河书摊
  'FRA/1': 'sunlit',
  // 圣诞前夜，窗外细雪室内暖炉
  'FRA/2': 'snowWindow',
  // 晨雨初歇的树篱伏击
  'FRA/4': 'battlefield',
  // 马赛港送别团旗的人群，情绪克制只留浮尘
  'FRA/the-weeping-frenchman': 'calm',
  // 巴黎解放次日，凯旋门前的晴日游行
  'FRA/general-leclerc-paris-1944': 'sunlit',
  // 逃难路上的乡间尘土
  'FRA/exodus-near-gien': 'sunlit',
  // 战俘纵队走过薄雾中的白杨
  'FRA/french-prisoners-thulin': 'dawnMist',
  // 比尔哈凯姆：正午沙漠上的突击
  'FRA/bir-hakeim-legionnaires': 'desert',
  // 舰艏刷漆：悬挂舷侧的海风
  'FRA/painting-le-triomphant': 'seaShore',
  // 树篱边，伞兵听抵抗者讲述敌情
  'FRA/resistance-and-paratroopers': 'summerField',
  // 登陆滩待命，远山海雾朦胧
  'FRA/senegalese-rifles-at-cavalaire': 'harborFog',
  // 协和广场的枪声：人群里的硝烟
  'FRA/sniper-fire-at-the-concorde': 'battlefield',
  // 马赛烧旗：火星从人群间升起
  'FRA/burning-the-flag-in-marseille': 'hearth',

  // ———— 日本 ————
  // 银座盛夏夜，霓虹与号外
  'JPA/1': 'nightCity',
  // 晚秋午后的教室，逆光里的千人针
  'JPA/2': 'sunlit',
  // 拂晓山巅放军鸽，脚下雾海翻涌
  'JPA/4': 'cloudSea',
  // 出击珍珠港：甲板外翻涌的白浪
  'JPA/pearl-harbor-takeoff': 'seaShore',
  // 樱花待发：白昼停机坪上的静默
  'JPA/ohka-standby-crews': 'sunlit',
  // 银座空袭：窗口喷出的烈焰
  'JPA/ginza-air-raid': 'fireRuins',
  // 焦土板车：余烬纷落的废墟
  'JPA/tokyo-ruins-cart': 'fireRuins',
  // 冲绳收容线：亚热带树丛的潮气
  'JPA/okinawa-civilians-collected': 'jungle',
  // 布干维尔投降行军：热带丛林
  'JPA/bougainville-surrender': 'jungle',
  // 学童疏散列车：夜车厢的昏灯
  'JPA/evacuation-train': 'interior',
  // 香港街头的轻装甲车：白昼顺光
  'JPA/hong-kong-tankettes': 'sunlit',

  // ———— 美国 ————
  // 芝加哥环线高架站的清晨
  'USA/1': 'sunlit',
  // 飞机制造厂天窗下的铆接
  'USA/2': 'sunlit',
  // 北大西洋风暴中的驱逐舰
  'USA/4': 'storm',
  // 折钵山升旗：阴天海风里的火山灰
  'USA/raising-the-flag-on-iwo-jima': {
    layers: [{ kind: 'ash', count: 90, z: [0.1, 1.0], wind: 0.45 }],
    shafts: 0.3,
  },
  // 邦克山号中弹：冲天烟柱与海面水花
  'USA/uss-bunker-hill-kamikaze': 'seaBattle',
  // 奥马哈滩头：涉水冲向烟尘弥漫的岸
  'USA/into-the-jaws-of-death': 'seaBattle',
  // 西弗吉尼亚号救援：浮油与吞舰的浓烟
  'USA/west-virginia-rescue': 'seaBattle',
  // 杜立特空袭：贴海爬升，阴沉的海面
  'USA/doolittle-takeoff': 'seaShore',
  // 日裔家庭候车：无风的等待
  'USA/centerville-evacuation': 'sunlit',
  // 轰炸机尾段装配：机身铝皮的冷光
  'USA/douglas-b17-tail-workers': 'interior',
  // 塔拉瓦涉水登陆：碎浪与硝烟
  'USA/tarawa-wade-ashore': 'seaBattle',
  // 诺曼底篱田：雾气弥漫的推进
  'USA/hedgerow-breach': 'dawnMist',
  // 机翼上装弹的白昼机场
  'USA/tuskegee-armourer': 'sunlit',
  // 巴斯托涅：风雪中盼来的空投
  'USA/bastogne-resupply': 'snowBattle',

  // ———— 苏联 ————
  // 白夜的列宁格勒，玫瑰金微光里的开桥
  'USSR/1': 'goldenHour',
  // 破晓林场，新雪与曙光
  'USSR/2': 'lightSnow',
  // 满月下的夜间机场，马灯旁的航图
  'USSR/4': 'moonlit',
  // 草坡上的冲锋呐喊
  'USSR/battalion-commander': 'summerField',
  // 国会大厦废墟的余烬
  'USSR/reichstag-in-ruins': 'fireRuins',
  // 檐口石雕间竖起红旗，远处硝烟未散
  'USSR/raising-a-flag-over-the-reichstag': 'battlefield',
  // 波罗的海沿岸的高射机枪手
  'USSR/baltic-aa-gunners': 'sunlit',
  // 解放的村庄：残雪与车辙
  'USSR/tanks-in-liberated-village': 'lightSnow',
  // 红十月厂区：远景升起的浓烟
  'USSR/stalingrad-workers-battalion': 'fireRuins',
  // 雪地松林间的野战医院
  'USSR/volkhov-field-hospital': 'lightSnow',
  // 斯大林格勒攻坚：残破楼群间的硝烟
  'USSR/stalingrad-house-assault': 'battlefield',
  // 狙击手分队：夏日野地的行军
  'USSR/central-front-snipers': 'summerField',
  // 机场上的飞行员与战机
  'USSR/pilots-and-airacobra': 'sunlit',
  // 矿工游击队：砖楼前的雪地
  'USSR/krivoy-rog-partisans': 'lightSnow',

  // ———— 德国（史实转绘）————
  // 东线森林边缘的堑壕，手榴弹出手前的一瞬
  'GER/german-troops-in-russia': 'battlefield',
  // 意大利草地上轻松的滑翔机演练
  'GER/fallschirmjager-dfs-230': 'summerField',
  // 白桦林间的重炮阵地
  'GER/artillerists-france-1940': 'battlefield',
  // 雪原野战机场上的检修
  'GER/ju87-winter-maintenance': 'lightSnow',
  // 北非出击前：沙色迷彩的野战机场
  'GER/me109-north-africa': 'desert',
  // U 艇凯旋进港
  'GER/u552-entering-st-nazaire': 'harborFog',
  // 库尔斯克夏原上的装弹
  'GER/tiger-ammunition-belgorod': 'summerField',
  // 东线冬日的观测哨：落尽叶子的白桦
  'GER/forward-observer-russia': 'lightSnow',
  // 铁拳试射：白烟罩过街面
  'GER/volkssturm-panzerfaust-training': 'battlefield',
  // 但泽冬日的难民车队
  'GER/danzig-refugee-column': 'lightSnow',

  // ———— 意大利（史实转绘）————
  // 骡队饮水：村庄土路的尘土
  'ITA/mule-train-eastern-front': 'sunlit',
  // 沙漠行军：延向地平线的队伍
  'ITA/infantry-march-north-africa': 'desert',
  // 西西里的白旗：远处腾起烟尘
  'ITA/surrender-in-sicily': 'battlefield',
  // 海岸机枪阵地：平静海湾的水汽
  'ITA/coastal-mg-position': 'seaShore',
  // 荒漠机场上的登机
  'ITA/macchi-c202-pilot': 'desert',
  // 那不勒斯的十月：街尽头的薄雾
  'ITA/naples-liberation': 'dawnMist',
  // 阿尔巴尼亚山地公路边休整
  'ITA/tankists-in-albania': 'sunlit',
  // 拉文纳广场上的授勋
  'ITA/partisans-honoured-ravenna': 'sunlit',

  // ———— 中国 ————
  // 初冬清晨的前门大街，细雪斜穿驼铃
  'CHI/1': 'lightSnow',
  // 黄昏嘉陵江滩，捣衣声与江上薄雾
  'CHI/2': 'harborFog',
  // 盛夏正午的白洋淀芦苇荡，水面白亮
  'CHI/4': 'sunlit',
  // 难民入租界：夏昼街头的尘土
  'CHI/shanghai-refugees': 'sunlit',
  // 淞沪迫击炮阵地：枝叶伪装后的硝烟
  'CHI/shanghai-mortar': 'battlefield',
  // 台儿庄巷战：瓦砾街巷间的冲锋
  'CHI/taierzhuang-street-fighting': 'battlefield',
  // 鱼雷快艇出击前：江面晨雾
  'CHI/shi-102-boat': 'dawnMist',
  // 人拉石磙：积云下的跑道尘土
  'CHI/airfield-roller': 'sunlit',
  // 难民火车：月台人潮的苍茫
  'CHI/guilin-evacuation': 'dawnMist',
  // 长沙学生兵：土坡上的夏日
  'CHI/changsha-student-corps': 'summerField',
  // 滇西骡队：山林层叠间的云雾
  'CHI/yunnan-mule-howitzer': 'cloudSea',
}

export function atmosphereFor(id) {
  const entry = ATMOSPHERES[id] ?? 'calm'
  const spec = typeof entry === 'string' ? { preset: entry } : entry
  if (spec.preset && !PRESETS[spec.preset]) console.warn(`[氛围] 壁纸 ${id} 登记的模板 ${spec.preset} 不存在，已改用 calm`)
  return { ...PRESETS.calm, ...PRESETS[spec.preset], ...spec }
}

// 播放控件与时钟的登记表：设置页、快捷键、换台过程与呼号卡片都从这里读取。
// 这里只放数据，组件由 App 与 Clock 按 id 取用。两者都与主题互相独立，每个主题各自记住上次的选择
// 名称与简介中英双份（nameEn 等后缀字段），界面按 store.lang 选择

// analog：换台时指针扫过刻度、穿过静电与差拍啸叫；否则以滤波扫频与淡入淡出过渡
// np：控件展开时“正在播放”距屏幕底边的高度
export const STYLES = [
  { id: 'vintage', name: '老式收音机', nameEn: 'Vintage Radio', short: '收音机', shortEn: 'Radio', analog: true, np: 222, desc: '旋钮、刻度盘与指针，换台时穿过静电与差拍啸叫', descEn: 'Knobs, dial and needle; tuning crosses static and beat whine' },
  { id: 'neon', name: '霓虹调谐台', nameEn: 'Neon Deck', short: '霓虹', shortEn: 'Neon', analog: false, np: 140, desc: '数字频率读数与实时频谱，台位如霓虹招牌，随节拍呼吸', descEn: 'Digital readout and live spectrum; stations glow like neon signs, breathing with the beat' },
  { id: 'gilded', name: '鎏金音乐厅', nameEn: 'Gilded Hall', short: '鎏金', shortEn: 'Gilded', analog: true, np: 232, desc: '象牙拱形表盘上蓝钢指针扫过各个时代，音量写成力度记号', descEn: 'A blued-steel needle sweeps the ages on an ivory arch; volume reads as dynamics' },
  { id: 'modern', name: '现代', nameEn: 'Modern', short: '现代', shortEn: 'Modern', analog: false, np: 128, desc: '简洁的控制条，换台以光带横扫与滤波渐变过渡', descEn: 'A clean control bar; tuning sweeps a band of light with filtered fades' },
]

export const CLOCKS = [
  { id: 'pilot', name: '飞行员腕表', nameEn: 'Pilot Watch', short: '腕表', shortEn: 'Watch', desc: '黑色哑光表盘、夜光数字与洋葱头表冠，秒针每秒六跳', descEn: 'Matte black dial, luminous numerals and an onion crown; six ticks per second' },
  { id: 'neon', name: '霓虹终端', nameEn: 'Neon Terminal', short: '霓虹', shortEn: 'Neon', desc: '全息面板上的霓虹数字，秒格逐一点亮，不时闪过信号干扰', descEn: 'Neon digits on a holographic panel; seconds light up one by one, glitching now and then' },
  { id: 'pocket', name: '鎏金怀表', nameEn: 'Gilded Pocket Watch', short: '怀表', shortEn: 'Pocket', desc: '银色玑镂表盘、罗马数字与蓝钢苹果针，附月相与小秒针', descEn: 'Silver guilloché dial, Roman numerals and blued Breguet hands, with moon phase and small seconds' },
  { id: 'flat', name: '极简', nameEn: 'Minimal', short: '极简', shortEn: 'Minimal', desc: '磨砂圆盘与细体数字，秒环首尾交替生长', descEn: 'A frosted disc with thin numerals; the seconds ring grows from both ends in turn' },
]

export const styleOf = (id) => STYLES.find((x) => x.id === id) ?? STYLES[0]
export const isAnalog = (id) => styleOf(id).analog

// 列表里的下一项，到末尾回到开头
export const nextOf = (list, id) => list[(list.findIndex((x) => x.id === id) + 1) % list.length]

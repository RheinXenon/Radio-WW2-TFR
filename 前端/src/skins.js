// 播放控件与时钟的登记表：设置页、快捷键、换台过程与呼号卡片都从这里读取。
// 这里只放数据，组件由 App 与 Clock 按 id 取用。两者都与主题互相独立，每个主题各自记住上次的选择

// analog：换台时指针扫过刻度、穿过静电与差拍啸叫；否则以滤波扫频与淡入淡出过渡
// np：控件展开时“正在播放”距屏幕底边的高度
export const STYLES = [
  { id: 'vintage', name: '老式收音机', short: '收音机', analog: true, np: 222, desc: '旋钮、刻度盘与指针，换台时穿过静电与差拍啸叫' },
  { id: 'neon', name: '霓虹调谐台', short: '霓虹', analog: false, np: 140, desc: '数字频率读数与实时频谱，台位如霓虹招牌，随节拍呼吸' },
  { id: 'gilded', name: '鎏金音乐厅', short: '鎏金', analog: true, np: 232, desc: '象牙拱形表盘上蓝钢指针扫过各个时代，音量写成力度记号' },
  { id: 'modern', name: '现代', short: '现代', analog: false, np: 128, desc: '简洁的控制条，换台以光带横扫与滤波渐变过渡' },
]

export const CLOCKS = [
  { id: 'pilot', name: '飞行员腕表', short: '腕表', desc: '黑色哑光表盘、夜光数字与洋葱头表冠，秒针每秒六跳' },
  { id: 'neon', name: '霓虹终端', short: '霓虹', desc: '全息面板上的霓虹数字，秒格逐一点亮，不时闪过信号干扰' },
  { id: 'pocket', name: '鎏金怀表', short: '怀表', desc: '银色玑镂表盘、罗马数字与蓝钢苹果针，附月相与小秒针' },
  { id: 'flat', name: '极简', short: '极简', desc: '磨砂圆盘与细体数字，秒环首尾交替生长' },
]

export const styleOf = (id) => STYLES.find((x) => x.id === id) ?? STYLES[0]
export const isAnalog = (id) => styleOf(id).analog

// 列表里的下一项，到末尾回到开头
export const nextOf = (list, id) => list[(list.findIndex((x) => x.id === id) + 1) % list.length]

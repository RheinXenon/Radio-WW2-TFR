// 各款时钟共用：中文日期写法、按时刷新的当前时间、逐帧回调与指针角度
import { useEffect, useRef, useState } from 'react'

export const WEEK = '日一二三四五六'
const NUM = '〇一二三四五六七八九'
export const zhNum = (n) => (n <= 10 ? (n === 10 ? '十' : NUM[n]) : n < 20 ? '十' + NUM[n - 10] : NUM[Math.floor(n / 10)] + '十' + (n % 10 ? NUM[n % 10] : ''))
export const zhDate = (d) => `${zhNum(d.getMonth() + 1)}月${zhNum(d.getDate())}日 · 星期${WEEK[d.getDay()]}`
export const pad2 = (n) => String(n).padStart(2, '0')

// 当前时间：对齐到 ms 毫秒的整数倍刷新（15 秒一刷时，分钟恰好在整分翻页），供数字读数与日期使用
export function useNow(ms = 15000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let t
    const tick = () => {
      setNow(new Date())
      t = setTimeout(tick, ms - (Date.now() % ms) + 5)
    }
    t = setTimeout(tick, ms - (Date.now() % ms) + 5)
    return () => clearTimeout(t)
  }, [ms])
  return now
}

// 每个动画帧调用一次 fn(now)，直接改写 DOM，不触发 React 重渲染
export function useFrame(fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    let raf
    const tick = () => {
      ref.current(new Date())
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
}

// 时、分、秒针的角度（度）。beats 为秒针每秒跳几下，0 表示连续扫动
export function handAngles(now, beats = 0) {
  const ms = now.getMilliseconds()
  const sec = now.getSeconds() + (beats ? Math.floor((ms / 1000) * beats) / beats : ms / 1000)
  const min = now.getMinutes() + sec / 60
  const hr = (now.getHours() % 12) + min / 60
  return { h: hr * 30, m: min * 6, s: sec * 6, sec }
}

// 角度量化到 0.1°:连续走动的分针/时针不再每帧写出新的浮点串,
// 量化后值相同的写入会被浏览器直接跳过,样式不失效
export const rotate = (ref, deg) => ref.current?.setAttribute('transform', `rotate(${Math.round(deg * 10) / 10})`)

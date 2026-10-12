// 云音乐歌词：拉取 LRC 与官方中文翻译、解析时间轴，按播放进度给出当前行
import { useEffect, useRef, useState } from 'react'
import { engine } from './engine.js'

// LRC 行：[mm:ss.xx]文本，一行可带多个时间标签
export function parseLrc(text) {
  const lines = []
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const times = [...line.matchAll(/\[(\d+):(\d+)(?:[.:](\d+))?\]/g)]
    if (!times.length) continue
    const content = line.replace(/\[[^\]]*\]/g, '').trim()
    if (!content) continue
    for (const m of times) {
      const frac = m[3] ? Number(`0.${m[3]}`) : 0
      lines.push({ t: Number(m[1]) * 60 + Number(m[2]) + frac, text: content })
    }
  }
  return lines.sort((a, b) => a.t - b.t)
}

// 翻译轨按时间对齐并进原文行（相差 0.5 秒内视为同一行）
function mergeTrans(lines, transLines) {
  if (!transLines.length) return lines
  let j = 0
  for (const line of lines) {
    while (j < transLines.length && transLines[j].t < line.t - 0.5) j++
    if (j < transLines.length && Math.abs(transLines[j].t - line.t) <= 0.5) line.trans = transLines[j].text
  }
  return lines
}

// 当前播放的云音乐歌曲歌词；本地歌返回空。行切换由 rAF 对齐 audio.currentTime
export function useLyric(song) {
  const [lines, setLines] = useState([])
  const [index, setIndex] = useState(-1)
  const cache = useRef(new Map())

  useEffect(() => {
    let alive = true
    setLines([])
    setIndex(-1)
    if (!song?.cloud || !song.nid) return
    const key = String(song.nid)
    const cached = cache.current.get(key)
    if (cached) { setLines(cached); return }
    fetch(`/netease/lyric?id=${key}`)
      .then((r) => r.json())
      .then((d) => {
        const parsed = mergeTrans(parseLrc(d.lrc), parseLrc(d.tlrc))
        if (!alive || !parsed.length) return
        if (cache.current.size > 40) cache.current.clear()
        cache.current.set(key, parsed)
        setLines(parsed)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [song?.nid])

  useEffect(() => {
    if (!lines.length) return
    let raf
    const tick = () => {
      const t = engine.el.currentTime + 0.15 // 稍微提前，读起来更跟手
      let i = -1
      for (let k = 0; k < lines.length; k++) { if (lines[k].t <= t) i = k; else break }
      setIndex((prev) => (prev === i ? prev : i))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [lines])

  return { lines, index }
}

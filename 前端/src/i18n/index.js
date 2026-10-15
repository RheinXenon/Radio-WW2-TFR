// 轻量双语：以中文原文为 key，英文译文查表；语言偏好持久化在 store.lang
// t() 在任何模块可用（含音频、场景等非组件代码），useT()/useLoc() 供组件订阅语言变化
import { useRadio, getRadio } from '../store.js'
import { EN } from './en.js'

// {name} 形式的占位符替换
const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s)

// 翻译一句话：中文模式原样返回，英文模式查表（缺译回显原文）
export const t = (zh, vars) => {
  const lang = getRadio().lang
  return fill(lang === 'en' ? EN[zh] ?? zh : zh, vars)
}

// 组件内用的 t：语言一变即重渲染
export const useT = () => {
  useRadio((s) => s.lang)
  return t
}

// 数据对象的双语字段选择：obj.name / obj.nameEn，英文缺字段时回退中文
export const loc = (o, k, lang = getRadio().lang) => (lang === 'en' ? o?.[k + 'En'] ?? o?.[k] : o?.[k])
export const useLoc = () => {
  const lang = useRadio((s) => s.lang)
  return (o, k) => (lang === 'en' ? o?.[k + 'En'] ?? o?.[k] : o?.[k])
}

// 把整组双语字段包成按语言读取的代理：locProxy(theme.terms, L).record
export const locProxy = (o, L) => new Proxy({}, { get: (_, k) => L(o, k) })

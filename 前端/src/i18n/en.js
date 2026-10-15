// 英文译表汇总：各分片按负责的界面分片维护，中文原文为 key
import { core } from './en/core.js'
import { panel } from './en/panel.js'
import { netease } from './en/netease.js'
import { themes } from './en/themes.js'
import { nowplaying } from './en/nowplaying.js'

export const EN = { ...core, ...panel, ...netease, ...themes, ...nowplaying }

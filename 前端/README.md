# 前端

## 运行

```powershell
npm run dev      # 开发服务器 http://127.0.0.1:5173
npm run build    # 构建到 dist/
npm run preview  # 以构建产物运行 http://127.0.0.1:4173（同样能读取 Resources）
```

资源不复制进工程：`plugins/resources.js` 把仓库根目录的 `Resources/` 挂在 `/res/` 下（支持 Range 请求），并扫描目录生成资源清单 `virtual:radio-manifest`。往 `Resources/` 里加壁纸、歌单或白噪音后，页面会自动刷新。

## 壁纸派生资源

每张壁纸需要一份深度图（视差、显影过渡、粒子遮挡都依赖它）、一张缩略图和一份光源与色板元数据，存放在 `public/gen/`（当前被 .gitignore 屏蔽，部署 GitHub Pages 时取消）。该目录同时是 vite 的静态目录，构建时会随其他资源一并复制进 `dist/`。

开发服务器启动时以及发现新壁纸时，会自动在后台调用：

```powershell
D:\miniconda3\envs\daily\python.exe scripts/derive.py ..\Resources public/gen
```

首次运行会下载 Depth Anything V2 Base 模型。可用环境变量 `RADIO_PYTHON` 指定其他解释器。缺少深度图的壁纸照常显示，只是退化为“下近上远”的平面假设。

## 目录

| 路径 | 内容 |
|---|---|
| `src/audio/engine.js` | Web Audio 图：音乐链路的信号模拟、合成静电、差拍啸叫、频谱分析、界面音效 |
| `src/audio/radio.js` | 选曲、换台过程编排、手动调谐、停播 |
| `src/audio/ambience.js` | 白噪音混音器：文件条目无缝循环，缺失条目程序合成 |
| `src/audio/lyric.js` | 云音乐歌词：LRC 解析与按播放进度定位当前行 |
| `src/scene/` | 壁纸舞台：视差遮挡映射、体积光、雾、显影过渡、深度遮挡粒子、泛光；`presets.js` 为可套用的氛围模板 |
| `src/themes/` | 主题注册表；`wwii/` 为二战主题的频道、徽记、纹样、壁纸氛围与开场 |
| `src/ui/` | 界面部件 |
| `src/skins.js` | 播放控件与时钟的登记表：名称、说明、指针式还是数字式换台、控件高度 |
| `src/ui/VintageRadio.jsx` `NeonDeck.jsx` `GildedConsole.jsx` `ModernDeck.jsx` | 四种播放控件：老式收音机、霓虹调谐台、鎏金音乐厅、现代控制条 |
| `src/ui/Clock.jsx` | 时钟分派；`Watch.jsx` 飞行员腕表、`NeonClock.jsx` 霓虹终端、`PocketWatch.jsx` 鎏金怀表、`FlatClock.jsx` 极简圆盘 |
| `src/ui/Dossier.jsx` | 史实档案：全屏详情。看片台在原照、分界对照、并列、转绘四档间连续变形；档案卡载出处、画面要点、史实与收录情况 |
| `plugins/netease.js` | 网易云接入：weapi 加密、扫码登录、云音乐库与在线播放代理（`/netease/*`） |

## 扩展

- **新歌**：放入 `Resources/WWII Radio/<国家码>/<组名>/` 并重新生成该国 JSON。清单会递归读取国家目录下的子文件夹，每首歌按 JSON 里的 `group` 归组；分组的显示名在 `src/themes/wwii/stations.js` 的 `GROUPS` 中登记。
- **新壁纸**：放入 `Resources/WWII Wallpapers/<国家码>/`，文件名 1–4 对应四个标准场景（时代城市街景、后方生活、战场与远方、近景战场，见 `src/themes/wwii/stations.js` 的 `POOL_SLOTS`），其余文件名排在后面。在 `src/themes/wwii/atmospheres.js` 里登记一行即可套用场景模板，如 `'GER/5': 'rainStreet'`；模板在 `src/scene/presets.js`，有晴日、黄昏、四季、雨雪、室内、夜色、云海、空中、沙漠、战火等二十多种。未登记时使用静谧浮尘。粒子颜色会按壁纸色板自动偏向画面的色调，不必逐张调色。
- **新白噪音**：放入 `Resources/White Noise/`，一个音效一个文件，文件即条目；常见名称的中文标签与图标在 `src/audio/ambience.js` 的 `KNOWN` 中。放入 `snow`、`radio`、`clock` 同名文件会自动取代对应的合成音源。
- **云音乐歌曲**：在云音乐面板（N）里加入——单曲、整张歌单、专辑（album 链接）、播客单期（dj 链接）或整座播客电台（djradio 链接），可新建同名子歌单或并入现有组（按歌曲去重）；落库到 `Resources/Netease Cloud/<主题 id>.json`（按主题分文件）；音频不落盘，播放经 `/netease/stream` 在线取流（本地开发服务器流式转发，支持拖动进度）。播客节目免费，不登录也能完整播放。已加入的子歌单可展开管理：拖动排序、改名（改名到已有组即合并）、逐首增删。登录态（cookie）存 `前端/.netease-session.json`，已被 .gitignore 屏蔽。
- **新主题**：在 `src/themes/` 下新建目录，按 `wwii/` 的结构提供频道表与氛围，再到 `src/themes/index.js` 登记。主题对象里的 `style` 与 `clock` 指定默认的播放控件与时钟，取值见 `src/skins.js`。

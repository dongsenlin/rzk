# 小米澎程 N90 Max · 动态图形宣传片（4 秒片头 + 15 秒正片）

"把家，带去远方" — 前面是 4 秒纪录片式片头，正片 128 BPM，8 小节 = 15.0 秒，全片 19 秒。所有画面由代码实时生成（Canvas 2D + CPU 合成：真实运动模糊、辉光、颗粒），
配乐与音效由 numpy 合成，配音用 Gemini 3.8 Flash TTS。字体为小米官方 MiSans（npm `misans`）。

| 时间（正片内） | 镜头 | 画面 | 配音 |
|---|---|---|---|
| 片头 0–4 s | 00 片头 | 黑场、胶片颗粒；细线上依次浮现署名组「出品 · PRODUCED BY 栋森网络科技 ｜ AI 创作 · CREATED WITH Claude Opus 5.5」，再是标题「小米澎程 / XIAOMI SKYNOMAD · N90 MAX」，底部「概念练手 · 非官方」；细线收成光点，正片的地平线从这个光点展开 | （无配音：低音铺底、两组钢琴和弦、反向和弦渐强接入正片） |
| 0–2.1 s | 01 远方 | 晨光地平线展开为宽银幕，露出主视觉；标题逐字随配音出现 | 把家，带去远方。 |
| 2.1–4.7 s | 02 续航 | 路线动画：前 464 km 远山青（纯电）→ 橙色（增程）直到 1705 km；里程表滚动，3.75 s 音乐进主段 | 一千七百零五公里，说走就走。 |
| 4.7–7.5 s | 03 空间 | 俯视座舱：座椅按拍子变换 4 种布局，计数 01→11；缩放进内饰实拍 | 大七座，十一种空间，随心而变。 |
| 7.5–9.4 s | 04 越野 | 水位线涨到 750 mm 涉水深度；双电机四驱、0–100 km/h 5.9 s | 四驱越野，无惧山海。 |
| 9.4–11.3 s | 05 细节 | 8 个八分音符快切，每刀不同转场 | （音乐） |
| 11.3–13.1 s | 06 澎程 | 放慢，"小米澎程"逐字，旅程线蓄力 | 小米澎程—— |
| 13.1–15 s | 07 片尾 | 小米澎程 N90 Max · 澎湃每一程 · 26.99 万元起；右下署名组「出品 · PRODUCED BY 栋森网络科技 ｜ AI 创作 · CREATED WITH Claude Opus 5.5」 | 澎湃每一程。 |

正片右下角一直有小字「概念练手 · 非官方」（`src/scenes.js` 里的 `NOTE`，署名在 `CREDIT`）。
片头长度是 `src/engine.js` 的 `PRE`（整数帧）和 `src/audio.py` 的 `PRE`；正片各场景仍按自己的 0–15 s 时间轴计时。

## 素材
- 官网图片：来自 xiaomiev.com/skynomad/n90（用户打包上传到本仓库 Release `435` 的 `41.zip`）。
  `python3 src/get_photos.py` 下载并解出片中用到的 15 张到 `photos/selected/`（不入库），映射见 `photos/photos.json`：
  片头 2.jpg（草原晨光）· 续航 31.jpg（跨湖大桥）· “说走就走” 37.jpg（夜间俯拍）· 空间 12.jpg（2+2+3 剖视）·
  越野 New_1-2.jpg（正侧面，水位按车高 1825 mm 换算到 750 mm）· 快切 New_1-3/New_1-4/New_1-1（蝴蝶谷蓝/火山灰/酒红）、
  6.jpg、18cover.jpg、27-1.jpg、32-2.jpg、20.jpg · 收尾 29.jpg · 片尾 1.jpg。
- 配音：Leda（Gemini 3.8 Flash TTS，AI Studio 生成的整段录音 `vo/leda_take_aistudio.wav`），由 `vo_take.py` 切句、`vo_align.py` 对齐。
- 配音：`GEMINI_API_KEY=... python3 src/vo_take.py --gemini`（整段一次调用），或把 AI Studio 生成的 wav 放进 `vo/`
  后 `python3 src/vo_take.py --file vo/xxx.wav`；然后 `python3 src/vo_align.py`。

## 生成
```
python3 src/audio.py
python3 src/get_photos.py
python3 src/vo_take.py --file vo/leda_take_aistudio.wav && python3 src/vo_align.py
PLAYWRIGHT=/opt/node22/lib/node_modules/playwright node src/render.js --workers 4   # → out/xiaomi-n90-reel_master.mp4，再压成 out/xiaomi_n90_max_19s.mp4
```
`out/xiaomi_n90_max_19s.mp4` 是带片头的成片，第 0 帧是封面（夜间俯拍 + 标题 + 署名 + 「概念练手 · 非官方」），这样播放器和聊天预览的缩略图不是黑屏；同一张封面另存为 `out/xiaomi_n90_max_cover.jpg`，平台可手动上传。`out/xiaomi_n90_max_15s.mp4` 是上一版不带片头的 15 秒版本。

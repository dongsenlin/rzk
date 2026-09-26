# 小米澎程 N90 Max · 15 秒动态图形宣传片

"把家，带去远方" — 128 BPM，8 小节 = 15.0 秒。所有画面由代码实时生成（Canvas 2D + CPU 合成：真实运动模糊、辉光、颗粒），
配乐与音效由 numpy 合成，配音用 Gemini 3.8 Flash TTS。字体为小米官方 MiSans（npm `misans`）。

| 时间 | 镜头 | 画面 | 配音 |
|---|---|---|---|
| 0–1.9 s | 01 远方 | 晨光地平线展开为宽银幕，露出主视觉；标题逐字随配音出现 | 把家，带去远方。 |
| 1.9–4.7 s | 02 续航 | 路线动画：前 464 km 远山青（纯电）→ 橙色（增程）直到 1705 km；里程表滚动，3.75 s 音乐进主段 | 一千七百零五公里，说走就走。 |
| 4.7–7.5 s | 03 空间 | 俯视座舱：座椅按拍子变换 4 种布局，计数 01→11；缩放进内饰实拍 | 大七座，十一种空间，随心而变。 |
| 7.5–9.4 s | 04 越野 | 水位线涨到 750 mm 涉水深度；双电机四驱、0–100 km/h 5.9 s | 四驱越野，无惧山海。 |
| 9.4–11.3 s | 05 细节 | 8 个八分音符快切，每刀不同转场 | （音乐） |
| 11.3–13.1 s | 06 澎程 | 放慢，"小米澎程"逐字，旅程线蓄力 | 小米澎程—— |
| 13.1–15 s | 07 片尾 | 小米澎程 N90 Max · 澎湃每一程 · 26.99 万元起 | 澎湃每一程。 |

## 素材
- 官网图片：上传到 `photos/`，在 `photos/photos.json` 里指定图片位（hero, road, interior, offroad, side, detail1…8），
  可选 `{"file": "...", "fx": 0.5, "fy": 0.5, "zoom": 1}` 调整裁切。缺图时用 `photos/placeholder/` 里的占位图。
- 配音：`GEMINI_API_KEY=... python3 src/vo_take.py --gemini`（整段一次调用），或把 AI Studio 生成的 wav 放进 `vo/`
  后 `python3 src/vo_take.py --file vo/xxx.wav`；然后 `python3 src/vo_align.py`。

## 生成
```
python3 src/audio.py
PLAYWRIGHT=/opt/node22/lib/node_modules/playwright node src/render.js --workers 4   # → out/tesla_careers_reel_15s.mp4（母版）
```

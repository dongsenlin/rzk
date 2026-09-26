# 月满千里 · 栋森网络科技 携 Opus 5.5 恭贺中秋

15 秒竖版（9:16）动态图形视频。画面、字形动画与配乐全部由代码程序化生成：没有使用任何图片素材或音频采样。

| 文件 | 说明 |
| --- | --- |
| `output/mid-autumn-2026.mp4` | 成片：1080×1920，60 fps，15.0 s，H.264 High + AAC 256k |
| `output/poster.jpg` | 封面 / 海报（定格帧，13.2 s） |
| `output/soundtrack.m4a` | 配乐单轨 |
| `index.html` | 可在浏览器里逐帧拖动预览的实时版本（空格键：播放/暂停，←/→：逐帧） |

## 分镜

| 时间 | 段落 | 画面 | 声音 |
| --- | --- | --- | --- |
| 0.0–2.45 s | 朔 → 望 | 月相计时盘（朔 · 上弦 · 望 · 下弦）逐刻绘出；农历日期从「初一」翻到「十五」，照度读数由约 4% 升至 100%，月相随之由新月盈满 | 古筝五声音阶随日期逐级上行 |
| 2.45 s | 满月 | 月光迸发：冲击光环、金色火花、横向光晕、刻度盘扫光、镜头轻推 | 钟声 + 低频下潜 + 和弦绽放 |
| 2.5–4.4 s | 月出 | 月光照亮层叠远山；祥云从两侧入画；桂枝垂入月前，桂花飘落 | 古筝短句、云气、远处秋虫 |
| 4.15–7.0 s | 千里共婵娟 | 山间灯火逐一点亮，金色弧线从千里之外连向明月，数据光点沿线流动，合成一盏「灯笼」骨架；竖排「但愿人长久 · 千里共婵娟」逐字浮现 | 风铃般的连线声、古筝琶音 |
| 7.0–9.6 s | 中秋 | 书法「中秋」先以金线勾勒轮廓，再由上而下晕染成墨，高光扫过；朱文印「花好月圓」落印 | 毛笔擦纸声、玻璃泛音、木质落印声 |
| 9.75–12.35 s | 落款 | 「栋森网络科技 携 Opus 5.5」 · 分隔线 · 「祝大家中秋佳节快乐」逐字浮现 · 「丙午年 · 八月十五」 | 低音双音、刮奏上行、主和弦解决 |
| 12.35–15.0 s | 定格 | 光带扫过落款，星光、桂花、数据流持续；末 0.6 s 渐隐 | 风铃滑音、泛音、收尾 |

## 视觉系统

- **配色「墨夜鎏金」**：夜空 `#03050D → #0D122D → #1C1936`，月白 `#F6EEDC`，香槟金 `#D9B77A` / 高光金 `#F8E4B2`，月晕 `#FFE7B8`，朱砂印 `#B83026`，雾紫 `#A8ACCC`。
- **字体**：标题「中秋」用马善政楷书（字形轮廓逐笔描金）；中文正文用思源宋体（Noto Serif SC）；「Opus 5.5」用 Cormorant Garamond（已固化等高数字）；辅助信息用 JetBrains Mono。
- **图形母题**：真实月海分布的月面（可辨「玉兔」）、月相计时盘、祥云卷纹、桂枝、层叠水墨远山、网络连线构成的灯笼骨架。
- **安全区**：标题、诗句、印章、落款与祝福语都位于 y 140–1560、x 60–890 之间，避开抖音 / 视频号的右侧按钮栏和底部文案区。

## 实现

- `src/scene.js`：确定性时间轴。`renderAt(t)` 只依赖时间 `t` 绘制一帧，因此任意帧都可以直接跳转、逐帧导出。
- `src/assets.js`：启动时生成全部素材：月面反照率贴图（按真实月海位置 + fbm 噪声 + 辐射纹坑）、夜空、远山、雾、祥云、桂枝、印章、胶片颗粒。
- `src/config.js`：画幅、配色、字体与**总时间轴**。时间轴同时导出为 `output/cues.json`，配乐据此对位。
- `tools/render.mjs`：Playwright 驱动无头 Chromium，多进程逐帧抓取原始 RGBA，按帧序送入 ffmpeg 编码。
- `tools/soundtrack.py`：纯合成配乐（加法合成古筝、Risset 钟、五声音阶 Pad：I–vi–IV–I、滤波噪声、低频、秋虫、合成厅堂混响）。
- `tools/extract_glyphs.py`：从书法字体中提取「中秋」的逐轮廓路径（用于描金动画）。
- `tools/build_fonts.py`：把字体子集化到片中实际用到的字形，并为 Cormorant 固化等高数字。

## 预览与重新渲染

```bash
npm install                        # Playwright（也可使用全局安装的 playwright）
pip install -r requirements.txt    # numpy / scipy / fonttools

# 浏览器预览：直接打开 index.html，或
npx serve .

# 重新生成成片（需要带 libx264 的 ffmpeg，可用 FFMPEG=/path/to/ffmpeg 指定）
node tools/render.mjs cues                                    # 导出时间轴 → output/cues.json
python3 tools/soundtrack.py                                   # 合成配乐 → output/soundtrack.wav
node tools/render.mjs video --audio output/soundtrack.wav     # → output/mid-autumn-2026.mp4
node tools/render.mjs stills 2.45 13.2 --out output/stills   # 导出任意时刻的静帧

# 修改文案后重新子集化字体（源文件来自 github.com/google/fonts）
python3 tools/build_fonts.py /path/to/google-fonts-sources
```

`render.mjs video` 可选参数：`--workers 3`（并行浏览器数）、`--fps 60`、`--crf 16`、`--preset slow`。

## 字体授权

所附字体均为 SIL Open Font License 1.1（无保留字体名），已按片中用字子集化，授权文本见 `fonts/licenses/`：
Noto Serif SC（© Google）、Ma Shan Zheng（© The Ma Shan Zheng Project Authors）、Cormorant Garamond（© The Cormorant Project Authors）、JetBrains Mono（© The JetBrains Mono Project Authors）。

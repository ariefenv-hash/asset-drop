# asset-drop · 资源文件中转仓

独立新仓库，与 `ariefenv-hash/md3` 完全隔离；md3 本侧已停工，不再改动任何文件与分支。

## 已归档（第 21 轮 · 2026-11-22 滚动更新）

- `archives/aosp-ripple-port-web-src.zip` — AOSP 涟漪移植展示 **第 21 轮** Next.js 工程源码
- `archives/aosp-ripple-port-web-dist.zip` — 对应 **GitHub Pages 静态导出产物**（`NEXT_EXPORT=1`，资源路径含 `/asset-drop` 前缀，解压即站点）

完整清单、sha256、dist 形态变化说明与评估报告对照见 **MANIFEST.md**。

## 说明

- `dist` 解压后 20.7 MB / 2,218 文件（纯静态导出，**无 node_modules**，与 gh-pages 分支同源）
- 第 18 轮 dist 为 standalone 形态（93 MB 含 node_modules），自第 21 轮起由静态导出取代；standalone 可由 src 包 `bun run build` 复现
- 需要展开时：`unzip archives/xxx.zip -d build/`（或 `source/`）
- 本仓做滚动更新与如实记录；归档均附 `zipfile.testzip()` 完整性校验

## 第 21 轮要点

- m3.material.io 官方清单重抓 = 六大类 **36 项**，一一比对全覆盖（修正第 18 轮 35 项口径）
- Icon buttons 按 MDC-Android 1.14.0 AAR 补齐（40 项几何 dimen + 2 份颜色选择器逐行核实）
- Google Sans Flex + 中文可变字体**全局混排**（第 20 条方案落地）
- radio/textfield tokens.xml 七条下载通道穷尽定论（第 19 条）
- `tsc --noEmit` 零错误；桌面 1280×900 + iPhone 14 双视口截图核验

## 线上预览

**https://ariefenv-hash.github.io/asset-drop/** （gh-pages 分支 · 第 21 轮源码级静态导出，详见 MANIFEST.md 第六节）

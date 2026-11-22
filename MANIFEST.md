# asset-drop · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**。
> **第 21 轮（2026-11-22）起归档滚动更新**：本轮为官方展示站点全量核验与
> 代码质量审计后的产物，取代第 18 轮归档（第 18 轮 zip 已从 archives/ 移除，
> 原始 sha256 保留于本文件末尾「第 18 轮归档留存记录」）。

## 一、两份原始归档（第 21 轮）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 7,152,750 B | `1b4f75c443ec7d43f11117e595eb2d6776c6dcd580d072acd1c071c1ac6e7556` |
| `archives/aosp-ripple-port-web-dist.zip` | 11,174,316 B | `0ecb8d59d17bdf715ea139e32030b21c9e8ad748c2e96f3f54f195b191f7a1ee` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）。

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-22（**第 21 轮**）
- **基线**：AOSP Android 17 `android-17.0.0_r1` · `@material/web 2.5.0` · MDC-Android 1.14.0
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 22 个组件文件 + 官方对照 iframe + 内嵌源码包 + evidence/ 取证转储）
- **dist**：**`NEXT_EXPORT=1` 静态导出产物（GitHub Pages 直托形态）**，资源根路径已注入 `/asset-drop` 前缀；自第 21 轮起取代第 18 轮的 standalone 产物形态（理由见三）
- **第 21 轮变更（官方站点重抓核验）**：
  - m3.material.io/components 官方清单重抓 = **六大类 36 项**（Buttons 8 · Date & time pickers 2 · Loading & progress 2 · Navigation 3 · Sheets 2 · All other 19），修正第 18 轮"35 项"口径
  - 36/36 一一比对闭环；唯一无独立实现的 **Icon buttons** 按 MDC-Android 1.14.0 AAR 补齐（`m3_comp_icon_button_*` 40 项几何 dimen + `m3_icon_button_icon_color_selector` / `m3_filled_icon_button_container_color_selector` 逐行核实）
  - **第 20 条字体混排全局化**：Google Sans Flex（本地 TTF）+ 中文可变字体（zeoseven fontsapi：文渊圆 414 / 文渊宋 415 / 思源宋 285）全局字体栈，`--vf-rond` 全局轴，实验室可调参并写入 localStorage
  - **第 19 条取证定论**：radio = `radiobutton/res/values/tokens.xml`（22 token）、textfield = `textfield/res/values/tokens_textfield.xml`（31 token），codeload tarball 通道 F 提取，与 AAR 通道 D 完全吻合；取证通道矩阵 A..G 七通道记录于组件头注释
  - **代码质量审计**：`tsc --noEmit` src/ 零错误；`m3GalleryShared.tsx` 共享壳层去重；next.config.ts 支持 `NEXT_EXPORT` / `NEXT_BASE_PATH` 构建开关
- **端到端自测**：双模式 build 通过 · SSR 10/10 区块 PASS · 桌面 1280×900 与 iPhone 14（390×844）截图核验（Icon buttons 五档几何 / filled toggle / outlined / disabled、缺口清单表、字体混排渲染）

## 三、体积与归档取舍（如实说明）

| 包 | ZIP 内条目 | 解压后体积 | 处理 |
|---|---|---|---|
| src | 2,289 文件 | 15,836,983 B | 原始 ZIP 归档 + `inspect/` 提取关键文本 |
| dist | 2,218 文件 | 20,707,251 B | 原始 ZIP 归档；内容即 gh-pages 全量 |

- **dist 形态变化说明**：第 18 轮 dist 为 `bun run build` 的 **standalone 产物**（93 MB / 4,553 文件，含 73 MB node_modules），仅适合容器内 `bun server.js` 运行，GitHub Pages 无法托管。第 21 轮起 dist 更换为 **`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 官方静态导出**（11.2 MB / 2,218 文件，纯静态无 node_modules），与 gh-pages 分支同源同哈希路径规则，解压即站点；standalone 形态可随时由 src 包 `bun run build` 复现。

## 四、与评估报告的静态对照（第 18 轮结论 → 第 21 轮实测更新）

| 报告第七章缺陷 | 第 18 轮 | 第 21 轮（本轮实测） |
|---|---|---|
| 高 · esbuild ^0.25 撞 vite 8.3 peer | ✅ 已消失 | ✅ 保持（Next.js 16 + `bun.lock`） |
| 中 · 页脚两个 ZIP 链接 404 | 🔶 仅 src 链接在 | ✅ **已修复**：页脚链接 + `public/aosp-ripple-port-src.zip` 同名文件齐备（SSR 与文件系统双重核验） |
| 中 · SystemUI 750ms 旧值 | 🔶 750/3000 并存 | ✅ **已修复**：`DEFAULT_RIPPLE_EFFECT_DURATION = 3000`（A17 值），750ms 旧值仅存于「修正记录」表内的对照说明，并暴露 A17/旧版切换 |
| 低 · AI Studio 模板残留 | ✅ 已清 | ✅ 保持 |
| 低 · 字体双份 | ✅ 单份 | ✅ 保持（`public/fonts/GoogleSansFlex.ttf` 唯一） |
| 低 · 自创参数未标注 | 🔶 未核 | ✅ **已修复**：`hypot×1.65` → `max(w,h)`（视图最大边）；`densityScale` 改取 devicePixelRatio 并标注 Web 适配近似（页面「修正记录」表明示） |

**新观察（非报告内容）**：工程名仍为模板名 `nextjs_tailwind_shadcn_ts`；依赖含 shadcn/Radix、Prisma 等演示无关项（预览平台工程壳，如实保留）；aosp 引擎 9 个 + `m3GalleryShared.tsx` 共享壳层（第 21 轮去重收敛）；`public/official-md-ripple/` 为官方 `@material/web` 同台对照资源。

> 第 18 轮为纯文本静态核验；第 21 轮已升级为**实构建（双模式）+ 实运行（SSR + 无头浏览器桌面/移动双视口）**核验。

## 五、目录

```
asset-drop/
├── archives/   # 两份原始 ZIP（第 21 轮）
├── inspect/    # 从 src ZIP 提取的关键文本（PACKAGE-INFO / 根配置 / 9 个 aosp 引擎）
├── MANIFEST.md
└── README.md
```

## 六、Pages 部署（gh-pages 分支）

- 站点：**https://ariefenv-hash.github.io/asset-drop/** · 数据源 `gh-pages / root` · legacy 模式
- **第 21 轮 gh-pages 更新**：由 `NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 从源码官方静态导出，全量替换（2,218 文件 + `.nojekyll`），与 `archives/aosp-ripple-port-web-dist.zip` 同源
- 第 18 轮 gh-pages 为「standalone 产物静态化拼接」，存在预渲染 HTML 与客户端不一致导致的 React #418 hydration 警告与部分交互不完整；第 21 轮改为**官方 `output:"export"` 源码级导出**，预渲染即构建期产出、组件树与客户端 bundle 同源，该已知局限按导出机制预期消除（线上复测以 Pages 发布后无头访问为准）
- 资源路径 `/asset-drop/_next/...`（构建期注入，非拼接）；`.nojekyll` 保住 `_next/` 目录

## 七、第 18 轮归档留存记录（原样保留的溯源信息）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip`（第 18 轮） | 9,479,884 B | `41741d29b7c8184ddf94cd69801de591a5d56833d1b21b295320198f15af1445` |
| `archives/aosp-ripple-port-web-dist.zip`（第 18 轮） | 33,994,730 B | `38f5644769d80337355416e8501f4be452de0c94694bc09c152ac19dfca67a61` |

- 第 18 轮 gh-pages 提交 `eda2f02`（3,223 文件）；已被第 21 轮导出全量替换
- 第 18 轮取证通道矩阵：`raw.github` / `api.github` / WebFetch / `dl.google.com` AAR 可用；`googlesource` 阻断；第 21 轮新增 codeload tarball（通道 F）与 jsdelivr 双 CDN（通道 G）定论

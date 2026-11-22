# asset-drop · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**。
> **第 28 轮（2026-11-22）归档滚动更新**：开关小球勾叉字形修复（图标渲染器 inline style 压类名实根因 + 真机逐像素取证定档）+ 页尾新增「还原边界 · 使用须知」，取代第 27 轮归档（第 18/21/23/24/25/26/27 轮历史数据见本文件后半与 git 历史）。
> **第 27 轮（2026-11-22）归档滚动更新**：在承接第 22-26 轮基础上，完成全站去 npm 化（运行时依赖收敛到 react/react-dom/next 三个；lucide-react 卸载 → Material Symbols 官方路径数据内联自研图标模块；shadcn/Radix/Prisma 死代码出库）。

## 一、两份原始归档（第 28 轮）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 7,455,172 B | `f7a7aa50b829cdf892e0eece598dae2c2c6b2afb2112643d705efbe6f70728c2` |
| `archives/aosp-ripple-port-web-dist.zip` | 11,597,032 B | `a9dbdb3edf96f94cb8df21315704a93557a0118bb476f585883dbc4d5dee5794` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）；**三包同源同哈希**：dist 内嵌页脚 ZIP（`aosp-ripple-port-src.zip`）= 归档 src zip（本轮新增校验，此前 dist 先于 public 同步构建，页脚包落后一轮）。

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-22（**第 28 轮**）
- **基线**：AOSP Android 17 `android-17.0.0_r1` · `@material/web 2.5.0`（pkg/ 原文内联运行）· MDC-Android 1.14.0 · Monet CoreSpec = `packages/SystemUI/monet/ColorScheme.kt`（aosp-mirror android-13.0.0_r1）
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 15 个组件文件（含自研图标模块 icons/）+ 官方对照 iframe（pkg/ 原文 + vendor/ lit 3.3.2）+ evidence/ 取证转储）
- **dist**：**`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 静态导出产物（GitHub Pages 直托形态）**，资源根路径已注入 `/asset-drop` 前缀
- **第 28 轮变更（开关小球勾叉修复 + 页尾还原边界说明）**：
  - **图标渲染器尺寸语义修复（"小球勾叉大一圈"实根因）**：icons/index.tsx 的 size 原先经 inline style（默认 24px）写入，内联样式压过 Tailwind 尺寸类——第 27 轮起全站 6 处类名定尺寸图标（开关小球勾叉 h-4、页头明暗切换与源码对照复制/成功 h-3.5、暗色演示 Sun h-5）实际全被撑成 24px；改 width/height 属性写入（lucide 同款语义），类名可覆盖，无类名时仍默认 24dp
  - **字形档位真机取证**：Android 16 Expressive 系统设置截图（Audio sharing 页两处开关）逐像素实测 X 宽/小球直径 = 0.355~0.387 ↔ 官方默认 close 字形 @16dp 图标盒 = 8.77/24 = 0.365 吻合；check_small/close_small 小号变体（0.256）明显小于实机——小球维持官方默认 check/close 字形，图标盒保持官方 spec 16dp（m3.material.io switch specs）；lucide 时代遗留 stroke-[2.75/2.5] 笔画类清除（对实心剪影本就无效）
  - **icons 模块补录**：check_small/close_small 官方小号变体原样内联（60→62 枚）备用，取证结论记录于模块头注
  - **页尾「关于本项目」三栏扩四栏**：新增「还原边界 · 使用须知」（用户要求）——仅展示从系统源码中可找到、可考据的部分；实现可能有所取舍，部分细节未与主代码一一对应（移植到网页不可避免）；组件只是基础，后续动画还需进一步补充
- **第 27 轮变更（全站去 npm 化：运行时依赖收敛到 react/react-dom/next）**：
  - **图标体系源码化**：14 个组件文件卸载 lucide-react，新增 `src/components/icons/`——google/material-design-icons 官方 Material Symbols Rounded/Outlined fill1 24px 路径数据【原样内联】（60 枚，单 path 无变换，viewBox 官方口径 `0 -960 960 960`，fill=currentColor），与 AOSP SystemUI / M3 官方同源同风格；"复制/粘贴/剪切" content_copy/content_paste/content_cut 对号入座，SplitButton 手绘感叹号换官方 error
  - **死代码出库**：src/components/ui（shadcn/Radix 全套，仅 Toaster 曾被挂载且演示从未派发 toast）、src/hooks、src/lib/db.ts（PrismaClient 唯一引用点）、prisma/、components.json、src/lib/utils.ts
  - **package.json 收敛**：dependencies 仅剩 next/react/react-dom；devDependencies 仅剩 typescript/@types/react/@types/react-dom/tailwindcss/@tailwindcss/postcss/eslint/eslint-config-next；移除 65 组直依赖（radix 全家/lucide/prisma/sharp/z-ai-sdk/framer-motion/tanstack 等脚手架残留）
  - **样式与字体**：globals.css 摘除 tw-animate-css（全站零引用）；@theme font-sans/font-mono 映射改指真实混排栈；layout.tsx 摘除 Toaster 与 Geist/next-font；tsconfig exclude 补 skills/scripts
- **第 26 轮变更（承接）**：全项目降采样排查收官（effectiveRasterDpr 共享口径 + 小画布 cap8/舞台 cap4）· 开关状态层"偏下+松手跳一下"根修（calc(50% - 半径)）
- **第 25 轮变更（承接）**："剪切" content_cut 图标还原 · 形变画布清晰度（撤 2.5 上采样顶）· 导航抽屉纵向滚动锁定（w-full 横溢根因）· 导航三件套胶囊/角标锚定精确 24×24 图标盒 · ThemeVariant 扩 styleList 全集（AOSP-13 CoreSpec 联网取证）· 配色圆形预览 8 颗可点击应用（行=明暗/列=风格）· 打包时序修正（三 zip 同源同哈希）
- **端到端自测（第 28 轮实测）**：`tsc --noEmit` 零错误 · `NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 静态导出通过 · 浏览器断言——开关小球 svg 实测盒宽 16px（0 处 24px 残留）、字形 d 与官方默认 check/close 逐位一致 · 全站类名定尺寸 svg 实宽与类一致（h-3.5→14 / h-4→16 / h-5→20，共 50 处抽检）· 页尾四栏文案齐备 · 控制台零错误 · 三包同源同哈希 ✓（第 27 轮实测项：127 枚官方 viewBox/badge 锚定/抽屉锁定/配色预览联动——未受本轮改动影响）
- **第 22-25 轮变更（承接，详见 git 历史）**：对照页 404 根因修复（basePath 构建期内联）· vendor/ 内联 lit 3.3.2 · switch 按压涟漪源码实证（40×40 state-layer）· 涟漪滥用修正 · 按压微放大/拖拽/吸附 · 页尾三栏说明 · 第 24 轮自审加固（click 抑制窗口/rAF 覆盖/pointercancel/键盘/reduced-motion/WebGL 兜底/仓库卫生）· 第 25 轮（图标还原/画布清晰度/抽屉锁定/锚定/四风格可点击）

## 三、体积与归档取舍（如实说明）

| 包 | ZIP 内条目 | 处理 |
|---|---|---|
| src | 2,577 文件 | 原始 ZIP 归档；**不再内嵌页脚源码包**（自引用排除，终止逐轮滚雪球） |
| dist | 2,542 文件 | 原始 ZIP 归档；内容即 gh-pages 全量（第 28 轮 ZIP 11,597,032 B，内嵌页脚 ZIP 与 src zip 同哈希） |

- **dist 形态变化说明**：第 18 轮 dist 为 `bun run build` 的 **standalone 产物**（93 MB / 4,553 文件，含 73 MB node_modules），仅适合容器内 `bun server.js` 运行，GitHub Pages 无法托管。第 21 轮起 dist 更换为 **`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 官方静态导出**（纯静态无 node_modules），与 gh-pages 分支同源同哈希路径规则，解压即站点；standalone 形态可随时由 src 包 `bun run build` 复现。第 22 轮 dist 增至 11.5 MB，主因 `official-md-ripple/vendor/`（lit 3.3.2 运行时 7 包）首次随包分发。

## 四、与评估报告的静态对照（第 18 轮结论 → 第 21 轮实测更新）

| 报告第七章缺陷 | 第 18 轮 | 第 21 轮（本轮实测） |
|---|---|---|
| 高 · esbuild ^0.25 撞 vite 8.3 peer | ✅ 已消失 | ✅ 保持（Next.js 16 + `bun.lock`） |
| 中 · 页脚两个 ZIP 链接 404 | 🔶 仅 src 链接在 | ✅ **已修复**：页脚链接 + `public/aosp-ripple-port-src.zip` 同名文件齐备（SSR 与文件系统双重核验） |
| 中 · SystemUI 750ms 旧值 | 🔶 750/3000 并存 | ✅ **已修复**：`DEFAULT_RIPPLE_EFFECT_DURATION = 3000`（A17 值），750ms 旧值仅存于「修正记录」表内的对照说明，并暴露 A17/旧版切换 |
| 低 · AI Studio 模板残留 | ✅ 已清 | ✅ 保持 |
| 低 · 字体双份 | ✅ 单份 | ✅ 保持（`public/fonts/GoogleSansFlex.ttf` 唯一） |
| 低 · 自创参数未标注 | 🔶 未核 | ✅ **已修复**：`hypot×1.65` → `max(w,h)`（视图最大边）；`densityScale` 改取 devicePixelRatio 并标注 Web 适配近似（页面「修正记录」表明示） |

**第 22 轮补充（部署形态 404，非报告清单项）**：Pages 线上页面自身的 iframe / zip / 字体引用因缺 `/asset-drop` 前缀而 404（assetPrefix 不改写手工路径），已以 `NEXT_PUBLIC_BASE_PATH` 构建期内联修复，并在本地子路径模拟部署中复现-验证闭环；官方对照页 lit 运行时缺失（importmap 指向不存在路径）同轮修复。

**第 24 轮补充（非报告清单项，全面自审产出）**：派生 click 抑制标志在 pointercancel 场景残留（真 bug，吞掉下一次点击）；拖拽 rAF 在松手后覆盖吸附落位（真 bug，快速操作"卡在中途"）；pointercancel 被误当松手处理（误触发切换）；键盘 repeat 涟漪 session 堆积；未响应 prefers-reduced-motion；WebGL2 不可用时零反馈；构建/缓存产物入库（5,366 文件脏跟踪）。同轮全部修复，浏览器断言逐项通过。

**新观察（非报告内容）**：工程名仍为模板名 `nextjs_tailwind_shadcn_ts`；依赖含 shadcn/Radix、Prisma 等演示无关项（预览平台工程壳，如实保留）；aosp 引擎 9 个 + `m3GalleryShared.tsx` 共享壳层（第 21 轮去重收敛）；`public/official-md-ripple/` 为官方 `@material/web` 同台对照资源。

> 第 18 轮为纯文本静态核验；第 21 轮已升级为**实构建（双模式）+ 实运行（SSR + 无头浏览器桌面/移动双视口）**核验。

## 五、目录

```
asset-drop/
├── archives/   # 两份原始 ZIP（第 26 轮）
├── inspect/    # 从 src ZIP 提取的关键文本（PACKAGE-INFO / 根配置 / 9 个 aosp 引擎）
├── MANIFEST.md
└── README.md
```

## 六、Pages 部署（gh-pages 分支）

- 站点：**https://ariefenv-hash.github.io/asset-drop/** · 数据源 `gh-pages / root` · legacy 模式
- **第 26 轮 gh-pages 更新**：由 `NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 从源码官方静态导出全量替换（2,556 文件 + `.nojekyll`），与 `archives/aosp-ripple-port-web-dist.zip` 同源；含第 22-26 轮全部修复（全站栅格化口径统一/开关状态层居中根修/第 25 轮导航锚定与四风格可点击/第 24 轮自审加固）
- **线上复测（2026-11-22，已推送 51be518 / 40c7151）**：首页 200 · `official-md-ripple/index.html` 200 · 页脚 ZIP 200 · GoogleSansFlex 字体 200；线上 HTML 核验为第 24 轮构建（iframe/zip 均带 `/asset-drop` 前缀）；对照页 md-switch 升级断言在沙盒无头浏览器中卡于 interactive，经三重判别（curl 全 200 / Python 12 线程并发拉全模块图 8.5s 全 200 / 同构建本地子路径模拟 5/5 升级）定论为沙盒浏览器到 github.io 的 TLS 连接不稳（同轮 git push 亦先报 GnuTLS -110 后 HTTP/1.1 重试成功），非部署缺陷
- **线上复测（2026-11-22，已推送 7ccc99b / eb4efff，第 27 轮）**：Pages status=built（legacy · gh-pages / root）；`/` 200 · `/official-md-ripple/index.html` 200；线上 index.html 的 8 个 _next chunk/css 路径集合与本地第 27 轮构建完全一致（部署即本轮产物），**线上已无 geist 任何残留**（next-font 摘除生效实证）；iframe/页脚 zip 引用均带 `/asset-drop` 前缀；归档双 zip 经 GitHub API raw 通道实测哈希——src 7,453,298 B sha256 `415d9c02…c449e` ✓ · dist 11,594,468 B sha256 `faae48c5…5b05` ✓（github.io 大文件直连沿用既定 TLS 不稳口径，API 通道互证）；令牌善后：一次性 URL 注入，临时克隆已删除，无 credential.helper 残留，令牌未写入任何项目文件
- 第 22-23 轮修复版曾因令牌失效滞留本地（第 18 轮令牌已按约定用后撤销），本轮新令牌到位后 main + gh-pages 一次性推送
- 第 18 轮 gh-pages 为「standalone 产物静态化拼接」，存在预渲染 HTML 与客户端不一致导致的 React #418 hydration 警告与部分交互不完整；第 21 轮改为**官方 `output:"export"` 源码级导出**，预渲染即构建期产出、组件树与客户端 bundle 同源，该已知局限按导出机制预期消除（线上复测以 Pages 发布后无头访问为准）
- 资源路径 `/asset-drop/_next/...`（构建期注入，非拼接）；`.nojekyll` 保住 `_next/` 目录

## 七、第 18 轮归档留存记录（原样保留的溯源信息）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip`（第 18 轮） | 9,479,884 B | `41741d29b7c8184ddf94cd69801de591a5d56833d1b21b295320198f15af1445` |
| `archives/aosp-ripple-port-web-dist.zip`（第 18 轮） | 33,994,730 B | `38f5644769d80337355416e8501f4be452de0c94694bc09c152ac19dfca67a61` |

- 第 18 轮 gh-pages 提交 `eda2f02`（3,223 文件）；已被第 21 轮导出全量替换
- 第 18 轮取证通道矩阵：`raw.github` / `api.github` / WebFetch / `dl.google.com` AAR 可用；`googlesource` 阻断；第 21 轮新增 codeload tarball（通道 F）与 jsdelivr 双 CDN（通道 G）定论

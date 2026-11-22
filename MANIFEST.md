# asset-drop · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**。
> **第 24 轮（2026-11-22）归档滚动更新**：在承接第 22-23 轮（404 根因修复 + switch 约束状态层/拖拽/吸附 + 页尾说明 + 底色残留根修 + 字体双保险）基础上，完成全面自审加固（派生 click 吞掉 窗口残留 / 拖拽 rAF 覆盖吸附落位 / pointercancel 语义 / 键盘 repeat / prefers-reduced-motion / WebGL 不可用兜底 / 仓库卫生），取代第 23 轮归档（第 18/21/23 轮历史数据见本文件后半与 git 历史）。

## 一、两份原始归档（第 24 轮）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 7,548,088 B | `03d5accef6468bd60c2f3612e5fb24da73d014e24bab49b62e76509bcf7cfbcc` |
| `archives/aosp-ripple-port-web-dist.zip` | 11,851,401 B | `70d29792ea818ac4eb8736d05f45cc5da83a652f185885cfc0ea26e51c443e36` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）。

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-22（**第 24 轮**）
- **基线**：AOSP Android 17 `android-17.0.0_r1` · `@material/web 2.5.0`（pkg/ 原文内联运行）· MDC-Android 1.14.0
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 22 个组件文件 + 官方对照 iframe（pkg/ 原文 + vendor/ lit 3.3.2）+ evidence/ 取证转储）
- **dist**：**`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 静态导出产物（GitHub Pages 直托形态）**，资源根路径已注入 `/asset-drop` 前缀
- **第 24 轮变更（全面自审驱动）**：
  - **派生 click 吞掉 标志残留修复**：pointercancel / lostpointercapture 结束拖拽时浏览器不派发 click，旧布尔标志残留会 吞掉 掉下一次正常点击（开关"点不动一次"）；改为 `CLICK_SUPPRESS_WINDOW_MS=600` 时间窗 + pointerdown 重置（实测 cancel 后紧接 click 正常切换）
  - **拖拽 rAF 覆盖吸附落位修复**：pointerup/cancel 后残留的 applyDragPosition rAF 会在下一帧把小球拉回中途位置（快速拖拽+松手"卡在中途"实错根因）；释放/取消统一取消未决 rAF + pressedRef 守卫
  - **pointercancel 语义修正**：由"当作松手做吸附判定"改为"手势中止"——回弹按压前状态、不派发 onChange、不设 click 抑制窗口（与原生开关语义一致）
  - **键盘加固**：key repeat 不再重复生成 涟漪 session；键盘 涟漪 生长点从轨道中心改为小球实际中心（状态层盒中心，与官方"涟漪 生长于贴着小球的状态层"语义一致）；释放定时器收进卸载清理
  - **prefers-reduced-motion**：撤位移/过冲动画与按压微放大，仅保留 67ms 颜色过渡（M3 无障碍基线）
  - **WebGL2 不可用兜底**：官方 pressed-state-layer-opacity 0.12 的 CSS 状态层补位，几何与 WebGL 路径一致（40×40 圆、贴小球），消除"按下零反馈"降级死区
  - **移动端长按体验**：屏蔽 contextmenu / 文本选择 / iOS 长按呼出气泡
  - **仓库卫生**：.next 缓存/out/tmp/日志共 5,366 个产物文件移出 git 跟踪；.gitignore 系统化（.env* / .DS_Store / tool-results 等）
  - **打包修正**：src zip 不再自引用内嵌的 `public/aosp-ripple-port-src.zip`（此前逐轮滚雪球，14.4MB → 修正后 7.5MB）
- **端到端自测（本轮实测）**：`tsc --noEmit` 零错误 · Pages 子路径本地模拟（首页/对照页/zip/字体全 200）· 浏览器断言：点击切换 ✓ · 双向拖拽吸附 ✓ · 欠中点回弹 ✓ · 快速甩动落位 ✓ · pointercancel 中止回弹且不吞后续点击 ✓ · Enter/Space 切换 ✓ · iframe 内 md-switch 5/5 升级 ✓ · 深色模式与页尾三栏说明渲染 ✓
- **第 22-23 轮变更（承接，详见 git 历史）**：对照页 404 根因修复（basePath 构建期内联，iframe/zip/字体全感知）· vendor/ 内联 lit 3.3.2 运行时 · switch 按压 涟漪 源码实证（switch.js L116 + _handle.scss L134-140 —— 40×40 state-layer-size 圆形状态层、随小球移动、pressed 透明度 0.12，永不扩散过整条轨道）· 涟漪 滥用修正（无界光晕 → 官方同几何约束状态层，星斑着色器 + maskRadii）· 按压 24→28dp + 1.05 微放大、左右拖拽、松手自动吸附判定 · 页尾「关于本项目」三栏说明 · 涟漪 演示底色残留根修 · 字体混排双保险

## 三、体积与归档取舍（如实说明）

| 包 | ZIP 内条目 | 处理 |
|---|---|---|
| src | 2,629 文件 | 原始 ZIP 归档；**不再内嵌页脚源码包**（自引用排除，终止逐轮滚雪球） |
| dist | 2,556 文件 | 原始 ZIP 归档；内容即 gh-pages 全量（第 24 轮 ZIP 11,851,401 B） |

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
├── archives/   # 两份原始 ZIP（第 24 轮）
├── inspect/    # 从 src ZIP 提取的关键文本（PACKAGE-INFO / 根配置 / 9 个 aosp 引擎）
├── MANIFEST.md
└── README.md
```

## 六、Pages 部署（gh-pages 分支）

- 站点：**https://ariefenv-hash.github.io/asset-drop/** · 数据源 `gh-pages / root` · legacy 模式
- **第 24 轮 gh-pages 更新**：由 `NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 从源码官方静态导出全量替换（2,556 文件 + `.nojekyll`），与 `archives/aosp-ripple-port-web-dist.zip` 同源；含第 22-24 轮全部修复（对照页 basePath / lit 运行时 / switch 约束状态层与拖拽吸附 / 第 24 轮自审加固）
- **线上验证清单（推送后复测）**：首页 200 · `official-md-ripple/index.html` 200 · 页脚 ZIP 200 · GoogleSansFlex 字体 200 · iframe 内 md-switch 升级
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

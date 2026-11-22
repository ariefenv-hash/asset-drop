# asset-drop · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**。
> **第 25 轮（2026-11-22）归档滚动更新**：在承接第 22-24 轮（404 根因修复 + switch 约束状态层/拖拽/吸附 + 页尾说明 + 第 24 轮全面自审加固）基础上，完成用户复核两弹（剪切图标还原 / 形变画布清晰度 / 抽屉纵向锁定 / 胶囊与角标锚定 / 配色预览四风格可点击应用），取代第 24 轮归档（第 18/21/23/24 轮历史数据见本文件后半与 git 历史）。

## 一、两份原始归档（第 25 轮）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 7,553,210 B | `c2718743f3830f715554a25ae37359738d689d0f641e1f48b80fb30ef865619b` |
| `archives/aosp-ripple-port-web-dist.zip` | 11,859,291 B | `2a6a2c32f6d92ab3a225b607b73d9a454c04b8f7de031f6f9f6410e0e30bdbf9` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）；**三包同源同哈希**：dist 内嵌页脚 ZIP（`aosp-ripple-port-src.zip`）= 归档 src zip（本轮新增校验，此前 dist 先于 public 同步构建，页脚包落后一轮）。

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-22（**第 25 轮**）
- **基线**：AOSP Android 17 `android-17.0.0_r1` · `@material/web 2.5.0`（pkg/ 原文内联运行）· MDC-Android 1.14.0 · Monet CoreSpec = `packages/SystemUI/monet/ColorScheme.kt`（aosp-mirror android-13.0.0_r1）
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 22 个组件文件 + 官方对照 iframe（pkg/ 原文 + vendor/ lit 3.3.2）+ evidence/ 取证转储）
- **dist**：**`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 静态导出产物（GitHub Pages 直托形态）**，资源根路径已注入 `/asset-drop` 前缀
- **第 25 轮变更（用户复核两弹驱动）**：
  - **"剪切" content_cut 矢量图标路径还原**：此前为损坏手写路径（弧线端点/圆孔半径全错，渲染畸形）；还原为 Material Icons 原版（与同组复制/粘贴同风格 filled 集）；同轮完成全部内联矢量图标审计（content_copy/paste、autorenew、checkbox/radio AAR 矢量、四象限预览圆、波浪生成路径均逐项核实无误）
  - **7 种几何形变加载指示器画布清晰度修复**：撤销 2.5 DPR 上采样顶 → 真实 `devicePixelRatio × visualViewport` 捏合缩放逐帧重设后备缓冲（封顶 8）；硬边贝塞尔剪影在浏览器缩放/捏合下不再发虚；大面积软边 WebGL 涟漪画布（实验区/RippleSurface/开关状态层）维持 2.5 封顶并注明口径
  - **导航抽屉纵向滚动锁定**：滚动容器补 `overflow-x hidden` + `touchAction: pan-y` + `overscrollBehavior: contain`（standard + modal）；条目按钮去 `w-full`（100% 宽 + marginInline 12 撑出 12px 横向溢出 = "能左右滑"真根因）；实测 scrollWidth==clientWidth==360、强制 scrollLeft 恒 0
  - **胶囊与角标锚定修复**：底部导航/侧边轨/抽屉的激活胶囊（56×32）、hover 层与角标改锚定精确 24×24 图标盒——内联 svg 基线排版上浮 + "图标+文字"整组居中曾使胶囊对不准图标、角标贴不上顶角（"下方的字把位置挤上去"实错）；侧边轨补角标演示
  - **ThemeVariant 扩展 styleList 全集**（+spritz/vibrant）：`buildM3Theme` 调色板 CoreSpec 逐值取自 AOSP-13 ColorScheme.kt L136-186（联网逐字核对：SPRITZ 12/8/16 中性 2/2 · VIBRANT MaxOut(130)/VibrantSecondary/Tertiary 旋转表 24/32 中性 10/12）；tonal_spot 中性色源码 n1=4.0 与本仓基线 6.0 存在历史口径差，本轮如实标注、维持基线不动
  - **配色方案圆形预览 8 颗全部可点击应用**：点击 = 应用该风格 + 该行明暗模式（行 = 浅/深 preview、列 = 四风格，WallpaperPicker2 语义）；选中外圈 = themeVariant × isDark 联合判定；四象限加同色 0.75 描边消除扇形共享边抗锯齿发丝缝
  - **打包时序修正**：打包脚本支持分阶段执行（src → 重建 out → dist），保证 Pages 页脚内嵌 ZIP 与归档 src zip 同源同哈希
- **端到端自测（本轮实测）**：`tsc --noEmit` 零错误 · 浏览器断言：胶囊对中/角标贴角 ✓ · 抽屉横滑禁用 ✓ · modal 抽屉 scrim+滑入 ✓ · 预览点击切风格+明暗+实验区选择器联动 ✓ · 形变画布 48×dpr 重设 ✓ · 三包同源同哈希 ✓
- **第 22-24 轮变更（承接，详见 git 历史）**：对照页 404 根因修复（basePath 构建期内联）· vendor/ 内联 lit 3.3.2 · switch 按压涟漪源码实证（40×40 state-layer）· 涟漪滥用修正 · 按压微放大/拖拽/吸附 · 页尾三栏说明 · 第 24 轮自审加固（click 抑制窗口/rAF 覆盖/pointercancel/键盘/reduced-motion/WebGL 兜底/仓库卫生）

## 三、体积与归档取舍（如实说明）

| 包 | ZIP 内条目 | 处理 |
|---|---|---|
| src | 2,629 文件 | 原始 ZIP 归档；**不再内嵌页脚源码包**（自引用排除，终止逐轮滚雪球） |
| dist | 2,556 文件 | 原始 ZIP 归档；内容即 gh-pages 全量（第 25 轮 ZIP 11,859,291 B，内嵌页脚 ZIP 与 src zip 同哈希） |

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
├── archives/   # 两份原始 ZIP（第 25 轮）
├── inspect/    # 从 src ZIP 提取的关键文本（PACKAGE-INFO / 根配置 / 9 个 aosp 引擎）
├── MANIFEST.md
└── README.md
```

## 六、Pages 部署（gh-pages 分支）

- 站点：**https://ariefenv-hash.github.io/asset-drop/** · 数据源 `gh-pages / root` · legacy 模式
- **第 25 轮 gh-pages 更新**：由 `NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 从源码官方静态导出全量替换（2,556 文件 + `.nojekyll`），与 `archives/aosp-ripple-port-web-dist.zip` 同源；含第 22-25 轮全部修复（导航三件套锚定/抽屉纵向锁定/形变画布清晰度/配色预览四风格可点击/剪切图标还原/第 24 轮自审加固）
- **线上复测（2026-11-22，已推送 51be518 / 40c7151）**：首页 200 · `official-md-ripple/index.html` 200 · 页脚 ZIP 200 · GoogleSansFlex 字体 200；线上 HTML 核验为第 24 轮构建（iframe/zip 均带 `/asset-drop` 前缀）；对照页 md-switch 升级断言在沙盒无头浏览器中卡于 interactive，经三重判别（curl 全 200 / Python 12 线程并发拉全模块图 8.5s 全 200 / 同构建本地子路径模拟 5/5 升级）定论为沙盒浏览器到 github.io 的 TLS 连接不稳（同轮 git push 亦先报 GnuTLS -110 后 HTTP/1.1 重试成功），非部署缺陷
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

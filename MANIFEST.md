# asset-drop · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**。
> **第 26 轮（2026-11-22）归档滚动更新**：在承接第 22-25 轮基础上，完成用户复核第 4 弹（全项目降采样排查收官：共享口径 effectiveRasterDpr + 小画布给足真实分辨率/舞台限幅 cap4；开关状态层"偏下+松手跳一下"根修：border 包含块偏移 → calc(50% - 半径)），取代第 25 轮归档（第 18/21/23/24/25 轮历史数据见本文件后半与 git 历史）。

## 一、两份原始归档（第 26 轮）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 7,554,234 B | `d59f65046ce33a2cea74e27127a10a023c7b2dcdd415ce28241ab5dbfc6457cc` |
| `archives/aosp-ripple-port-web-dist.zip` | 11,859,901 B | `221b5147d910eec88c2ed1c756b304401389d0ebf6f54814536902a03822f7e7` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）；**三包同源同哈希**：dist 内嵌页脚 ZIP（`aosp-ripple-port-src.zip`）= 归档 src zip（本轮新增校验，此前 dist 先于 public 同步构建，页脚包落后一轮）。

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-22（**第 26 轮**）
- **基线**：AOSP Android 17 `android-17.0.0_r1` · `@material/web 2.5.0`（pkg/ 原文内联运行）· MDC-Android 1.14.0 · Monet CoreSpec = `packages/SystemUI/monet/ColorScheme.kt`（aosp-mirror android-13.0.0_r1）
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 22 个组件文件 + 官方对照 iframe（pkg/ 原文 + vendor/ lit 3.3.2）+ evidence/ 取证转储）
- **dist**：**`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 静态导出产物（GitHub Pages 直托形态）**，资源根路径已注入 `/asset-drop` 前缀
- **第 26 轮变更（用户复核第 4 弹：全项目降采样排查 + 开关状态层偏移）**：
  - **全项目降采样排查收官**：新增共享口径 `effectiveRasterDpr(cap) = devicePixelRatio × visualViewport.scale`（捏合缩放计入），封顶防病态值；小画布（开关状态层 40dp · 涟漪面 24-96dp · 形变指示器 48dp）全部给足真实分辨率（cap 8），大面积 WebGL 实验区舞台 cap 2.5→4（软边涟漪下收益递减，限幅保帧率，数学叠层半径换算同步）
  - **开关状态层"偏下 + 松手跳一下"根修**：绝对定位包含块为 padding box，unchecked 态 border-2 把固定 top 值整体压低 2px（实测圆心 18 vs 小球 16），checked 翻转瞬间跳变 2px；`top: calc(50% - 20px)` 后两种状态、翻转前后圆心恒与 border-box 中心重合（浏览器逐帧采样实测双向翻转全程 cy=16 无跳变）
  - **顺带审计**：RippleSurface/Switch 空闲画布停在默认 300×150 属正常（tick 首帧先重设后绘制，空闲透明不可见）；共享 WebGL 渲染器画布按调用方 dpr 逐次重设，无隐藏瓶颈
- **第 25 轮变更（承接）**："剪切" content_cut 图标还原 · 形变画布清晰度（撤 2.5 上采样顶）· 导航抽屉纵向滚动锁定（w-full 横溢根因）· 导航三件套胶囊/角标锚定精确 24×24 图标盒 · ThemeVariant 扩 styleList 全集（AOSP-13 CoreSpec 联网取证）· 配色圆形预览 8 颗可点击应用（行=明暗/列=风格）· 打包时序修正（三 zip 同源同哈希）
- **端到端自测（第 26 轮实测）**：`tsc --noEmit` 零错误 · unchecked/checked 状态层圆心 delta 均为 0 · 双向翻转逐帧采样无跳变 · 实验区触发生成无报错 · 三包同源同哈希 ✓
- **第 22-25 轮变更（承接，详见 git 历史）**：对照页 404 根因修复（basePath 构建期内联）· vendor/ 内联 lit 3.3.2 · switch 按压涟漪源码实证（40×40 state-layer）· 涟漪滥用修正 · 按压微放大/拖拽/吸附 · 页尾三栏说明 · 第 24 轮自审加固（click 抑制窗口/rAF 覆盖/pointercancel/键盘/reduced-motion/WebGL 兜底/仓库卫生）· 第 25 轮（图标还原/画布清晰度/抽屉锁定/锚定/四风格可点击）

## 三、体积与归档取舍（如实说明）

| 包 | ZIP 内条目 | 处理 |
|---|---|---|
| src | 2,629 文件 | 原始 ZIP 归档；**不再内嵌页脚源码包**（自引用排除，终止逐轮滚雪球） |
| dist | 2,556 文件 | 原始 ZIP 归档；内容即 gh-pages 全量（第 26 轮 ZIP 11,859,901 B，内嵌页脚 ZIP 与 src zip 同哈希） |

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

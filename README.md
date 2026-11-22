# asset-drop · 资源文件中转仓

独立新仓库，与 `ariefenv-hash/md3` 完全隔离；md3 本侧已停工，不再改动任何文件与分支。

## 已归档（第 25 轮 · 2026-11-22 滚动更新）

- `archives/aosp-ripple-port-web-src.zip` — AOSP 涟漪移植展示 **第 25 轮** Next.js 工程源码
- `archives/aosp-ripple-port-web-dist.zip` — 对应 **GitHub Pages 静态导出产物**（`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop`，资源路径含 `/asset-drop` 前缀，解压即站点）

完整清单、sha256、dist 形态变化说明与评估报告对照见 **MANIFEST.md**。

## 说明

- `dist` 解压后 21.6 MB / 2,556 文件（纯静态导出，**无 node_modules**，与 gh-pages 分支同源）
- 第 18 轮 dist 为 standalone 形态（93 MB 含 node_modules），自第 21 轮起由静态导出取代；standalone 可由 src 包 `bun run build` 复现
- 需要展开时：`unzip archives/xxx.zip -d build/`（或 `source/`）
- 本仓做滚动更新与如实记录；归档均附 `zipfile.testzip()` 完整性校验
- **第 25 轮起打包脚本支持分阶段执行（src → 重建 out → dist）**，保证 Pages 页脚内嵌 ZIP 与归档 src zip 同源同哈希（此前 dist 先于 public 同步构建，页脚包落后一轮）

## 第 25 轮要点（用户复核两弹驱动）

- **"剪切" content_cut 矢量图标路径还原**：此前为损坏手写路径（弧线端点/圆孔半径全错，渲染畸形）；还原为 Material Icons 原版，与同组复制/粘贴一致
- **7 种几何形变加载指示器画布清晰度修复**：撤销 2.5 DPR 上采样顶 → 真实 `devicePixelRatio × visualViewport` 捏合缩放逐帧重设后备缓冲（封顶 8 防病态值）；硬边贝塞尔剪影在浏览器缩放/捏合下不再比周围 SVG/文本发虚；大面积软边 WebGL 涟漪画布维持 2.5 封顶（差异不可见，既定性能口径）
- **导航抽屉纵向滚动锁定**：滚动容器补 `overflow-x hidden` + `touchAction: pan-y` + `overscrollBehavior: contain`（standard + modal 双处）；条目按钮去掉 `w-full`——100% 宽 + marginInline 12 曾撑出 12px 横向溢出（"能左右滑"真根因），现 `scrollWidth == clientWidth`、强制 scrollLeft 恒 0
- **底部导航/侧边轨/抽屉胶囊与角标锚定修复**：激活胶囊（56×32）、hover 层与角标改锚定到精确 24×24 图标盒——内联 svg 基线排版上浮 + "图标+文字"整组居中曾使胶囊对不准图标、角标贴不上图标顶角（"下方的字把位置挤上去"实错）；侧边轨补角标演示（首页 99+，折叠/展开两形制）
- **ThemeVariant 扩展为 styleList 全集**（+spritz/vibrant）：`buildM3Theme` 调色板 CoreSpec 逐值取自 AOSP-13 `ColorScheme.kt` L136-186（aosp-mirror 联网逐字核对：Spritz 12/8/16 中性 2/2 · Vibrant MaxOut(130)/旋转表 24/32 中性 10/12）；实验区变体选择器同步扩为 4 项
- **配色方案圆形预览 8 颗全部可点击应用**：点击 = 应用该风格（全站 themeVariant）+ 该行明暗模式（行 = 浅/深 preview、列 = 四风格，与 WallpaperPicker2「点选颜色选项 = 应用方案」一致）；选中外圈 = themeVariant × isDark 联合判定；四象限加同色 0.75 描边消除扇形共享边抗锯齿发丝缝
- 端到端实测：`tsc --noEmit` 零错误；浏览器断言——胶囊对中/角标贴角 ✓、抽屉横滑禁用（scrollWidth==clientWidth==360）✓、预览点击切风格+明暗+选择器联动 ✓、形变画布 48×dpr 重设 ✓、modal 抽屉 scrim+滑入 ✓；三 zip 同源同哈希（页脚 ZIP = 归档 src zip）

## 第 22-24 轮要点（承接）

- **对照页 404 根因修复**：iframe src / 页脚 zip href / @font-face URL 全部 basePath 感知（`NEXT_PUBLIC_BASE_PATH` 构建期内联）；本地 `/asset-drop/` 子路径模拟 Pages 复现-验证闭环
- **对照页运行时修复**：`official-md-ripple/vendor/` 内联 lit 3.3.2 全家，importmap 改指 `./vendor/*`，md-switch / md-ripple / md-filled-button 实测升级
- **switch 按压涟漪源码实证**：官方 md-ripple = 小球中心 40×40 圆形状态层（switch.js L116 · _handle.scss L134-140 · pressed 0.12），永不扩散过整条轨道——用户"小区域涟漪"观察获源码证实
- **涟漪滥用修正**：移植版开关撤无界光晕 → 官方同几何约束状态层（AOSP 星斑着色器 + maskRadii 圆形裁剪）
- **开关交互增强**（Web 增强项、官方无拖拽、如实注明）：按压 24→28dp + 1.05 微放大；左右拖拽（PointerCapture + rAF 命令式写 DOM）；松手自动吸附判定（越中点/甩动切换，否则 300ms 官方过冲缓动回弹）
- **页尾新增「关于本项目」三栏说明**（项目性质/溯源/分发）
- **第 24 轮全面自审加固**：派生 click 抑制窗口残留 / 拖拽 rAF 覆盖吸附落位 / pointercancel 语义 / 键盘 repeat / prefers-reduced-motion / WebGL2 不可用 CSS 兜底 / 移动端长按屏蔽 / 仓库卫生（5,366 产物文件出库）+ 打包自引用排除

## 线上预览

**https://ariefenv-hash.github.io/asset-drop/** （gh-pages 分支）
- 第 25 轮（含第 22-24 轮全部修复）已随本次推送同步上线：导航三件套锚定、抽屉纵向锁定、形变画布清晰度、配色预览四风格可点击应用均可在线验证

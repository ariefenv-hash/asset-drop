# asset-drop · 资源文件中转仓

独立新仓库，与 `ariefenv-hash/md3` 完全隔离；md3 本侧已停工，不再改动任何文件与分支。

## 已归档（第 24 轮 · 2026-11-22 滚动更新）

- `archives/aosp-ripple-port-web-src.zip` — AOSP 涟漪移植展示 **第 24 轮** Next.js 工程源码
- `archives/aosp-ripple-port-web-dist.zip` — 对应 **GitHub Pages 静态导出产物**（`NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop`，资源路径含 `/asset-drop` 前缀，解压即站点）

完整清单、sha256、dist 形态变化说明与评估报告对照见 **MANIFEST.md**。

## 说明

- `dist` 解压后 21.6 MB / 2,556 文件（纯静态导出，**无 node_modules**，与 gh-pages 分支同源）
- 第 18 轮 dist 为 standalone 形态（93 MB 含 node_modules），自第 21 轮起由静态导出取代；standalone 可由 src 包 `bun run build` 复现
- 需要展开时：`unzip archives/xxx.zip -d build/`（或 `source/`）
- 本仓做滚动更新与如实记录；归档均附 `zipfile.testzip()` 完整性校验

## 第 24 轮要点（全面自审驱动）

- **派生 click 吞掉标志残留修复**：pointercancel 结束拖拽后浏览器不派发 click，旧布尔标志残留会吞掉下一次正常点击（开关"点不动一次"）；改为 600ms 时间窗 + pointerdown 重置（实测 cancel 后紧接 click 正常切换）
- **拖拽 rAF 覆盖吸附落位修复**：pointerup/cancel 后残留的 applyDragPosition rAF 会在下一帧把小球拉回中途位置（快速拖拽+松手"卡在中途"实错根因）；释放/取消统一取消未决 rAF + pressedRef 守卫
- **pointercancel 语义修正**：由"当作松手做吸附判定"改为"手势中止"——回弹按压前状态、不派发 onChange、不设 click 抑制窗口（与原生开关语义一致）
- **键盘加固**：key repeat 不再重复生成涟漪 session；键盘涟漪生长点从轨道中心改为小球实际中心（状态层盒中心，与官方"涟漪生长于小球状态层"语义一致）；释放定时器收进卸载清理
- **prefers-reduced-motion**：撤位移/过冲动画与按压微放大，仅保留 67ms 颜色过渡（M3 无障碍基线）
- **WebGL2 不可用兜底**：官方 pressed-state-layer-opacity 0.12 的 CSS 状态层补位，几何与 WebGL 路径一致（40×40 圆、贴小球），消除"按下零反馈"降级死区
- **移动端长按体验**：屏蔽 contextmenu / 文本选择 / iOS 长按呼出气泡
- **仓库卫生**：.next 缓存/out/tmp/日志共 5,366 个产物文件移出 git 跟踪；.gitignore 系统化（.env* / .DS_Store / tool-results 等）
- **打包修正**：src zip 不再自引用内嵌的 public/aosp-ripple-port-src.zip（此前逐轮滚雪球，14.4MB → 修正后 7.5MB）
- 端到端实测：`tsc --noEmit` 零错误；Pages 子路径本地模拟（首页/对照页/zip/字体全 200）；浏览器断言——点击切换、双向拖拽吸附、欠中点回弹、快速甩动落位、pointercancel 中止回弹且不吞后续点击、Enter/Space 切换、iframe 内 md-switch 5/5 升级、深色模式与页尾三栏说明渲染，全部通过

## 第 22-23 轮要点（承接）

- **对照页 404 根因修复**：iframe src / 页脚 zip href / @font-face URL 全部 basePath 感知（`NEXT_PUBLIC_BASE_PATH` 构建期内联）；本地 `/asset-drop/` 子路径模拟 Pages 复现-验证闭环
- **对照页运行时修复**：`official-md-ripple/vendor/` 内联 lit 3.3.2 全家，importmap 改指 `./vendor/*`，md-switch / md-ripple / md-filled-button 实测升级
- **switch 按压涟漪源码实证**：官方 md-ripple = 小球中心 40×40 圆形状态层（switch.js L116 · _handle.scss L134-140 · pressed 0.12），永不扩散过整条轨道——用户"小区域涟漪"观察获源码证实
- **涟漪滥用修正**：移植版开关撤无界光晕 → 官方同几何约束状态层（AOSP 星斑着色器 + maskRadii 圆形裁剪）
- **开关交互增强**（Web 增强项、官方无拖拽、如实注明）：按压 24→28dp + 1.05 微放大；左右拖拽（PointerCapture + rAF 命令式写 DOM）；松手自动吸附判定（越中点/甩动切换，否则 300ms 官方过冲缓动回弹）
- **页尾新增「关于本项目」三栏说明**（项目性质/溯源/分发）
- **涟漪演示底色残留根修**：session 级定时器 Map + 多指按压记账 + 15s 自愈保险
- **字体混排双保险**：双 format 回退 + 3.9MB TTF preload

## 线上预览

**https://ariefenv-hash.github.io/asset-drop/** （gh-pages 分支）
- 第 24 轮（含第 22-23 轮全部修复）已随本次推送同步上线：对照页 / 页脚 ZIP / 官方 md-switch 对照可直接验证

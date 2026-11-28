# asset-drop → md3e-try · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**。
> **第 31 轮（2026-11-28）归档滚动更新（合并轮）**：拉平并行实例分叉——以对方已推树为基底逐文件三方合并，合并入本侧「Checkbox/Radio 官方动画（MDC-Android 1.14.0 ASLD/AVD + AppCompat animated-selector）+ 还原基准声明落库 + 全盘去网页版核查 + PWA 化（manifest/sw/图标）+ Google Sans Flex wdth=25 最窄字形图标」，对方第 29/30 轮工作全部保留（9 引擎重考据/细节动画三件套/可变字体 6 枚）。取代第 30 轮归档。
> **第 30 轮（2026-11-28）归档滚动更新**：细节动画三件套（SwipeRefresh 逐值移植 androidx SwipeRefreshLayout+CircularProgressDrawable / SpringLab 转译 androidx object Spring 劲度表 / CheckboxDraw 转译 MDC-Android AVD 三态动画，全部真实源码逐值取证）+ 可变字体多字体多轴化（4 英文 × 5 中文：新增 Roboto Flex 13 轴 / Recursive 5 轴 / Fraunces 4 轴 / MiSans VF / 资源圆体 CN VF 双轴子集内置；GSF opsz 考据修正 6→1–144）。取代第 29 轮归档。
> **第 29 轮（2026-11-28）归档滚动更新**：9 个 aosp 引擎文件全量重考据——反推值清零（SystemUI 时长 3000/750、最大扩散 0.725/0.68 均查无源码依据，按真实调用方取值表修正），核对一致项补真实文件+行号出处；仓库更名 asset-drop → **md3e-try**（Pages 前缀随构建变量切至 /md3e-try）。取代第 28 轮归档（第 18/21/23/24/25/26/27/28 轮历史数据见本文件后半与 git 历史）。
> **第 28 轮（2026-11-22）归档滚动更新**：开关小球勾叉字形修复（图标渲染器 inline style 压类名实根因 + 真机逐像素取证定档）+ 页尾新增「还原边界 · 使用须知」。
> **第 27 轮（2026-11-22）归档滚动更新**：在承接第 22-26 轮基础上，完成全站去 npm 化（运行时依赖收敛到 react/react-dom/next 三个；lucide-react 卸载 → Material Symbols 官方路径数据内联自研图标模块；shadcn/Radix/Prisma 死代码出库）。

## 一、两份原始归档（第 31 轮）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 12,232,891 B | `26af0313bc80b2b1396a6d880aef5230ae41062a6ff6a2ff9776064dfe8c687e` |
| `archives/aosp-ripple-port-web-dist.zip` | 21,131,636 B | `270eef5bc8d2efee21e32c342eb3f9654d1ee01a0af38fbd53dd75b4c570465a` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）；**三包同源同哈希**：dist 内嵌页脚 ZIP（`aosp-ripple-port-src.zip`）= 归档 src zip = `download/` 同名包（脚本断言校验）。第 31 轮 src 条目 2,600 = 本侧第 29 轮树 2,588 + 对方新增 12（三件套 demo×3 + springPresets + 字体×4 + evidence×4）；合并前从第 28 轮归档恢复 639 个被并行实例删减的对照区文件（official-md-ripple/pkg/ + tsconfig.check.json）。

## 〇0、第 31 轮（合并轮）：拉平并行分叉 + Checkbox/Radio 官方动画 + PWA 化（2026-11-28）

### A. 合并方法与落位（三方逐文件核对，双方工作零丢失）
- 真基线 = 第 28 轮归档（/tmp/zipsrc 解包，2577 文件）；对 14 个共同差异文件逐一
  三方哈希定位：7 个本侧未动 → 采用对方版本（4 引擎 + CurveAndMathPanel/
  InteractiveLab/VariableFontPlayground）；4 个对方未动 → 保留本侧版本
  （.gitignore / AospExpressiveSwitch / M3CoreComponentsGallery / tailwind.config）；
  3 处双改手工合并：globals.css = 对方 --vf-en 字体变量重构 + 本侧尾部 181 行
  Checkbox/Radio 动画节；layout.tsx = 对方 4 组 VF @font-face + MiSans 分片 link +
  本侧 PWA metadata/viewport/PwaRegister；App.tsx = 对方三件套挂载 + 修正记录表
  更新 + 本侧页尾还原基准声明文案。合并后 `tsc --noEmit` 零错误。
- **仓库级还原基准声明补齐**（用户第 29 轮指令，对方树未写入）：README.md 新增
  「还原基准声明（铁律 6）」章节 + PACKAGE-INFO.txt 首部声明段 + 页尾声明栏文案。

### B. Checkbox / Radio 官方动画（本侧第 29 轮，Android 17 取证链合并入树）
- Checkbox（MDC-Android 1.14.0 checkbox ASLD/AVD + motion tokens.xml）：入 = 盒/勾
  scale 0.6→1.0（350ms · emphasized-decelerate 0.1,0.7,0.1,1）+ fillAlpha 50ms
  linear + 勾 trimPathEnd 0→1（AOSP hwui VectorDrawable.cpp applyTrim 语义 =
  SkPathMeasure 部分轮廓 + fill 隐式闭合，Web 端 rAF 逐帧重写 path d）；出 =
  scale 1.0→0.6（150ms · emphasized-accelerate 0.3,0,0.8,0.2）+ 50ms 淡出；
  勾↔减号 = pathData 形变 350ms；初始渲染静置（对齐 animated-selector 初绑语义）
- Radio（M3 样式不覆写 android:button → 动画来自 AppCompat animated-selector/AVD）：
  off→on 498ms 三段（点 0→0→1.5→1.0 过冲 + 环 1→0.5→0.9→1.0 + 描边 2→18→2 脉冲，
  fos 0.4,0,0.2,1 / interp_0 0.4,0,0.4,1）；on→off 499ms 三段反向；几何闭环
  btn_radio_{on,off}_mtrl.xml（viewport 32 · r=9/stroke 2 · 点 r=5）；is-armed 门控
  修复加载误播闪点
- AospExpressiveSwitch 小球按压改 Android 双向 100ms standard、位移 250ms
  AccelerateDecelerate（摘除网页版独有过冲缓动 cubic-bezier(0.175,0.885,0.32,1.275)）
- 全盘"去网页版"核查（第 29 轮实测）：移植代码零 import/零实现引用、网页版独有
  键帧/类名 0 处

### C. PWA 化 + 图标（本侧第 29 轮，合并入树）
- manifest.webmanifest：全部相对 URL（./），md3e-try 子路径与根路径双形态自动正确
  （本地 /md3e-try/ 子路径模拟冒烟全 200 实测）；sw.js：scope 自解析，导航
  network-first + 离线回退缓存根，同源静态 SWR，跨源 CDN 不接管；PwaRegister.tsx
  仅生产注册；layout metadata = manifest + 图标组 + appleWebApp + themeColor 亮暗
- 图标：Google Sans Flex 最窄字形 **wdth=25**（fvar 轴最小值 25–151，instancer
  静态实例 wght=700·ROND=100·opsz=144）「M3」黑字白底 + 涟漪触点装饰；
  icon-512/192/32、maskable-512（安全区 161.9px ≤ 204.8px 断言）、apple-touch-180、
  favicon.ico(16/32/48)、icon.svg/favicon.svg 同源矢量重建（scripts/r29_pwa_icons.py）
- 端到端实测（合并树复跑）：tsc 零错误 · /md3e-try 前缀 NEXT_EXPORT 导出通过 ·
  子路径模拟冒烟 10/10 全 200（首页/manifest/sw/图标/对照区/字体/页脚包）·
  index.html 内联 /md3e-try/manifest.webmanifest ×2 · 三包同源同哈希 ✓

## 〇1、第 30 轮扩容（细节动画三件套 + 可变字体多字体多轴，2026-11-28）

### A. 细节动画三件套（真实源码逐值转译，组件头注与页内标注均落真实出处）
1. **SwipeRefreshDemo**：androidx-main `swiperefreshlayout` 联网取证——
   SwipeRefreshLayout.java（1454 行）：DRAG_RATE 0.5（L99）/ 触发线 64dp（L114）/
   圆径 40·56dp（L88/90）/ 起始透明度 76（L95）/ 回收 200ms（L109/111）/
   MAX_PROGRESS_ANGLE 0.8（L103）；同库 CircularProgressDrawable.java：
   1332ms 单周期扫掠（L109）/ 组旋转 216°（L112）/ 弧长 0.01-0.8 前后半
   FastOutSlowIn（L121-126 + applyTransformation L542-564）/ SHRINK@0.5 /
   CENTER_RADIUS 7.5·11 / STROKE 2.5·3 / ARROW 10×5·12×6 / COLORS={BLACK}。
   诚实边界：VelocityTracker 抛掷判速未移植、箭头 arrowScale 逐帧微调未复刻。
   本地浏览器实测：拖拽→64dp 触发→spinner→finishing→列表刷新全链路通。
2. **SpringLabDemo**：androidx compose `object Spring` 劲度/阻尼预设实验室——
   常量表 = VectorizedAnimationSpec.kt L835-880（High 10000/Medium 1500/MediumLow
   400/Low 200/VeryLow 50；HighBouncy 0.2/MediumBouncy 0.5/LowBouncy 0.75/
   NoBouncy 1；DefaultDisplacementThreshold 0.01），物理方程 = SpringSimulation.kt
   L62-68（accel = -k·x - c·v，c = 2·√k·ζ）。注意：androidx-main 已无 Spring.kt，
   object Spring 现居 VectorizedAnimationSpec.kt（JetBrains/androidx 镜像同构核验）。
3. **CheckboxDrawDemo**：MDC-Android 1.14.0 Checkbox 三态图标动画（AAR 离线解包
   取证）：勾形/横线/方块路径（values.xml string 原文）；unchecked→checked =
   scale 0.6→1 @350ms emphasizedDecelerate(0.1,0.7,0.1,1) + trimPathEnd 0→1；
   checked→unchecked = scale 1→0.6 @150ms emphasizedAccelerate(0.3,0,0.8,0.2) +
   fillAlpha 1→0 @50ms linear；半选 = pathData 形变 @350ms；时长 token
   short1=50/short3=150/medium3=350。缓动控制点自 values.xml dimen 逐值提取。

### B. 可变字体多字体多轴（VariableFontPlayground 重构，全部 fvar 实测）
- 英文 4 枚本地内置（google/fonts ofl 原文件）：GSF 5 轴（opsz 考据修正 6→1–144/def
  18）、Roboto Flex 13 轴、Recursive 5 轴（64 命名实例）、Fraunces 4 轴
  （wght def=max=900，官方默认即 Black）
- 中文 5 枚：文渊圆体/文渊宋体/思源宋体（zeoseven 414/415/285 原方案保留）、
  MiSans VF（小米官方 VF，jsDelivr npm misans@5.0.0 分片；wght 150-700(def 330)
  内部刻度如实标注）、资源圆体 CN VF（Resource Han Rounded CN VF v1.910，OFL；
  **wght 200-900 + ROND 0-100 双轴、33 命名实例**——本站第一枚多轴中文可变字体；
  65MB CFF2 原件 fontTools 子集化 3913 字形 → 2.4MB woff2 本地内置）
- 工程改动：layout.tsx +4 组 @font-face（轴范围 fvar 实测）+ MiSans 分片 link；
  globals.css 混排栈改 var(--vf-en) 前导；游乐场重构为英/中双排选择器 + 动态轴
  滑块 + wght 交集区间钳位 + 混搭预设 7 条 + 全站应用支持 --vf-en
- 考据排除记录：霞鹜文楷 v1.530 无 VF（fontsource axes=[] + GitHub release 逐一
  核实）；OPPO Sans VF 仅存于 ColorOS 系统内；阿里巴巴普惠体 3.0 仅静态字重
- 取证档案：evidence/round30-evidence.md（6 枚字体 fvar 逐轴 + 动画常量行号）

## 〇2、第 29 轮全量重考据（反推值清零）

**取证通道**：api.github.com contents/raw（MDC-Android 1.14.0 tag、androidx/androidx androidx-main、aosp-mirror/platform_frameworks_base main + blobless sparse clone 本地全仓 grep）；raw.github / googlesource / GitHub code search 通道不可用或不稳定，均如实留档。

### A. 核对后确认与真实源码逐位一致（未改动，头注补真实出处）

| 引擎文件 | 真实源码 | 结论 |
|---|---|---|
| materialShapes.ts | androidx/androidx `graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/`（Cubic.kt circularArc L339-368、RoundedPolygon.kt L566-580/L181-197、Shapes.kt L39-58/L136-168、Morph.kt match L215-296、FloatMapping.kt、FeatureMapping.kt L28-148、PolygonMeasure.kt segments=3；DistanceEpsilon=1e-4 / AngleEpsilon=1e-6 = Utils.kt L50-51） | 公式/阈值/算法逐位一致 |
| materialShapes.ts 七形 | MDC-Android 1.14.0 `MaterialShapes.java`（getSoftBurst L385-390 / getCookie9 L327-337 / getPentagon L259-262 / getPill L217-222 / getSunny L281-290 / getCookie4 L299-304 / getOval L204-213）+ `LoadingIndicatorDrawingDelegate.java` INDETERMINATE_SHAPES L134-143（顺序 SOFT_BURST→COOKIE_9→PENTAGON→PILL→SUNNY→COOKIE_4→OVAL，normalize 域 RectF(-1,-1,1,1)）+ `LoadingIndicatorAnimatorDelegate.java` L36 650ms / L39-40 旋转 50°+90° / L41-42 弹簧 200/0.6 | 顶点值/顺序/动画参数逐位一致（用户关心项） |
| RippleEngine.ts framework | `RippleAnimationSession.java` L42-47 + enter/exit 结构（0→0.5 FSOI / 0.5→1 LINEAR + delay=max(450-elapsed,0)）；`RippleComponent.java` getTargetRadius = hypot(w/2,h/2)；`RippleShader.java` setRadius×2.3 L139 / setResolution 2.1 L195 / 湍流全式 L157-183；`RippleDrawable.java` MAX_RIPPLES=10 L157 / DEFAULT_EFFECT_COLOR=0x8dffffff L159 | 逐位一致 |
| shaders.ts | framework AGSL = `RippleShader.java` SHADER_LIB；SystemUI AGSL = `RippleShader.kt` + `ShaderUtilLibrary.kt`（sparkles l=i*0.01/h=l+0.1、distort 8/1.641/5/2.14/0.00412/0.00215/0.8123/0.005931）+ `SdfShaderLibrary.kt`（circleRing 0.25、sdRoundedBox /size.y、sdEllipse Halley 3 迭代） | 逐字一致；0 尺寸守卫为 Web 防 NaN 适配（头注标注） |
| edgeStretch.ts | `EdgeEffect.java` L98-148 全部常量 + `StretchEffect.cpp` L188 INTERPOLATION_STRENGTH_VALUE=0.7 | 逐位一致 |
| spring.ts | compose material3 `StandardMotionTokens.kt` L28-29（1400/0.9）· `ExpressiveMotionTokens.kt` L28-29（800/0.6）· MDC `LoadingIndicatorAnimatorDelegate.java` L41-42（200/0.6） | 逐位一致 |
| monetStyleSpec.ts / dynamicColor.ts | ColorScheme.kt L136-186（第 25 轮已联网核对） | 未发现偏差 |

### B. 反推值修正（本轮实质变更）

1. **SystemUI 涟漪时长**：旧版自创 `3000ms`（命名 "DEFAULT_RIPPLE_EFFECT_DURATION"——AOSP main 分支全仓检索**无此常量**）与对照旧值 `750ms` 一并移除。真实取值表：`RippleView.kt` L46 duration 默认 = **1750ms**（充电涟漪 WiredChargingRippleController 未显式改 duration 即用此值）；媒体触控涟漪 `MediaControlViewBinder.kt` duration = **1500L**；解锁涟漪 `AuthRippleController.kt` L433 RIPPLE_ANIMATION_DURATION = **800ms**；`RippleAnimationConfig.duration` 默认 0 由调用方指定。RippleEngine.ts 以 AOSP_RIPPLE_VIEW_DURATION / AOSP_MEDIA_TOUCH_RIPPLE_DURATION / AOSP_AUTH_RIPPLE_DURATION 三常量落档（旧常量名保留为 @deprecated 别名），InteractiveLab 时长切换 UI 改为真实三档并标注出处。
2. **SystemUI 最大扩散尺寸**：旧版自创 `max(w,h)×0.725` 与 ellipse 固定系数 `0.68`（SystemUI 全仓检索均不存在）→ 按真实语义重写：最终尺寸由调用方经 `setMaxSize(maxWidth, maxHeight)` 显式传入（`RippleSize.update` 线性乘 progress），圆 = 充电涟漪直径 `max(w,h)×2`（`WiredChargingRippleController.layoutRipple`，终态半径 = max(w,h) 铺满屏幕）；box/椭圆 main 分支无 AOSP 调用方 → 演示按视图尺寸适配并如实标注「非源码直传」。
3. **shaders.ts 展示块归属修正**：uniform 映射（2.3/2.1/tCircle/tRotation）此前误挂 RippleAnimationSession.java 名下，现拆分标注到 RippleShader.java 对应行号（L138-140/L194-199/L157-183）。
4. **package.json**：devDependencies 补 `@types/node`（`tsc --noEmit` 全绿所需；bun.lock 同步）。

### C. 端到端自测（第 29 轮实测）

`bunx tsc --noEmit -p tsconfig.check.json` 零错误（补 @types/node 后）· `NEXT_EXPORT=1 NEXT_BASE_PATH=/md3e-try bunx next build` 通过 · 本地子路径模拟（127.0.0.1:8901/md3e-try/）Playwright 14/14 断言全过——旧切换文案（"Android 17 · 3000ms"/"旧版 A13/14 · 750ms"）0 残留、新三档真实时长切换可用、修正记录两行新偏差项可见、页脚常量行更新、LoadingIndicator 形变 d 与旋转逐帧实测动画中 · 页脚 ZIP 链接 200 且字节数 = 归档 src zip（7,483,644 B）· 控制台零错误 · 三包同源同哈希 ✓

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-28（**第 29 轮**）
- **基线**：AOSP main 分支（联网取证）· `@material/web 2.5.0`（pkg/ 原文内联运行）· MDC-Android 1.14.0（tag 联网逐值核对）· androidx graphics-shapes（androidx-main）· Monet CoreSpec = `packages/SystemUI/monet/ColorScheme.kt`（aosp-mirror android-13.0.0_r1，第 25 轮联网核对）
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 15 个组件文件（含自研图标模块 icons/）+ 官方对照 iframe（pkg/ 原文 + vendor/ lit 3.3.2）+ evidence/ 取证转储）
- **dist**：**`NEXT_EXPORT=1 NEXT_BASE_PATH=/md3e-try` 静态导出产物（GitHub Pages 直托形态）**，资源根路径已注入 `/md3e-try` 前缀（第 29 轮起随仓库更名切换）
- **第 29 轮变更（全量重考据：反推值清零）**：详见上文「〇、第 29 轮全量重考据」——SystemUI 时长 3000/750 → 真实取值表（1750/1500/800）；最大扩散 0.725/0.68 → setMaxSize 真实调用方语义；引擎头注全部落真实文件+行号；@types/node 补齐
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
| src | 2,600 文件 | 原始 ZIP 归档；**不再内嵌页脚源码包**（自引用排除，终止逐轮滚雪球） |
| dist | 2,557 文件 | 原始 ZIP 归档；内容即 gh-pages 全量（第 31 轮 ZIP 21,131,636 B，解压后约 31 MB，内嵌页脚 ZIP 与 src zip 同哈希；PWA 可安装） |

- **dist 形态变化说明**：第 18 轮 dist 为 `bun run build` 的 **standalone 产物**（93 MB / 4,553 文件，含 73 MB node_modules），仅适合容器内 `bun server.js` 运行，GitHub Pages 无法托管。第 21 轮起 dist 更换为 **`NEXT_EXPORT=1` 官方静态导出**（纯静态无 node_modules），与 gh-pages 分支同源同哈希路径规则，解压即站点（第 22-28 轮前缀 `/asset-drop`，第 29 轮起随仓库更名切至 `/md3e-try`）；standalone 形态可随时由 src 包复现。第 22 轮 dist 增至 11.5 MB，主因 `official-md-ripple/vendor/`（lit 3.3.2 运行时 7 包）首次随包分发。

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
md3e-try/（原 asset-drop）
├── archives/   # 两份原始 ZIP（第 26 轮）
├── inspect/    # 从 src ZIP 提取的关键文本（PACKAGE-INFO / 根配置 / 9 个 aosp 引擎）
├── MANIFEST.md
└── README.md
```

## 六、Pages 部署（gh-pages 分支）

- 站点：**https://ariefenv-hash.github.io/md3e-try/**（2026-11-28 随仓库更名迁移） · 数据源 `gh-pages / root` · legacy 模式
- 第 29 轮 gh-pages 为 `NEXT_BASE_PATH=/md3e-try` 全量重导出（与归档 dist zip 同源）
- **第 26 轮 gh-pages 更新**：由 `NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop` 从源码官方静态导出全量替换（2,556 文件 + `.nojekyll`），与 `archives/aosp-ripple-port-web-dist.zip` 同源；含第 22-26 轮全部修复（全站栅格化口径统一/开关状态层居中根修/第 25 轮导航锚定与四风格可点击/第 24 轮自审加固）
- **线上复测（2026-11-22，已推送 51be518 / 40c7151）**：首页 200 · `official-md-ripple/index.html` 200 · 页脚 ZIP 200 · GoogleSansFlex 字体 200；线上 HTML 核验为第 24 轮构建（iframe/zip 均带 `/asset-drop` 前缀）；对照页 md-switch 升级断言在沙盒无头浏览器中卡于 interactive，经三重判别（curl 全 200 / Python 12 线程并发拉全模块图 8.5s 全 200 / 同构建本地子路径模拟 5/5 升级）定论为沙盒浏览器到 github.io 的 TLS 连接不稳（同轮 git push 亦先报 GnuTLS -110 后 HTTP/1.1 重试成功），非部署缺陷
- **线上复测（2026-11-22，已推送 a19197e / c588315，第 28 轮）**：Pages status=built（legacy · gh-pages / root）；线上 index.html（337,901 B）的 11 个 _next 资源引用集合与本地第 28 轮构建完全一致（部署即本轮产物）；**新增页尾「还原边界 · 使用须知」关键文案线上可见**（三段探针全命中）；图标数据 chunk 53a7906935f94c18.js 线上与本地 sha256 逐字节一致（406fdb62…e4a48，默认 check/close 勾叉字形在线）；归档双 zip 经 contents API 元数据核验——src 7,455,172 B git-blob-sha1 `510d4178…17f2e1` ✓ · dist 11,597,032 B git-blob-sha1 `58835882…95e580f` ✓（与本地 git hash-object 双向一致）；网络抖动与令牌判读如实留档（clone 129s 超时/GnuTLS -110 重试成功；只读令牌 push 被拒后写令牌换用成功，均未落盘，临时克隆已删）
- **线上复测（2026-11-22，已推送 7ccc99b / eb4efff，第 27 轮）**：Pages status=built（legacy · gh-pages / root）；`/` 200 · `/official-md-ripple/index.html` 200；线上 index.html 的 8 个 _next chunk/css 路径集合与本地第 27 轮构建完全一致（部署即本轮产物），**线上已无 geist 任何残留**（next-font 摘除生效实证）；iframe/页脚 zip 引用均带 `/asset-drop` 前缀；归档双 zip 经 GitHub API raw 通道实测哈希——src 7,453,298 B sha256 `415d9c02…c449e` ✓ · dist 11,594,468 B sha256 `faae48c5…5b05` ✓（github.io 大文件直连沿用既定 TLS 不稳口径，API 通道互证）；令牌善后：一次性 URL 注入，临时克隆已删除，无 credential.helper 残留，令牌未写入任何项目文件
- **线上复测（2026-11-28，已推送 33a3fe6 / 309a88c，第 29 轮）**：Pages status=built（legacy · gh-pages / root）；`/md3e-try/` 200（338,526 B）· `/md3e-try/official-md-ripple/index.html` 200 · 页脚 ZIP 200（github.io 大文件直连沿既定 TLS 不稳口径，完整字节经 API 通道互证）；线上 index.html 的 6 个 _next chunk 路径集合与本地第 29 轮构建完全一致（含 toggle 文案 chunk `e43487d8…js` sha256 前缀逐位一致）——部署即本轮产物；线上 0 处 `/asset-drop/` 残留（21 处 `/md3e-try/_next` 引用全就位）；页尾「RIPPLEVIEW 默认 1750ms」/「SystemUI 最大扩散尺寸」/「WiredChargingRippleController」三探针全命中；归档双 zip 经 contents API 元数据核验——src 7,483,644 B git-blob-sha1 `dd841a89…` ✓ · dist 11,607,214 B git-blob-sha1 `f25a7f3f…` ✓（与本地 `git hash-object` 双向一致）
- **线上复测（2026-11-28，已推送 c2b6deb / a27aee1，第 31 轮）**：Pages status=built（legacy · gh-pages / root · 构建 commit=a27aee18）；`/md3e-try/` 200（345,052 B，与本地第 31 轮构建**逐字节一致**）· 线上 9 个 `_next` chunk/css 集合与本地构建一致 · manifest.webmanifest 200（index.html 内联 ×2）· sw.js 200（scope 自解析 + 离线回退，逐字节一致）· icons/icon-512.png（31,343 B）/ maskable-512.png / favicon.ico 200 · 对照区 200 · 页脚 ZIP 200（github.io 大文件直连 TLS 中断沿既定口径，字节经 contents API 互证——src 12,232,891 B git-blob-sha1 `6f38cb75…` ✓ · dist 21,131,636 B git-blob-sha1 `cb19ca13…` ✓ 与本地 `git hash-object` 双向一致）；页尾「还原基准声明」探针命中（线上=本地同文）；css chunk `55d8ed4a…` 逐字节一致且含 m3cb-/m3radio- 动画 keyframes 全组——**PWA 可安装形态与 Checkbox/Radio 官方动画上线**
- 第 31 轮推送即 27.5 清单全项执行（令牌到位后一次性完成 main + gh-pages + Pages + 复测 + 善后；过程见 WORKLOG 27.6 节）
- 第 22-23 轮修复版曾因令牌失效滞留本地（第 18 轮令牌已按约定用后撤销），本轮新令牌到位后 main + gh-pages 一次性推送
- 第 18 轮 gh-pages 为「standalone 产物静态化拼接」，存在预渲染 HTML 与客户端不一致导致的 React #418 hydration 警告与部分交互不完整；第 21 轮改为**官方 `output:"export"` 源码级导出**，预渲染即构建期产出、组件树与客户端 bundle 同源，该已知局限按导出机制预期消除（线上复测以 Pages 发布后无头访问为准）
- 资源路径 `/md3e-try/_next/...`（第 29 轮起；构建期注入，非拼接）；`.nojekyll` 保住 `_next/` 目录

## 七、第 18 轮归档留存记录（原样保留的溯源信息）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip`（第 18 轮） | 9,479,884 B | `41741d29b7c8184ddf94cd69801de591a5d56833d1b21b295320198f15af1445` |
| `archives/aosp-ripple-port-web-dist.zip`（第 18 轮） | 33,994,730 B | `38f5644769d80337355416e8501f4be452de0c94694bc09c152ac19dfca67a61` |

- 第 18 轮 gh-pages 提交 `eda2f02`（3,223 文件）；已被第 21 轮导出全量替换
- 第 18 轮取证通道矩阵：`raw.github` / `api.github` / WebFetch / `dl.google.com` AAR 可用；`googlesource` 阻断；第 21 轮新增 codeload tarball（通道 F）与 jsdelivr 双 CDN（通道 G）定论

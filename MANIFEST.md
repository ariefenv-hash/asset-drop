# asset-drop · 资源清单

> 本仓为**资源中转仓**，与 `ariefenv-hash/md3` 完全隔离。md3 本侧已停工。
> 归档内容**原样保留、未做任何修改**；平台上传时后缀被改成 `.txt`，本仓已改回 `.zip`。

## 一、两份原始归档（字节级一致）

| 文件 | 大小 | sha256 |
|---|---|---|
| `archives/aosp-ripple-port-web-src.zip` | 9,479,884 B | `41741d29b7c8184ddf94cd69801de591a5d56833d1b21b295320198f15af1445` |
| `archives/aosp-ripple-port-web-dist.zip` | 33,994,730 B | `38f5644769d80337355416e8501f4be452de0c94694bc09c152ac19dfca67a61` |

两份均通过 `zipfile.testzip()` 完整性校验（无损坏条目）。

## 二、内容概览（来自 PACKAGE-INFO.txt）

- **构建时间**：2026-11-22 00:43（**第 18 轮**）
- **基线**：AOSP Android 17 `android-17.0.0_r1` · `@material/web 2.5.0` · MDC-Android 1.14.0
- **src**：Next.js 预览工程源码（9 个 aosp 引擎文件 + 20+ 组件 + 官方对照 iframe + 内嵌源码包）
- **dist**：`bun run build` 的 **Next.js standalone** 产物，`NODE_ENV=production bun server.js` 即起
- **第 18 轮变更**：横向拉伸 Overscroll 右缘锚点修复、移动端 flex-col 溢出修复、补齐 12 类 M3 组件（Badges/Checkbox/Radio/Chips/Snackbar/Tabs/Cards/Dialogs/Divider/Menus/Tooltips/Text fields）、诚实缺口清单（App bars/Navigation/Sheets/Search/Carousel/Date & time pickers 暂缓）
- **取证通道矩阵**：`raw.github` / `api.github` / WebFetch / `dl.google.com` 官方 AAR 可用；`googlesource` 阻断（与本侧 403 实测一致）

## 三、体积与归档取舍（如实说明）

| 包 | ZIP 内条目 | 解压后体积 | 处理 |
|---|---|---|---|
| src | 2,271 文件 | 18,772,993 B | 原始 ZIP 归档 + `inspect/` 提取 14 个关键文本 |
| dist | 4,553 文件 | 93,166,144 B | **仅原始 ZIP 归档**，未展开 |

`dist` 解压后含 **2,251 个 `node_modules` 条目 / 73.1 MB**（含两份 16 MB 的 `libvips-cpp.so` 与 9 MB `typescript.js`）。
全量展开会污染中转仓且本侧沙箱对小文件批量写入不稳，故保留 ZIP 原貌；需要时本地解压即可：

```bash
unzip archives/aosp-ripple-port-web-dist.zip -d build/
cd build/aosp-ripple-port-web-dist/standalone
NODE_ENV=production bun server.js
```

`src` 同理：`unzip archives/aosp-ripple-port-web-src.zip -d source/`

## 四、与 GLM 评估报告的静态对照（只核不改）

评估报告对象为 **Vite + React 版** `aosp-ripple-port-src.zip`（1.9 MB / 28 文件）；本仓是**后续第 18 轮 Next.js 版**，不是同一份。
纯文本静态核验（未安装依赖、未构建、未运行）：

| 报告第七章缺陷 | 本版状态 |
|---|---|
| 高 · esbuild ^0.25 撞 vite 8.3 peer | ✅ 已消失（改 Next.js 16 + `bun.lock`，无 esbuild/vite 声明） |
| 中 · 页脚两个 ZIP 链接 404 | 🔶 `aosp-ripple-port-src.zip` 仍在（内嵌源码包），`dist.zip` 已移除 |
| 中 · SystemUI 750ms 旧值 | 🔶 `750` 与 `3000` **同时出现**，需看具体上下文确认是否参数化/标注版本，本侧未下结论 |
| 低 · AI Studio 模板残留 | ✅ `metadata.json` / `.env.example` / `vite.config.ts` / `react-example` 均已清 |
| 低 · 字体双份 | ✅ 仅 `public/fonts/GoogleSansFlex.ttf` 一份 |
| 低 · 自创参数未标注 | 🔶 `hypot*1.65` / `densityScale` 仍在源码中，是否已在界面注明未核 |

**新观察（非报告内容）**：工程名仍为模板名 `nextjs_tailwind_shadcn_ts`；依赖里带整包 shadcn/Radix（30+）、Prisma、`next-auth`、`z-ai-web-dev-sdk` 等演示无关项；aosp 引擎由 8 个增至 9 个，新增 `edgeStretch.ts` / `globalStretch.ts`（对应 Overscroll 修复），`public/official-md-ripple/` 2,170 个文件为官方 `@material/web` 同台对照资源。

> 以上均为**静态读包结论**，没有安装、构建、真机验证，也没有修改任何一行源码。

## 五、目录

```
asset-drop/
├── archives/   # 两份原始 ZIP（去 .txt 后原样）
├── inspect/    # 从 src ZIP 提取的关键文本（PACKAGE-INFO / 根配置 / 9 个 aosp 引擎）
├── MANIFEST.md
└── README.md
```

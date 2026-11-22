# asset-drop · 资源文件中转仓

独立新仓库，与 `ariefenv-hash/md3` 完全隔离；md3 本侧已停工，不再改动任何文件与分支。

## 已归档

- `archives/aosp-ripple-port-web-src.zip` — AOSP 涟漪移植展示 **第 18 轮** Next.js 工程源码
- `archives/aosp-ripple-port-web-dist.zip` — 对应 standalone 生产构建产物

平台上传时被改成 `.txt` 后缀，本仓已改回 `.zip`，**字节级未改动**。
完整清单、sha256、体积取舍与「与 GLM 评估报告的静态对照」见 **MANIFEST.md**。

## 说明

- `dist` 解压后 93 MB / 4,553 文件（含 73 MB node_modules），故只保留原始 ZIP，未展开
- 需要展开时：`unzip archives/xxx.zip -d build/`（或 `source/`）
- 本仓只做中转，不修改资源内容；如需精简版、分版本目录或转私有，告诉我即可

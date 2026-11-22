import type { NextConfig } from "next";

/**
 * 构建模式开关（GitHub Pages 分发用，第 21 条任务清单）：
 *  · 默认（无环境变量）→ output: "standalone"，供预览服务器容器运行；
 *  · NEXT_EXPORT=1 → output: "export"，静态导出 out/ 供 GitHub Pages 纯静态托管，
 *    /api 路由以 force-static 预渲染；images 关闭优化（导出模式必需）；
 *  · NEXT_BASE_PATH=/repo → 部署到 username.github.io/<repo>/ 子路径时注入
 *    basePath + assetPrefix（若 Pages 仓库本身是用户站点根仓库则留空）。
 *  两种模式共用同一套源码与构建管线，切换只影响产物形态，不影响组件实现。
 */
const isExport = process.env.NEXT_EXPORT === "1";
const basePath = process.env.NEXT_BASE_PATH || "";

const nextConfig: NextConfig = {
  // 第 22 轮修复：把 basePath 以 NEXT_PUBLIC_ 前缀内联进客户端/服务端 bundle，
  // 组件里的公共资源引用（iframe、zip、@font-face）按部署形态取正确前缀——
  // 此前硬编码绝对路径在 GitHub Pages /asset-drop/ 子路径下全部 404。
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isExport
    ? {
        output: "export" as const,
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
        images: { unoptimized: true },
      }
    : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;

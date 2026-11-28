/*
 * AOSP Ripple Port · PWA Service Worker（第 29 轮）
 * ============================================================
 * 设计约束：
 *  · basePath 无关——本文件同时服务两种分发形态：
 *      standalone 预览（站点在根路径，SW 位于 /sw.js，scope = /）
 *      GitHub Pages 静态导出（NEXT_EXPORT=1 NEXT_BASE_PATH=/asset-drop，
 *      SW 位于 /asset-drop/sw.js，scope = /asset-drop/）
 *    因此所有缓存键一律基于 self.registration.scope 解析相对路径，
 *    不硬编码任何绝对前缀。
 *  · 策略：
 *      导航请求（HTML）→ network-first（离线时回退 precache 的 scope 根）；
 *      同源静态资源（_next 静态、fonts、icons、官方对照页等）→
 *        stale-while-revalidate（先缓存后后台更新）；
 *      跨源请求（zeoseven 字体 CDN 等）→ 不缓存（保持浏览器默认行为，
 *        避免缓存第三方分片字体造成配额浪费）。
 *  · 版本：CACHE_VERSION 变更即整缓存重建（activate 时清理旧版本）。
 */
const CACHE_VERSION = 'aosp-ripple-port-r29';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // 以 SW scope 为基准解析站点根（两种分发形态自动适配）
      const rootUrl = new URL('./', self.registration.scope);
      const cache = await caches.open(CACHE_VERSION);
      try {
        const resp = await fetch(rootUrl.href, { cache: 'no-cache' });
        if (resp.ok) await cache.put(rootUrl.href, resp.clone());
      } catch (e) {
        // 首次安装离线：跳过 precache，运行时按需填充
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CACHE_VERSION]);
      const names = await caches.keys();
      await Promise.all(names.map((n) => (keep.has(n) ? null : caches.delete(n))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const scopeUrl = new URL(self.registration.scope);
  const sameScope = url.origin === scopeUrl.origin && url.pathname.startsWith(scopeUrl.pathname);
  if (!sameScope) return; // 跨源（字体 CDN 等）不接管

  // 导航请求：network-first，离线回退缓存根
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        try {
          const resp = await fetch(req);
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        } catch (e) {
          const rootUrl = new URL('./', self.registration.scope);
          return (
            (await cache.match(req)) ||
            (await cache.match(rootUrl.href)) ||
            new Response('offline', { status: 503, statusText: 'offline' })
          );
        }
      })()
    );
    return;
  }

  // 同源静态资源：stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((resp) => {
          if (resp.ok) cache.put(req, resp.clone());
          return resp;
        })
        .catch(() => undefined);
      return cached || (await network) || new Response('offline', { status: 503, statusText: 'offline' });
    })()
  );
});

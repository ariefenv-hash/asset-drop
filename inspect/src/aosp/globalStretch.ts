"use client";
/**
 * 全站边界拉伸 Overscroll（Stretch Edge Effect）—— Android 12+ 拉伸过滚应用到全站主滚动
 * （文档根滚动容器）。Android 17 (android-17.0.0_r1) framework/hwui 源码语义，与
 * StretchOverscrollDemo 共用 src/aosp/edgeStretch.ts 引擎（常量/弹簧/阻尼向量逐行对齐
 * EdgeEffect.java，见该文件头注释行号）。
 *
 * 【为什么需要全局拦截（用户指令：Windows Edge 等浏览器默认滑动动画必须阻拦）】
 *  - Chromium/Edge 在滚动到边界时会播放原生过滚动画（glow/回弹）与滚动链；
 *  - Edge 在快速滚轮/触摸后还有惯性动量轮事件与平滑滚动，会在我们拉伸时叠加原生位移，
 *    导致拉伸"只在容器里生效"或直接被原生动画盖住；
 *  - 因此：html/body 设 `overscroll-behavior-y: none`（阻断原生过滚与 pull-to-refresh），
 *    wheel/touchmove 非 passive 监听，在边界且越界方向时 preventDefault，把越界量交给
 *    EdgeEffect.onPullDistance（L426-443）；非边界时完全不干预原生滚动。
 *
 * 【全局形变目标】
 *  App.tsx 用返回的 ref 挂到全站内容包裹层（main+footer；sticky header 在形变层外——
 *  Android 语义：AppBar 不参与拉伸，若 header 在层内会被 scale 推离视口顶）。AmbientBackdrop 的
 *  fixed 背景层通过 portal 渲染在该包裹层之外（Android 语义：拉伸的是滚动视图，壁纸
 *  不参与拉伸；同时避免 transform 破坏 position:fixed）。
 *
 * 【边界判定与事件语义】
 *  - wheel：scrollY≤0 且 deltaY<0（顶部外拉）或 scrollY+innerHeight≥scrollHeight 且
 *    deltaY>0（底部外拉）→ preventDefault + onPullDistance(|delta|)；其余情况不拦截。
 *    Edge/Chrome 的动量轮事件会在边界持续触发 → 持续供 pull（与真机"持续按住拉伸"
 *    观感一致）；停止 120ms 后 onRelease（L465-482，Web 适配——源码 onRelease 由
 *    触摸抬起触发，滚轮无对应事件）。
 *  - touchmove：同判据，preventDefault + onPullDistance；手指中段滚到边界后继续拖动
 *    的第一个事件会把整段 delta 交给 pull（原生滚动此时已被 overscroll-behavior 压住，
 *    无叠加动画），与真机残差语义的偏差为 Web 适配，已声明。
 *  - touchend：拉伸中松手且有向外速度（≥100px/s）→ onAbsorb(|v|)（L495-499，×13）；
 *    否则 onRelease 走 updateSpring 解析弹簧（L749-798，ω=24.657、ζ=0.98）。
 *  - 事件冒泡护栏：目标位于 [data-stretch-local]（演示卡自管容器）内时不处理，避免
 *    演示卡与全局双重拉伸；目标位于还能在该方向继续滚动的嵌套滚动容器（代码面板、
 *    内部列表等 overflow auto/scroll）内时也不处理——Android 嵌套滚动语义：子视图
 *    先消费，子视图到界后剩余量才交给父视图（此时才进入拉伸路径）。
 *
 * 【诚实声明】
 *  - 键盘（PageDown/Space）与滚动条拖拽不产生边界事件，不走拉伸（未拦截）；
 *  - 触摸中段到边界的整段 delta 归入 pull（见上）；
 *  - prefers-reduced-motion → 效果禁用（对应源码 animators disabled → TYPE_NONE）；
 *  - 水平方向：文档根无水平滚动，全局只做垂直（水平演示见 StretchOverscrollDemo）。
 */
import { useCallback, useEffect, useRef } from 'react';
import { EdgeStretchEffect, stretchScaleFor } from './edgeStretch';

const WHEEL_SETTLE_MS = 120; // 滚轮空闲 → onRelease（Web 适配，与演示卡一致）
const MIN_ABSORB_VELOCITY = 100; // px/s，低于此速度松手走 onRelease 弹簧

/** 挂到全站内容包裹层的 ref；返回值同时完成监听与形变写入 */
export function useGlobalStretchOverscroll(): (node: HTMLElement | null) => void {
  const targetRef = useRef<HTMLElement | null>(null);

  const setStretchTarget = useCallback((node: HTMLElement | null) => {
    targetRef.current = node;
  }, []);

  useEffect(() => {
    const doc = document.documentElement;
    const target = targetRef.current;
    if (!target) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 阻断 Chromium/Edge 原生过滚动画、滚动链与 pull-to-refresh（用户明确要求）
    const prevHtmlOverscroll = doc.style.overscrollBehaviorY;
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
    doc.style.overscrollBehaviorY = 'none';
    document.body.style.overscrollBehaviorY = 'none';

    // 每条边一个 EdgeEffect 实例（对齐 ScrollView 顶/底两实例语义）
    const top = new EdgeStretchEffect('start');
    const bottom = new EdgeStretchEffect('end');

    const setSize = () => {
      top.size = Math.max(1, window.innerHeight);
      bottom.size = top.size;
    };
    setSize();

    let raf: number | null = null;
    let lastTick = performance.now();
    let wheelTimer: number | null = null;
    let touchLastY: number | null = null;
    let touchVelY = 0; // 手指速度 px/s（正 = 手指向下）
    let touchLastT = 0;

    const atTop = () => window.scrollY <= 0;
    const atBottom = () =>
      window.scrollY + window.innerHeight >= doc.scrollHeight - 1;

    const applyTransform = () => {
      const el = targetRef.current;
      if (!el) return;
      const o = top.stretchVec + bottom.stretchVec; // 单边恒正语义，仅一条边非零
      if (o > 0) {
        el.style.transformOrigin = '50% 0';
        el.style.transform = `scale3d(1, ${stretchScaleFor(o)}, 1)`;
      } else if (o < 0) {
        el.style.transformOrigin = '50% 100%';
        el.style.transform = `scale3d(1, ${stretchScaleFor(o)}, 1)`;
      } else {
        el.style.transform = '';
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - lastTick) / 1000));
      lastTick = now;
      top.tick(now);
      bottom.tick(now);
      applyTransform();
      raf = top.active || bottom.active ? requestAnimationFrame(tick) : null;
    };
    const ensureRaf = () => {
      if (raf == null) {
        lastTick = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const inScopedContainer = (t: EventTarget | null): boolean =>
      t instanceof Element && t.closest('[data-stretch-local]') != null;

    /**
     * 嵌套滚动护栏：从 target 向上找第一个“还能消费该方向 delta”的滚动容器。
     * 返回 null = 没有可消费的子容器（或子容器已到界）→ 允许全局拉伸接管。
     * 对齐 Android nested scrolling：子视图先消费，到界后剩余量交给父视图。
     */
    const inConsumableScroller = (t: EventTarget | null, deltaDown: boolean): boolean => {
      // 从 target 自身开始（真实滚轮事件的 target 可能就是滚动容器本身，
      // 例如光标落在 pre 的内边距区域时）
      let n = t instanceof Element ? t : null;
      while (n != null && n !== document.body && n !== doc) {
        if (n instanceof HTMLElement) {
          const oy = getComputedStyle(n).overflowY;
          if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
            const canDown = n.scrollTop + n.clientHeight < n.scrollHeight - 1;
            const canUp = n.scrollTop > 0;
            if (deltaDown ? canDown : canUp) return true;
          }
        }
        n = n.parentElement;
      }
      return false;
    };

    /* ---------- 滚轮：边界 + 越界方向 → preventDefault + pull ---------- */
    const onWheel = (e: WheelEvent) => {
      if (inScopedContainer(e.target)) return; // 演示卡自管
      if (reducedMotion) return;
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= window.innerHeight;
      if (delta === 0) return;
      const now = performance.now();
      // 嵌套滚动护栏：子滚动容器还能消费该方向 delta → 完全不干预
      if (inConsumableScroller(e.target, delta > 0)) return;
      if (delta < 0 && atTop()) {
        e.preventDefault();
        top.onPullDistance(-delta, now);
        bottom.onRelease(now);
        ensureRaf();
      } else if (delta > 0 && atBottom()) {
        e.preventDefault();
        bottom.onPullDistance(delta, now);
        top.onRelease(now);
        ensureRaf();
      } else {
        return; // 非边界：完全不干预原生滚动
      }
      if (wheelTimer != null) window.clearTimeout(wheelTimer);
      wheelTimer = window.setTimeout(() => {
        const n = performance.now();
        top.onRelease(n);
        bottom.onRelease(n);
        ensureRaf();
      }, WHEEL_SETTLE_MS);
    };

    /* ---------- 触摸：边界 + 越界方向 → preventDefault + pull ---------- */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchLastY = e.touches[0].clientY;
      touchLastT = performance.now();
      touchVelY = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchLastY == null || reducedMotion || inScopedContainer(e.target)) return;
      if (e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - touchLastY; // 手指向下 = dy>0 → 顶部外拉
      const now = performance.now();
      const dt = Math.max(1, now - touchLastT);
      touchVelY = touchVelY * 0.8 + (dy / dt) * 1000 * 0.2; // EMA 平滑
      touchLastY = y;
      touchLastT = now;
      // 嵌套滚动护栏（触摸）：子滚动容器还能消费 → 不拦截，交给原生滚动
      if (inConsumableScroller(e.target, dy < 0)) return;
      if (dy > 0 && atTop()) {
        e.preventDefault();
        top.onPullDistance(dy, now);
        bottom.onRelease(now);
        ensureRaf();
      } else if (dy < 0 && atBottom()) {
        e.preventDefault();
        bottom.onPullDistance(-dy, now);
        top.onRelease(now);
        ensureRaf();
      }
    };
    const onTouchEnd = () => {
      if (touchLastY == null) return;
      touchLastY = null;
      const now = performance.now();
      if (atTop()) {
        if (touchVelY > MIN_ABSORB_VELOCITY) top.onAbsorb(touchVelY, now);
        else top.onRelease(now);
      }
      if (atBottom()) {
        if (touchVelY < -MIN_ABSORB_VELOCITY) bottom.onAbsorb(-touchVelY, now);
        else bottom.onRelease(now);
      }
      ensureRaf();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('resize', setSize);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', setSize);
      if (wheelTimer != null) window.clearTimeout(wheelTimer);
      if (raf != null) cancelAnimationFrame(raf);
      doc.style.overscrollBehaviorY = prevHtmlOverscroll;
      document.body.style.overscrollBehaviorY = prevBodyOverscroll;
    };
  }, []);

  return setStretchTarget;
}

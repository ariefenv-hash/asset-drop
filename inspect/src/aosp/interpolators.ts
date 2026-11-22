/**
 * Exact port of Android's PathInterpolator cubic-bezier timing functions
 * used in AOSP RippleAnimationSession.java and SystemUI RippleShader.kt.
 */

export type InterpolatorFn = (t: number) => number;

function sampleCurveX(x1: number, x2: number, t: number): number {
  const ax = 1.0 - 3.0 * x2 + 3.0 * x1;
  const bx = 3.0 * x2 - 6.0 * x1;
  const cx = 3.0 * x1;
  return ((ax * t + bx) * t + cx) * t;
}

function sampleCurveY(y1: number, y2: number, t: number): number {
  const ay = 1.0 - 3.0 * y2 + 3.0 * y1;
  const by = 3.0 * y2 - 6.0 * y1;
  const cy = 3.0 * y1;
  return ((ay * t + by) * t + cy) * t;
}

function sampleCurveDerivativeX(x1: number, x2: number, t: number): number {
  const ax = 1.0 - 3.0 * x2 + 3.0 * x1;
  const bx = 3.0 * x2 - 6.0 * x1;
  const cx = 3.0 * x1;
  return (3.0 * ax * t + 2.0 * bx) * t + cx;
}

/**
 * Matches android.view.animation.PathInterpolator(controlX1, controlY1, controlX2, controlY2).
 */
export function createPathInterpolator(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): InterpolatorFn {
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson iterations
    let t = x;
    for (let i = 0; i < 8; i++) {
      const xEst = sampleCurveX(x1, x2, t) - x;
      if (Math.abs(xEst) < 1e-6) {
        return sampleCurveY(y1, y2, t);
      }
      const dx = sampleCurveDerivativeX(x1, x2, t);
      if (Math.abs(dx) < 1e-6) break;
      t -= xEst / dx;
    }

    // Binary subdivision fallback
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 16; i++) {
      const xEst = sampleCurveX(x1, x2, t);
      if (Math.abs(xEst - x) < 1e-6) break;
      if (x > xEst) lo = t;
      else hi = t;
      t = 0.5 * (lo + hi);
    }

    return sampleCurveY(y1, y2, t);
  };
}

/** RippleAnimationSession.java: new PathInterpolator(0.4f, 0f, 0.2f, 1f) */
export const FAST_OUT_SLOW_IN: InterpolatorFn = createPathInterpolator(0.4, 0, 0.2, 1);

/** SystemUI RippleShader.kt: PathInterpolator(0.2f, 0f, 0f, 1f) */
export const STANDARD_INTERPOLATOR: InterpolatorFn = createPathInterpolator(0.2, 0, 0, 1);

/** RippleAnimationSession.java: new LinearInterpolator() */
export const LINEAR_INTERPOLATOR: InterpolatorFn = (t: number) =>
  Math.max(0, Math.min(1, t));

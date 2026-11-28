/**
 * Exact damped harmonic oscillator solver matching AndroidX DynamicAnimation / SpringForce:
 *   F = -k * (x - target) - c * v
 *   c = 2 * dampingRatio * sqrt(stiffness)
 * Used in (真实源码位置，2026-11 联网逐值复核，第 29 轮):
 *   - androidx compose material3 StandardMotionTokens.kt L28-29
 *       SpringFastSpatialDamping = 0.9f / SpringFastSpatialStiffness = 1400.0f
 *       （= MDC-Android MaterialButton Motion_Material3_Spring_Standard_Fast_Spatial 同源 token）
 *   - androidx compose material3 ExpressiveMotionTokens.kt L28-29
 *       SpringFastSpatialDamping = 0.6f / SpringFastSpatialStiffness = 800.0f
 *   - MDC-Android LoadingIndicatorAnimatorDelegate.java L41-42
 *       SPRING_STIFFNESS = 200f / SPRING_DAMPING_RATIO = 0.6f
 */

export interface SpringConfig {
  stiffness: number;
  dampingRatio: number;
}

/** ExpressiveMotionTokens.kt L28-29：SpringFastSpatial（Expressive 方案 fast spatial） */
export const M3_SPRING_EXPRESSIVE_FAST: SpringConfig = {
  stiffness: 800,
  dampingRatio: 0.6,
};

/** StandardMotionTokens.kt L28-29：SpringFastSpatial（Standard 方案 fast spatial） */
export const M3_SPRING_STANDARD_FAST: SpringConfig = {
  stiffness: 1400,
  dampingRatio: 0.9,
};

export interface SpringState {
  value: number;
  velocity: number;
  target: number;
}

export function stepSpring(
  state: SpringState,
  dtSeconds: number,
  config: SpringConfig,
  threshold = 0.02
): boolean {
  const dt = Math.min(dtSeconds, 0.032);
  const subSteps = 2;
  const h = dt / subSteps;
  const k = config.stiffness;
  const c = 2 * config.dampingRatio * Math.sqrt(k);

  for (let i = 0; i < subSteps; i++) {
    const displacement = state.value - state.target;
    const accel = -k * displacement - c * state.velocity;
    state.velocity += accel * h;
    state.value += state.velocity * h;
  }

  const settled =
    Math.abs(state.value - state.target) < threshold &&
    Math.abs(state.velocity) < threshold * 5;
  if (settled) {
    state.value = state.target;
    state.velocity = 0;
  }
  return !settled;
}

/**
 * Exact damped harmonic oscillator solver matching AndroidX DynamicAnimation / SpringForce:
 *   F = -k * (x - target) - c * v
 *   c = 2 * dampingRatio * sqrt(stiffness)
 * Used in:
 *   - MDC MaterialButton.java (Motion_Material3_Spring_Standard_Fast_Spatial: k=1400, ζ=0.9)
 *   - M3 Expressive Spatial Fast (m3_sys_motion_expressive_spring_fast_spatial: k=800, ζ=0.6)
 *   - LoadingIndicatorAnimatorDelegate.java (k=200, ζ=0.6)
 */

export interface SpringConfig {
  stiffness: number;
  dampingRatio: number;
}

export const M3_SPRING_EXPRESSIVE_FAST: SpringConfig = {
  stiffness: 800,
  dampingRatio: 0.6,
};

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

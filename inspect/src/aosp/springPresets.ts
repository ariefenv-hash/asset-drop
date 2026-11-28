/**
 * androidx.compose.animation.core `object Spring` 劲度/阻尼预设（真实源码转译，第 30 轮）
 * ============================================================
 * 【真实源码位置】androidx/androidx（androidx-main 分支）：
 *   compose/animation/animation-core/src/commonMain/kotlin/androidx/compose/animation/core/
 *   VectorizedAnimationSpec.kt L835-880 —— `public object Spring` 全部常量逐值核对
 *   （2026-11 联网取证，api.github.com contents/raw 通道）。
 *
 * 【逐值清单】（= 源码原文）
 *   StiffnessHigh            = 10_000f   L838
 *   StiffnessMedium          = 1500f     L843（spring() 默认劲度，AnimationSpec.kt L187）
 *   StiffnessMediumLow       = 400f      L848（enter/exit 过渡弹簧默认劲度）
 *   StiffnessLow             = 200f      L852
 *   StiffnessVeryLow         = 50f       L856
 *   DampingRatioHighBouncy   = 0.2f      L860
 *   DampingRatioMediumBouncy = 0.5f      L868（spring() 默认阻尼，AnimationSpec.kt L186）
 *   DampingRatioLowBouncy    = 0.75f     L876
 *   DampingRatioNoBouncy     = 1f        L884（临界阻尼，spring() 默认）
 *   DefaultDisplacementThreshold = 0.01f L888（物理动画舍入截止阈值）
 *
 * 【物理方程】SpringSimulation.kt L62-68（androidx-main）：
 *   naturalFreq = sqrt(stiffness)；k = naturalFreq²；c = 2 * naturalFreq * dampingRatio
 *   acceleration = -k * displacement - c * velocity
 *   与本目录 spring.ts 的 stepSpring（F = -k·x - c·v, c = 2·ζ·√k）为同一方程。
 *
 * 【SpringSimulation.kt L57】默认 naturalFreq = sqrt(StiffnessVeryLow)，
 *   默认 dampingRatio = DampingRatioNoBouncy（L76）——即 SpringSimulation 单独使用时
 *   未配置即为「极软无弹」弹簧，这是 Compose 文档长期让开发者困惑的取值，如实转译。
 */

/** VectorizedAnimationSpec.kt L835-880 `object Spring` 常量表（真实取值） */
export const ANDROIDX_SPRING = {
  StiffnessHigh: 10_000,
  StiffnessMedium: 1500,
  StiffnessMediumLow: 400,
  StiffnessLow: 200,
  StiffnessVeryLow: 50,
  DampingRatioHighBouncy: 0.2,
  DampingRatioMediumBouncy: 0.5,
  DampingRatioLowBouncy: 0.75,
  DampingRatioNoBouncy: 1,
  DefaultDisplacementThreshold: 0.01,
} as const;

/** 劲度预设下拉（真实源码顺序） */
export const STIFFNESS_PRESETS: { label: string; value: number; note: string }[] = [
  { label: 'High · 10000', value: ANDROIDX_SPRING.StiffnessHigh, note: '极硬弹簧 L838' },
  { label: 'Medium · 1500', value: ANDROIDX_SPRING.StiffnessMedium, note: 'spring() 默认 L843' },
  { label: 'MediumLow · 400', value: ANDROIDX_SPRING.StiffnessMediumLow, note: '进场/退场默认 L848' },
  { label: 'Low · 200', value: ANDROIDX_SPRING.StiffnessLow, note: '软弹簧 L852' },
  { label: 'VeryLow · 50', value: ANDROIDX_SPRING.StiffnessVeryLow, note: '极软弹簧 L856' },
];

/** 阻尼预设下拉（真实源码顺序） */
export const DAMPING_PRESETS: { label: string; value: number; note: string }[] = [
  { label: 'HighBouncy · 0.2', value: ANDROIDX_SPRING.DampingRatioHighBouncy, note: '高弹跳 L860' },
  { label: 'MediumBouncy · 0.5', value: ANDROIDX_SPRING.DampingRatioMediumBouncy, note: 'spring() 默认 L868' },
  { label: 'LowBouncy · 0.75', value: ANDROIDX_SPRING.DampingRatioLowBouncy, note: '低弹跳 L876' },
  { label: 'NoBouncy · 1', value: ANDROIDX_SPRING.DampingRatioNoBouncy, note: '临界阻尼 L884' },
];

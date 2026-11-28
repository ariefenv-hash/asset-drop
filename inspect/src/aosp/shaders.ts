/**
 * Direct WebGL2 (GLSL ES 3.00) port of AOSP AGSL shaders:
 * 1) frameworks/base/graphics/java/android/graphics/drawable/RippleShader.java
 * 2) frameworks/base/packages/SystemUI/animation/src/com/android/systemui/surfaceeffects/ripple/RippleShader.kt
 *    （+ 同目录 ../shaderutil/ShaderUtilLibrary.kt 与 SdfShaderLibrary.kt 的 SHADER_LIB）
 *
 * 【Web 端鲁棒性守卫（与源码的偏差，如实标注，第 29 轮全量核对后仍保留）】
 *  - sdCircle/sdRoundedBox/sdEllipse/softCircle 对 0 尺寸的 max(·, 0.0001) 下限与
 *    sdEllipse 迭代分母 |denom|>1e-6 兜底：AGSL 未定义除零行为，GLSL ES 3.00 需防
 *    NaN 传染（progress→0 的首帧会真实触发 0 半径）；其余算式与源码逐字一致。
 */

export const VERTEX_SHADER_GLSL = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
out vec2 v_uv;

void main() {
  // Map clip-space [-1, 1] to top-left origin UV [0, 1] matching Android Canvas (y-down)
  v_uv = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAMEWORK_FRAGMENT_SHADER_GLSL = `#version 300 es
precision highp float;

#define saturate(x) clamp(x, 0.0, 1.0)

in vec2 v_uv;
out vec4 fragColor;

// Exact AOSP RippleShader.java SHADER_UNIFORMS
uniform vec2 in_origin;
uniform vec2 in_touch;
uniform float in_progress;
uniform float in_maxRadius;
uniform vec2 in_resolutionScale;
uniform vec2 in_noiseScale;
uniform float in_hasMask;
uniform float in_noisePhase;
uniform float in_turbulencePhase;
uniform vec2 in_tCircle1;
uniform vec2 in_tCircle2;
uniform vec2 in_tCircle3;
uniform vec2 in_tRotation1;
uniform vec2 in_tRotation2;
uniform vec2 in_tRotation3;
uniform vec4 in_color;
uniform vec4 in_sparkleColor;

// Host canvas uniforms for top-left pixel coordinate reconstruction & SDF mask
uniform vec2 u_resolution;
uniform vec4 u_maskRadii; // (topLeft, topRight, bottomRight, bottomLeft) in px

// Exact AOSP RippleShader.java SHADER_LIB
float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

const float PI = 3.1415926535897932384626;

float threshold(float v, float l, float h) {
  return step(l, v) * (1.0 - step(h, v));
}

float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    float l = i * 0.1;
    float h = l + 0.05;
    float o = sin(PI * (t + 0.35 * i));
    s += threshold(n + o, l, h);
  }
  return saturate(s) * in_sparkleColor.a;
}

float softCircle(vec2 uv, vec2 xy, float radius, float blur) {
  float blurHalf = blur * 0.5;
  float d = distance(uv, xy);
  float safeRadius = max(radius, 0.0001);
  return 1.0 - smoothstep(1.0 - blurHalf, 1.0 + blurHalf, d / safeRadius);
}

float softRing(vec2 uv, vec2 xy, float radius, float progress, float blur) {
  float thickness = 0.05 * radius;
  float currentRadius = radius * progress;
  float circle_outer = softCircle(uv, xy, currentRadius + thickness, blur);
  float circle_inner = softCircle(uv, xy, max(currentRadius - thickness, 0.0), blur);
  return saturate(circle_outer - circle_inner);
}

float subProgress(float start, float end, float progress) {
  float sub = clamp(progress, start, end);
  return (sub - start) / (end - start);
}

mat2 rotate2d(vec2 rad) {
  return mat2(rad.x, -rad.y, rad.y, rad.x);
}

float circle_grid(vec2 resolution, vec2 coord, float time, vec2 center,
    vec2 rotation, float cell_diameter) {
  coord = rotate2d(rotation) * (center - coord) + center;
  coord = mod(coord, cell_diameter) / resolution;
  float normal_radius = cell_diameter / resolution.y * 0.5;
  float radius = 0.65 * normal_radius;
  return softCircle(coord, vec2(normal_radius), radius, radius * 50.0);
}

float turbulence(vec2 uv, float t) {
  const vec2 scale = vec2(0.8);
  uv = uv * scale;
  float g1 = circle_grid(scale, uv, t, in_tCircle1, in_tRotation1, 0.17);
  float g2 = circle_grid(scale, uv, t, in_tCircle2, in_tRotation2, 0.2);
  float g3 = circle_grid(scale, uv, t, in_tCircle3, in_tRotation3, 0.275);
  float v = (g1 * g1 + g2 - g3) * 0.5;
  return saturate(0.45 + 0.8 * v);
}

// Analytical per-corner rounded rect mask equivalent for RippleDrawable's in_shader.eval(p).a > 0.
float evalMask(vec2 p) {
  if (in_hasMask < 0.5) return 1.0;
  vec2 halfSize = u_resolution * 0.5;
  vec2 rel = p - halfSize;
  float r = rel.x > 0.0
    ? (rel.y > 0.0 ? u_maskRadii.z : u_maskRadii.y)
    : (rel.y > 0.0 ? u_maskRadii.w : u_maskRadii.x);
  r = min(r, min(halfSize.x, halfSize.y));
  vec2 d = abs(rel) - (halfSize - vec2(r));
  float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  return sdf <= 0.0 ? 1.0 : 0.0;
}

void main() {
  vec2 p = v_uv * u_resolution;

  float fadeIn = subProgress(0.0, 0.13, in_progress);
  float scaleIn = subProgress(0.0, 1.0, in_progress);
  float fadeOutNoise = subProgress(0.4, 0.5, in_progress);
  float fadeOutRipple = subProgress(0.4, 1.0, in_progress);
  vec2 center = mix(in_touch, in_origin, saturate(in_progress * 2.0));
  float ring = softRing(p, center, in_maxRadius, scaleIn, 1.0);
  float alpha = min(fadeIn, 1.0 - fadeOutNoise);
  vec2 uv = p * in_resolutionScale;
  vec2 densityUv = uv - mod(uv, in_noiseScale);
  float turb = turbulence(uv, in_turbulencePhase);
  float sparkleAlpha = sparkles(densityUv, in_noisePhase) * ring * alpha * turb;
  float fade = min(fadeIn, 1.0 - fadeOutRipple);
  float waveAlpha = softCircle(p, center, in_maxRadius * scaleIn, 1.0) * fade * in_color.a;
  vec4 waveColor = vec4(in_color.rgb * waveAlpha, waveAlpha);
  vec4 sparkleColor = vec4(in_sparkleColor.rgb * in_sparkleColor.a, in_sparkleColor.a);
  float mask = evalMask(p);

  fragColor = mix(waveColor, sparkleColor, sparkleAlpha) * mask;
}
`;

export const SYSTEMUI_FRAGMENT_SHADER_GLSL = `#version 300 es
precision highp float;

#define saturate(x) clamp(x, 0.0, 1.0)

in vec2 v_uv;
out vec4 fragColor;

// Exact AOSP SystemUI RippleShader.kt SHADER_UNIFORMS
uniform vec2 in_center;
uniform vec2 in_size;
uniform float in_cornerRadius;
uniform float in_thickness;
uniform float in_time;
uniform float in_distort_radial;
uniform float in_distort_xy;
uniform float in_fadeSparkle;
uniform float in_fadeFill;
uniform float in_fadeRing;
uniform float in_blur;
uniform float in_pixelDensity;
uniform vec4 in_color;
uniform float in_sparkle_strength;

// Host canvas uniforms
uniform vec2 u_resolution;
uniform int u_shape; // 0 = CIRCLE, 1 = ROUNDED_BOX, 2 = ELLIPSE
uniform float u_hasMask;
uniform vec4 u_maskRadii; // (topLeft, topRight, bottomRight, bottomLeft) in px

const float PI = 3.1415926535897932384626;

// Exact AOSP ShaderUtilLibrary.kt
float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    float l = i * 0.01;
    float h = l + 0.1;
    float o = smoothstep(n - l, h, n);
    o *= abs(sin(PI * o * (t + 0.55 * i)));
    s += o;
  }
  return s;
}

vec2 distort(vec2 p, float time, float distort_amount_radial, float distort_amount_xy) {
  float angle = atan(p.y, p.x);
  return p + vec2(sin(angle * 8.0 + time * 0.003 + 1.641),
                  cos(angle * 5.0 + 2.14 + time * 0.00412)) * distort_amount_radial
           + vec2(sin(p.x * 0.01 + time * 0.00215 + 0.8123),
                  cos(p.y * 0.01 + time * 0.005931)) * distort_amount_xy;
}

// Exact AOSP SdfShaderLibrary.kt
float soften(float d, float blur) {
  float blurHalf = blur * 0.5;
  return smoothstep(-blurHalf, blurHalf, d);
}

float subtract(float outer, float inner) {
  return max(outer, -inner);
}

float sdCircle(vec2 p, float r) {
  float safeR = max(r, 0.0001);
  return (length(p) - safeR) / safeR;
}

float circleRing(vec2 p, float radius) {
  float thicknessHalf = radius * 0.25;
  float outerCircle = sdCircle(p, radius + thicknessHalf);
  float innerCircle = sdCircle(p, radius);
  return subtract(outerCircle, innerCircle);
}

float sdRoundedBox(vec2 p, vec2 size, float cornerRadius) {
  size = max(size * 0.5, vec2(0.0001));
  cornerRadius *= 0.5;
  vec2 d = abs(p) - size + cornerRadius;
  float outside = length(max(d, 0.0));
  float inside = min(max(d.x, d.y), 0.0);
  return (outside + inside - cornerRadius) / size.y;
}

float roundedBoxRing(vec2 p, vec2 size, float cornerRadius, float borderThickness) {
  float outerRoundBox = sdRoundedBox(p, size + vec2(borderThickness), cornerRadius + borderThickness);
  float innerRoundBox = sdRoundedBox(p, size, cornerRadius);
  return subtract(outerRoundBox, innerRoundBox);
}

float sdEllipse(vec2 p, vec2 wh) {
  wh = max(wh * 0.5, vec2(0.0001));
  if (wh.x > wh.y) {
    wh = wh.yx;
    p = abs(p.yx);
  } else {
    p = abs(p);
  }
  vec2 u = wh * p;
  vec2 v = wh * wh;
  float U1 = u.y / 2.0;
  float U2 = v.y - v.x;
  float U3 = u.x - U2;
  float U4 = u.x + U2;
  float U5 = 4.0 * U1;
  float U6 = 6.0 * U1;
  float U7 = 3.0 * U3;
  float t = 0.5;
  for (int i = 0; i < 3; i++) {
    float F1 = t * (t * t * (U1 * t + U3) + U4) - U1;
    float F2 = t * t * (U5 * t + U7) + U4;
    float F3 = t * (U6 * t + U7);
    float denom = F1 * F3 - F2 * F2;
    t += abs(denom) > 1e-6 ? (F1 * F2) / denom : 0.0;
  }
  t = clamp(t, 0.0, 1.0);
  float d = distance(p, wh * vec2(1.0 - t * t, 2.0 * t) / (t * t + 1.0));
  d /= wh.y;
  return (dot(p / wh, p / wh) > 1.0) ? d : -d;
}

float ellipseRing(vec2 p, vec2 wh) {
  vec2 thicknessHalf = wh * 0.25;
  float outerEllipse = sdEllipse(p, wh + thicknessHalf);
  float innerEllipse = sdEllipse(p, wh);
  return subtract(outerEllipse, innerEllipse);
}

float evalMask(vec2 p) {
  if (u_hasMask < 0.5) return 1.0;
  vec2 halfSize = u_resolution * 0.5;
  vec2 rel = p - halfSize;
  float r = rel.x > 0.0
    ? (rel.y > 0.0 ? u_maskRadii.z : u_maskRadii.y)
    : (rel.y > 0.0 ? u_maskRadii.w : u_maskRadii.x);
  r = min(r, min(halfSize.x, halfSize.y));
  vec2 d = abs(rel) - (halfSize - vec2(r));
  float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  return sdf <= 0.0 ? 1.0 : 0.0;
}

void main() {
  vec2 p = v_uv * u_resolution;

  float sparkleRing = 1.0;
  float inside = 1.0;

  if (u_shape == 0) {
    vec2 p_distorted = distort(p, in_time, in_distort_radial, in_distort_xy);
    float radius = in_size.x * 0.5;
    sparkleRing = soften(circleRing(p_distorted - in_center, radius), in_blur);
    inside = soften(sdCircle(p_distorted - in_center, radius * 1.25), in_blur);
  } else if (u_shape == 1) {
    sparkleRing = soften(roundedBoxRing(p - in_center, in_size, in_cornerRadius, in_thickness), in_blur);
    inside = soften(sdRoundedBox(p - in_center, in_size * 1.25, in_cornerRadius), in_blur);
  } else {
    vec2 p_distorted = distort(p, in_time, in_distort_radial, in_distort_xy);
    sparkleRing = soften(ellipseRing(p_distorted - in_center, in_size), in_blur);
    inside = soften(sdEllipse(p_distorted - in_center, in_size * 1.2), in_blur);
  }

  float stepDensity = max(in_pixelDensity * 0.8, 0.1);
  float sparkle = sparkles(p - mod(p, stepDensity), in_time * 0.00175)
    * (1.0 - sparkleRing) * in_fadeSparkle;
  float rippleInsideAlpha = (1.0 - inside) * in_fadeFill;
  float rippleRingAlpha = (1.0 - sparkleRing) * in_fadeRing;
  float rippleAlpha = max(rippleInsideAlpha, rippleRingAlpha) * in_color.a;
  vec4 ripple = vec4(in_color.rgb, 1.0) * rippleAlpha;
  float mask = evalMask(p);
  float sparkleClamped = saturate(sparkle);

  fragColor = mix(ripple, vec4(sparkleClamped), saturate(sparkle * in_sparkle_strength)) * mask;
}
`;

export const AOSP_FRAMEWORK_AGSL_SOURCE = `// frameworks/base/graphics/java/android/graphics/drawable/RippleShader.java
uniform vec2 in_origin;
uniform vec2 in_touch;
uniform float in_progress;
uniform float in_maxRadius;
uniform vec2 in_resolutionScale;
uniform vec2 in_noiseScale;
uniform float in_hasMask;
uniform float in_noisePhase;
uniform float in_turbulencePhase;
uniform vec2 in_tCircle1;
uniform vec2 in_tCircle2;
uniform vec2 in_tCircle3;
uniform vec2 in_tRotation1;
uniform vec2 in_tRotation2;
uniform vec2 in_tRotation3;
layout(color) uniform vec4 in_color;
layout(color) uniform vec4 in_sparkleColor;
uniform shader in_shader;

float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

const float PI = 3.1415926535897932384626;

float threshold(float v, float l, float h) {
  return step(l, v) * (1.0 - step(h, v));
}

float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0; i < 4; i += 1) {
    float l = i * 0.1;
    float h = l + 0.05;
    float o = sin(PI * (t + 0.35 * i));
    s += threshold(n + o, l, h);
  }
  return saturate(s) * in_sparkleColor.a;
}

float softCircle(vec2 uv, vec2 xy, float radius, float blur) {
  float blurHalf = blur * 0.5;
  float d = distance(uv, xy);
  return 1. - smoothstep(1. - blurHalf, 1. + blurHalf, d / radius);
}

float softRing(vec2 uv, vec2 xy, float radius, float progress, float blur) {
  float thickness = 0.05 * radius;
  float currentRadius = radius * progress;
  float circle_outer = softCircle(uv, xy, currentRadius + thickness, blur);
  float circle_inner = softCircle(uv, xy, max(currentRadius - thickness, 0.), blur);
  return saturate(circle_outer - circle_inner);
}

float subProgress(float start, float end, float progress) {
  float sub = clamp(progress, start, end);
  return (sub - start) / (end - start);
}

mat2 rotate2d(vec2 rad){
  return mat2(rad.x, -rad.y, rad.y, rad.x);
}

float circle_grid(vec2 resolution, vec2 coord, float time, vec2 center,
    vec2 rotation, float cell_diameter) {
  coord = rotate2d(rotation) * (center - coord) + center;
  coord = mod(coord, cell_diameter) / resolution;
  float normal_radius = cell_diameter / resolution.y * 0.5;
  float radius = 0.65 * normal_radius;
  return softCircle(coord, vec2(normal_radius), radius, radius * 50.0);
}

float turbulence(vec2 uv, float t) {
  const vec2 scale = vec2(0.8);
  uv = uv * scale;
  float g1 = circle_grid(scale, uv, t, in_tCircle1, in_tRotation1, 0.17);
  float g2 = circle_grid(scale, uv, t, in_tCircle2, in_tRotation2, 0.2);
  float g3 = circle_grid(scale, uv, t, in_tCircle3, in_tRotation3, 0.275);
  float v = (g1 * g1 + g2 - g3) * 0.5;
  return saturate(0.45 + 0.8 * v);
}

vec4 main(vec2 p) {
  float fadeIn = subProgress(0., 0.13, in_progress);
  float scaleIn = subProgress(0., 1.0, in_progress);
  float fadeOutNoise = subProgress(0.4, 0.5, in_progress);
  float fadeOutRipple = subProgress(0.4, 1., in_progress);
  vec2 center = mix(in_touch, in_origin, saturate(in_progress * 2.0));
  float ring = softRing(p, center, in_maxRadius, scaleIn, 1.);
  float alpha = min(fadeIn, 1. - fadeOutNoise);
  vec2 uv = p * in_resolutionScale;
  vec2 densityUv = uv - mod(uv, in_noiseScale);
  float turb = turbulence(uv, in_turbulencePhase);
  float sparkleAlpha = sparkles(densityUv, in_noisePhase) * ring * alpha * turb;
  float fade = min(fadeIn, 1. - fadeOutRipple);
  float waveAlpha = softCircle(p, center, in_maxRadius * scaleIn, 1.) * fade * in_color.a;
  vec4 waveColor = vec4(in_color.rgb * waveAlpha, waveAlpha);
  vec4 sparkleColor = vec4(in_sparkleColor.rgb * in_sparkleColor.a, in_sparkleColor.a);
  float mask = in_hasMask == 1. ? in_shader.eval(p).a > 0. ? 1. : 0. : 1.;
  return mix(waveColor, sparkleColor, sparkleAlpha) * mask;
}`;

export const AOSP_SESSION_JAVA_SOURCE = `// frameworks/base/graphics/java/android/graphics/drawable/RippleAnimationSession.java（常量）
private static final int ENTER_ANIM_DURATION = 450;
private static final int EXIT_ANIM_DURATION = 375;
private static final long NOISE_ANIMATION_DURATION = 7000;
private static final long MAX_NOISE_PHASE = NOISE_ANIMATION_DURATION / 214; // = 32
private static final Interpolator FAST_OUT_SLOW_IN = new PathInterpolator(0.4f, 0f, 0.2f, 1f);
private static final TimeInterpolator LINEAR_INTERPOLATOR = new LinearInterpolator();

// Enter phase: progress 0.0f -> 0.5f over 450ms (FAST_OUT_SLOW_IN)
// Noise loop:  phase mStartTime -> mStartTime + 32 over 7000ms (LINEAR)
// Exit phase:  progress 0.5f -> 1.0f over 375ms (LINEAR), startDelay = max(450 - elapsed, 0)

// frameworks/base/graphics/java/android/graphics/drawable/RippleShader.java（uniform 映射）：
// setRadius(radius)       => in_maxRadius = radius * 2.3f (L138-140)
// setResolution(w, h)     => in_resolutionScale = (1/w, 1/h), in_noiseScale = (2.1/w, 2.1/h) (L194-199)
// setNoisePhase(phase)    => in_noisePhase = phase * 0.001f, in_turbulencePhase = phase (L157-183)
//   in_tCircle1 = (1.5*0.5 + phase*0.01*cos(1.5*0.55), 1.5*0.5 + phase*0.01*sin(1.5*0.55))
//   in_tCircle2 = (1.5*0.2 - phase*0.0066*cos(1.5*0.45), 1.5*0.2 - phase*0.0066*sin(1.5*0.45))
//   in_tCircle3 = (1.5     - phase*0.0066*cos(1.5*0.35), 1.5     - phase*0.0066*sin(1.5*0.35))
//   in_tRotation1 = (cos(phase * PI*0.0078125 + 1.7*PI), sin(...))
//   in_tRotation2 = (cos(phase * -PI*0.0078125 + 2.0*PI), sin(...))
//   in_tRotation3 = (cos(phase * PI*0.0078125 + 2.75*PI), sin(...))`;

export const AOSP_SYSTEMUI_AGSL_SOURCE = `// packages/SystemUI/animation/src/com/android/systemui/surfaceeffects/ripple/RippleShader.kt
// Interpolator: STANDARD = PathInterpolator(0.2f, 0f, 0f, 1f)（L192-193）
// FadeParams（L54-66 默认值）:
//   sparkleRingFadeParams = (0.0, 0.1, 0.4, 1.0)
//   baseRingFadeParams    = (0.0, 0.1, 0.3, 1.0)
//   centerFillFadeParams  = (0.0, 0.0, 0.0, 0.6)
//   blur = lerp(1.25, 0.5, progress), sparkleStrength = 0.3

float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0; i < 4; i += 1) {
    float l = i * 0.01;
    float h = l + 0.1;
    float o = smoothstep(n - l, h, n);
    o *= abs(sin(PI * o * (t + 0.55 * i)));
    s += o;
  }
  return s;
}

vec4 main(vec2 p) {
  vec2 p_distorted = distort(p, in_time, in_distort_radial, in_distort_xy);
  float radius = in_size.x * 0.5;
  float sparkleRing = soften(circleRing(p_distorted-in_center, radius), in_blur);
  float inside = soften(sdCircle(p_distorted-in_center, radius * 1.25), in_blur);
  float sparkle = sparkles(p - mod(p, in_pixelDensity * 0.8), in_time * 0.00175)
      * (1.-sparkleRing) * in_fadeSparkle;
  float rippleInsideAlpha = (1.-inside) * in_fadeFill;
  float rippleRingAlpha = (1.-sparkleRing) * in_fadeRing;
  float rippleAlpha = max(rippleInsideAlpha, rippleRingAlpha) * in_color.a;
  vec4 ripple = vec4(in_color.rgb, 1.0) * rippleAlpha;
  return mix(ripple, vec4(sparkle), sparkle * in_sparkle_strength);
}`;

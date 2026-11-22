/**
 * Android 17 (android-17.0.0_r1) ThemePicker 壁纸取色圆形预览 —— 配色方案规格移植
 *
 * 【源码依据】（本地磁盘可核查）
 *  1. 象限几何：tmp/tp17 (platform/packages/apps/ThemePicker @ android-17 manifest)
 *     src/com/android/customization/picker/color/ui/view/ColorOptionIconView.kt
 *     —— 整圆分四个 90° 扇形：color3 [0°,90°] 右下、color2 [90°,180°] 左下、
 *        color0 [180°,270°] 左上、color1 [270°,360°] 右上（Canvas 角度，0°=3 点钟方向顺时针）。
 *        注释明确 w/h 取偶数避免扇形间像素缝隙。color0==color1 时顶部两象限同色，
 *        视觉上合并为"上半圆主色 + 下半两个 1/4 扇形"。
 *  2. 四色映射：src/com/android/customization/model/color/ColorProvider.kt L246-311
 *     - getLightColorPreview: [accent1.s600, accent1.s600, accent2.s500→LStar85, accent3.s300]
 *     - getDarkColorPreview:  [accent1.s200, accent1.s200, accent2.s500→LStar35, accent3.s300]
 *     - ALPHA_MASK = 0xFF（setAlphaComponent(c, 0xFF) 即全不透明，对 hex 无损）
 *  3. shade→tone 换算：tmp/sysui17 (platform/frameworks/libs/systemui @ android-17)
 *     monet/src/com/android/systemui/monet/TonalPalette.java
 *       getAtTone(shade) = materialTonalPalette.tone((1000 - shade) / 10)
 *     即 s600→tone 40、s200→tone 80、s500→tone 50、s300→tone 70（与 ColorProvider
 *     注释 "Primary (light)"/"Tertiary LStar 70" 等互证）。
 *  4. 四种风格色板（styleList，ColorProvider.kt L71-74）：
 *     TONAL_SPOT / SPRITZ / VIBRANT / EXPRESSIVE —— CoreSpec 逐值取自
 *     tmp/monet13（frameworks/base @ android-13.0.0_r1 提取）
 *     packages/SystemUI/monet/src/com/android/systemui/monet/ColorScheme.kt L158-195
 *     （Android 12-13 内联实现，即 Material Color Utilities 语义；Android 14+ 的
 *     libmonet DynamicScheme 承接同一规格）。
 *  5. LStar 重定标：ColorProvider.kt 调 ColorStateList.withLStar(85f/35f)
 *     （android.content.res.ColorStateList）→ android.graphics.ColorUtils.colorToLAB/
 *     LABToColor，白点 {95.047, 100, 108.883}（D65），与 MCU WHITE_POINT_D65 一致。
 *
 * 【诚实声明】
 *  - 种子色为演示输入（用户可点选），非壁纸取色结果；真实种子来自
 *    ColorScheme.getSeedColors(wallpaperColors)（Quantizer + Score），Web 端无壁纸。
 *  - preset 预色（getPresetColorPreview）与单色（Monochrome）变体未纳入演示，
 *    因其输入是预置色 bundle 桩数据，Web 端无对应来源。
 *  - withLStar 的 L* 计算与 HCT tone 在数学上同源（tone 即 L*），但通道映射路径不同
 *    （LAB a/b 保持、仅改 L），本实现按 Android ColorUtils 公式直译。
 */
import { argbFromHex, hexFromArgb, TonalPalette, sanitizeDegreesDouble } from './dynamicColor';

/* ---------- 风格 CoreSpec（ColorScheme.kt L158-195） ---------- */

/** Hue 变换（ColorScheme.kt L36-103）：source / add / 减 / Vibrant·Expressive 分段旋转表 */
type HueSpec =
  | { kind: 'source' }
  | { kind: 'add'; degrees: number }
  | { kind: 'subtract'; degrees: number }
  | { kind: 'table'; rotations: [number, number][] };

const HUE_VIBRANT_SECONDARY: [number, number][] = [
  [0, 18], [41, 15], [61, 10], [101, 12], [131, 15], [181, 18], [251, 15], [301, 12], [360, 12],
];
const HUE_VIBRANT_TERTIARY: [number, number][] = [
  [0, 35], [41, 30], [61, 20], [101, 25], [131, 30], [181, 35], [251, 30], [301, 25], [360, 25],
];
const HUE_EXPRESSIVE_SECONDARY: [number, number][] = [
  [0, 45], [21, 95], [51, 45], [121, 20], [151, 45], [191, 90], [271, 45], [321, 45], [360, 45],
];
const HUE_EXPRESSIVE_TERTIARY: [number, number][] = [
  [0, 120], [21, 120], [51, 20], [121, 45], [151, 20], [191, 15], [271, 20], [321, 120], [360, 120],
];

/**
 * getHueRotation（ColorScheme.kt L36-53）：落进哪个 [hue_i, hue_i+1) 区间就用该区间
 * 旋转量；越界 hue 一律按 0 处理（sanitizedSourceHue）；无命中兜底返回源色相。
 */
function getHueRotation(sourceHue: number, table: [number, number][]): number {
  const sanitized = sourceHue < 0 || sourceHue >= 360 ? 0 : sourceHue;
  for (let i = 0; i < table.length - 1; i++) {
    if (table[i][0] <= sanitized && sanitized < table[i + 1][0]) {
      return sanitizeDegreesDouble(sanitized + table[i][1]);
    }
  }
  return sourceHue;
}

function resolveHue(spec: HueSpec, sourceHue: number): number {
  switch (spec.kind) {
    case 'source': return sourceHue;
    case 'add': return sanitizeDegreesDouble(sourceHue + spec.degrees);
    case 'subtract': return sanitizeDegreesDouble(sourceHue - spec.degrees);
    case 'table': return getHueRotation(sourceHue, spec.rotations);
  }
}

/** Chroma 变换（ColorScheme.kt L106-130）：constant / source / maxOut */
type ChromaSpec =
  | { kind: 'constant'; chroma: number }
  | { kind: 'source' }
  | { kind: 'maxOut' };

const CHROMA_MAX_OUT = 130.0; // ChromaMaxOut：故意超出，由 HCT→sRGB 色域映射自然截顶

function resolveChroma(spec: ChromaSpec, sourceChroma: number): number {
  switch (spec.kind) {
    case 'constant': return spec.chroma;
    case 'source': return sourceChroma;
    case 'maxOut': return CHROMA_MAX_OUT;
  }
}

interface AccentSpec {
  hue: HueSpec;
  chroma: ChromaSpec;
}

/** CoreSpec（仅 a1/a2/a3；n1/n2 不参与预览圆，省略） */
export interface MonetStyleSpec {
  a1: AccentSpec;
  a2: AccentSpec;
  a3: AccentSpec;
}

/** ColorProvider.kt L71-74 styleList 顺序（壁纸取色每颗种子出 4 个选项） */
export type ThemeStyleName = 'tonal_spot' | 'spritz' | 'vibrant' | 'expressive';

export const THEME_STYLE_SPECS: Record<ThemeStyleName, MonetStyleSpec> = {
  tonal_spot: {
    // TONAL_SPOT：a1 (HueSource, 36) / a2 (HueSource, 16) / a3 (HueAdd 60, 24)
    a1: { hue: { kind: 'source' }, chroma: { kind: 'constant', chroma: 36.0 } },
    a2: { hue: { kind: 'source' }, chroma: { kind: 'constant', chroma: 16.0 } },
    a3: { hue: { kind: 'add', degrees: 60.0 }, chroma: { kind: 'constant', chroma: 24.0 } },
  },
  spritz: {
    // SPRITZ：a1 (HueSource, 12) / a2 (HueSource, 8) / a3 (HueSource, 16)
    a1: { hue: { kind: 'source' }, chroma: { kind: 'constant', chroma: 12.0 } },
    a2: { hue: { kind: 'source' }, chroma: { kind: 'constant', chroma: 8.0 } },
    a3: { hue: { kind: 'source' }, chroma: { kind: 'constant', chroma: 16.0 } },
  },
  vibrant: {
    // VIBRANT：a1 (HueSource, MaxOut) / a2 (VibrantSecondary 表, 24) / a3 (VibrantTertiary 表, 32)
    a1: { hue: { kind: 'source' }, chroma: { kind: 'maxOut' } },
    a2: { hue: { kind: 'table', rotations: HUE_VIBRANT_SECONDARY }, chroma: { kind: 'constant', chroma: 24.0 } },
    a3: { hue: { kind: 'table', rotations: HUE_VIBRANT_TERTIARY }, chroma: { kind: 'constant', chroma: 32.0 } },
  },
  expressive: {
    // EXPRESSIVE：a1 (HueAdd 240, 40) / a2 (ExpressiveSecondary 表, 24) / a3 (ExpressiveTertiary 表, 32)
    a1: { hue: { kind: 'add', degrees: 240.0 }, chroma: { kind: 'constant', chroma: 40.0 } },
    a2: { hue: { kind: 'table', rotations: HUE_EXPRESSIVE_SECONDARY }, chroma: { kind: 'constant', chroma: 24.0 } },
    a3: { hue: { kind: 'table', rotations: HUE_EXPRESSIVE_TERTIARY }, chroma: { kind: 'constant', chroma: 32.0 } },
  },
};

/* ---------- LAB 转换（android.graphics.ColorUtils.colorToLAB / LABToColor 直译） ---------- */

// android.graphics.Color 白点（0-100 刻度）：{95.047, 100, 108.883} = D65，
// 与 MCU WHITE_POINT_D65（dynamicColor.ts L110）一致。
const WHITE_POINT = [95.047, 100.0, 108.883];

// sRGB 线性化复用 dynamicColor.ts 的 linearized / delinearized（经 import 使用）
import { linearized, delinearized } from './dynamicColor';

/** ColorUtils.colorToLAB（XyzMatrix 系数与 MCU srgbToXyz 相同：sRGB→CIE XYZ（D65））
 *  注：dynamicColor.ts 的 linearized 输出 0-100、delinearized 输入 0-100，与
 *  android Color.rgbToXYZ（0-1 域×100）量纲一致。 */
export function colorToLab(argb: number): [number, number, number] {
  const sr = linearized((argb >> 16) & 0xff); // 0-100
  const sg = linearized((argb >> 8) & 0xff);
  const sb = linearized(argb & 0xff);
  // android.graphics.Color.rgbToXYZ 矩阵（与 MCU 相同的 sRGB D65 标准矩阵）
  const x = 0.41233795 * sr + 0.35762004 * sg + 0.18051084 * sb;
  const y = 0.21267291 * sr + 0.71515223 * sg + 0.072175 * sb;
  const z = 0.01933394 * sr + 0.11919203 * sg + 0.95030407 * sb;
  const fx = labFFromXyz(x / WHITE_POINT[0]);
  const fy = labFFromXyz(y / WHITE_POINT[1]);
  const fz = labFFromXyz(z / WHITE_POINT[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labFFromXyz(t: number): number {
  // ColorUtils: f(t) = t > 216/24389 ? cbrt(t) : (841/108)t + 4/29
  return t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;
}

function labInvF(ft: number): number {
  const ft3 = ft * ft * ft;
  return ft3 > 216 / 24389 ? ft3 : (108 / 841) * (ft - 4 / 29);
}

/** ColorUtils.LABToColor（逆变换） */
export function labToArgb(l: number, a: number, b: number): number {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const x = labInvF(fx) * WHITE_POINT[0] / 100;
  const y = labInvF(fy) * WHITE_POINT[1] / 100;
  const z = labInvF(fz) * WHITE_POINT[2] / 100;
  // android.graphics.Color.XYZToColor 逆矩阵（sRGB D65）；xyz 归一到 0-100 域后交
  // delinearized（0-100 → 0-255，内部含截断取整）
  const sr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const sg = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const sb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  const r = delinearized(sr * 100);
  const g = delinearized(sg * 100);
  const bl = delinearized(sb * 100);
  return (255 << 24) | (r << 16) | (g << 8) | bl;
}

/** ColorStateList.withLStar(f)（ColorProvider.kt L266/L270 调用）：保持 a/b、重设 L* */
export function withLStar(argb: number, lstar: number): number {
  const [, a, b] = colorToLab(argb);
  return labToArgb(lstar, a, b);
}

/* ---------- 预览四色（ColorProvider.kt getLight/DarkColorPreview） ---------- */

export interface SchemePreviewColors {
  /** [color0 左上, color1 右上, color2 左下, color3 右下]（ColorOptionIconView.bindColor 顺序） */
  colors: [string, string, string, string];
}

/** shade→tone：sysui17 TonalPalette.getAtTone —— tone((1000 − shade)/10) */
function shadeToTone(shade: number): number {
  return Math.trunc((1000 - shade) / 10);
}

/**
 * ColorProvider.kt L246-272 的逐值转译：
 *  light = [a1.s600, a1.s600, withLStar(a2.s500, 85), a3.s300]
 *  dark  = [a1.s200, a1.s200, withLStar(a2.s500, 35), a3.s300]
 * （setAlphaComponent(c, ALPHA_MASK=0xFF) 为全不透明，对 hex 直传无损）
 */
export function buildSchemePreviewColors(
  seedHex: string,
  style: ThemeStyleName,
  darkTheme: boolean,
): SchemePreviewColors {
  const spec = THEME_STYLE_SPECS[style];
  const source = argbFromHex(seedHex);
  const hct = (() => {
    // Hct.fromInt 等价：经 TonalPalette.fromInt 取 hue/chroma
    const p = TonalPalette.fromInt(source);
    return { hue: p.hue, chroma: p.keyColor.chroma };
  })();
  const a1 = TonalPalette.fromHueAndChroma(
    resolveHue(spec.a1.hue, hct.hue),
    resolveChroma(spec.a1.chroma, hct.chroma),
  );
  const a2 = TonalPalette.fromHueAndChroma(
    resolveHue(spec.a2.hue, hct.hue),
    resolveChroma(spec.a2.chroma, hct.chroma),
  );
  const a3 = TonalPalette.fromHueAndChroma(
    resolveHue(spec.a3.hue, hct.hue),
    resolveChroma(spec.a3.chroma, hct.chroma),
  );

  const accent1 = a1.tone(darkTheme ? shadeToTone(200) : shadeToTone(600)); // s200→80 / s600→40
  const accent2s500 = a2.tone(shadeToTone(500)); // s500→tone 50
  const accent3 = a3.tone(shadeToTone(300)); // s300→tone 70

  const c2 = withLStar(accent2s500, darkTheme ? 35 : 85);
  const colors: [string, string, string, string] = [
    hexFromArgb(accent1),
    hexFromArgb(accent1), // color1 与 color0 同源 → 顶部两象限合并为半圆
    hexFromArgb(c2),
    hexFromArgb(accent3),
  ];
  return { colors };
}

/** ThemePicker res/values-zh-rCN/strings.xml content_description_*_color_option */
export const THEME_STYLE_LABELS: Record<ThemeStyleName, string> = {
  tonal_spot: '主要动态主题',
  spritz: '主要中性主题',
  vibrant: '主要鲜艳主题',
  expressive: '主要炫彩主题',
};

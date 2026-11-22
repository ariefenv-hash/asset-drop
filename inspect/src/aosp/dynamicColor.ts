/**
 * Complete Material Color Utilities (MCU) TypeScript port from AOSP / MDC-Android:
 *   ColorUtils, ViewingConditions, Cam16, HctSolver, Hct, TonalPalette, Contrast,
 *   DynamicScheme, SchemeTonalSpot, SchemeExpressive, QuantizerWsmeans, Score,
 *   and MaterialDynamicColors token resolution for M3 & MD3E surfaces.
 */

export type ThemeVariant = 'tonal_spot' | 'expressive';

export interface M3ThemeTokens {
  seedHex: string;
  variant: ThemeVariant;
  isDark: boolean;
  isMonochrome: boolean;
  hct: { hue: number; chroma: number; tone: number };
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  palettes: {
    primary: { hue: number; chroma: number; tones: { tone: number; hex: string }[] };
    secondary: { hue: number; chroma: number; tones: { tone: number; hex: string }[] };
    tertiary: { hue: number; chroma: number; tones: { tone: number; hex: string }[] };
    neutral: { hue: number; chroma: number; tones: { tone: number; hex: string }[] };
  };
}

// ===== MathUtils =====

function clampInt(min: number, max: number, input: number): number {
  if (input < min) return min;
  if (input > max) return max;
  return input | 0;
}

function clampDouble(min: number, max: number, input: number): number {
  if (input < min) return min;
  if (input > max) return max;
  return input;
}

function signum(num: number): number {
  if (num < 0) return -1;
  if (num === 0) return 0;
  return 1;
}

function lerpDouble(start: number, stop: number, amount: number): number {
  return (1.0 - amount) * start + amount * stop;
}

export function sanitizeDegreesDouble(degrees: number): number {
  const mod = degrees % 360.0;
  return mod < 0 ? mod + 360.0 : mod;
}

function sanitizeDegreesInt(degrees: number): number {
  let mod = degrees % 360;
  if (mod < 0) mod += 360;
  return mod | 0;
}

function differenceDegrees(a: number, b: number): number {
  return 180.0 - Math.abs(Math.abs(a - b) - 180.0);
}

function matrixMultiply(row: [number, number, number], matrix: number[][]): [number, number, number] {
  return [
    row[0] * matrix[0][0] + row[1] * matrix[0][1] + row[2] * matrix[0][2],
    row[0] * matrix[1][0] + row[1] * matrix[1][1] + row[2] * matrix[1][2],
    row[0] * matrix[2][0] + row[1] * matrix[2][1] + row[2] * matrix[2][2],
  ];
}

// ===== ColorUtils =====

const SRGB_TO_XYZ = [
  [0.41233895, 0.35762064, 0.18051042],
  [0.2126, 0.7152, 0.0722],
  [0.01932141, 0.11916382, 0.95034478],
];

const XYZ_TO_SRGB = [
  [3.2413774792388685, -1.5376652402851851, -0.49885366846268053],
  [-0.9691452513005321, 1.8758853451067872, 0.04156585616912061],
  [0.05562093689691305, -0.20395524564742123, 1.0571799111220335],
];

const WHITE_POINT_D65 = [95.047, 100.0, 108.883];

export function argbFromRgb(r: number, g: number, b: number): number {
  return ((255 << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0;
}

export function redFromArgb(argb: number): number {
  return (argb >> 16) & 255;
}

export function greenFromArgb(argb: number): number {
  return (argb >> 8) & 255;
}

export function blueFromArgb(argb: number): number {
  return argb & 255;
}

export function hexFromArgb(argb: number): string {
  const r = redFromArgb(argb).toString(16).padStart(2, '0');
  const g = greenFromArgb(argb).toString(16).padStart(2, '0');
  const b = blueFromArgb(argb).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

export function argbFromHex(hex: string): number {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.slice(0, 6);
  const val = parseInt(full, 16);
  if (Number.isNaN(val)) return 0xff4285f4 >>> 0;
  return (0xff000000 | val) >>> 0;
}

function labF(t: number): number {
  const e = 216.0 / 24389.0;
  const kappa = 24389.0 / 27.0;
  return t > e ? Math.cbrt(t) : (kappa * t + 16.0) / 116.0;
}

function labInvf(ft: number): number {
  const e = 216.0 / 24389.0;
  const kappa = 24389.0 / 27.0;
  const ft3 = ft * ft * ft;
  return ft3 > e ? ft3 : (116.0 * ft - 16.0) / kappa;
}

export function linearized(rgbComponent: number): number {
  const normalized = rgbComponent / 255.0;
  if (normalized <= 0.040449936) {
    return (normalized / 12.92) * 100.0;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4) * 100.0;
}

export function delinearized(rgbComponent: number): number {
  const normalized = rgbComponent / 100.0;
  const delin =
    normalized <= 0.0031308
      ? normalized * 12.92
      : 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
  return clampInt(0, 255, Math.round(delin * 255.0));
}

function argbFromLinrgb(linrgb: [number, number, number]): number {
  return argbFromRgb(
    delinearized(linrgb[0]),
    delinearized(linrgb[1]),
    delinearized(linrgb[2])
  );
}

function argbFromXyz(x: number, y: number, z: number): number {
  const lr = XYZ_TO_SRGB[0][0] * x + XYZ_TO_SRGB[0][1] * y + XYZ_TO_SRGB[0][2] * z;
  const lg = XYZ_TO_SRGB[1][0] * x + XYZ_TO_SRGB[1][1] * y + XYZ_TO_SRGB[1][2] * z;
  const lb = XYZ_TO_SRGB[2][0] * x + XYZ_TO_SRGB[2][1] * y + XYZ_TO_SRGB[2][2] * z;
  return argbFromRgb(delinearized(lr), delinearized(lg), delinearized(lb));
}

function yFromLstar(lstar: number): number {
  return 100.0 * labInvf((lstar + 16.0) / 116.0);
}

function lstarFromY(y: number): number {
  return labF(y / 100.0) * 116.0 - 16.0;
}

function argbFromLstar(lstar: number): number {
  const c = delinearized(yFromLstar(lstar));
  return argbFromRgb(c, c, c);
}

function lstarFromArgb(argb: number): number {
  const r = linearized(redFromArgb(argb));
  const g = linearized(greenFromArgb(argb));
  const b = linearized(blueFromArgb(argb));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 116.0 * labF(y / 100.0) - 16.0;
}

function labFromArgb(argb: number): [number, number, number] {
  const lr = linearized(redFromArgb(argb));
  const lg = linearized(greenFromArgb(argb));
  const lb = linearized(blueFromArgb(argb));
  const x = SRGB_TO_XYZ[0][0] * lr + SRGB_TO_XYZ[0][1] * lg + SRGB_TO_XYZ[0][2] * lb;
  const y = SRGB_TO_XYZ[1][0] * lr + SRGB_TO_XYZ[1][1] * lg + SRGB_TO_XYZ[1][2] * lb;
  const z = SRGB_TO_XYZ[2][0] * lr + SRGB_TO_XYZ[2][1] * lg + SRGB_TO_XYZ[2][2] * lb;
  const fx = labF(x / WHITE_POINT_D65[0]);
  const fy = labF(y / WHITE_POINT_D65[1]);
  const fz = labF(z / WHITE_POINT_D65[2]);
  return [116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)];
}

function argbFromLab(l: number, a: number, b: number): number {
  const fy = (l + 16.0) / 116.0;
  const fx = a / 500.0 + fy;
  const fz = fy - b / 200.0;
  return argbFromXyz(
    labInvf(fx) * WHITE_POINT_D65[0],
    labInvf(fy) * WHITE_POINT_D65[1],
    labInvf(fz) * WHITE_POINT_D65[2]
  );
}

// ===== ViewingConditions & Cam16 =====

const XYZ_TO_CAM16RGB = [
  [0.401288, 0.650173, -0.051461],
  [-0.250268, 1.204414, 0.045854],
  [-0.002079, 0.048952, 0.953127],
];

const CAM16RGB_TO_XYZ = [
  [1.8620678, -1.0112547, 0.14918678],
  [0.38752654, 0.62144744, -0.00897398],
  [-0.0158415, -0.03412294, 1.0499644],
];

interface ViewingConditions {
  n: number;
  aw: number;
  nbb: number;
  ncb: number;
  c: number;
  nc: number;
  rgbD: [number, number, number];
  fl: number;
  flRoot: number;
  z: number;
}

function makeViewingConditions(
  whitePoint: number[],
  adaptingLuminance: number,
  backgroundLstar: number,
  surround: number,
  discountingIlluminant: boolean
): ViewingConditions {
  const bgL = Math.max(0.1, backgroundLstar);
  const m = XYZ_TO_CAM16RGB;
  const rW = whitePoint[0] * m[0][0] + whitePoint[1] * m[0][1] + whitePoint[2] * m[0][2];
  const gW = whitePoint[0] * m[1][0] + whitePoint[1] * m[1][1] + whitePoint[2] * m[1][2];
  const bW = whitePoint[0] * m[2][0] + whitePoint[1] * m[2][1] + whitePoint[2] * m[2][2];
  const f = 0.8 + surround / 10.0;
  const c =
    f >= 0.9
      ? lerpDouble(0.59, 0.69, (f - 0.9) * 10.0)
      : lerpDouble(0.525, 0.59, (f - 0.8) * 10.0);
  const d = clampDouble(
    0.0,
    1.0,
    discountingIlluminant
      ? 1.0
      : f * (1.0 - (1.0 / 3.6) * Math.exp((-adaptingLuminance - 42.0) / 92.0))
  );
  const nc = f;
  const rgbD: [number, number, number] = [
    d * (100.0 / rW) + 1.0 - d,
    d * (100.0 / gW) + 1.0 - d,
    d * (100.0 / bW) + 1.0 - d,
  ];
  const k = 1.0 / (5.0 * adaptingLuminance + 1.0);
  const k4 = k * k * k * k;
  const k4F = 1.0 - k4;
  const fl = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5.0 * adaptingLuminance);
  const n = yFromLstar(bgL) / whitePoint[1];
  const z = 1.48 + Math.sqrt(n);
  const nbb = 0.725 / Math.pow(n, 0.2);
  const ncb = nbb;
  const rgbAF = [
    Math.pow((fl * rgbD[0] * rW) / 100.0, 0.42),
    Math.pow((fl * rgbD[1] * gW) / 100.0, 0.42),
    Math.pow((fl * rgbD[2] * bW) / 100.0, 0.42),
  ];
  const rgbA = [
    (400.0 * rgbAF[0]) / (rgbAF[0] + 27.13),
    (400.0 * rgbAF[1]) / (rgbAF[1] + 27.13),
    (400.0 * rgbAF[2]) / (rgbAF[2] + 27.13),
  ];
  const aw = (2.0 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb;
  return { n, aw, nbb, ncb, c, nc, rgbD, fl, flRoot: Math.pow(fl, 0.25), z };
}

const DEFAULT_VC: ViewingConditions = makeViewingConditions(
  WHITE_POINT_D65,
  ((200.0 / Math.PI) * yFromLstar(50.0)) / 100.0,
  50.0,
  2.0,
  false
);

export class Cam16 {
  constructor(
    public readonly hue: number,
    public readonly chroma: number,
    public readonly j: number
  ) {}

  static fromInt(argb: number): Cam16 {
    const redL = linearized(redFromArgb(argb));
    const greenL = linearized(greenFromArgb(argb));
    const blueL = linearized(blueFromArgb(argb));
    const x = 0.41233895 * redL + 0.35762064 * greenL + 0.18051042 * blueL;
    const y = 0.2126 * redL + 0.7152 * greenL + 0.0722 * blueL;
    const z = 0.01932141 * redL + 0.11916382 * greenL + 0.95034478 * blueL;

    const vc = DEFAULT_VC;
    const rT = x * XYZ_TO_CAM16RGB[0][0] + y * XYZ_TO_CAM16RGB[0][1] + z * XYZ_TO_CAM16RGB[0][2];
    const gT = x * XYZ_TO_CAM16RGB[1][0] + y * XYZ_TO_CAM16RGB[1][1] + z * XYZ_TO_CAM16RGB[1][2];
    const bT = x * XYZ_TO_CAM16RGB[2][0] + y * XYZ_TO_CAM16RGB[2][1] + z * XYZ_TO_CAM16RGB[2][2];

    const rD = vc.rgbD[0] * rT;
    const gD = vc.rgbD[1] * gT;
    const bD = vc.rgbD[2] * bT;

    const rAF = Math.pow((vc.fl * Math.abs(rD)) / 100.0, 0.42);
    const gAF = Math.pow((vc.fl * Math.abs(gD)) / 100.0, 0.42);
    const bAF = Math.pow((vc.fl * Math.abs(bD)) / 100.0, 0.42);

    const rA = (signum(rD) * 400.0 * rAF) / (rAF + 27.13);
    const gA = (signum(gD) * 400.0 * gAF) / (gAF + 27.13);
    const bA = (signum(bD) * 400.0 * bAF) / (bAF + 27.13);

    const a = (11.0 * rA - 12.0 * gA + bA) / 11.0;
    const b = (rA + gA - 2.0 * bA) / 9.0;
    const u = (20.0 * rA + 20.0 * gA + 21.0 * bA) / 20.0;
    const p2 = (40.0 * rA + 20.0 * gA + bA) / 20.0;

    const atanDegrees = (Math.atan2(b, a) * 180.0) / Math.PI;
    const hue =
      atanDegrees < 0 ? atanDegrees + 360.0 : atanDegrees >= 360 ? atanDegrees - 360.0 : atanDegrees;

    const ac = p2 * vc.nbb;
    const j = 100.0 * Math.pow(ac / vc.aw, vc.c * vc.z);
    const huePrime = hue < 20.14 ? hue + 360.0 : hue;
    const eHue = 0.25 * (Math.cos((huePrime * Math.PI) / 180.0 + 2.0) + 3.8);
    const p1 = (50000.0 / 13.0) * eHue * vc.nc * vc.ncb;
    const t = (p1 * Math.hypot(a, b)) / (u + 0.305);
    const alpha = Math.pow(1.64 - Math.pow(0.29, vc.n), 0.73) * Math.pow(t, 0.9);
    const c = alpha * Math.sqrt(j / 100.0);

    return new Cam16(hue, c, j);
  }
}

// ===== HctSolver & Hct =====

const SCALED_DISCOUNT_FROM_LINRGB = [
  [0.001200833568784504, 0.002389694492170889, 0.0002795742885861124],
  [0.0005891086651375999, 0.0029785502573438758, 0.0003270666104008398],
  [0.00010146692491640572, 0.0005364214359186694, 0.0032979401770712076],
];

const LINRGB_FROM_SCALED_DISCOUNT = [
  [1373.2198709594231, -1100.4251190754821, -7.278681089101213],
  [-271.815969077903, 559.6580465940733, -32.46047482791194],
  [1.9622899599665666, -57.173814538844006, 308.7233197812385],
];

const Y_FROM_LINRGB = [0.2126, 0.7152, 0.0722];

const CRITICAL_PLANES = Array.from({ length: 256 }, (_, k) =>
  linearized(k + 0.5)
);

function chromaticAdaptation(component: number): number {
  const af = Math.pow(Math.abs(component), 0.42);
  return (signum(component) * 400.0 * af) / (af + 27.13);
}

function inverseChromaticAdaptation(adapted: number): number {
  const abs = Math.abs(adapted);
  const base = Math.max(0, (27.13 * abs) / (400.0 - abs));
  return signum(adapted) * Math.pow(base, 1.0 / 0.42);
}

function hueOfLinrgb(linrgb: [number, number, number]): number {
  const scaled = matrixMultiply(linrgb, SCALED_DISCOUNT_FROM_LINRGB);
  const rA = chromaticAdaptation(scaled[0]);
  const gA = chromaticAdaptation(scaled[1]);
  const bA = chromaticAdaptation(scaled[2]);
  const a = (11.0 * rA - 12.0 * gA + bA) / 11.0;
  const b = (rA + gA - 2.0 * bA) / 9.0;
  return Math.atan2(b, a);
}

function sanitizeRadians(angle: number): number {
  return (angle + Math.PI * 8) % (Math.PI * 2);
}

function areInCyclicOrder(a: number, b: number, c: number): boolean {
  return sanitizeRadians(b - a) < sanitizeRadians(c - a);
}

function nthVertex(y: number, n: number): [number, number, number] {
  const kR = Y_FROM_LINRGB[0];
  const kG = Y_FROM_LINRGB[1];
  const kB = Y_FROM_LINRGB[2];
  const coordA = n % 4 <= 1 ? 0.0 : 100.0;
  const coordB = n % 2 === 0 ? 0.0 : 100.0;
  const isBounded = (v: number) => 0.0 <= v && v <= 100.0;

  if (n < 4) {
    const r = (y - coordA * kG - coordB * kB) / kR;
    return isBounded(r) ? [r, coordA, coordB] : [-1, -1, -1];
  } else if (n < 8) {
    const g = (y - coordB * kR - coordA * kB) / kG;
    return isBounded(g) ? [coordB, g, coordA] : [-1, -1, -1];
  } else {
    const b = (y - coordA * kR - coordB * kG) / kB;
    return isBounded(b) ? [coordA, coordB, b] : [-1, -1, -1];
  }
}

function bisectToSegment(y: number, targetHue: number): [[number, number, number], [number, number, number]] {
  let left: [number, number, number] = [-1, -1, -1];
  let right: [number, number, number] = [-1, -1, -1];
  let leftHue = 0;
  let rightHue = 0;
  let initialized = false;
  let uncut = true;
  for (let n = 0; n < 12; n++) {
    const mid = nthVertex(y, n);
    if (mid[0] < 0) continue;
    const midHue = hueOfLinrgb(mid);
    if (!initialized) {
      left = mid;
      right = mid;
      leftHue = midHue;
      rightHue = midHue;
      initialized = true;
      continue;
    }
    if (uncut || areInCyclicOrder(leftHue, midHue, rightHue)) {
      uncut = false;
      if (areInCyclicOrder(leftHue, targetHue, midHue)) {
        right = mid;
        rightHue = midHue;
      } else {
        left = mid;
        leftHue = midHue;
      }
    }
  }
  return [left, right];
}

function trueDelinearized(rgbComponent: number): number {
  const normalized = rgbComponent / 100.0;
  const delin =
    normalized <= 0.0031308
      ? normalized * 12.92
      : 1.055 * Math.pow(normalized, 1.0 / 2.4) - 0.055;
  return delin * 255.0;
}

function bisectToLimit(y: number, targetHue: number): [number, number, number] {
  const segment = bisectToSegment(y, targetHue);
  let left = segment[0];
  let leftHue = hueOfLinrgb(left);
  let right = segment[1];

  for (let axis = 0; axis < 3; axis++) {
    if (left[axis] !== right[axis]) {
      let lPlane: number;
      let rPlane: number;
      if (left[axis] < right[axis]) {
        lPlane = Math.floor(trueDelinearized(left[axis]) - 0.5);
        rPlane = Math.ceil(trueDelinearized(right[axis]) - 0.5);
      } else {
        lPlane = Math.ceil(trueDelinearized(left[axis]) - 0.5);
        rPlane = Math.floor(trueDelinearized(right[axis]) - 0.5);
      }
      for (let i = 0; i < 8; i++) {
        if (Math.abs(rPlane - lPlane) <= 1) break;
        const mPlane = clampInt(0, 255, Math.floor((lPlane + rPlane) / 2));
        const coord = CRITICAL_PLANES[mPlane];
        const t = (coord - left[axis]) / (right[axis] - left[axis]);
        const mid: [number, number, number] = [
          left[0] + (right[0] - left[0]) * t,
          left[1] + (right[1] - left[1]) * t,
          left[2] + (right[2] - left[2]) * t,
        ];
        const midHue = hueOfLinrgb(mid);
        if (areInCyclicOrder(leftHue, targetHue, midHue)) {
          right = mid;
          rPlane = mPlane;
        } else {
          left = mid;
          leftHue = midHue;
          lPlane = mPlane;
        }
      }
    }
  }
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2, (left[2] + right[2]) / 2];
}

function findResultByJ(hueRadians: number, chroma: number, y: number): number {
  let j = Math.sqrt(y) * 11.0;
  const vc = DEFAULT_VC;
  const tInnerCoeff = 1 / Math.pow(1.64 - Math.pow(0.29, vc.n), 0.73);
  const eHue = 0.25 * (Math.cos(hueRadians + 2.0) + 3.8);
  const p1 = eHue * (50000.0 / 13.0) * vc.nc * vc.ncb;
  const hSin = Math.sin(hueRadians);
  const hCos = Math.cos(hueRadians);

  for (let round = 0; round < 5; round++) {
    const jNorm = j / 100.0;
    const alpha = chroma === 0 || j === 0 ? 0 : chroma / Math.sqrt(jNorm);
    const t = Math.pow(alpha * tInnerCoeff, 1.0 / 0.9);
    const ac = vc.aw * Math.pow(jNorm, 1.0 / vc.c / vc.z);
    const p2 = ac / vc.nbb;
    const gamma = (23.0 * (p2 + 0.305) * t) / (23.0 * p1 + 11.0 * t * hCos + 108.0 * t * hSin);
    const a = gamma * hCos;
    const b = gamma * hSin;
    const rA = (460.0 * p2 + 451.0 * a + 288.0 * b) / 1403.0;
    const gA = (460.0 * p2 - 891.0 * a - 261.0 * b) / 1403.0;
    const bA = (460.0 * p2 - 220.0 * a - 6300.0 * b) / 1403.0;
    const linrgb = matrixMultiply(
      [
        inverseChromaticAdaptation(rA),
        inverseChromaticAdaptation(gA),
        inverseChromaticAdaptation(bA),
      ],
      LINRGB_FROM_SCALED_DISCOUNT
    );
    if (linrgb[0] < 0 || linrgb[1] < 0 || linrgb[2] < 0) return 0;
    const fnj =
      Y_FROM_LINRGB[0] * linrgb[0] + Y_FROM_LINRGB[1] * linrgb[1] + Y_FROM_LINRGB[2] * linrgb[2];
    if (fnj <= 0) return 0;
    if (round === 4 || Math.abs(fnj - y) < 0.002) {
      if (linrgb[0] > 100.01 || linrgb[1] > 100.01 || linrgb[2] > 100.01) return 0;
      return argbFromLinrgb(linrgb);
    }
    j = j - ((fnj - y) * j) / (2 * fnj);
  }
  return 0;
}

export function solveHctToInt(hueDegrees: number, chroma: number, lstar: number): number {
  if (chroma < 0.0001 || lstar < 0.0001 || lstar > 99.9999) {
    return argbFromLstar(lstar);
  }
  const hDeg = sanitizeDegreesDouble(hueDegrees);
  const hRad = (hDeg / 180.0) * Math.PI;
  const y = yFromLstar(lstar);
  const exact = findResultByJ(hRad, chroma, y);
  if (exact !== 0) return exact;
  return argbFromLinrgb(bisectToLimit(y, hRad));
}

export class Hct {
  public readonly hue: number;
  public readonly chroma: number;
  public readonly tone: number;
  public readonly argb: number;

  private constructor(argb: number) {
    this.argb = argb >>> 0;
    const cam = Cam16.fromInt(this.argb);
    this.hue = cam.hue;
    this.chroma = cam.chroma;
    this.tone = lstarFromArgb(this.argb);
  }

  static fromInt(argb: number): Hct {
    return new Hct(argb);
  }

  static from(hue: number, chroma: number, tone: number): Hct {
    return new Hct(solveHctToInt(hue, chroma, tone));
  }

  toInt(): number {
    return this.argb;
  }
}

// ===== TonalPalette & Contrast =====

export class TonalPalette {
  private readonly cache = new Map<number, number>();
  public readonly hue: number;
  public readonly chroma: number;
  public readonly keyColor: Hct;

  private constructor(hue: number, chroma: number, keyColor: Hct) {
    this.hue = hue;
    this.chroma = chroma;
    this.keyColor = keyColor;
  }

  static fromHueAndChroma(hue: number, chroma: number): TonalPalette {
    const keyColor = TonalPalette.createKeyColor(hue, chroma);
    return new TonalPalette(hue, chroma, keyColor);
  }

  static fromInt(argb: number): TonalPalette {
    const hct = Hct.fromInt(argb);
    return new TonalPalette(hct.hue, hct.chroma, hct);
  }

  private static createKeyColor(hue: number, requestedChroma: number): Hct {
    const pivotTone = 50;
    const epsilon = 0.01;
    const chromaCache = new Map<number, number>();
    const maxChroma = (t: number): number => {
      const cached = chromaCache.get(t);
      if (cached !== undefined) return cached;
      const c = Hct.from(hue, 200.0, t).chroma;
      chromaCache.set(t, c);
      return c;
    };

    let lowerTone = 0;
    let upperTone = 100;
    while (lowerTone < upperTone) {
      const midTone = Math.floor((lowerTone + upperTone) / 2);
      const isAscending = maxChroma(midTone) < maxChroma(midTone + 1);
      const sufficientChroma = maxChroma(midTone) >= requestedChroma - epsilon;
      if (sufficientChroma) {
        if (Math.abs(lowerTone - pivotTone) < Math.abs(upperTone - pivotTone)) {
          upperTone = midTone;
        } else {
          if (lowerTone === midTone) {
            return Hct.from(hue, requestedChroma, lowerTone);
          }
          lowerTone = midTone;
        }
      } else if (isAscending) {
        lowerTone = midTone + 1;
      } else {
        upperTone = midTone;
      }
    }
    return Hct.from(hue, requestedChroma, lowerTone);
  }

  tone(tone: number): number {
    const t = Math.round(tone);
    const cached = this.cache.get(t);
    if (cached !== undefined) return cached;
    const argb = Hct.from(this.hue, this.chroma, tone).toInt();
    this.cache.set(t, argb);
    return argb;
  }

  getHct(tone: number): Hct {
    return Hct.from(this.hue, this.chroma, tone);
  }
}

export function ratioOfYs(y1: number, y2: number): number {
  const lighter = Math.max(y1, y2);
  const darker = lighter === y2 ? y1 : y2;
  return (lighter + 5.0) / (darker + 5.0);
}

export function ratioOfTones(t1: number, t2: number): number {
  return ratioOfYs(yFromLstar(t1), yFromLstar(t2));
}

export function contrastRatioHex(hexA: string, hexB: string): number {
  const lumA = yFromLstar(lstarFromArgb(argbFromHex(hexA)));
  const lumB = yFromLstar(lstarFromArgb(argbFromHex(hexB)));
  return ratioOfYs(lumA, lumB);
}

function lighterTone(tone: number, ratio: number): number {
  if (tone < 0 || tone > 100) return -1;
  const darkY = yFromLstar(tone);
  const lightY = ratio * (darkY + 5.0) - 5.0;
  if (lightY < 0 || lightY > 100) return -1;
  const realContrast = ratioOfYs(lightY, darkY);
  if (realContrast < ratio && Math.abs(realContrast - ratio) > 0.04) return -1;
  const ret = lstarFromY(lightY) + 0.4;
  return ret >= 0 && ret <= 100 ? ret : -1;
}

function darkerTone(tone: number, ratio: number): number {
  if (tone < 0 || tone > 100) return -1;
  const lightY = yFromLstar(tone);
  const darkY = (lightY + 5.0) / ratio - 5.0;
  if (darkY < 0 || darkY > 100) return -1;
  const realContrast = ratioOfYs(lightY, darkY);
  if (realContrast < ratio && Math.abs(realContrast - ratio) > 0.04) return -1;
  const ret = lstarFromY(darkY) - 0.4;
  return ret >= 0 && ret <= 100 ? ret : -1;
}

function foregroundToneForContrast(bgTone: number, ratio: number): number {
  const lighter = lighterTone(bgTone, ratio);
  const darker = darkerTone(bgTone, ratio);
  const lighterSafe = lighter < 0 ? 100 : lighter;
  const darkerSafe = darker < 0 ? 0 : darker;
  const lighterRatio = ratioOfTones(lighterSafe, bgTone);
  const darkerRatio = ratioOfTones(darkerSafe, bgTone);
  const preferLight = bgTone < 60;
  if (preferLight) {
    return lighterRatio >= ratio || lighterRatio >= darkerRatio ? lighterSafe : darkerSafe;
  }
  return darkerRatio >= ratio || darkerRatio >= lighterRatio ? darkerSafe : lighterSafe;
}

// ===== DynamicScheme: SchemeTonalSpot & SchemeExpressive =====

const EXPRESSIVE_HUES = [0, 21, 51, 121, 151, 191, 271, 321, 360];
const EXPRESSIVE_SEC_ROT = [45, 95, 45, 20, 45, 90, 45, 45, 45];
const EXPRESSIVE_TER_ROT = [120, 120, 20, 45, 20, 15, 20, 120, 120];

function getRotatedHue(hct: Hct, hues: number[], rotations: number[]): number {
  const h = hct.hue;
  for (let i = 0; i <= hues.length - 2; i++) {
    if (h >= hues[i] && h < hues[i + 1]) {
      return sanitizeDegreesDouble(h + rotations[i]);
    }
  }
  return h;
}

function buildSchemePalettes(
  sourceHct: Hct,
  variant: ThemeVariant,
  monochrome: boolean
): {
  primaryPalette: TonalPalette;
  secondaryPalette: TonalPalette;
  tertiaryPalette: TonalPalette;
  neutralPalette: TonalPalette;
  neutralVariantPalette: TonalPalette;
} {
  if (monochrome) {
    const h = sourceHct.hue;
    return {
      primaryPalette: TonalPalette.fromHueAndChroma(h, 4.0),
      secondaryPalette: TonalPalette.fromHueAndChroma(h, 4.0),
      tertiaryPalette: TonalPalette.fromHueAndChroma(h, 6.0),
      neutralPalette: TonalPalette.fromHueAndChroma(h, 3.0),
      neutralVariantPalette: TonalPalette.fromHueAndChroma(h, 4.0),
    };
  }
  if (variant === 'expressive') {
    return {
      primaryPalette: TonalPalette.fromHueAndChroma(
        sanitizeDegreesDouble(sourceHct.hue + 240.0),
        40.0
      ),
      secondaryPalette: TonalPalette.fromHueAndChroma(
        getRotatedHue(sourceHct, EXPRESSIVE_HUES, EXPRESSIVE_SEC_ROT),
        24.0
      ),
      tertiaryPalette: TonalPalette.fromHueAndChroma(
        getRotatedHue(sourceHct, EXPRESSIVE_HUES, EXPRESSIVE_TER_ROT),
        32.0
      ),
      neutralPalette: TonalPalette.fromHueAndChroma(
        sanitizeDegreesDouble(sourceHct.hue + 15.0),
        8.0
      ),
      neutralVariantPalette: TonalPalette.fromHueAndChroma(
        sanitizeDegreesDouble(sourceHct.hue + 15.0),
        12.0
      ),
    };
  }
  // SchemeTonalSpot (Android 12-17 standard default)
  return {
    primaryPalette: TonalPalette.fromHueAndChroma(sourceHct.hue, 36.0),
    secondaryPalette: TonalPalette.fromHueAndChroma(sourceHct.hue, 16.0),
    tertiaryPalette: TonalPalette.fromHueAndChroma(
      sanitizeDegreesDouble(sourceHct.hue + 60.0),
      24.0
    ),
    neutralPalette: TonalPalette.fromHueAndChroma(sourceHct.hue, 6.0),
    neutralVariantPalette: TonalPalette.fromHueAndChroma(sourceHct.hue, 8.0),
  };
}

function resolvePairWithContrast(
  palette: TonalPalette,
  bgTone: number,
  desiredFgTone: number,
  minRatio = 4.5
): { bg: string; fg: string; bgTone: number; fgTone: number } {
  const bgHct = palette.getHct(bgTone);
  const bgHex = hexFromArgb(bgHct.toInt());
  let fgHct = palette.getHct(desiredFgTone);
  let fgHex = hexFromArgb(fgHct.toInt());

  if (contrastRatioHex(bgHex, fgHex) < minRatio) {
    const safeTone = foregroundToneForContrast(bgHct.tone, minRatio);
    fgHct = palette.getHct(safeTone);
    fgHex = hexFromArgb(fgHct.toInt());
  }
  return { bg: bgHex, fg: fgHex, bgTone: bgHct.tone, fgTone: fgHct.tone };
}

const KEY_TONE_STEPS = [95, 90, 80, 60, 40, 20];

export function buildM3Theme(
  seedHex: string,
  variant: ThemeVariant,
  isDark: boolean,
  options?: { isMonochrome?: boolean }
): M3ThemeTokens {
  const seedArgb = argbFromHex(seedHex);
  const sourceHct = Hct.fromInt(seedArgb);
  const isMonochrome = Boolean(options?.isMonochrome);
  const {
    primaryPalette,
    secondaryPalette,
    tertiaryPalette,
    neutralPalette,
    neutralVariantPalette,
  } = buildSchemePalettes(sourceHct, variant, isMonochrome);

  // Surface tokens (MaterialDynamicColors.java)
  const surfaceTone = isDark ? 6 : 98;
  const surfaceLowestTone = isDark ? 4 : 100;
  const surfaceLowTone = isDark ? 10 : 96;
  const surfaceDefaultTone = isDark ? 12 : 94;
  const surfaceHighTone = isDark ? 17 : 92;
  const surfaceHighestTone = isDark ? 22 : 90;

  const surface = hexFromArgb(neutralPalette.tone(surfaceTone));
  const surfaceContainerLowest = hexFromArgb(neutralPalette.tone(surfaceLowestTone));
  const surfaceContainerLow = hexFromArgb(neutralPalette.tone(surfaceLowTone));
  const surfaceContainer = hexFromArgb(neutralPalette.tone(surfaceDefaultTone));
  const surfaceContainerHigh = hexFromArgb(neutralPalette.tone(surfaceHighTone));
  const surfaceContainerHighest = hexFromArgb(neutralPalette.tone(surfaceHighestTone));

  const onSurface = resolvePairWithContrast(
    neutralPalette,
    surfaceHighTone,
    isDark ? 90 : 10,
    7.0
  ).fg;
  const onSurfaceVariant = resolvePairWithContrast(
    neutralVariantPalette,
    surfaceTone,
    isDark ? 80 : 30,
    4.5
  ).fg;

  const outline = hexFromArgb(neutralVariantPalette.tone(isDark ? 60 : 50));
  const outlineVariant = hexFromArgb(neutralVariantPalette.tone(isDark ? 30 : 80));
  const inverseSurface = hexFromArgb(neutralPalette.tone(isDark ? 90 : 20));
  const inverseOnSurface = resolvePairWithContrast(
    neutralPalette,
    isDark ? 90 : 20,
    isDark ? 20 : 95,
    4.5
  ).fg;

  // Primary / Container pairs (Contrast >= 4.5 guaranteed across all hues)
  const primaryPair = resolvePairWithContrast(
    primaryPalette,
    isMonochrome ? (isDark ? 88 : 22) : isDark ? 80 : 40,
    isMonochrome ? (isDark ? 14 : 100) : isDark ? 20 : 100,
    4.5
  );
  const primaryContainerPair = resolvePairWithContrast(
    primaryPalette,
    isMonochrome ? (isDark ? 24 : 90) : isDark ? 30 : 90,
    isMonochrome ? (isDark ? 92 : 16) : isDark ? 90 : 30,
    4.5
  );
  const secondaryPair = resolvePairWithContrast(
    secondaryPalette,
    isDark ? 80 : 40,
    isDark ? 20 : 100,
    4.5
  );
  const secondaryContainerPair = resolvePairWithContrast(
    secondaryPalette,
    isDark ? 30 : 90,
    isDark ? 90 : 30,
    4.5
  );
  const tertiaryPair = resolvePairWithContrast(
    tertiaryPalette,
    isDark ? 80 : 40,
    isDark ? 20 : 100,
    4.5
  );
  const tertiaryContainerPair = resolvePairWithContrast(
    tertiaryPalette,
    isDark ? 30 : 90,
    isDark ? 90 : 30,
    4.5
  );
  const inversePrimary = hexFromArgb(primaryPalette.tone(isDark ? 40 : 80));

  const mapTones = (p: TonalPalette) => ({
    hue: p.hue,
    chroma: p.chroma,
    tones: KEY_TONE_STEPS.map((tone) => ({ tone, hex: hexFromArgb(p.tone(tone)) })),
  });

  return {
    seedHex: hexFromArgb(seedArgb),
    variant,
    isDark,
    isMonochrome,
    hct: { hue: sourceHct.hue, chroma: sourceHct.chroma, tone: sourceHct.tone },
    primary: primaryPair.bg,
    onPrimary: primaryPair.fg,
    primaryContainer: primaryContainerPair.bg,
    onPrimaryContainer: primaryContainerPair.fg,
    secondary: secondaryPair.bg,
    onSecondary: secondaryPair.fg,
    secondaryContainer: secondaryContainerPair.bg,
    onSecondaryContainer: secondaryContainerPair.fg,
    tertiary: tertiaryPair.bg,
    onTertiary: tertiaryPair.fg,
    tertiaryContainer: tertiaryContainerPair.bg,
    onTertiaryContainer: tertiaryContainerPair.fg,
    surface,
    surfaceContainerLowest,
    surfaceContainerLow,
    surfaceContainer,
    surfaceContainerHigh,
    surfaceContainerHighest,
    onSurface,
    onSurfaceVariant,
    outline,
    outlineVariant,
    inverseSurface,
    inverseOnSurface,
    inversePrimary,
    palettes: {
      primary: mapTones(primaryPalette),
      secondary: mapTones(secondaryPalette),
      tertiary: mapTones(tertiaryPalette),
      neutral: mapTones(neutralPalette),
    },
  };
}

export function hexToRgb01(hex: string): [number, number, number] {
  const argb = argbFromHex(hex);
  return [
    redFromArgb(argb) / 255,
    greenFromArgb(argb) / 255,
    blueFromArgb(argb) / 255,
  ];
}

export function hexToRgbaWave(
  hex: string,
  alpha: number
): { r: number; g: number; b: number; a: number } {
  const [r, g, b] = hexToRgb01(hex);
  return { r, g, b, a: alpha };
}

export function hexWithAlpha(hex: string, alpha: number): string {
  const argb = argbFromHex(hex);
  return `rgba(${redFromArgb(argb)}, ${greenFromArgb(argb)}, ${blueFromArgb(argb)}, ${alpha})`;
}

// ===== Image QuantizerWsmeans (Lab) + Score.java =====

function quantizeWsmeans(inputPixels: number[], maxColors = 128): Map<number, number> {
  const pixelToCount = new Map<number, number>();
  const points: [number, number, number][] = [];
  const pixels: number[] = [];

  for (let i = 0; i < inputPixels.length; i++) {
    const px = inputPixels[i] >>> 0;
    const prev = pixelToCount.get(px);
    if (prev === undefined) {
      points.push(labFromArgb(px));
      pixels.push(px);
      pixelToCount.set(px, 1);
    } else {
      pixelToCount.set(px, prev + 1);
    }
  }

  const pointCount = points.length;
  if (pointCount === 0) return new Map([[0xff4285f4 >>> 0, 1]]);
  const counts = pixels.map((px) => pixelToCount.get(px) ?? 1);
  const clusterCount = Math.min(maxColors, pointCount);

  // Deterministic initial clusters evenly distributed across sorted unique pixels
  const clusters: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(pointCount / clusterCount));
  for (let i = 0; i < clusterCount; i++) {
    const pt = points[Math.min(i * step, pointCount - 1)];
    clusters.push([pt[0], pt[1], pt[2]]);
  }

  // Deterministic LCG matching QuantizerWsmeans reproducible assignment
  let rng = 0x42688;
  const clusterIndices = new Int32Array(pointCount);
  for (let i = 0; i < pointCount; i++) {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    clusterIndices[i] = rng % clusterCount;
  }

  const distLab = (a: [number, number, number], b: [number, number, number]) => {
    const dl = a[0] - b[0];
    const da = a[1] - b[1];
    const db = a[2] - b[2];
    return dl * dl + da * da + db * db;
  };

  const distanceMatrix: { index: number; distance: number }[][] = Array.from(
    { length: clusterCount },
    () => Array.from({ length: clusterCount }, () => ({ index: 0, distance: 0 }))
  );
  const pixelCountSums = new Int32Array(clusterCount);

  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < clusterCount; i++) {
      for (let j = i + 1; j < clusterCount; j++) {
        const d = distLab(clusters[i], clusters[j]);
        distanceMatrix[i][j].index = j;
        distanceMatrix[i][j].distance = d;
        distanceMatrix[j][i].index = i;
        distanceMatrix[j][i].distance = d;
      }
      distanceMatrix[i][i].index = i;
      distanceMatrix[i][i].distance = 0;
      distanceMatrix[i].sort((a, b) => a.distance - b.distance);
    }

    let pointsMoved = 0;
    for (let i = 0; i < pointCount; i++) {
      const point = points[i];
      const prevIdx = clusterIndices[i];
      const prevDist = distLab(point, clusters[prevIdx]);
      let minDist = prevDist;
      let newIdx = -1;
      for (let j = 0; j < clusterCount; j++) {
        if (distanceMatrix[prevIdx][j].distance >= 4 * prevDist) continue;
        const d = distLab(point, clusters[j]);
        if (d < minDist) {
          minDist = d;
          newIdx = j;
        }
      }
      if (newIdx !== -1 && Math.abs(Math.sqrt(minDist) - Math.sqrt(prevDist)) > 3.0) {
        pointsMoved++;
        clusterIndices[i] = newIdx;
      }
    }

    if (pointsMoved === 0 && iter !== 0) break;

    const sumL = new Float64Array(clusterCount);
    const sumA = new Float64Array(clusterCount);
    const sumB = new Float64Array(clusterCount);
    pixelCountSums.fill(0);

    for (let i = 0; i < pointCount; i++) {
      const cIdx = clusterIndices[i];
      const w = counts[i];
      pixelCountSums[cIdx] += w;
      sumL[cIdx] += points[i][0] * w;
      sumA[cIdx] += points[i][1] * w;
      sumB[cIdx] += points[i][2] * w;
    }

    for (let i = 0; i < clusterCount; i++) {
      const w = pixelCountSums[i];
      if (w === 0) {
        clusters[i] = [0, 0, 0];
      } else {
        clusters[i] = [sumL[i] / w, sumA[i] / w, sumB[i] / w];
      }
    }
  }

  const out = new Map<number, number>();
  for (let i = 0; i < clusterCount; i++) {
    const count = pixelCountSums[i];
    if (count === 0) continue;
    const argb = argbFromLab(clusters[i][0], clusters[i][1], clusters[i][2]);
    if (!out.has(argb)) {
      out.set(argb, count);
    }
  }
  return out;
}

/** Exact MCU Score.score() implementation */
export function scoreWallpaperColors(
  colorsToPopulation: Map<number, number>,
  maxColorCount = 4,
  fallbackArgb = 0xff4285f4 >>> 0
): number[] {
  const colorsHct: Hct[] = [];
  const huePopulation = new Float64Array(360);
  let populationSum = 0;

  for (const [argb, pop] of colorsToPopulation.entries()) {
    const hct = Hct.fromInt(argb);
    colorsHct.push(hct);
    const hue = clampInt(0, 359, Math.floor(hct.hue));
    huePopulation[hue] += pop;
    populationSum += pop;
  }

  if (populationSum <= 0) return [fallbackArgb];

  const hueExcitedProportions = new Float64Array(360);
  for (let hue = 0; hue < 360; hue++) {
    const proportion = huePopulation[hue] / populationSum;
    for (let i = hue - 14; i < hue + 16; i++) {
      hueExcitedProportions[sanitizeDegreesInt(i)] += proportion;
    }
  }

  const scored: { hct: Hct; score: number }[] = [];
  for (const hct of colorsHct) {
    const hue = sanitizeDegreesInt(Math.round(hct.hue));
    const proportion = hueExcitedProportions[hue];
    if (hct.chroma < 5.0 || proportion <= 0.01) continue;
    const proportionScore = proportion * 100.0 * 0.7;
    const chromaWeight = hct.chroma < 48.0 ? 0.1 : 0.3;
    const chromaScore = (hct.chroma - 48.0) * chromaWeight;
    scored.push({ hct, score: proportionScore + chromaScore });
  }
  scored.sort((a, b) => b.score - a.score);

  const chosen: Hct[] = [];
  for (let diffDeg = 90; diffDeg >= 15; diffDeg--) {
    chosen.length = 0;
    for (const entry of scored) {
      const duplicate = chosen.some(
        (c) => differenceDegrees(entry.hct.hue, c.hue) < diffDeg
      );
      if (!duplicate) {
        chosen.push(entry.hct);
      }
      if (chosen.length >= maxColorCount) break;
    }
    if (chosen.length >= maxColorCount) break;
  }

  if (chosen.length === 0) return [fallbackArgb];
  return chosen.map((c) => c.toInt());
}

export function extractWallpaperSeeds(rgbaBytes: Uint8ClampedArray, maxSeeds = 4): string[] {
  const argbs: number[] = [];
  for (let i = 0; i < rgbaBytes.length; i += 4) {
    const a = rgbaBytes[i + 3];
    if (a < 255) continue;
    argbs.push(argbFromRgb(rgbaBytes[i], rgbaBytes[i + 1], rgbaBytes[i + 2]));
  }
  if (argbs.length === 0) return ['#1A73E8'];
  const quantized = quantizeWsmeans(argbs, 64);
  const scored = scoreWallpaperColors(quantized, maxSeeds);
  return scored.map(hexFromArgb);
}

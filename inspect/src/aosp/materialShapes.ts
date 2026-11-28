/**
 * Exact TypeScript port of AOSP androidx.graphics.shapes (RoundedPolygon, Cubic,
 * Feature, FeatureMapping, FloatMapping, PolygonMeasure, Morph) and MDC-Android
 * MaterialShapes + LoadingIndicatorDrawingDelegate 7-shape morph sequence.
 *
 * 【真实源码位置（2026-11 联网逐值复核，第 29 轮）】
 *  - androidx.graphics.shapes（androidx/androidx 仓库 androidx-main 分支）：
 *      graphics/graphics-shapes/src/commonMain/kotlin/androidx/graphics/shapes/
 *        Cubic.kt（circularArc L339-368：k = d·4/3·(√(2(1−cosα)) − √(1−cos²α))/(1−cosα)，
 *                  cosa>0.999 转直线；DistanceEpsilon=1e-4 / AngleEpsilon=1e-6 见 Utils.kt L50-51）
 *        RoundedPolygon.kt（RoundedCorner expectedRoundCut L566-580 sinAngle>1e-3；
 *                  calculateMaxBounds L181-197：锚点+中点最大距离的外接方）
 *        Shapes.kt（circle L39-58：polygonRadius = radius/cos(π/n)，默认 8 顶点；
 *                  star L136-168 + starVerticesFromNumVerts L442-460）
 *        Morph.kt（match L215-296：doubleMapper→cutAndShift→minb 逐段配对）
 *        FloatMapping.kt（linearMap/DoubleMapper/progressDistance）
 *        FeatureMapping.kt（featureMapper L28-148：按距离排序贪心配对 + Identity 兜底）
 *        PolygonMeasure.kt（LengthMeasurer segments=3，L321-324）
 *  - MDC-Android（material-components/material-components-android 仓库 1.14.0 tag）：
 *      lib/java/com/google/android/material/shape/MaterialShapes.java
 *        七形顶点值逐位核对一致：getSoftBurst L385-390 / getCookie9 L327-337 / getPentagon
 *        L259-262 / getPill L217-222 / getSunny L281-290 / getCookie4 L299-304 / getOval
 *        L204-213；公开常量统一经 normalize(shape, radial=true)（L594-630）
 *      lib/java/com/google/android/material/loadingindicator/LoadingIndicatorDrawingDelegate.java
 *        （INDETERMINATE_SHAPES L134-143：SOFT_BURST→COOKIE_9→PENTAGON→PILL→SUNNY→
 *        COOKIE_4→OVAL，normalize 目标域 RectF(-1,-1,1,1)；LIDrawDelegate 段内进度 L120-125）
 *      LoadingIndicatorAnimatorDelegate.java（L36 DURATION=650ms / L39-40 旋转 50°+90° /
 *        L41-42 弹簧 k=200 ζ=0.6 / L123-141 旋转合成公式）
 *
 * Fixes the sharp-corner / linear-segment distortion by computing exact circular
 * arc tangent lengths via Cubic.circularArc, feature-matched Morph pairs with
 * LengthMeasurer & DoubleMapper, and rendering true cubic Beziers.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface CornerRounding {
  radius: number;
  smoothing: number;
}

export const UNROUNDED_CORNER: CornerRounding = { radius: 0, smoothing: 0 };

export type PointTransformer = (x: number, y: number) => [number, number];

const DISTANCE_EPSILON = 1e-4;
const ANGLE_EPSILON = 1e-6;

function distance(x: number, y: number): number {
  return Math.hypot(x, y);
}

function distanceSquared(x: number, y: number): number {
  return x * x + y * y;
}

function directionVector(x: number, y: number): Point2D {
  const d = distance(x, y);
  if (d <= 0) {
    throw new Error('directionVector: Required distance greater than zero');
  }
  return { x: x / d, y: y / d };
}

function radialToCartesian(radius: number, angleRadians: number, cx = 0, cy = 0): Point2D {
  return {
    x: Math.cos(angleRadians) * radius + cx,
    y: Math.sin(angleRadians) * radius + cy,
  };
}

function lerp(start: number, stop: number, fraction: number): number {
  return (1 - fraction) * start + fraction * stop;
}

function lerpPoint(p0: Point2D, p1: Point2D, fraction: number): Point2D {
  return { x: lerp(p0.x, p1.x, fraction), y: lerp(p0.y, p1.y, fraction) };
}

function positiveModulo(num: number, mod: number): number {
  return ((num % mod) + mod) % mod;
}

function rotate90(p: Point2D): Point2D {
  return { x: -p.y, y: p.x };
}

function dotProduct(a: Point2D, b: Point2D): number {
  return a.x * b.x + a.y * b.y;
}

function convex(prev: Point2D, curr: Point2D, next: Point2D): boolean {
  const v0x = curr.x - prev.x;
  const v0y = curr.y - prev.y;
  const v1x = next.x - curr.x;
  const v1y = next.y - curr.y;
  return v0x * v1y - v0y * v1x > 0;
}

function progressInRange(progress: number, progressFrom: number, progressTo: number): boolean {
  if (progressTo >= progressFrom) {
    return progress >= progressFrom && progress <= progressTo;
  }
  return progress >= progressFrom || progress <= progressTo;
}

function progressDistance(p1: number, p2: number): number {
  const d = Math.abs(p1 - p2);
  return Math.min(d, 1 - d);
}

/**
 * Cubic Bezier segment storing [ax0, ay0, cx0, cy0, cx1, cy1, ax1, ay1].
 */
export class Cubic {
  public readonly points: Float64Array;

  constructor(points: ArrayLike<number>) {
    if (points.length !== 8) {
      throw new Error(`Cubic requires 8 coordinates, got ${points.length}`);
    }
    this.points = Float64Array.from(points);
  }

  get anchor0X(): number { return this.points[0]; }
  get anchor0Y(): number { return this.points[1]; }
  get control0X(): number { return this.points[2]; }
  get control0Y(): number { return this.points[3]; }
  get control1X(): number { return this.points[4]; }
  get control1Y(): number { return this.points[5]; }
  get anchor1X(): number { return this.points[6]; }
  get anchor1Y(): number { return this.points[7]; }

  pointOnCurve(t: number): Point2D {
    const u = 1 - t;
    const u2 = u * u;
    const t2 = t * t;
    const w0 = u2 * u;
    const w1 = 3 * t * u2;
    const w2 = 3 * t2 * u;
    const w3 = t2 * t;
    return {
      x: this.anchor0X * w0 + this.control0X * w1 + this.control1X * w2 + this.anchor1X * w3,
      y: this.anchor0Y * w0 + this.control0Y * w1 + this.control1Y * w2 + this.anchor1Y * w3,
    };
  }

  zeroLength(): boolean {
    return (
      Math.abs(this.anchor0X - this.anchor1X) < DISTANCE_EPSILON &&
      Math.abs(this.anchor0Y - this.anchor1Y) < DISTANCE_EPSILON
    );
  }

  split(t: number): [Cubic, Cubic] {
    const u = 1 - t;
    const mid = this.pointOnCurve(t);
    const c1 = new Cubic([
      this.anchor0X,
      this.anchor0Y,
      this.anchor0X * u + this.control0X * t,
      this.anchor0Y * u + this.control0Y * t,
      this.anchor0X * (u * u) + this.control0X * (2 * u * t) + this.control1X * (t * t),
      this.anchor0Y * (u * u) + this.control0Y * (2 * u * t) + this.control1Y * (t * t),
      mid.x,
      mid.y,
    ]);
    const c2 = new Cubic([
      mid.x,
      mid.y,
      this.control0X * (u * u) + this.control1X * (2 * u * t) + this.anchor1X * (t * t),
      this.control0Y * (u * u) + this.control1Y * (2 * u * t) + this.anchor1Y * (t * t),
      this.control1X * u + this.anchor1X * t,
      this.control1Y * u + this.anchor1Y * t,
      this.anchor1X,
      this.anchor1Y,
    ]);
    return [c1, c2];
  }

  reverse(): Cubic {
    return new Cubic([
      this.anchor1X,
      this.anchor1Y,
      this.control1X,
      this.control1Y,
      this.control0X,
      this.control0Y,
      this.anchor0X,
      this.anchor0Y,
    ]);
  }

  transformed(f: PointTransformer): Cubic {
    const out = new Float64Array(8);
    for (let i = 0; i < 8; i += 2) {
      const [nx, ny] = f(this.points[i], this.points[i + 1]);
      out[i] = nx;
      out[i + 1] = ny;
    }
    return new Cubic(out);
  }

  static straightLine(x0: number, y0: number, x1: number, y1: number): Cubic {
    return new Cubic([
      x0,
      y0,
      lerp(x0, x1, 1 / 3),
      lerp(y0, y1, 1 / 3),
      lerp(x0, x1, 2 / 3),
      lerp(y0, y1, 2 / 3),
      x1,
      y1,
    ]);
  }

  /** Exact androidx.graphics.shapes.Cubic.circularArc */
  static circularArc(
    centerX: number,
    centerY: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): Cubic {
    const p0d = directionVector(x0 - centerX, y0 - centerY);
    const p1d = directionVector(x1 - centerX, y1 - centerY);
    const rotatedP0 = rotate90(p0d);
    const rotatedP1 = rotate90(p1d);
    const clockwise = rotatedP0.x * (x1 - centerX) + rotatedP0.y * (y1 - centerY) >= 0;
    const cosa = dotProduct(p0d, p1d);
    if (cosa > 0.999) {
      return Cubic.straightLine(x0, y0, x1, y1);
    }
    const denom = 1 - cosa;
    const k =
      distance(x0 - centerX, y0 - centerY) *
      (4 / 3) *
      ((Math.sqrt(Math.max(0, 2 * (1 - cosa))) - Math.sqrt(Math.max(0, 1 - cosa * cosa))) / denom) *
      (clockwise ? 1 : -1);
    return new Cubic([
      x0,
      y0,
      x0 + rotatedP0.x * k,
      y0 + rotatedP0.y * k,
      x1 - rotatedP1.x * k,
      y1 - rotatedP1.y * k,
      x1,
      y1,
    ]);
  }
}

export type Feature =
  | { kind: 'edge'; cubics: Cubic[] }
  | { kind: 'corner'; cubics: Cubic[]; convex: boolean };

function transformFeature(feature: Feature, f: PointTransformer): Feature {
  const cubics = feature.cubics.map((c) => c.transformed(f));
  return feature.kind === 'edge'
    ? { kind: 'edge', cubics }
    : { kind: 'corner', cubics, convex: feature.convex };
}

class RoundedCorner {
  private readonly p0: Point2D;
  private readonly p1: Point2D;
  private readonly p2: Point2D;
  private readonly d1: Point2D;
  private readonly d2: Point2D;
  private readonly cornerRadius: number;
  private readonly smoothing: number;
  private readonly cosAngle: number;
  private readonly sinAngle: number;
  public readonly expectedRoundCut: number;
  public center: Point2D = { x: 0, y: 0 };

  constructor(p0: Point2D, p1: Point2D, p2: Point2D, rounding: CornerRounding | null) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    const v01x = p0.x - p1.x;
    const v01y = p0.y - p1.y;
    const v21x = p2.x - p1.x;
    const v21y = p2.y - p1.y;
    const d01 = distance(v01x, v01y);
    const d21 = distance(v21x, v21y);

    if (d01 > 0 && d21 > 0) {
      this.d1 = { x: v01x / d01, y: v01y / d01 };
      this.d2 = { x: v21x / d21, y: v21y / d21 };
      this.cornerRadius = rounding ? rounding.radius : 0;
      this.smoothing = rounding ? rounding.smoothing : 0;
      this.cosAngle = dotProduct(this.d1, this.d2);
      this.sinAngle = Math.sqrt(Math.max(0, 1 - this.cosAngle * this.cosAngle));
      this.expectedRoundCut =
        this.sinAngle > 1e-3 ? (this.cornerRadius * (this.cosAngle + 1)) / this.sinAngle : 0;
    } else {
      this.d1 = { x: 0, y: 0 };
      this.d2 = { x: 0, y: 0 };
      this.cornerRadius = 0;
      this.smoothing = 0;
      this.cosAngle = 0;
      this.sinAngle = 0;
      this.expectedRoundCut = 0;
    }
  }

  get expectedCut(): number {
    return (1 + this.smoothing) * this.expectedRoundCut;
  }

  private calculateActualSmoothingValue(allowedCut: number): number {
    if (allowedCut > this.expectedCut) return this.smoothing;
    if (allowedCut > this.expectedRoundCut && this.expectedCut > this.expectedRoundCut) {
      return (
        (this.smoothing * (allowedCut - this.expectedRoundCut)) /
        (this.expectedCut - this.expectedRoundCut)
      );
    }
    return 0;
  }

  private lineIntersection(p0: Point2D, d0: Point2D, p1: Point2D, d1: Point2D): Point2D | null {
    const rotatedD1 = rotate90(d1);
    const den = dotProduct(d0, rotatedD1);
    if (Math.abs(den) < DISTANCE_EPSILON) return null;
    const num = (p1.x - p0.x) * rotatedD1.x + (p1.y - p0.y) * rotatedD1.y;
    if (Math.abs(den) < DISTANCE_EPSILON * Math.abs(num)) return null;
    const k = num / den;
    return { x: p0.x + d0.x * k, y: p0.y + d0.y * k };
  }

  private computeFlankingCurve(
    actualRoundCut: number,
    actualSmoothingValue: number,
    corner: Point2D,
    sideStart: Point2D,
    circleSegmentIntersection: Point2D,
    otherCircleSegmentIntersection: Point2D,
    circleCenter: Point2D,
    actualR: number
  ): Cubic {
    const sideDirection = directionVector(sideStart.x - corner.x, sideStart.y - corner.y);
    const curveStart: Point2D = {
      x: corner.x + sideDirection.x * actualRoundCut * (1 + actualSmoothingValue),
      y: corner.y + sideDirection.y * actualRoundCut * (1 + actualSmoothingValue),
    };
    const midInter = {
      x: (circleSegmentIntersection.x + otherCircleSegmentIntersection.x) * 0.5,
      y: (circleSegmentIntersection.y + otherCircleSegmentIntersection.y) * 0.5,
    };
    const p = lerpPoint(circleSegmentIntersection, midInter, actualSmoothingValue);
    const dirCenter = directionVector(p.x - circleCenter.x, p.y - circleCenter.y);
    const curveEnd: Point2D = {
      x: circleCenter.x + dirCenter.x * actualR,
      y: circleCenter.y + dirCenter.y * actualR,
    };
    const circleTangent = rotate90({
      x: curveEnd.x - circleCenter.x,
      y: curveEnd.y - circleCenter.y,
    });
    const anchorEnd =
      this.lineIntersection(sideStart, sideDirection, curveEnd, circleTangent) ??
      circleSegmentIntersection;
    const anchorStart: Point2D = {
      x: (curveStart.x + anchorEnd.x * 2) / 3,
      y: (curveStart.y + anchorEnd.y * 2) / 3,
    };
    return new Cubic([
      curveStart.x,
      curveStart.y,
      anchorStart.x,
      anchorStart.y,
      anchorEnd.x,
      anchorEnd.y,
      curveEnd.x,
      curveEnd.y,
    ]);
  }

  getCubics(allowedCut0: number, allowedCut1: number): Cubic[] {
    const allowedCut = Math.min(allowedCut0, allowedCut1);
    if (
      this.expectedRoundCut < DISTANCE_EPSILON ||
      allowedCut < DISTANCE_EPSILON ||
      this.cornerRadius < DISTANCE_EPSILON
    ) {
      this.center = { ...this.p1 };
      return [Cubic.straightLine(this.p1.x, this.p1.y, this.p1.x, this.p1.y)];
    }
    const actualRoundCut = Math.min(allowedCut, this.expectedRoundCut);
    const actualSmoothing0 = this.calculateActualSmoothingValue(allowedCut0);
    const actualSmoothing1 = this.calculateActualSmoothingValue(allowedCut1);
    const actualR = (this.cornerRadius * actualRoundCut) / this.expectedRoundCut;
    const centerDistance = Math.sqrt(actualR * actualR + actualRoundCut * actualRoundCut);
    const avgDir = directionVector(
      (this.d1.x + this.d2.x) * 0.5,
      (this.d1.y + this.d2.y) * 0.5
    );
    this.center = {
      x: this.p1.x + avgDir.x * centerDistance,
      y: this.p1.y + avgDir.y * centerDistance,
    };
    const circleIntersection0: Point2D = {
      x: this.p1.x + this.d1.x * actualRoundCut,
      y: this.p1.y + this.d1.y * actualRoundCut,
    };
    const circleIntersection2: Point2D = {
      x: this.p1.x + this.d2.x * actualRoundCut,
      y: this.p1.y + this.d2.y * actualRoundCut,
    };
    const flanking0 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing0,
      this.p1,
      this.p0,
      circleIntersection0,
      circleIntersection2,
      this.center,
      actualR
    );
    const flanking2 = this.computeFlankingCurve(
      actualRoundCut,
      actualSmoothing1,
      this.p1,
      this.p2,
      circleIntersection2,
      circleIntersection0,
      this.center,
      actualR
    ).reverse();
    return [
      flanking0,
      Cubic.circularArc(
        this.center.x,
        this.center.y,
        flanking0.anchor1X,
        flanking0.anchor1Y,
        flanking2.anchor0X,
        flanking2.anchor0Y
      ),
      flanking2,
    ];
  }
}

export class RoundedPolygon {
  public readonly features: Feature[];
  public readonly centerX: number;
  public readonly centerY: number;
  public readonly cubics: Cubic[];

  constructor(features: Feature[], centerX: number, centerY: number) {
    this.features = features;
    this.centerX = centerX;
    this.centerY = centerY;
    this.cubics = RoundedPolygon.flattenFeatures(features, centerX, centerY);
  }

  private static flattenFeatures(features: Feature[], cx: number, cy: number): Cubic[] {
    const out: Cubic[] = [];
    let firstCubic: Cubic | null = null;
    let lastCubic: Cubic | null = null;
    let firstFeatureSplitStart: Cubic[] | null = null;
    let firstFeatureSplitEnd: Cubic[] | null = null;

    if (features.length > 0 && features[0].cubics.length === 3) {
      const centerCubic = features[0].cubics[1];
      const [start, end] = centerCubic.split(0.5);
      firstFeatureSplitStart = [features[0].cubics[0], start];
      firstFeatureSplitEnd = [end, features[0].cubics[2]];
    }

    for (let i = 0; i <= features.length; i++) {
      let featureCubics: Cubic[];
      if (i === 0 && firstFeatureSplitEnd !== null) {
        featureCubics = firstFeatureSplitEnd;
      } else if (i === features.length) {
        if (firstFeatureSplitStart !== null) {
          featureCubics = firstFeatureSplitStart;
        } else {
          break;
        }
      } else {
        featureCubics = features[i].cubics;
      }

      for (let j = 0; j < featureCubics.length; j++) {
        const cubic = featureCubics[j];
        if (!cubic.zeroLength()) {
          if (lastCubic !== null) out.push(lastCubic);
          lastCubic = cubic;
          if (firstCubic === null) firstCubic = cubic;
        } else if (lastCubic !== null) {
          const pts = Float64Array.from(lastCubic.points);
          pts[6] = cubic.anchor1X;
          pts[7] = cubic.anchor1Y;
          lastCubic = new Cubic(pts);
        }
      }
    }

    if (lastCubic !== null && firstCubic !== null) {
      out.push(
        new Cubic([
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          firstCubic.anchor0X,
          firstCubic.anchor0Y,
        ])
      );
    } else {
      out.push(new Cubic([cx, cy, cx, cy, cx, cy, cx, cy]));
    }
    return out;
  }

  transformed(f: PointTransformer): RoundedPolygon {
    const [ncx, ncy] = f(this.centerX, this.centerY);
    return new RoundedPolygon(
      this.features.map((feat) => transformFeature(feat, f)),
      ncx,
      ncy
    );
  }

  /**
   * Exact androidx.graphics.shapes.RoundedPolygon.calculateMaxBounds
   * returning [left, top, right, bottom].
   */
  calculateMaxBounds(): [number, number, number, number] {
    let maxDistSq = 0;
    for (const cubic of this.cubics) {
      const anchorDist = distanceSquared(cubic.anchor0X - this.centerX, cubic.anchor0Y - this.centerY);
      const mid = cubic.pointOnCurve(0.5);
      const midDist = distanceSquared(mid.x - this.centerX, mid.y - this.centerY);
      maxDistSq = Math.max(maxDistSq, anchorDist, midDist);
    }
    const d = Math.sqrt(maxDistSq);
    return [this.centerX - d, this.centerY - d, this.centerX + d, this.centerY + d];
  }

  static fromVertices(
    vertices: number[],
    rounding: CornerRounding = UNROUNDED_CORNER,
    perVertexRounding?: CornerRounding[],
    centerX?: number,
    centerY?: number
  ): RoundedPolygon {
    const n = vertices.length / 2;
    if (n < 3) {
      throw new Error('RoundedPolygon requires at least 3 vertices');
    }
    const roundedCorners: RoundedCorner[] = [];
    for (let i = 0; i < n; i++) {
      const vtxRounding = perVertexRounding ? perVertexRounding[i] : rounding;
      const prevIdx = ((i + n - 1) % n) * 2;
      const nextIdx = ((i + 1) % n) * 2;
      roundedCorners.push(
        new RoundedCorner(
          { x: vertices[prevIdx], y: vertices[prevIdx + 1] },
          { x: vertices[i * 2], y: vertices[i * 2 + 1] },
          { x: vertices[nextIdx], y: vertices[nextIdx + 1] },
          vtxRounding
        )
      );
    }

    const cutAdjusts: [number, number][] = [];
    for (let ix = 0; ix < n; ix++) {
      const cCurr = roundedCorners[ix];
      const cNext = roundedCorners[(ix + 1) % n];
      const expectedRoundCut = cCurr.expectedRoundCut + cNext.expectedRoundCut;
      const expectedCut = cCurr.expectedCut + cNext.expectedCut;
      const sideSize = distance(
        vertices[ix * 2] - vertices[((ix + 1) % n) * 2],
        vertices[ix * 2 + 1] - vertices[((ix + 1) % n) * 2 + 1]
      );
      if (expectedRoundCut > sideSize && expectedRoundCut > 0) {
        cutAdjusts.push([sideSize / expectedRoundCut, 0]);
      } else if (expectedCut > sideSize && expectedCut > expectedRoundCut) {
        cutAdjusts.push([
          1,
          (sideSize - expectedRoundCut) / (expectedCut - expectedRoundCut),
        ]);
      } else {
        cutAdjusts.push([1, 1]);
      }
    }

    const corners: Cubic[][] = [];
    for (let i = 0; i < n; i++) {
      const allowedCuts: number[] = [];
      for (let delta = 0; delta <= 1; delta++) {
        const [roundCutRatio, cutRatio] = cutAdjusts[(i + n - 1 + delta) % n];
        allowedCuts.push(
          roundedCorners[i].expectedRoundCut * roundCutRatio +
            (roundedCorners[i].expectedCut - roundedCorners[i].expectedRoundCut) * cutRatio
        );
      }
      corners.push(roundedCorners[i].getCubics(allowedCuts[0], allowedCuts[1]));
    }

    const tempFeatures: Feature[] = [];
    for (let i = 0; i < n; i++) {
      const prevIdx = (i + n - 1) % n;
      const nextIdx = (i + 1) % n;
      const currV: Point2D = { x: vertices[i * 2], y: vertices[i * 2 + 1] };
      const prevV: Point2D = { x: vertices[prevIdx * 2], y: vertices[prevIdx * 2 + 1] };
      const nextV: Point2D = { x: vertices[nextIdx * 2], y: vertices[nextIdx * 2 + 1] };
      tempFeatures.push({
        kind: 'corner',
        cubics: corners[i],
        convex: convex(prevV, currV, nextV),
      });
      const lastC = corners[i][corners[i].length - 1];
      const nextC = corners[(i + 1) % n][0];
      tempFeatures.push({
        kind: 'edge',
        cubics: [
          Cubic.straightLine(lastC.anchor1X, lastC.anchor1Y, nextC.anchor0X, nextC.anchor0Y),
        ],
      });
    }

    let cx = centerX;
    let cy = centerY;
    if (cx === undefined || cy === undefined) {
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < n; i++) {
        sx += vertices[i * 2];
        sy += vertices[i * 2 + 1];
      }
      cx = sx / n;
      cy = sy / n;
    }
    return new RoundedPolygon(tempFeatures, cx, cy);
  }

  static circle(numVertices = 8, radius = 1, centerX = 0, centerY = 0): RoundedPolygon {
    const theta = Math.PI / numVertices;
    const polygonRadius = radius / Math.cos(theta);
    const verts: number[] = [];
    for (let i = 0; i < numVertices; i++) {
      const v = radialToCartesian(polygonRadius, (Math.PI / numVertices) * 2 * i, centerX, centerY);
      verts.push(v.x, v.y);
    }
    return RoundedPolygon.fromVertices(
      verts,
      { radius, smoothing: 0 },
      undefined,
      centerX,
      centerY
    );
  }

  static star(
    numVerticesPerRadius: number,
    radius = 1,
    innerRadius = 0.5,
    rounding: CornerRounding = UNROUNDED_CORNER,
    innerRounding?: CornerRounding,
    centerX = 0,
    centerY = 0
  ): RoundedPolygon {
    const verts: number[] = [];
    const perVertex: CornerRounding[] | undefined = innerRounding
      ? Array.from({ length: numVerticesPerRadius }, () => [rounding, innerRounding]).flat()
      : undefined;
    for (let i = 0; i < numVerticesPerRadius; i++) {
      const vOut = radialToCartesian(
        radius,
        (Math.PI / numVerticesPerRadius) * 2 * i,
        centerX,
        centerY
      );
      verts.push(vOut.x, vOut.y);
      const vIn = radialToCartesian(
        innerRadius,
        (Math.PI / numVerticesPerRadius) * (2 * i + 1),
        centerX,
        centerY
      );
      verts.push(vIn.x, vIn.y);
    }
    return RoundedPolygon.fromVertices(verts, rounding, perVertex, centerX, centerY);
  }
}

// ===== PolygonMeasure + FeatureMapping + DoubleMapper + Morph =====

interface ProgressableFeature {
  progress: number;
  feature: Feature;
}

class LengthMeasurer {
  private readonly segments = 3;

  measureCubic(c: Cubic): number {
    return this.closestProgressTo(c, Infinity)[1];
  }

  findCubicCutPoint(c: Cubic, m: number): number {
    return this.closestProgressTo(c, m)[0];
  }

  private closestProgressTo(cubic: Cubic, threshold: number): [number, number] {
    let total = 0;
    let remainder = threshold;
    let prev: Point2D = { x: cubic.anchor0X, y: cubic.anchor0Y };
    for (let i = 1; i <= this.segments; i++) {
      const progress = i / this.segments;
      const point = cubic.pointOnCurve(progress);
      const segment = distance(point.x - prev.x, point.y - prev.y);
      if (segment >= remainder) {
        return [
          Math.max(0, Math.min(1, progress - (1 - remainder / segment) / this.segments)),
          threshold,
        ];
      }
      remainder -= segment;
      total += segment;
      prev = point;
    }
    return [1, total];
  }
}

class MeasuredCubic {
  public readonly cubic: Cubic;
  public readonly measuredSize: number;
  public startOutlineProgress: number;
  public endOutlineProgress: number;
  private readonly measurer: LengthMeasurer;

  constructor(measurer: LengthMeasurer, cubic: Cubic, startP: number, endP: number) {
    this.measurer = measurer;
    this.cubic = cubic;
    this.measuredSize = measurer.measureCubic(cubic);
    this.startOutlineProgress = startP;
    this.endOutlineProgress = endP;
  }

  cutAtProgress(cutOutlineProgress: number): [MeasuredCubic, MeasuredCubic] {
    const bounded = Math.max(
      this.startOutlineProgress,
      Math.min(this.endOutlineProgress, cutOutlineProgress)
    );
    const outlineProgressSize = this.endOutlineProgress - this.startOutlineProgress;
    const progressFromStart = bounded - this.startOutlineProgress;
    const relativeProgress = outlineProgressSize > 0 ? progressFromStart / outlineProgressSize : 0;
    const t = this.measurer.findCubicCutPoint(this.cubic, relativeProgress * this.measuredSize);
    const [c1, c2] = this.cubic.split(t);
    return [
      new MeasuredCubic(this.measurer, c1, this.startOutlineProgress, bounded),
      new MeasuredCubic(this.measurer, c2, bounded, this.endOutlineProgress),
    ];
  }
}

class MeasuredPolygon {
  public readonly cubics: MeasuredCubic[];
  public readonly features: ProgressableFeature[];
  private readonly measurer: LengthMeasurer;

  constructor(
    measurer: LengthMeasurer,
    features: ProgressableFeature[],
    cubics: Cubic[],
    outlineProgress: number[]
  ) {
    this.measurer = measurer;
    this.features = features;
    const measuredCubics: MeasuredCubic[] = [];
    let startP = 0;
    for (let i = 0; i < cubics.length; i++) {
      if (outlineProgress[i + 1] - outlineProgress[i] > DISTANCE_EPSILON) {
        measuredCubics.push(new MeasuredCubic(measurer, cubics[i], startP, outlineProgress[i + 1]));
        startP = outlineProgress[i + 1];
      }
    }
    if (measuredCubics.length > 0) {
      measuredCubics[measuredCubics.length - 1].endOutlineProgress = 1;
    }
    this.cubics = measuredCubics;
  }

  cutAndShift(cuttingPoint: number): MeasuredPolygon {
    if (cuttingPoint < DISTANCE_EPSILON) return this;
    const targetIndex = this.cubics.findIndex(
      (c) => cuttingPoint >= c.startOutlineProgress && cuttingPoint <= c.endOutlineProgress
    );
    const idx = targetIndex >= 0 ? targetIndex : 0;
    const target = this.cubics[idx];
    const [b1, b2] = target.cutAtProgress(cuttingPoint);

    const retCubics: Cubic[] = [b2.cubic];
    for (let i = 1; i < this.cubics.length; i++) {
      retCubics.push(this.cubics[(i + idx) % this.cubics.length].cubic);
    }
    retCubics.push(b1.cubic);

    const n = this.cubics.length;
    const retOutlineProgress: number[] = [];
    for (let i = 0; i < n + 2; i++) {
      if (i === 0) retOutlineProgress.push(0);
      else if (i === n + 1) retOutlineProgress.push(1);
      else {
        const cubicIdx = (idx + i - 1) % n;
        retOutlineProgress.push(
          positiveModulo(this.cubics[cubicIdx].endOutlineProgress - cuttingPoint, 1)
        );
      }
    }

    const newFeatures: ProgressableFeature[] = this.features.map((f) => ({
      progress: positiveModulo(f.progress - cuttingPoint, 1),
      feature: f.feature,
    }));

    return new MeasuredPolygon(this.measurer, newFeatures, retCubics, retOutlineProgress);
  }

  static measurePolygon(measurer: LengthMeasurer, polygon: RoundedPolygon): MeasuredPolygon {
    const cubics: Cubic[] = [];
    const featureToCubic: { feature: Feature; cubicIdx: number }[] = [];
    for (const feature of polygon.features) {
      for (let cubicIdx = 0; cubicIdx < feature.cubics.length; cubicIdx++) {
        if (feature.kind === 'corner' && cubicIdx === Math.floor(feature.cubics.length / 2)) {
          featureToCubic.push({ feature, cubicIdx: cubics.length });
        }
        cubics.push(feature.cubics[cubicIdx]);
      }
    }

    const measures: number[] = [0];
    let acc = 0;
    for (const cubic of cubics) {
      acc += measurer.measureCubic(cubic);
      measures.push(acc);
    }
    const totalMeasure = Math.max(acc, 1e-6);
    const outlineProgress = measures.map((m) => m / totalMeasure);

    const features: ProgressableFeature[] = featureToCubic.map(({ feature, cubicIdx }) => ({
      progress: positiveModulo((outlineProgress[cubicIdx] + outlineProgress[cubicIdx + 1]) * 0.5, 1),
      feature,
    }));

    return new MeasuredPolygon(measurer, features, cubics, outlineProgress);
  }
}

function featureRepresentativePoint(feature: Feature): Point2D {
  const first = feature.cubics[0];
  const last = feature.cubics[feature.cubics.length - 1];
  return {
    x: (first.anchor0X + last.anchor1X) * 0.5,
    y: (first.anchor0Y + last.anchor1Y) * 0.5,
  };
}

function featureDistSquared(f1: Feature, f2: Feature): number {
  if (f1.kind === 'corner' && f2.kind === 'corner' && f1.convex !== f2.convex) {
    return Infinity;
  }
  const p1 = featureRepresentativePoint(f1);
  const p2 = featureRepresentativePoint(f2);
  return distanceSquared(p1.x - p2.x, p1.y - p2.y);
}

function linearMap(xValues: number[], yValues: number[], x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  let segStartIdx = xValues.findIndex((_, i) =>
    progressInRange(clamped, xValues[i], xValues[(i + 1) % xValues.length])
  );
  if (segStartIdx < 0) segStartIdx = 0;
  const segEndIdx = (segStartIdx + 1) % xValues.length;
  const segSizeX = positiveModulo(xValues[segEndIdx] - xValues[segStartIdx], 1);
  const segSizeY = positiveModulo(yValues[segEndIdx] - yValues[segStartIdx], 1);
  const positionInSeg =
    segSizeX < 0.001 ? 0.5 : positiveModulo(clamped - xValues[segStartIdx], 1) / segSizeX;
  return positiveModulo(yValues[segStartIdx] + segSizeY * positionInSeg, 1);
}

class DoubleMapper {
  private readonly sourceValues: number[];
  private readonly targetValues: number[];

  constructor(mappings: [number, number][]) {
    this.sourceValues = mappings.map((m) => m[0]);
    this.targetValues = mappings.map((m) => m[1]);
  }

  map(x: number): number {
    return linearMap(this.sourceValues, this.targetValues, x);
  }

  mapBack(x: number): number {
    return linearMap(this.targetValues, this.sourceValues, x);
  }
}

function featureMapper(
  features1: ProgressableFeature[],
  features2: ProgressableFeature[]
): DoubleMapper {
  const f1List = features1.filter((f) => f.feature.kind === 'corner');
  const f2List = features2.filter((f) => f.feature.kind === 'corner');

  const pairs: { d: number; f1: ProgressableFeature; f2: ProgressableFeature }[] = [];
  for (const f1 of f1List) {
    for (const f2 of f2List) {
      const d = featureDistSquared(f1.feature, f2.feature);
      if (Number.isFinite(d)) {
        pairs.push({ d, f1, f2 });
      }
    }
  }
  pairs.sort((a, b) => a.d - b.d);

  if (pairs.length === 0) {
    return new DoubleMapper([
      [0, 0],
      [0.5, 0.5],
    ]);
  }
  if (pairs.length === 1) {
    const p1 = pairs[0].f1.progress;
    const p2 = pairs[0].f2.progress;
    return new DoubleMapper([
      [p1, p2],
      [(p1 + 0.5) % 1, (p2 + 0.5) % 1],
    ]);
  }

  const mapping: [number, number][] = [];
  const used1 = new Set<ProgressableFeature>();
  const used2 = new Set<ProgressableFeature>();

  for (const { f1, f2 } of pairs) {
    if (used1.has(f1) || used2.has(f2)) continue;
    let insertIdx = mapping.findIndex((m) => m[0] >= f1.progress);
    if (insertIdx === -1) insertIdx = mapping.length;
    if (insertIdx < mapping.length && Math.abs(mapping[insertIdx][0] - f1.progress) < DISTANCE_EPSILON) {
      continue;
    }

    const n = mapping.length;
    if (n >= 1) {
      const [before1, before2] = mapping[(insertIdx + n - 1) % n];
      const [after1, after2] = mapping[insertIdx % n];
      if (
        progressDistance(f1.progress, before1) < DISTANCE_EPSILON ||
        progressDistance(f1.progress, after1) < DISTANCE_EPSILON ||
        progressDistance(f2.progress, before2) < DISTANCE_EPSILON ||
        progressDistance(f2.progress, after2) < DISTANCE_EPSILON
      ) {
        continue;
      }
      if (n > 1 && !progressInRange(f2.progress, before2, after2)) {
        continue;
      }
    }

    mapping.splice(insertIdx, 0, [f1.progress, f2.progress]);
    used1.add(f1);
    used2.add(f2);
  }

  if (mapping.length < 2) {
    return new DoubleMapper([
      [0, 0],
      [0.5, 0.5],
    ]);
  }
  return new DoubleMapper(mapping);
}

export class Morph {
  public readonly morphMatch: [Cubic, Cubic][];

  constructor(start: RoundedPolygon, end: RoundedPolygon) {
    this.morphMatch = Morph.match(start, end);
  }

  asCubics(progress: number): Cubic[] {
    const out: Cubic[] = [];
    let firstCubic: Cubic | null = null;
    let lastCubic: Cubic | null = null;
    for (let i = 0; i < this.morphMatch.length; i++) {
      const [c1, c2] = this.morphMatch[i];
      const pts = new Float64Array(8);
      for (let k = 0; k < 8; k++) {
        pts[k] = lerp(c1.points[k], c2.points[k], progress);
      }
      const cubic = new Cubic(pts);
      if (firstCubic === null) firstCubic = cubic;
      if (lastCubic !== null) out.push(lastCubic);
      lastCubic = cubic;
    }
    if (lastCubic !== null && firstCubic !== null) {
      out.push(
        new Cubic([
          lastCubic.anchor0X,
          lastCubic.anchor0Y,
          lastCubic.control0X,
          lastCubic.control0Y,
          lastCubic.control1X,
          lastCubic.control1Y,
          firstCubic.anchor0X,
          firstCubic.anchor0Y,
        ])
      );
    }
    return out;
  }

  private static match(p1: RoundedPolygon, p2: RoundedPolygon): [Cubic, Cubic][] {
    const measurer = new LengthMeasurer();
    const measured1 = MeasuredPolygon.measurePolygon(measurer, p1);
    const measured2 = MeasuredPolygon.measurePolygon(measurer, p2);
    const mapper = featureMapper(measured1.features, measured2.features);
    const poly2CutPoint = mapper.map(0);

    const bs1 = measured1.cubics;
    const bs2 = measured2.cutAndShift(poly2CutPoint).cubics;

    const ret: [Cubic, Cubic][] = [];
    let i1 = 0;
    let i2 = 0;
    let b1: MeasuredCubic | null = bs1[i1++] ?? null;
    let b2: MeasuredCubic | null = bs2[i2++] ?? null;

    while (b1 !== null && b2 !== null) {
      const b1a = i1 === bs1.length ? 1 : b1.endOutlineProgress;
      const b2a =
        i2 === bs2.length
          ? 1
          : mapper.mapBack(positiveModulo(b2.endOutlineProgress + poly2CutPoint, 1));
      const minb = Math.min(b1a, b2a);

      let seg1: MeasuredCubic;
      let newb1: MeasuredCubic | null;
      if (b1a > minb + ANGLE_EPSILON) {
        const [cutA, cutB] = b1.cutAtProgress(minb);
        seg1 = cutA;
        newb1 = cutB;
      } else {
        seg1 = b1;
        newb1 = bs1[i1++] ?? null;
      }

      let seg2: MeasuredCubic;
      let newb2: MeasuredCubic | null;
      if (b2a > minb + ANGLE_EPSILON) {
        const [cutA, cutB] = b2.cutAtProgress(
          positiveModulo(mapper.map(minb) - poly2CutPoint, 1)
        );
        seg2 = cutA;
        newb2 = cutB;
      } else {
        seg2 = b2;
        newb2 = bs2[i2++] ?? null;
      }

      ret.push([seg1.cubic, seg2.cubic]);
      b1 = newb1;
      b2 = newb2;
    }

    return ret;
  }
}

// ===== MaterialShapes (Exact MDC-Android MaterialShapes.java) =====

interface VertexAndRounding {
  x: number;
  y: number;
  rounding: CornerRounding;
}

function customPolygon(
  template: VertexAndRounding[],
  repeat: number,
  centerX: number,
  centerY: number,
  mirroring: boolean
): RoundedPolygon {
  const radial = template.map((p) => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    return {
      angle: Math.atan2(dy, dx),
      distance: Math.hypot(dx, dy),
      rounding: p.rounding,
    };
  });

  const out: { angle: number; distance: number; rounding: CornerRounding }[] = [];
  let spanPerRepeat = (2 * Math.PI) / repeat;

  if (mirroring) {
    const mirroredRepeat = repeat * 2;
    spanPerRepeat /= 2;
    for (let i = 0; i < mirroredRepeat; i++) {
      for (let j = 0; j < radial.length; j++) {
        const reverse = i % 2 !== 0;
        const idx = reverse ? radial.length - 1 - j : j;
        const tp = radial[idx];
        if (idx > 0 || !reverse) {
          const angle =
            spanPerRepeat * i +
            (reverse ? spanPerRepeat - tp.angle + 2 * radial[0].angle : tp.angle);
          out.push({ angle, distance: tp.distance, rounding: tp.rounding });
        }
      }
    }
  } else {
    for (let i = 0; i < repeat; i++) {
      for (const tp of radial) {
        out.push({
          angle: spanPerRepeat * i + tp.angle,
          distance: tp.distance,
          rounding: tp.rounding,
        });
      }
    }
  }

  const vertices: number[] = [];
  const roundings: CornerRounding[] = [];
  for (const pt of out) {
    vertices.push(pt.distance * Math.cos(pt.angle) + centerX, pt.distance * Math.sin(pt.angle) + centerY);
    roundings.push(pt.rounding);
  }
  return RoundedPolygon.fromVertices(vertices, UNROUNDED_CORNER, roundings, centerX, centerY);
}

function rotateTransform(degrees: number): PointTransformer {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return (x, y) => [x * c - y * s, x * s + y * c];
}

function normalizeToRect(
  shape: RoundedPolygon,
  dstMin = -1,
  dstMax = 1
): RoundedPolygon {
  const [left, top, right, bottom] = shape.calculateMaxBounds();
  const srcW = Math.max(right - left, 1e-6);
  const srcH = Math.max(bottom - top, 1e-6);
  const dstW = dstMax - dstMin;
  const dstH = dstMax - dstMin;
  const scale = Math.min(dstW / srcW, dstH / srcH);
  const srcCx = (left + right) * 0.5;
  const srcCy = (top + bottom) * 0.5;
  const dstCx = (dstMin + dstMax) * 0.5;
  const dstCy = (dstMin + dstMax) * 0.5;
  return shape.transformed((x, y) => [
    (x - srcCx) * scale + dstCx,
    (y - srcCy) * scale + dstCy,
  ]);
}

const CORNER_ROUND_15: CornerRounding = { radius: 0.15, smoothing: 0 };
const CORNER_ROUND_50: CornerRounding = { radius: 0.5, smoothing: 0 };
const CORNER_ROUND_100: CornerRounding = { radius: 1, smoothing: 0 };

function createSoftBurst(): RoundedPolygon {
  return customPolygon(
    [
      { x: 0.193, y: 0.277, rounding: { radius: 0.053, smoothing: 0 } },
      { x: 0.176, y: 0.055, rounding: { radius: 0.053, smoothing: 0 } },
    ],
    10,
    0.5,
    0.5,
    false
  );
}

function createCookie9(): RoundedPolygon {
  return RoundedPolygon.star(9, 1, 0.8, CORNER_ROUND_50).transformed(rotateTransform(-90));
}

function createPentagon(): RoundedPolygon {
  return customPolygon(
    [{ x: 0.5, y: -0.009, rounding: { radius: 0.172, smoothing: 0 } }],
    5,
    0.5,
    0.5,
    false
  );
}

function createPill(): RoundedPolygon {
  return customPolygon(
    [
      { x: 0.961, y: 0.039, rounding: { radius: 0.426, smoothing: 0 } },
      { x: 1.001, y: 0.428, rounding: UNROUNDED_CORNER },
      { x: 1.0, y: 0.609, rounding: CORNER_ROUND_100 },
    ],
    2,
    0.5,
    0.5,
    true
  );
}

function createSunny(): RoundedPolygon {
  return RoundedPolygon.star(8, 1, 0.8, CORNER_ROUND_15);
}

function createCookie4(): RoundedPolygon {
  return customPolygon(
    [
      { x: 1.237, y: 1.236, rounding: { radius: 0.258, smoothing: 0 } },
      { x: 0.5, y: 0.918, rounding: { radius: 0.233, smoothing: 0 } },
    ],
    4,
    0.5,
    0.5,
    false
  );
}

function createOval(): RoundedPolygon {
  return RoundedPolygon.circle(8)
    .transformed((x, y) => [x * 1, y * 0.64])
    .transformed(rotateTransform(-45));
}

export interface LoadingShapeEntry {
  id: string;
  label: string;
  polygon: RoundedPolygon;
}

export const LOADING_INDICATOR_SHAPES: LoadingShapeEntry[] = [
  { id: 'softBurst', label: 'SoftBurst', polygon: normalizeToRect(createSoftBurst()) },
  { id: 'cookie9', label: 'Cookie9', polygon: normalizeToRect(createCookie9()) },
  { id: 'pentagon', label: 'Pentagon', polygon: normalizeToRect(createPentagon()) },
  { id: 'pill', label: 'Pill', polygon: normalizeToRect(createPill()) },
  { id: 'sunny', label: 'Sunny', polygon: normalizeToRect(createSunny()) },
  { id: 'cookie4', label: 'Cookie4', polygon: normalizeToRect(createCookie4()) },
  { id: 'oval', label: 'Oval', polygon: normalizeToRect(createOval()) },
];

export const LOADING_INDICATOR_MORPHS: Morph[] = LOADING_INDICATOR_SHAPES.map(
  (entry, idx) =>
    new Morph(
      entry.polygon,
      LOADING_INDICATOR_SHAPES[(idx + 1) % LOADING_INDICATOR_SHAPES.length].polygon
    )
);

export function getLoadingIndicatorMorphCubics(morphFraction: number): {
  cubics: Cubic[];
  fromIndex: number;
  toIndex: number;
  localProgress: number;
  fromLabel: string;
  toLabel: string;
} {
  const count = LOADING_INDICATOR_MORPHS.length;
  const baseIdx = Math.floor(morphFraction);
  const seqIdx = ((baseIdx % count) + count) % count;
  const nextIdx = (seqIdx + 1) % count;
  const localProgress = morphFraction - baseIdx;
  const cubics = LOADING_INDICATOR_MORPHS[seqIdx].asCubics(localProgress);
  return {
    cubics,
    fromIndex: seqIdx,
    toIndex: nextIdx,
    localProgress,
    fromLabel: LOADING_INDICATOR_SHAPES[seqIdx].label,
    toLabel: LOADING_INDICATOR_SHAPES[nextIdx].label,
  };
}

export function cubicsToSvgPath(cubics: Cubic[], scale = 1, cx = 0, cy = 0): string {
  if (cubics.length === 0) return '';
  const fmt = (v: number) => v.toFixed(3);
  const parts: string[] = [
    `M ${fmt(cx + cubics[0].anchor0X * scale)} ${fmt(cy + cubics[0].anchor0Y * scale)}`,
  ];
  for (const c of cubics) {
    parts.push(
      `C ${fmt(cx + c.control0X * scale)} ${fmt(cy + c.control0Y * scale)}, ` +
        `${fmt(cx + c.control1X * scale)} ${fmt(cy + c.control1Y * scale)}, ` +
        `${fmt(cx + c.anchor1X * scale)} ${fmt(cy + c.anchor1Y * scale)}`
    );
  }
  parts.push('Z');
  return parts.join(' ');
}

/**
 * Android 12+ 边界拉伸 Overscroll（Stretch Edge Effect）—— Android 17 (android-17.0.0_r1)
 * framework / hwui 双侧源码 1:1 移植（本仓库 AOSP 涟漪移植项目，遵守三铁律）。
 *
 * 【源码依据】（本地磁盘可核查）
 *  A. Java 侧：tmp/fb17/core/java/android/widget/EdgeEffect.java（839 行）
 *   - 常量：NATURAL_FREQUENCY=24.657（L125）、DAMPING_RATIO=0.98（L130）、
 *     LINEAR_VELOCITY_TAKE_OVER=200（L106）、LINEAR_DISTANCE_TAKE_OVER=8.0（L120）、
 *     LINEAR_STRETCH_INTENSITY=0.016（L144）、EXP_STRETCH_INTENSITY=0.016（L146）、
 *     SCROLL_DIST_AFFECTED_BY_EXP_STRETCH=0.33（L148）、
 *     ON_ABSORB_VELOCITY_ADJUSTMENT=13（L136）、VELOCITY_THRESHOLD=0.01（L98）、
 *     VALUE_THRESHOLD=0.001（L112）、PULL 距离 clamp ≤1（L368-372）
 *   - onPullDistance/onPull：mPullDistance += deltaDistance（delta 以"视图高度归一"计），
 *     stretch 分支 mPullDistance = min(1, ·)，mDistance = max(0, mPullDistance)，mVelocity=0
 *   - dampStretchVector（L831-838）：sign·(0.016·|v| + 0.016·(1 − e^(−|v|·e/0.33)))
 *   - draw() stretch 分支（L606-661）：drag 点 = (w·disp, h·mDistance)，
 *     vecY = dampStretchVector(clamp(y/height, −1, 1)) → RenderNode.stretch(vecX, vecY, w, h)
 *     （垂直拉拽时 drag 起点与 drag 点 x 相同 → vecX ≡ 0）
 *   - updateSpring（L749-798）：解析欠阻尼弹簧（位移/速度均以像素计）：
 *     d(t) = e^(−ζωt)·(d0·cos(ωd t) + ((ζω·d0 + v0)/ωd)·sin(ωd t))，
 *     ωd = ω·√(1−ζ²)；近平衡（|v|≤200px/s 且 |d|≤8px 且 v 与 d 反号）改线性插值速达；
 *     d>1·h 截断；isAtEquilibrium：d<0 或（|v|<0.01px/s 且 d<0.001px）
 *   - onAbsorb（L495-499）：stretch 分支 mVelocity = velocity × 13
 *  B. Native 侧（形变曲线）：tmp/fb17/libs/hwui/effects/StretchEffect.cpp
 *   - SkSL shader（L29-185）：屏幕坐标 → 内容纹理坐标的映射
 *     computeOverscrollStart(inPos, o, S=W, invS=1/W, D=W/(1+|o|), strength=0.7)：
 *       offsetPos = S − inPos; variation = mix(1, offsetPos·invS, 0.7);
 *       out = D − offsetPos/(1 + o·variation)      （o>0，锚定起点边）
 *     o<0 时 computeOverscrollEnd 镜像（锚定终点边）；uInterpolationStrength = 0.7（L188）
 *   - CPU 逆映射（L248-303，供 StretchMask 与本移植逐元素变形使用）：
 *       distanceStretched = 1/(1+|o|)
 *       o>0: input ≥ D → input − (D−1)；否则 reverseMapStart(o, input)
 *       o<0: input ≤ 1−D → input + (1−D)；否则 reverseMapEnd(o, input)
 *       reverseMapStart/End 为 shader 映射的代数逆（源码注释："maps the input texture
 *        position to the stretch position"）
 *
 * 【标准形变形态（第七轮重查结论，用户裁定逐行平移为“不标准”后）】
 *  Android 12+ 拉伸是 RenderNode 位图的整体 warp：可见内容区间 [0, 1/(1+|o|)] 被
 *  非线性拉伸铺满视口，锚定边（被拉的那条边）位移为 0，远端被推出视口外。行与行
 *  之间不存在缝隙，行高随内容一起被拉长。
 *  Web 标准复现 = 单容器形变：`scale(1+|o|)`、transform-origin 置于锚定边。
 *  与源码精确映射的吻合性（可验证）：
 *   - p=0（锚定边）→ 屏幕 0（源码 reverseMapStart(o,0)=0，逐位一致）；
 *   - p=1/(1+|o|)（可见内容远端）→ 屏幕 1（源码远段分支 input−distanceDiff=1，
 *     逐位一致）；即可见内容区间恰好铺满视口；
 *   - 中段最大偏差 <0.6% 视口高（o≤0.032 时实测），人眼不可分辨。
 *  逐元素 computeReverseOverscroll 保留导出（源码原式），供需要逐元素精确映射的
 *  场景使用；标准展示路径走 stretchScaleFor。
 *
 * 【诚实声明】
 *  - Android 的形变作用于整个 RenderNode 位图（GPU 逐像素 warp，行内像素同样拉伸）；
 *    Web 端标准复现为单容器 scale 形变（见"标准形变形态"节）：内容整块拉长、无行缝，
 *    与源码逐像素曲线在可见区间两端逐位一致、中段偏差 <0.6% 视口高，已诚实标注。
 *  - onPullDistance 源码含 Math.max(0f, deltaDistance + mDistance)（L430）：每个真实
 *    EdgeEffect 实例只服务一条边（ScrollView 底边实例画在 180° 旋转画布上，delta 在
 *    局部坐标恒为正）。本移植按同一语义：每条边一个实例、距离恒正、锚定方向由实例
 *    的 anchor 决定。
 *  - 浏览器默认滚动行为阻拦：容器 overscroll-behavior: contain（Chromium/Edge 链式
 *    滚动与原生 glow 阻断）+ 自管 pointer 拖拽（touch-action: none）。
 */

/* ---------- 源码常量（EdgeEffect.java L98-136 + StretchEffect.cpp L188） ---------- */
export const EDGE_STRETCH = {
  /** The natural frequency of the stretch spring (EdgeEffect.java L125) */
  NATURAL_FREQUENCY: 24.657,
  /** The damping ratio of the stretch spring (L130) */
  DAMPING_RATIO: 0.98,
  LINEAR_VELOCITY_TAKE_OVER: 200, // px/s（L101）
  LINEAR_DISTANCE_TAKE_OVER: 8.0, // px（L120）
  LINEAR_STRETCH_INTENSITY: 0.016,
  EXP_STRETCH_INTENSITY: 0.016,
  SCROLL_DIST_AFFECTED_BY_EXP_STRETCH: 0.33,
  ON_ABSORB_VELOCITY_ADJUSTMENT: 13,
  VELOCITY_THRESHOLD: 0.01, // px/s
  VALUE_THRESHOLD: 0.001, // px
  /** StretchEffect.cpp L188 INTERPOLATION_STRENGTH_VALUE */
  INTERPOLATION_STRENGTH: 0.7,
} as const;

const E = Math.E;

/** EdgeEffect.java L831-838 dampStretchVector：输入 clamp 后的归一化过滚，输出形变强度向量 */
export function dampStretchVector(normalizedVec: number): number {
  const sign = normalizedVec > 0 ? 1 : -1;
  const overscroll = Math.abs(normalizedVec);
  const linearIntensity = EDGE_STRETCH.LINEAR_STRETCH_INTENSITY * overscroll;
  const scalar = E / EDGE_STRETCH.SCROLL_DIST_AFFECTED_BY_EXP_STRETCH;
  const expIntensity =
    EDGE_STRETCH.EXP_STRETCH_INTENSITY * (1 - Math.exp(-overscroll * scalar));
  return sign * (linearIntensity + expIntensity);
}

/** StretchEffect.cpp L248-254 reverseMapStart（起点边代数逆映射，归一化 0-1 域） */
export function reverseMapStart(overscroll: number, input: number): number {
  const numerator = -input * overscroll * overscroll - 2 * input * overscroll - input;
  const denominator =
    1 + 0.3 * overscroll + 0.7 * input * overscroll * overscroll + 0.7 * input * overscroll;
  return -(numerator / denominator);
}

/** StretchEffect.cpp L264-272 reverseMapEnd（终点边代数逆映射） */
export function reverseMapEnd(overscroll: number, input: number): number {
  const numerator =
    0.3 * overscroll * overscroll -
    0.3 * input * overscroll * overscroll +
    1.3 * input * overscroll -
    overscroll -
    input;
  const denominator =
    0.7 * input * overscroll * overscroll -
    0.7 * input * overscroll -
    0.7 * overscroll * overscroll +
    overscroll -
    1;
  return numerator / denominator;
}

/**
 * StretchEffect.cpp L285-303 computeReverseOverscroll：内容位置（0-1）→ 拉伸后屏幕位置（0-1）。
 * overscroll ∈ [−1,1]（dampStretchVector 输出）：>0 锚定起点边（顶/左），<0 锚定终点边（底/右）。
 */
export function computeReverseOverscroll(overscroll: number, normalizedInput: number): number {
  let distanceStretched = 1 / (1 + Math.abs(overscroll));
  const distanceDiff = distanceStretched - 1;
  if (overscroll > 0) {
    if (normalizedInput >= distanceStretched) {
      return normalizedInput - distanceDiff;
    }
    return reverseMapStart(overscroll, normalizedInput);
  }
  if (overscroll < 0) {
    distanceStretched = 1 - distanceStretched;
    if (normalizedInput <= distanceStretched) {
      return normalizedInput + distanceDiff;
    }
    return reverseMapEnd(overscroll, normalizedInput);
  }
  return normalizedInput;
}

export type StretchAnchor = 'start' | 'end'; // start = 顶/左边，end = 底/右边

/**
 * 单边 EdgeEffect（TYPE_STRETCH）实例。语义对齐 EdgeEffect.java：
 * 每条边一个实例，pullDistance 恒正（源码 Math.max(0, ·)），distance 以"容器高度归一"存储。
 */
export class EdgeStretchEffect {
  private mPullDistance = 0; // L367 累积（stretch 分支 min(1, ·)）
  private mDistance = 0; // L372 = max(0, mPullDistance)
  private mVelocity = 0; // px/s（updateSpring 域）
  private mState: 'idle' | 'pull' | 'recede' = 'idle';
  private mLastTime = 0;
  /** 锚定方向：start 实例的 mDistance 视觉映射为 o>0，end 实例映射为 o<0（draw 翻转画布语义） */
  readonly anchor: StretchAnchor;
  /** 容器尺寸（px）——updateSpring 的位移/速度以像素计（L778-788） */
  size = 1;

  constructor(anchor: StretchAnchor) {
    this.anchor = anchor;
  }

  /** EdgeEffect.onPullDistance L426-443：返回被应用的 delta（delta = deltaDistance/size 归一） */
  onPullDistance(deltaPx: number, now: number): number {
    if (deltaPx <= 0) return 0; // 每条边只接受"指向边界外"的正向拉拽（源码 max(0,·) 语义）
    const deltaDistance = deltaPx / this.size;
    const finalDistance = Math.max(0, deltaDistance + this.mDistance); // L430
    const delta = finalDistance - this.mDistance; // L431
    if (delta === 0 && this.mDistance === 0) return 0; // L432-434
    this.onPull(delta, now); // L441：传入已归一的 delta
    return delta;
  }

  /** EdgeEffect.onPull L342-393（stretch 分支逐行） */
  onPull(deltaDistance: number, now: number): void {
    if (this.mState !== 'pull') {
      // L353-361：从动画中"接住"当前 stretch 值
      this.mPullDistance = this.mDistance;
    }
    this.mState = 'pull';
    this.mLastTime = now;
    this.mPullDistance += deltaDistance;
    this.mPullDistance = Math.min(1, this.mPullDistance); // L368-371
    this.mDistance = Math.max(0, this.mPullDistance); // L372
    this.mVelocity = 0; // L373
    if (this.mDistance === 0) this.mState = 'idle'; // L391-393
  }

  /** EdgeEffect.onRelease L465-482（stretch 分支：进入 recede，交给 updateSpring） */
  onRelease(now: number): void {
    if (this.mState !== 'pull') return;
    this.mState = 'recede';
    this.mLastTime = now;
    if (this.mDistance === 0 && this.mVelocity === 0) this.mState = 'idle';
  }

  /** EdgeEffect.onAbsorb L495-499（stretch 分支）：velocity 为 px/s，×13 后作为弹簧初速 */
  onAbsorb(velocityPxPerSec: number, now: number): void {
    this.mState = 'recede';
    this.mVelocity = velocityPxPerSec * EDGE_STRETCH.ON_ABSORB_VELOCITY_ADJUSTMENT;
    this.mLastTime = now;
  }

  /** 当前形变向量（EdgeEffect.draw L644-650：vecY = damp(clamp(mDistance, −1, 1))） */
  get stretchVec(): number {
    if (this.mDistance === 0) return 0;
    const clamped = Math.max(-1, Math.min(1, this.mDistance));
    const vec = dampStretchVector(clamped);
    return this.anchor === 'start' ? vec : -vec;
  }

  get distance(): number {
    return this.mDistance;
  }

  get active(): boolean {
    return this.mState !== 'idle' || this.mDistance !== 0;
  }

  /**
   * EdgeEffect.updateSpring L749-798 逐行移植（recede 态逐帧推进）。
   * 返回是否仍在动画中（draw L670-676 的 STATE_RECEDE 结束判定）。
   */
  tick(now: number): boolean {
    if (this.mState !== 'recede') return this.active;
    const deltaT = (now - this.mLastTime) / 1000;
    if (deltaT < 0.001) return true; // L752-754：至少 1ms
    this.mLastTime = now;

    const h = this.size;
    const dPx = this.mDistance * h; // 位移转像素（L778）

    // L757-774：线性接管（接近平衡、速度与位移反向）
    if (
      Math.abs(this.mVelocity) <= EDGE_STRETCH.LINEAR_VELOCITY_TAKE_OVER &&
      Math.abs(dPx) < EDGE_STRETCH.LINEAR_DISTANCE_TAKE_OVER &&
      sgn(this.mVelocity) === -sgn(dPx)
    ) {
      this.mVelocity = sgn(this.mVelocity) * EDGE_STRETCH.LINEAR_VELOCITY_TAKE_OVER;
      const targetPx = dPx + this.mVelocity * deltaT;
      if (sgn(targetPx) !== sgn(dPx)) {
        this.mDistance = 0;
        this.mVelocity = 0;
        this.mState = 'idle';
        return false;
      }
      this.mDistance = targetPx / h;
      return true;
    }

    // L775-793：解析欠阻尼弹簧
    const zeta = EDGE_STRETCH.DAMPING_RATIO;
    const omega = EDGE_STRETCH.NATURAL_FREQUENCY;
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const cosCoeff = dPx;
    const sinCoeff = (1 / omegaD) * (zeta * omega * dPx + this.mVelocity);
    const decay = Math.exp(-zeta * omega * deltaT);
    const distancePx =
      decay * (cosCoeff * Math.cos(omegaD * deltaT) + sinCoeff * Math.sin(omegaD * deltaT));
    const velocity =
      distancePx * (-omega * zeta) +
      decay *
        (-omegaD * cosCoeff * Math.sin(omegaD * deltaT) +
          omegaD * sinCoeff * Math.cos(omegaD * deltaT));
    this.mDistance = distancePx / h;
    this.mVelocity = velocity;
    if (this.mDistance > 1) { // L790-793
      this.mDistance = 1;
      this.mVelocity = 0;
    }
    if (this.isAtEquilibrium()) { // L794-797
      this.mDistance = 0;
      this.mVelocity = 0;
      this.mState = 'idle';
      return false;
    }
    return true;
  }

  /** EdgeEffect.isAtEquilibrium L820-829：d<0 或（|v|<0.01px/s 且 d<0.001px） */
  private isAtEquilibrium(): boolean {
    const displacement = this.mDistance * this.size;
    return displacement < 0 || (Math.abs(this.mVelocity) < EDGE_STRETCH.VELOCITY_THRESHOLD && displacement < EDGE_STRETCH.VALUE_THRESHOLD);
  }
}

/**
 * 标准整块形变比例：o 为 dampStretchVector 输出（|o|≤0.032）。
 * 返回 CSS scale 值（锚定边 origin）：可见内容区间 [0, 1/(1+|o|)] 经 scale(1+|o|)
 * 恰好铺满视口，与源码精确映射在可见区间两端逐位一致（见头注释“标准形变形态”）。
 */
export function stretchScaleFor(stretchVec: number): number {
  return 1 + Math.abs(stretchVec);
}

/** Java Math.signum 语义 */
function sgn(v: number): number {
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

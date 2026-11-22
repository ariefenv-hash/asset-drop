import {
  FAST_OUT_SLOW_IN,
  LINEAR_INTERPOLATOR,
  STANDARD_INTERPOLATOR,
} from './interpolators';
import {
  FRAMEWORK_FRAGMENT_SHADER_GLSL,
  SYSTEMUI_FRAGMENT_SHADER_GLSL,
  VERTEX_SHADER_GLSL,
} from './shaders';

export type AospRippleEngineMode = 'framework' | 'systemui';
export type SystemUiRippleShape = 'circle' | 'rounded_box' | 'ellipse';

export interface RippleColorRGBA {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
  a: number; // 0..1
}

export interface RippleSessionConfig {
  mode: AospRippleEngineMode;
  touchX: number; // CSS px relative to surface top-left
  touchY: number;
  originX: number;
  originY: number;
  width: number; // CSS px
  height: number; // CSS px
  dpr: number;
  maxRadiusOverride?: number | null; // CSS px, null => auto diagonal
  color: RippleColorRGBA;
  sparkleColor: RippleColorRGBA; // used in framework mode (default 0x8dffffff)
  sparkleStrength: number; // used in systemui mode (default 0.3)
  distortionStrength: number; // used in systemui mode (default 1.0)
  systemUiShape: SystemUiRippleShape;
  hasMask: boolean;
  maskRadius: number; // CSS px
  maskRadii?: [number, number, number, number]; // [TL, TR, BR, BL] CSS px
  densityScale: number; // AOSP default = 2.1
  speedMultiplier: number; // 1.0 = real-time AOSP 450ms/375ms
  durationMs?: number; // SystemUI 涟漪时长（默认 3000ms = Android 17 DEFAULT_RIPPLE_EFFECT_DURATION）
}

export interface FrameworkUniformSnapshot {
  mode: AospRippleEngineMode;
  progress: number;
  rawProgress: number;
  noisePhase: number;
  turbulencePhase: number;
  inNoisePhase: number;
  maxRadius: number;
  fadeIn: number;
  scaleIn: number;
  fadeOutNoise: number;
  fadeOutRipple: number;
  centerX: number;
  centerY: number;
  tCircle1: [number, number];
  tCircle2: [number, number];
  tCircle3: [number, number];
  stage: 'ENTER' | 'HOLD' | 'EXIT' | 'DONE';
  elapsedMs: number;
}

/**
 * Exact AOSP RippleAnimationSession.java constants
 */
export const AOSP_ENTER_ANIM_DURATION = 450;
export const AOSP_EXIT_ANIM_DURATION = 375;
export const AOSP_NOISE_ANIMATION_DURATION = 7000;
export const AOSP_MAX_NOISE_PHASE = Math.floor(AOSP_NOISE_ANIMATION_DURATION / 214); // 32
export const AOSP_MAX_RIPPLES = 10;
export const AOSP_RADIUS_MULTIPLIER = 2.3;
export const AOSP_DENSITY_SCALE = 2.1;
/**
 * SystemUI 涟漪效果时长。
 * Android 17（android-17.0.0_r1）SystemUI DEFAULT_RIPPLE_EFFECT_DURATION = 3000 ms。
 * 旧版实现误用 750 ms（Android 13/14 时代参数），已按 Android 17 修正；
 * 可通过 RippleSessionConfig.durationMs 覆盖。
 */
export const AOSP_SYSTEMUI_DURATION = 3000;
/** Android 13/14 时代旧值，仅保留作对照展示，非 Android 17 行为。 */
export const AOSP_SYSTEMUI_DURATION_LEGACY = 750;

const PI_ROTATE_RIGHT = Math.PI * 0.0078125;
const PI_ROTATE_LEFT = Math.PI * -0.0078125;
const TURBULENCE_SCALE = 1.5;

function subProgress(start: number, end: number, progress: number): number {
  if (start === end) {
    return progress > start ? 1 : 0;
  }
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const sub = Math.min(Math.max(progress, min), max);
  return (sub - start) / (end - start);
}

function getSystemUiFade(
  fadeInStart: number,
  fadeInEnd: number,
  fadeOutStart: number,
  fadeOutEnd: number,
  rawProgress: number
): number {
  const fadeIn = subProgress(fadeInStart, fadeInEnd, rawProgress);
  const fadeOut = 1 - subProgress(fadeOutStart, fadeOutEnd, rawProgress);
  return Math.min(fadeIn, fadeOut);
}

export class RippleSession {
  public readonly id: number;
  public config: RippleSessionConfig;
  public startTimeMs: number;
  public releaseTimeMs: number | null = null;
  public isHolding = true;
  public finished = false;
  private startPhaseSeed: number;
  private lastTickMs: number;
  private accumulatedElapsedMs = 0;
  private accumulatedAtReleaseMs: number | null = null;

  constructor(id: number, config: RippleSessionConfig, nowMs: number) {
    this.id = id;
    this.config = { ...config };
    this.startTimeMs = nowMs;
    this.lastTickMs = nowMs;
    this.startPhaseSeed = nowMs % 10000;
  }

  public release(nowMs: number) {
    if (this.releaseTimeMs === null) {
      this.advanceClock(nowMs);
      this.releaseTimeMs = nowMs;
      this.accumulatedAtReleaseMs = this.accumulatedElapsedMs;
      this.isHolding = false;
    }
  }

  public updateConfig(patch: Partial<RippleSessionConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  private advanceClock(nowMs: number): number {
    const dt = Math.max(0, nowMs - this.lastTickMs);
    this.lastTickMs = nowMs;
    const speed = Math.max(0.05, this.config.speedMultiplier);
    this.accumulatedElapsedMs += dt * speed;
    return this.accumulatedElapsedMs;
  }

  public computeState(nowMs: number): {
    progress: number;
    rawProgress: number;
    noisePhase: number;
    elapsedMs: number;
    stage: 'ENTER' | 'HOLD' | 'EXIT' | 'DONE';
  } {
    const elapsedMs = this.advanceClock(nowMs);

    if (this.config.mode === 'systemui') {
      const duration = this.config.durationMs ?? AOSP_SYSTEMUI_DURATION;
      const rawProgress = Math.min(1, Math.max(0, elapsedMs / duration));
      const progress = STANDARD_INTERPOLATOR(rawProgress);
      if (rawProgress >= 1) {
        this.finished = true;
      }
      return {
        progress,
        rawProgress,
        noisePhase: elapsedMs,
        elapsedMs,
        stage: rawProgress >= 1 ? 'DONE' : rawProgress < 0.35 ? 'ENTER' : 'EXIT',
      };
    }

    const enterT = Math.min(1, Math.max(0, elapsedMs / AOSP_ENTER_ANIM_DURATION));
    const enterProgress = 0.5 * FAST_OUT_SLOW_IN(enterT);

    const noiseT = Math.min(1, elapsedMs / AOSP_NOISE_ANIMATION_DURATION);
    const noisePhase = this.startPhaseSeed + AOSP_MAX_NOISE_PHASE * noiseT;

    if (this.accumulatedAtReleaseMs === null) {
      return {
        progress: enterProgress,
        rawProgress: enterT * 0.5,
        noisePhase,
        elapsedMs,
        stage: enterT < 1 ? 'ENTER' : 'HOLD',
      };
    }

    const timePassedAtRelease = this.accumulatedAtReleaseMs;
    const exitDelayMs = Math.max(AOSP_ENTER_ANIM_DURATION - timePassedAtRelease, 0);
    const exitStartScaled = timePassedAtRelease + exitDelayMs;

    if (elapsedMs < exitStartScaled) {
      return {
        progress: enterProgress,
        rawProgress: enterT * 0.5,
        noisePhase,
        elapsedMs,
        stage: 'ENTER',
      };
    }

    const exitElapsed = elapsedMs - exitStartScaled;
    const exitT = Math.min(1, Math.max(0, exitElapsed / AOSP_EXIT_ANIM_DURATION));
    const progress = 0.5 + 0.5 * LINEAR_INTERPOLATOR(exitT);

    if (exitT >= 1) {
      this.finished = true;
    }

    return {
      progress,
      rawProgress: 0.5 + 0.5 * exitT,
      noisePhase,
      elapsedMs,
      stage: exitT >= 1 ? 'DONE' : 'EXIT',
    };
  }

  public getTelemetry(nowMs: number): FrameworkUniformSnapshot {
    const { progress, rawProgress, noisePhase, elapsedMs, stage } =
      this.computeState(nowMs);
    const dpr = this.config.dpr;
    const w = this.config.width * dpr;
    const h = this.config.height * dpr;
    const autoRadius = Math.hypot(w * 0.5, h * 0.5);
    const baseRadius =
      this.config.maxRadiusOverride && this.config.maxRadiusOverride > 0
        ? this.config.maxRadiusOverride * dpr
        : autoRadius;
    const maxRadius =
      this.config.mode === 'systemui'
        ? (this.config.maxRadiusOverride && this.config.maxRadiusOverride > 0
            ? this.config.maxRadiusOverride * dpr
            : Math.max(w, h) * 0.725)
        : baseRadius * AOSP_RADIUS_MULTIPLIER;

    const isSystemUi = this.config.mode === 'systemui';
    const fadeIn = isSystemUi
      ? subProgress(0, 0.1, rawProgress)
      : subProgress(0, 0.13, progress);
    const scaleIn = isSystemUi ? progress : subProgress(0, 1.0, progress);
    const fadeOutNoise = isSystemUi
      ? subProgress(0.4, 1.0, rawProgress)
      : subProgress(0.4, 0.5, progress);
    const fadeOutRipple = isSystemUi
      ? subProgress(0.3, 1.0, rawProgress)
      : subProgress(0.4, 1.0, progress);

    const mixAmt = isSystemUi ? 0 : Math.max(0, Math.min(1, progress * 2.0));
    const centerX =
      this.config.touchX + (this.config.originX - this.config.touchX) * mixAmt;
    const centerY =
      this.config.touchY + (this.config.originY - this.config.touchY) * mixAmt;

    return {
      mode: this.config.mode,
      progress,
      rawProgress,
      noisePhase,
      turbulencePhase: noisePhase,
      inNoisePhase: noisePhase * 0.001,
      maxRadius,
      fadeIn,
      scaleIn,
      fadeOutNoise,
      fadeOutRipple,
      centerX,
      centerY,
      tCircle1: [
        TURBULENCE_SCALE * 0.5 + noisePhase * 0.01 * Math.cos(TURBULENCE_SCALE * 0.55),
        TURBULENCE_SCALE * 0.5 + noisePhase * 0.01 * Math.sin(TURBULENCE_SCALE * 0.55),
      ],
      tCircle2: [
        TURBULENCE_SCALE * 0.2 + noisePhase * -0.0066 * Math.cos(TURBULENCE_SCALE * 0.45),
        TURBULENCE_SCALE * 0.2 + noisePhase * -0.0066 * Math.sin(TURBULENCE_SCALE * 0.45),
      ],
      tCircle3: [
        TURBULENCE_SCALE + noisePhase * -0.0066 * Math.cos(TURBULENCE_SCALE * 0.35),
        TURBULENCE_SCALE + noisePhase * -0.0066 * Math.sin(TURBULENCE_SCALE * 0.35),
      ],
      stage,
      elapsedMs,
    };
  }
}

interface ProgramHandle {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSrc: string,
  fragmentSrc: string,
  uniformNames: string[]
): ProgramHandle {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create WebGL program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }

  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  for (const name of uniformNames) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }
  return { program, uniforms };
}

const FRAMEWORK_UNIFORM_NAMES = [
  'in_origin',
  'in_touch',
  'in_progress',
  'in_maxRadius',
  'in_resolutionScale',
  'in_noiseScale',
  'in_hasMask',
  'in_noisePhase',
  'in_turbulencePhase',
  'in_tCircle1',
  'in_tCircle2',
  'in_tCircle3',
  'in_tRotation1',
  'in_tRotation2',
  'in_tRotation3',
  'in_color',
  'in_sparkleColor',
  'u_resolution',
  'u_maskRadii',
];

const SYSTEMUI_UNIFORM_NAMES = [
  'in_center',
  'in_size',
  'in_cornerRadius',
  'in_thickness',
  'in_time',
  'in_distort_radial',
  'in_distort_xy',
  'in_fadeSparkle',
  'in_fadeFill',
  'in_fadeRing',
  'in_blur',
  'in_pixelDensity',
  'in_color',
  'in_sparkle_strength',
  'u_resolution',
  'u_shape',
  'u_hasMask',
  'u_maskRadii',
];

export class WebGL2RippleRenderer {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGL2RenderingContext | null;
  private frameworkProgram: ProgramHandle | null = null;
  private systemUiProgram: ProgramHandle | null = null;
  private quadVao: WebGLVertexArrayObject | null = null;
  private quadVbo: WebGLBuffer | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      preserveDrawingBuffer: false,
    });
    this.gl = gl;
    if (!gl) return;

    this.frameworkProgram = createProgram(
      gl,
      VERTEX_SHADER_GLSL,
      FRAMEWORK_FRAGMENT_SHADER_GLSL,
      FRAMEWORK_UNIFORM_NAMES
    );
    this.systemUiProgram = createProgram(
      gl,
      VERTEX_SHADER_GLSL,
      SYSTEMUI_FRAGMENT_SHADER_GLSL,
      SYSTEMUI_UNIFORM_NAMES
    );

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.quadVao = vao;
    this.quadVbo = vbo;
  }

  public isSupported(): boolean {
    return this.gl !== null;
  }

  public renderSessions(
    sessions: RippleSession[],
    widthCss: number,
    heightCss: number,
    dpr: number,
    nowMs: number
  ) {
    const gl = this.gl;
    if (!gl || !this.frameworkProgram || !this.systemUiProgram || !this.quadVao) {
      return;
    }

    const pw = Math.max(1, Math.round(widthCss * dpr));
    const ph = Math.max(1, Math.round(heightCss * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }

    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (sessions.length === 0) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.quadVao);

    for (const session of sessions) {
      const { progress, rawProgress, noisePhase, elapsedMs } = session.computeState(nowMs);
      if (session.finished) continue;

      const cfg = session.config;
      const effDpr = cfg.dpr;
      const w = Math.max(1, cfg.width * effDpr);
      const h = Math.max(1, cfg.height * effDpr);

      if (cfg.mode === 'framework') {
        const { program, uniforms: u } = this.frameworkProgram;
        gl.useProgram(program);

        const autoRadius = Math.hypot(w * 0.5, h * 0.5);
        const radius =
          cfg.maxRadiusOverride && cfg.maxRadiusOverride > 0
            ? cfg.maxRadiusOverride * effDpr
            : autoRadius;

        gl.uniform1f(u.in_maxRadius, radius * AOSP_RADIUS_MULTIPLIER);
        gl.uniform2f(u.in_origin, cfg.originX * effDpr, cfg.originY * effDpr);
        gl.uniform2f(u.in_touch, cfg.touchX * effDpr, cfg.touchY * effDpr);
        gl.uniform1f(u.in_progress, progress);

        gl.uniform2f(u.in_resolutionScale, 1.0 / w, 1.0 / h);
        gl.uniform2f(u.in_noiseScale, cfg.densityScale / w, cfg.densityScale / h);

        gl.uniform1f(u.in_noisePhase, noisePhase * 0.001);
        gl.uniform1f(u.in_turbulencePhase, noisePhase);
        gl.uniform2f(
          u.in_tCircle1,
          TURBULENCE_SCALE * 0.5 + noisePhase * 0.01 * Math.cos(TURBULENCE_SCALE * 0.55),
          TURBULENCE_SCALE * 0.5 + noisePhase * 0.01 * Math.sin(TURBULENCE_SCALE * 0.55)
        );
        gl.uniform2f(
          u.in_tCircle2,
          TURBULENCE_SCALE * 0.2 + noisePhase * -0.0066 * Math.cos(TURBULENCE_SCALE * 0.45),
          TURBULENCE_SCALE * 0.2 + noisePhase * -0.0066 * Math.sin(TURBULENCE_SCALE * 0.45)
        );
        gl.uniform2f(
          u.in_tCircle3,
          TURBULENCE_SCALE + noisePhase * -0.0066 * Math.cos(TURBULENCE_SCALE * 0.35),
          TURBULENCE_SCALE + noisePhase * -0.0066 * Math.sin(TURBULENCE_SCALE * 0.35)
        );

        const rotation1 = noisePhase * PI_ROTATE_RIGHT + 1.7 * Math.PI;
        const rotation2 = noisePhase * PI_ROTATE_LEFT + 2.0 * Math.PI;
        const rotation3 = noisePhase * PI_ROTATE_RIGHT + 2.75 * Math.PI;
        gl.uniform2f(u.in_tRotation1, Math.cos(rotation1), Math.sin(rotation1));
        gl.uniform2f(u.in_tRotation2, Math.cos(rotation2), Math.sin(rotation2));
        gl.uniform2f(u.in_tRotation3, Math.cos(rotation3), Math.sin(rotation3));

        gl.uniform4f(u.in_color, cfg.color.r, cfg.color.g, cfg.color.b, cfg.color.a);
        gl.uniform4f(
          u.in_sparkleColor,
          cfg.sparkleColor.r,
          cfg.sparkleColor.g,
          cfg.sparkleColor.b,
          cfg.sparkleColor.a
        );
        const radii = cfg.maskRadii ?? [
          cfg.maskRadius,
          cfg.maskRadius,
          cfg.maskRadius,
          cfg.maskRadius,
        ];
        gl.uniform1f(u.in_hasMask, cfg.hasMask ? 1.0 : 0.0);
        gl.uniform2f(u.u_resolution, w, h);
        gl.uniform4f(
          u.u_maskRadii,
          radii[0] * effDpr,
          radii[1] * effDpr,
          radii[2] * effDpr,
          radii[3] * effDpr
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else {
        const { program, uniforms: u } = this.systemUiProgram;
        gl.useProgram(program);

        // Android 17 SystemUI：最大扩散尺寸由调用方传入视图实际尺寸
        // （RippleShader setSize / 调用方 maxWidth·maxHeight 语义）。
        // 旧版自创近似 hypot(w,h) * 1.65 已按源码语义废弃，改为视图最大边。
        const autoMax = Math.max(w, h);
        const maxSizeW =
          cfg.maxRadiusOverride && cfg.maxRadiusOverride > 0
            ? cfg.maxRadiusOverride * 2.0 * effDpr
            : autoMax;
        const maxSizeH =
          cfg.systemUiShape === 'ellipse'
            ? maxSizeW * 0.68
            : cfg.systemUiShape === 'rounded_box'
              ? maxSizeW * (h / Math.max(w, 1))
              : maxSizeW;

        const curW = maxSizeW * progress;
        const curH = maxSizeH * progress;

        gl.uniform2f(u.in_center, cfg.touchX * effDpr, cfg.touchY * effDpr);
        gl.uniform2f(u.in_size, curW, curH);
        gl.uniform1f(u.in_thickness, curH * 0.5);
        gl.uniform1f(u.in_cornerRadius, Math.min(curW, curH));
        gl.uniform1f(u.in_time, elapsedMs);

        const dist = (1 - rawProgress) * cfg.distortionStrength;
        gl.uniform1f(u.in_distort_radial, 75.0 * rawProgress * dist);
        gl.uniform1f(u.in_distort_xy, 75.0 * dist);

        gl.uniform1f(u.in_fadeSparkle, getSystemUiFade(0, 0.1, 0.4, 1.0, rawProgress));
        gl.uniform1f(u.in_fadeRing, getSystemUiFade(0, 0.1, 0.3, 1.0, rawProgress));
        gl.uniform1f(u.in_fadeFill, getSystemUiFade(0, 0.0, 0.0, 0.6, rawProgress));

        gl.uniform1f(u.in_blur, 1.25 + (0.5 - 1.25) * progress);
        // Android 17 SystemUI：pixelDensity = resources.displayMetrics.density。
        // Web 无 displayMetrics，取渲染 devicePixelRatio 为最接近对应量。
        // 【诚实标注】这是 Web 适配近似，非源码直传。
        gl.uniform1f(u.in_pixelDensity, cfg.dpr);
        gl.uniform4f(u.in_color, cfg.color.r, cfg.color.g, cfg.color.b, cfg.color.a);
        gl.uniform1f(u.in_sparkle_strength, cfg.sparkleStrength);

        gl.uniform2f(u.u_resolution, w, h);
        const shapeInt =
          cfg.systemUiShape === 'circle'
            ? 0
            : cfg.systemUiShape === 'rounded_box'
              ? 1
              : 2;
        gl.uniform1i(u.u_shape, shapeInt);
        const radii = cfg.maskRadii ?? [
          cfg.maskRadius,
          cfg.maskRadius,
          cfg.maskRadius,
          cfg.maskRadius,
        ];
        gl.uniform1f(u.u_hasMask, cfg.hasMask ? 1.0 : 0.0);
        gl.uniform4f(
          u.u_maskRadii,
          radii[0] * effDpr,
          radii[1] * effDpr,
          radii[2] * effDpr,
          radii[3] * effDpr
        );

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    gl.bindVertexArray(null);
  }

  public dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.frameworkProgram) gl.deleteProgram(this.frameworkProgram.program);
    if (this.systemUiProgram) gl.deleteProgram(this.systemUiProgram.program);
    if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
    if (this.quadVao) gl.deleteVertexArray(this.quadVao);
  }
}

let sharedOffscreenRenderer: WebGL2RippleRenderer | null = null;

export function getSharedRippleRenderer(): WebGL2RippleRenderer {
  if (!sharedOffscreenRenderer) {
    sharedOffscreenRenderer = new WebGL2RippleRenderer();
  }
  return sharedOffscreenRenderer;
}

/**
 * 第 26 轮（用户复核）：全项目栅格化清晰度统一口径。
 * 浏览器页面缩放已含在 devicePixelRatio 内，移动端捏合缩放走 visualViewport.scale；
 * 两者任一超出后备缓冲的预设上限都会把内容上采样拉糊（硬边剪影/圆环尤其明显）。
 * 小画布（状态层 40dp、涟漪面 24-96dp、形变指示器 48dp）逐帧重设缓冲代价可忽略，
 * 直接给足真实分辨率；大面积 WebGL 舞台由调用方传更低 cap 自行限幅（性能口径，
 * 软边涟漪下差异不可见）。cap 仅防病态取值（如 500% 缩放的 4K 屏）。
 */
export function effectiveRasterDpr(cap: number): number {
  const vv =
    typeof window !== 'undefined' && window.visualViewport
      ? window.visualViewport.scale
      : 1;
  return Math.min((window.devicePixelRatio || 1) * (vv || 1), cap);
}

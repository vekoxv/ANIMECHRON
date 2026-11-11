/**
 * Ink stage: a tiny WebGL program that bleeds one image into another the way ink spreads
 * through paper — a ragged front driven by fractal noise, a dark rim where the ink is wet,
 * and both images pulled slightly toward the front.
 *
 * It draws only while a transition is running and holds no animation loop at rest.
 * Raw WebGL 1, no library: one quad, two textures, about forty lines of GLSL.
 */

const VERTEX = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D uFrom, uTo;
uniform vec2 uFitFrom, uFitTo;  // crop each image to cover the canvas
uniform vec2 uDir;              // which way the front travels
uniform vec3 uInk;
uniform float uT;               // 0 = all old image, 1 = all new

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
vec3 cover(sampler2D t, vec2 fit, vec2 p) { return texture2D(t, (p - 0.5) * fit + 0.5).rgb; }

void main() {
  float along = dot(uv - 0.5, uDir) + 0.5;
  float front = mix(-0.4, 1.4, uT);
  float old = smoothstep(front - 0.035, front + 0.035, along + (fbm(uv * vec2(3.2, 4.6) + 7.0) - 0.5) * 0.7);
  float wet = old * (1.0 - old) * 4.0;                      // 1 on the boundary, 0 away from it
  vec2 pull = uDir * 0.045 * wet;
  vec3 colour = mix(cover(uTo, uFitTo, uv - pull), cover(uFrom, uFitFrom, uv + pull), old);
  gl_FragColor = vec4(mix(colour, uInk, wet * 0.82), 1.0);
}`;

export type InkSource = HTMLImageElement | [number, number, number];

export class InkStage {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private textures: WebGLTexture[] = [];
  private fits: [number, number][] = [[1, 1], [1, 1]];
  private frame = 0;
  /** Set when the browser takes the context away; the caller then falls back to plain images. */
  lost = false;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) throw new Error("WebGL is not available");
    this.gl = gl;
    this.canvas = canvas;
    canvas.addEventListener("webglcontextlost", () => {
      this.lost = true;
      cancelAnimationFrame(this.frame);
    });

    const program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Ink shader: ${gl.getShaderInfoLog(shader)}`);
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Ink program: ${gl.getProgramInfoLog(program)}`);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    for (const name of ["uFrom", "uTo", "uFitFrom", "uFitTo", "uDir", "uInk", "uT"]) this.uniforms[name] = gl.getUniformLocation(program, name);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (let unit = 0; unit < 2; unit++) {
      const texture = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Covers are not power-of-two sized: clamp and skip mipmaps (required in WebGL 1).
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      this.textures.push(texture);
    }
    gl.uniform1i(this.uniforms.uFrom, 0);
    gl.uniform1i(this.uniforms.uTo, 1);
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    const w = Math.round(this.canvas.clientWidth * dpr);
    const h = Math.round(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, w, h);
  }

  private upload(unit: 0 | 1, source: InkSource) {
    const { gl, canvas } = this;
    gl.activeTexture(gl.TEXTURE0 + unit);
    if (Array.isArray(source)) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(source));
      this.fits[unit] = [1, 1];
      return;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    const image = source.naturalWidth / source.naturalHeight;
    const frame = canvas.clientWidth / canvas.clientHeight;
    this.fits[unit] = image > frame ? [frame / image, 1] : [1, image / frame];
  }

  private draw(t: number) {
    const { gl, uniforms } = this;
    gl.uniform2fv(uniforms.uFitFrom, this.fits[0]);
    gl.uniform2fv(uniforms.uFitTo, this.fits[1]);
    gl.uniform1f(uniforms.uT, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /** Puts one image (or a flat colour) on the stage, at rest. */
  show(source: InkSource) {
    if (this.lost) return;
    cancelAnimationFrame(this.frame);
    this.resize();
    this.upload(0, source);
    this.draw(0);
  }

  /** Bleeds from what is on the stage to `source`. Resolves when the new image fully shows. */
  to(source: InkSource, direction: [number, number], ink: [number, number, number], ms = 1150): Promise<void> {
    if (this.lost) return Promise.resolve();
    const { gl, uniforms } = this;
    cancelAnimationFrame(this.frame);
    this.resize();
    this.upload(1, source);
    const length = Math.hypot(direction[0], direction[1]) || 1;
    gl.uniform2f(uniforms.uDir, direction[0] / length, direction[1] / length);
    gl.uniform3f(uniforms.uInk, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        this.draw(t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
        if (t < 1 && !this.lost) {
          this.frame = requestAnimationFrame(step);
          return;
        }
        // The destination becomes the resting image for the next transition.
        this.textures.reverse();
        this.fits.reverse();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
        resolve();
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  /** Stops drawing and hands the GPU context back. */
  destroy() {
    cancelAnimationFrame(this.frame);
    this.lost = true;
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

"use client";

import { useEffect, useRef } from "react";
import type { VoiceState } from "./voice-types";

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}`;

const FRAGMENT_SHADER_SRC = `
precision highp float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_energy;
uniform float u_mode;
uniform float u_backendOnly;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amp * noise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = length(v_uv - center) * 2.0;

  vec3 dark = vec3(0.02, 0.02, 0.05);
  vec3 slate = vec3(0.06, 0.08, 0.13);
  vec3 bg = mix(dark, slate, smoothstep(0.0, 1.6, dist));

  float glowIntensity = 0.08 + u_energy * 0.28;
  float innerGlow = exp(-dist * 3.5);
  float outerGlow = exp(-dist * 1.8);
  float rimGlow = exp(-dist * 0.8);

  if (u_backendOnly > 0.5) {
    glowIntensity *= 2.0;
    innerGlow *= 1.5;
    outerGlow *= 1.3;
    rimGlow *= 0.6;
  }

  vec3 blue = vec3(0.12, 0.22, 0.55);
  vec3 cyan = vec3(0.08, 0.28, 0.50);
  vec3 accent = mix(blue, cyan, u_energy * 0.7);

  if (u_backendOnly > 0.5) {
    accent = mix(accent, vec3(0.18, 0.12, 0.42), 0.35);
  }

  vec3 color = bg;
  color += accent * innerGlow * glowIntensity;
  color += accent * outerGlow * glowIntensity * 0.35;

  if (u_backendOnly > 0.5) {
    color += accent * rimGlow * glowIntensity * 0.6;
    color.rb *= 1.08;
  }

  float breathe = sin(u_time * 0.45) * 0.028 + 0.032;
  color += accent * breathe * (1.0 - dist * 0.55);

  if (u_mode > 0.5) {
    float pulse = sin(u_time * 1.8) * 0.5 + 0.5;
    color += accent * pulse * 0.025;
  }

  if (u_mode > 1.5) {
    float procPulse = sin(u_time * 2.8) * 0.5 + 0.5;
    color += accent * procPulse * 0.05 * (1.0 - dist * 0.4);
  }

  float n = fbm(v_uv * 3.0 + u_time * 0.08) * 0.01;
  if (u_backendOnly > 0.5) n *= 1.3;
  color += n;

  float vignette = 1.0 - dist * 0.18;
  color *= vignette;

  gl_FragColor = vec4(color, 1.0);
}`;

type VisualizerMode = "idle" | "listening" | "processing";

function voiceStateToMode(s: VoiceState): VisualizerMode {
  if (s === "listening") return "listening";
  if (s === "processing") return "processing";
  return "idle";
}

export function VoiceCanvasVisualizer({
  voiceState,
  isBackendOnlyMode,
  analyser,
}: {
  voiceState: VoiceState;
  isBackendOnlyMode: boolean;
  analyser: AnalyserNode | null;
}) {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const uniformsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const animRef = useRef(0);
  const timeRef = useRef(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const modeRef = useRef<VisualizerMode>("idle");
  const backendRef = useRef(false);
  const energyRef = useRef(0);
  const energySmoothRef = useRef(0);
  const analyserRef = useRef(analyser);

  useEffect(() => {
    modeRef.current = voiceStateToMode(voiceState);
    backendRef.current = isBackendOnlyMode;
    analyserRef.current = analyser;
  });

  useEffect(() => {
    const bg = bgCanvasRef.current;
    const wave = waveCanvasRef.current;
    if (!bg || !wave) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = bg.getContext("webgl", { alpha: false, antialias: false });
    } catch { /* fallback to Canvas2D */ }
    glRef.current = gl;

    function compileShader(
      context: WebGLRenderingContext,
      type: number,
      source: string,
    ): WebGLShader {
      const shader = context.createShader(type);
      if (!shader) throw new Error("Failed to create shader");
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        const info = context.getShaderInfoLog(shader);
        context.deleteShader(shader);
        throw new Error(`Shader compile error: ${info}`);
      }
      return shader;
    }

    const setupGL = () => {
      if (!gl) return;
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return;
      }
      gl.useProgram(program);
      programRef.current = program;

      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const aPos = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uniformsRef.current = {
        u_time: gl.getUniformLocation(program, "u_time"),
        u_energy: gl.getUniformLocation(program, "u_energy"),
        u_mode: gl.getUniformLocation(program, "u_mode"),
        u_backendOnly: gl.getUniformLocation(program, "u_backendOnly"),
      };
    };

    setupGL();

    const drawBg2D = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      t: number,
      energy: number,
    ) => {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);

      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      g.addColorStop(0, `rgba(15, 15, 35, 1)`);
      g.addColorStop(0.4, `rgba(12, 14, 28, 1)`);
      g.addColorStop(0.8, `rgba(8, 9, 20, 1)`);
      g.addColorStop(1, `rgba(4, 4, 12, 1)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const blueIntensity = 0.06 + energy * 0.22;
      const breathe = Math.sin(t * 0.45) * 0.018 + 0.022;
      const alpha = blueIntensity + breathe;

      if (alpha > 0.01) {
        const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.6);
        const r = backendRef.current ? 32 : 22;
        const gv = backendRef.current ? 65 : 52;
        const b = backendRef.current ? 155 : 130;
        gg.addColorStop(0, `rgba(${r}, ${gv}, ${b}, ${alpha * 2})`);
        gg.addColorStop(0.5, `rgba(${r}, ${gv}, ${b}, ${alpha})`);
        gg.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = gg;
        ctx.fillRect(0, 0, w, h);
      }

      if (backendRef.current) {
        const rimG = ctx.createRadialGradient(cx, cy, maxR * 0.3, cx, cy, maxR * 0.7);
        const rimR = 28;
        const rimGv = 20;
        const rimB = 90;
        rimG.addColorStop(0, "rgba(0, 0, 0, 0)");
        rimG.addColorStop(0.5, `rgba(${rimR}, ${rimGv}, ${rimB}, ${energy * 0.08})`);
        rimG.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = rimG;
        ctx.fillRect(0, 0, w, h);
      }
    };

    const renderWaveform = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      energy: number,
      mode: VisualizerMode,
    ) => {
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      const points: { x: number; yTop: number; yBot: number }[] = [];
      const analyser = analyserRef.current;

      if (mode === "listening" && analyser) {
        const fftSize = analyser.fftSize;
        if (!dataArrayRef.current || dataArrayRef.current.length !== fftSize) {
          dataArrayRef.current = new Uint8Array(fftSize);
        }
        const data = dataArrayRef.current!;
        analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);

        const sampleCount = 120;
        const step = fftSize / sampleCount;
        for (let i = 0; i < sampleCount; i++) {
          const idx = Math.floor(i * step);
          const t = (i / (sampleCount - 1)) * 2 - 1;
          const gaussian = Math.exp(-t * t * 2.5);

          let avg = 0;
          const windowSize = Math.min(8, fftSize - idx);
          for (let j = 0; j < windowSize; j++) {
            avg += data[idx + j] / 128.0;
          }
          avg /= windowSize;
          const x = (i / (sampleCount - 1)) * w;
          const maxAmp = h * (0.18 + energy * 0.55);
          const baseAmplitude = Math.max(0.005, (avg - 0.5)) * maxAmp;
          const amplitude = baseAmplitude * (0.35 + gaussian * 0.65);
          points.push({ x, yTop: midY - amplitude, yBot: midY + amplitude });
        }
      } else if (mode === "processing") {
        const count = 100;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const x = t * w;
          const pulse = Math.sin(timeRef.current * 2.5 + t * Math.PI * 4) * 0.5 + 0.5;
          const jitter = Math.sin(timeRef.current * 7.3 + t * 11.0) * 0.3;
          const amp = 10 + pulse * 16 + jitter * 3;
          const gauss = Math.exp(-(t * 2 - 1) * (t * 2 - 1) * 1.5);
          const scaledAmp = amp * (0.4 + gauss * 0.6);
          points.push({ x, yTop: midY - scaledAmp, yBot: midY + scaledAmp });
        }
      } else {
        const count = 80;
        for (let i = 0; i < count; i++) {
          const t = i / (count - 1);
          const x = t * w;
          const drift = Math.sin(timeRef.current * 0.18 + t * Math.PI * 3) * 0.5 + 0.5;
          const drift2 = Math.sin(timeRef.current * 0.35 + t * Math.PI * 2.3) * 0.5 + 0.5;
          const amp = 1.5 + drift * 1.5 + drift2 * 1.0;
          const gauss = Math.exp(-(t * 2 - 1) * (t * 2 - 1) * 3.0);
          const scaledAmp = amp * (0.3 + gauss * 0.7);
          points.push({ x, yTop: midY - scaledAmp, yBot: midY + scaledAmp });
        }
      }

      const drawCurveGroup = (
        strokeWidth: number,
        alpha: number,
        upward: boolean,
      ) => {
        ctx.beginPath();
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const baseAlpha = upward ? alpha : alpha * 0.35;
        ctx.strokeStyle = `rgba(80, 140, 230, ${baseAlpha})`;

        let started = false;
        for (let i = 0; i < points.length - 2; i++) {
          const y = upward ? points[i].yTop : points[i].yBot;
          const nextY = upward ? points[i + 1].yTop : points[i + 1].yBot;
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (y + nextY) / 2;
          if (!started) {
            ctx.moveTo(points[i].x, y);
            started = true;
          }
          ctx.quadraticCurveTo(points[i].x, y, xc, yc);
        }
        const lastIdx = points.length - 1;
        const lastY = upward ? points[lastIdx].yTop : points[lastIdx].yBot;
        ctx.lineTo(points[lastIdx].x, lastY);
        ctx.stroke();
      };

      const lineAlpha = 0.25 + energy * 0.35 + (backendRef.current ? 0.15 : 0);
      const glowWidth = 20 + energy * 12 + (backendRef.current ? 10 : 0);
      const coreWidth = 2.5 + energy * 2.5 + (backendRef.current ? 1.5 : 0);
      const outerGlowWidth = glowWidth * 1.8;
      const outerAlpha = lineAlpha * 0.4;

      if (backendRef.current) {
        drawCurveGroup(outerGlowWidth, outerAlpha, true);
        drawCurveGroup(outerGlowWidth, outerAlpha, false);
      }

      drawCurveGroup(glowWidth, lineAlpha, true);
      drawCurveGroup(glowWidth, lineAlpha, false);
      drawCurveGroup(coreWidth, lineAlpha * 2.5, true);
      drawCurveGroup(coreWidth, lineAlpha * 2.5, false);
    };

    let lastTime = performance.now();

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);

      const canvas = bgCanvasRef.current;
      const waveCanvas = waveCanvasRef.current;
      if (!canvas || !waveCanvas) return;
      if (canvas.width === 0 || canvas.height === 0) return;

      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      timeRef.current += dt;

      const targetEnergy = energyRef.current;
      const smoothAlpha = 0.12;
      energySmoothRef.current =
        smoothAlpha * targetEnergy + (1 - smoothAlpha) * energySmoothRef.current;
      const energy = energySmoothRef.current;

      const mode = modeRef.current;
      const modeUniform = mode === "listening" ? 1.0 : mode === "processing" ? 2.0 : 0.0;

      if (gl) {
        const prg = programRef.current;
        const u = uniformsRef.current;
        if (prg && u.u_time && u.u_energy && u.u_mode && u.u_backendOnly) {
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.uniform1f(u.u_time, timeRef.current);
          gl.uniform1f(u.u_energy, energy);
          gl.uniform1f(u.u_mode, modeUniform);
          gl.uniform1f(u.u_backendOnly, backendRef.current ? 1.0 : 0.0);
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
      } else {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawBg2D(ctx, canvas.width, canvas.height, timeRef.current, energy);
        }
      }

      const waveCtx = waveCanvas.getContext("2d");
      if (waveCtx) {
        renderWaveform(waveCtx, waveCanvas.width, waveCanvas.height, energy, mode);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      if (gl) {
        gl.deleteProgram(programRef.current);
        glRef.current = null;
        programRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const resize = () => {
      const bg = bgCanvasRef.current;
      const wave = waveCanvasRef.current;
      if (!bg || !wave) return;
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      [bg, wave].forEach((c) => {
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        const ctx = c.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
      });
      if (glRef.current) {
        glRef.current.viewport(0, 0, w * dpr, h * dpr);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const rmsBuffer = new Float32Array(2048);
    const id = setInterval(() => {
      const a = analyserRef.current;
      if (!a) {
        energyRef.current *= 0.85;
        return;
      }
      a.getFloatTimeDomainData(rmsBuffer);
      let sum = 0;
      for (const v of rmsBuffer) sum += v * v;
      const raw = Math.sqrt(sum / rmsBuffer.length);
      energyRef.current = Math.min(1, raw * 4);
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />
      <canvas
        ref={waveCanvasRef}
        className="absolute inset-0 z-10 w-full h-full"
        aria-hidden
      />
    </>
  );
}

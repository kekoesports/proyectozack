'use client';

import { useEffect, useRef } from 'react';

const COLORS = ['#C0186A', '#EE6A3C', '#8E2466', '#ffffff'] as const;
const NUM = 160;

class Particle {
  x = 0; y = 0; r = 1; color = '#fff';
  alpha = 0.3; vx = 0; vy = 0;

  constructor(canvas: HTMLCanvasElement) { this.reset(true, canvas); }

  reset(init: boolean, canvas: HTMLCanvasElement) {
    this.x = Math.random() * canvas.width;
    this.y = init ? Math.random() * canvas.height : canvas.height + 10;
    this.r = Math.random() * 2.5 + 0.8;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#fff';
    this.alpha = Math.random() * 0.8 + 0.2;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.vy = -(Math.random() * 0.5 + 0.1);
  }

  update(canvas: HTMLCanvasElement, mouse: { x: number; y: number }) {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      const force = (100 - dist) / 100;
      this.vx += (dx / dist) * force * 0.4;
      this.vy += (dy / dist) * force * 0.4;
    }
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
      this.reset(false, canvas);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

// Returns cleanup so useEffect can return it directly.
// Receives non-null canvas/ctx so inner functions don't need null guards.
function startAnimation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): () => void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const mouse = { x: -9999, y: -9999 };

  const onMouseMove = (e: MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  };
  window.addEventListener('mousemove', onMouseMove, { passive: true });

  const particles = Array.from({ length: NUM }, () => new Particle(canvas));

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pi = particles[i];
        const pj = particles[j];
        if (!pi || !pj) continue;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.save();
          ctx.globalAlpha = (1 - d / 120) * 0.25;
          ctx.strokeStyle = '#C0186A';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  let rafId = 0;

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawConnections();
    particles.forEach(p => { p.update(canvas, mouse); p.draw(ctx); });
    rafId = requestAnimationFrame(loop);
  }

  if (!prefersReduced) loop();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMouseMove);
  };
}

export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // why: canvas 2D animation requires imperative DOM API — no React equivalent
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    return startAnimation(canvas, ctx);
  }, []);

  return (
    <>
      <div className="absolute inset-0 bg-[#060608]" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(192,24,106,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(192,24,106,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <div
        className="absolute -top-20 -left-24 w-[400px] h-[400px] rounded-full pointer-events-none animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(192,24,106,0.18) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute -bottom-16 -right-16 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(238,106,60,0.12) 0%, transparent 70%)',
          animation: 'pulse 5s 1s ease-in-out infinite',
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(6,6,8,0.85) 100%)',
        }}
      />
    </>
  );
}

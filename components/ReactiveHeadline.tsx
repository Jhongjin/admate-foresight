'use client';

import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';

interface ReactiveHeadlineProps {
  children: string;
  className?: string;
}

type Particle = {
  x: number;
  y: number;
  size: number;
  drift: number;
  tone: string;
};

export default function ReactiveHeadline({ children, className }: ReactiveHeadlineProps) {
  const frameRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      active: true,
    };
  }

  function handlePointerLeave() {
    pointerRef.current.active = false;
  }

  useEffect(() => {
    const root = rootRef.current;
    const title = titleRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: true });
    if (!root || !title || !canvas || !context) return;

    const rootElement = root;
    const titleElement = title;
    const canvasElement = canvas;
    const canvasContext = context;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const palette = ['rgba(15, 118, 110, 0.58)', 'rgba(183, 121, 31, 0.5)', 'rgba(16, 24, 32, 0.34)'];

    function wrapText(context2d: CanvasRenderingContext2D, text: string, maxWidth: number) {
      const tokens = text.split(/(\s+)/).filter(Boolean);
      const lines: string[] = [];
      let line = '';

      for (const token of tokens) {
        const candidate = `${line}${token}`;
        if (context2d.measureText(candidate).width <= maxWidth || line.length === 0) {
          line = candidate;
          continue;
        }

        lines.push(line.trimEnd());
        line = token.trimStart();
      }

      if (line) lines.push(line);
      return lines;
    }

    function createParticles(width: number, height: number, dpr: number) {
      const computed = window.getComputedStyle(titleElement);
      const sampleCanvas = document.createElement('canvas');
      const sampleContext = sampleCanvas.getContext('2d');
      if (!sampleContext) return [] as Particle[];

      sampleCanvas.width = Math.max(1, Math.floor(width * dpr));
      sampleCanvas.height = Math.max(1, Math.floor(height * dpr));
      sampleContext.scale(dpr, dpr);
      sampleContext.clearRect(0, 0, width, height);
      sampleContext.fillStyle = '#101820';
      sampleContext.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
      sampleContext.textBaseline = 'top';

      const lineHeight = Number.parseFloat(computed.lineHeight) || 36;
      const lines = wrapText(sampleContext, children, width);
      lines.forEach((line, index) => {
        sampleContext.fillText(line, 0, index * lineHeight);
      });

      const image = sampleContext.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
      const particles: Particle[] = [];
      const step = Math.max(4, Math.round(5 * dpr));

      for (let y = 0; y < sampleCanvas.height; y += step) {
        for (let x = 0; x < sampleCanvas.width; x += step) {
          const alpha = image[(y * sampleCanvas.width + x) * 4 + 3];
          if (alpha < 80) continue;

          const seed = (x * 17 + y * 31) % 97;
          particles.push({
            x: x / dpr,
            y: y / dpr,
            size: 0.7 + (seed % 4) * 0.18,
            drift: (seed / 97) * Math.PI * 2,
            tone: palette[seed % palette.length],
          });
        }
      }

      return particles;
    }

    function render() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rootElement.clientWidth);
      const height = Math.max(1, titleElement.offsetHeight);
      const particles = createParticles(width, height, dpr);
      const reducedMotion = motionQuery.matches;
      let tick = 0;

      canvasElement.width = Math.floor(width * dpr);
      canvasElement.height = Math.floor(height * dpr);
      canvasElement.style.width = `${width}px`;
      canvasElement.style.height = `${height}px`;
      canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      function draw() {
        canvasContext.clearRect(0, 0, width, height);
        const pointer = pointerRef.current;
        tick += reducedMotion ? 0 : 0.016;

        for (const particle of particles) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const pull = pointer.active && !reducedMotion ? Math.max(0, 1 - distance / 120) : 0;
          const wave = reducedMotion ? 0 : Math.sin(tick + particle.drift) * 0.38;
          const x = particle.x + (dx / distance) * pull * 4 + wave;
          const y = particle.y + (dy / distance) * pull * 3;

          canvasContext.beginPath();
          canvasContext.fillStyle = particle.tone;
          canvasContext.arc(x, y, particle.size + pull * 0.35, 0, Math.PI * 2);
          canvasContext.fill();
        }

        if (!reducedMotion) {
          frameRef.current = window.requestAnimationFrame(draw);
        }
      }

      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      draw();
    }

    const observer = new ResizeObserver(render);
    observer.observe(rootElement);
    render();

    motionQuery.addEventListener('change', render);
    return () => {
      observer.disconnect();
      motionQuery.removeEventListener('change', render);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [children]);

  return (
    <div
      ref={rootRef}
      className={`foresight-reactive-headline ${className ?? ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <h1 ref={titleRef} className="foresight-reactive-headline__title">
        {children}
      </h1>
      <canvas ref={canvasRef} className="foresight-reactive-headline__canvas" aria-hidden="true" />
    </div>
  );
}

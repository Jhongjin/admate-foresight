'use client';

import { useEffect, useRef } from 'react';

type TextParticle = {
  char: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  settled: boolean;
  radius: number;
};

const SOURCE_TEXT =
  'BASELINE FORECAST RANGE VARIANCE TREND MODEL SCENARIO DATA SAMPLE CONFIDENCE BUDGET PERIOD KPI';

const GLYPHS = SOURCE_TEXT.replace(/\s/g, '').split('');

function createParticle(width: number, fontSize: number, index: number): TextParticle {
  return {
    char: GLYPHS[index % GLYPHS.length],
    x: Math.random() * width,
    y: -10 - Math.random() * 72,
    vx: (Math.random() - 0.5) * 62,
    vy: Math.random() * 34,
    settled: false,
    radius: fontSize * 0.42,
  };
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: TextParticle,
  alpha: number,
) {
  const speed = Math.hypot(particle.vx, particle.vy);
  const speedNorm = Math.min(1, speed / 220);

  if (particle.settled) {
    context.fillStyle = `rgba(16, 24, 32, ${0.42 + alpha * 0.28})`;
  } else if (speedNorm > 0.45) {
    context.fillStyle = `rgba(15, 118, 110, ${0.45 + speedNorm * 0.42})`;
  } else {
    context.fillStyle = `rgba(127, 91, 29, ${0.36 + speedNorm * 0.34})`;
  }

  context.fillText(particle.char, particle.x, particle.y);
}

export default function ForesightTextMaterialCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return undefined;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mouse = { x: -1000, y: -1000 };
    let particles: TextParticle[] = [];
    let animationFrame = 0;
    let spawnIndex = 0;
    let lastTime = 0;
    let width = 1;
    let height = 1;
    let fontSize = 12;
    let maxParticles = 900;
    let spawnAccumulator = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      fontSize = Math.max(9, Math.min(13, Math.floor(width / 34)));
      maxParticles = Math.min(2600, Math.max(900, Math.floor((width * height) / 95)));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textBaseline = 'middle';
      context.textAlign = 'center';
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

      particles = particles
        .filter((particle) => particle.y < height + 40)
        .map((particle) => ({
          ...particle,
          x: Math.max(particle.radius, Math.min(width - particle.radius, particle.x)),
          y: Math.min(height - particle.radius, particle.y),
        }));

      if (particles.length > maxParticles) {
        particles = particles.slice(-maxParticles);
      }
    };

    const spawnParticles = (count: number) => {
      for (let index = 0; index < count && particles.length < maxParticles; index += 1) {
        particles.push(createParticle(width, fontSize, spawnIndex));
        spawnIndex += 1;
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = 'rgba(255, 253, 248, 0.62)';
      context.fillRect(0, 0, width, height);
      context.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      context.textBaseline = 'middle';
      context.textAlign = 'center';

      for (const particle of particles) {
        drawParticle(context, particle, particle.y / Math.max(1, height));
      }

      if (mouse.x > 0 && mouse.y > 0) {
        context.beginPath();
        context.arc(mouse.x, mouse.y, 82, 0, Math.PI * 2);
        context.strokeStyle = 'rgba(15, 118, 110, 0.12)';
        context.lineWidth = 1;
        context.stroke();
      }
    };

    const tick = (time: number) => {
      const motionScale = reducedMotionQuery.matches ? 0.34 : 1;
      const delta = Math.min(1 / 28, (lastTime ? time - lastTime : 16) / 1000) * motionScale;
      lastTime = time;
      spawnAccumulator += delta * (reducedMotionQuery.matches ? 24 : 52);

      if (spawnAccumulator >= 1) {
        const spawnCount = Math.min(8, Math.floor(spawnAccumulator));
        spawnParticles(spawnCount);
        spawnAccumulator -= spawnCount;
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        if (particle.settled) {
          if (mouse.x > 0) {
            const dx = particle.x - mouse.x;
            const dy = particle.y - mouse.y;
            const distance = Math.hypot(dx, dy);

            if (distance < 82 && distance > 0.1) {
              const force = (82 - distance) * 9;
              particle.vx += (dx / distance) * force * delta;
              particle.vy += (dy / distance) * force * delta - 42 * delta;
              particle.settled = false;
            }
          }

          continue;
        }

        particle.vy += 420 * delta;

        if (mouse.x > 0) {
          const dx = particle.x - mouse.x;
          const dy = particle.y - mouse.y;
          const distance = Math.hypot(dx, dy);

          if (distance < 98 && distance > 0.1) {
            const force = (98 - distance) * 13;
            particle.vx += (dx / distance) * force * delta;
            particle.vy += (dy / distance) * force * delta;
          }
        }

        particle.vx *= 0.997;
        particle.vy *= 0.997;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;

        if (particle.y > height - particle.radius) {
          particle.y = height - particle.radius;
          particle.vy *= -0.34;
          particle.vx *= 0.9;

          if (Math.abs(particle.vy) < 6) {
            particle.vy = 0;
            particle.settled = true;
          }
        }

        if (particle.x < particle.radius) {
          particle.x = particle.radius;
          particle.vx *= -0.34;
        }

        if (particle.x > width - particle.radius) {
          particle.x = width - particle.radius;
          particle.vx *= -0.34;
        }

        for (let otherIndex = Math.max(0, index - 120); otherIndex < index; otherIndex += 1) {
          const other = particles[otherIndex];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.hypot(dx, dy);
          const minDistance = particle.radius + other.radius;

          if (distance < minDistance && distance > 0.01) {
            const overlap = minDistance - distance;
            const nx = dx / distance;
            const ny = dy / distance;

            if (other.settled) {
              particle.x += nx * overlap;
              particle.y += ny * overlap;
            } else {
              particle.x += nx * overlap * 0.5;
              particle.y += ny * overlap * 0.5;
              other.x -= nx * overlap * 0.5;
              other.y -= ny * overlap * 0.5;
            }

            const relativeX = particle.vx - (other.settled ? 0 : other.vx);
            const relativeY = particle.vy - (other.settled ? 0 : other.vy);
            const relativeDot = relativeX * nx + relativeY * ny;

            if (relativeDot < 0) {
              particle.vx -= nx * relativeDot * 1.17;
              particle.vy -= ny * relativeDot * 1.17;

              if (!other.settled) {
                other.vx += nx * relativeDot * 0.3;
                other.vy += ny * relativeDot * 0.3;
              }
            }

            if (Math.abs(particle.vy) < 4 && Math.abs(particle.vx) < 4 && particle.y > height - 220) {
              particle.vy = 0;
              particle.vx = 0;
              particle.settled = true;
            }
          }
        }
      }

      draw();
      animationFrame = window.requestAnimationFrame(tick);
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      lastTime = 0;
      resize();

      if (particles.length === 0) {
        spawnParticles(Math.min(160, Math.floor(maxParticles * 0.18)));
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restart();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    const handlePointerLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const resizeObserver = new ResizeObserver(restart);
    resizeObserver.observe(canvas);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerleave', handlePointerLeave);
    reducedMotionQuery.addEventListener('change', restart);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    restart();

    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      reducedMotionQuery.removeEventListener('change', restart);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="foresight-gate-text-material" aria-label="Foresight baseline forecast signal">
      <canvas ref={canvasRef} className="foresight-gate-text-material-canvas" aria-hidden="true" />
    </div>
  );
}

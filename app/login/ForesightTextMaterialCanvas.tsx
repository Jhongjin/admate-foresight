'use client';

import { useEffect, useRef } from 'react';

type Cell = {
  glyph: string;
  tone: number;
};

type Shape = {
  points: Array<[number, number]>;
};

type Piece = {
  x: number;
  y: number;
  speed: number;
  word: string;
  tone: number;
  shape: Shape;
};

const WORDS = ['BASELINE', 'FORECAST', 'RANGE', 'VARIANCE', 'TREND', 'MODEL'] as const;

const SHAPES: Shape[] = [
  { points: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { points: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { points: [[1, 0], [1, 1], [1, 2], [0, 2]] },
  { points: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { points: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { points: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { points: [[0, 0], [1, 0], [2, 0], [3, 0]] },
];

const TONES = ['#182620', '#0b625b', '#7f5b1d', '#36516f'];

function createRandom(seed: number) {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function getGlyph(word: string, index: number) {
  return word[index % word.length];
}

function createGrid(columns: number, rows: number) {
  return Array<Cell | null>(columns * rows).fill(null);
}

function drawCell(
  context: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  cellSize: number,
  alpha = 1,
) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = TONES[cell.tone % TONES.length];
  context.shadowColor = 'rgba(15, 118, 110, 0.16)';
  context.shadowBlur = 5;
  context.fillText(cell.glyph, x + cellSize / 2, y + cellSize / 2);
  context.restore();
}

function canPlace(
  grid: Array<Cell | null>,
  columns: number,
  rows: number,
  piece: Piece,
  yOffset: number,
) {
  const gridY = Math.floor(piece.y + yOffset);

  return piece.shape.points.every(([pointX, pointY]) => {
    const x = piece.x + pointX;
    const y = gridY + pointY;

    if (x < 0 || x >= columns || y >= rows) {
      return false;
    }

    return y < 0 || grid[y * columns + x] === null;
  });
}

function settlePiece(grid: Array<Cell | null>, columns: number, piece: Piece) {
  const gridY = Math.floor(piece.y);

  piece.shape.points.forEach(([pointX, pointY], index) => {
    const x = piece.x + pointX;
    const y = gridY + pointY;

    if (y >= 0) {
      grid[y * columns + x] = {
        glyph: getGlyph(piece.word, index),
        tone: piece.tone,
      };
    }
  });
}

function trimSettledRows(grid: Array<Cell | null>, columns: number, rows: number) {
  for (let y = rows - 1; y >= 0; y -= 1) {
    const filled = Array.from({ length: columns }).filter((_, x) => grid[y * columns + x]).length;

    if (filled >= columns - 1) {
      for (let pullY = y; pullY > 0; pullY -= 1) {
        for (let x = 0; x < columns; x += 1) {
          grid[pullY * columns + x] = grid[(pullY - 1) * columns + x];
        }
      }

      for (let x = 0; x < columns; x += 1) {
        grid[x] = null;
      }
    }
  }
}

function createPiece(random: () => number, columns: number, startAbove = true): Piece {
  const shape = SHAPES[Math.floor(random() * SHAPES.length)];
  const width = Math.max(...shape.points.map(([x]) => x)) + 1;
  const word = WORDS[Math.floor(random() * WORDS.length)];

  return {
    x: Math.floor(random() * Math.max(1, columns - width)),
    y: startAbove ? -3 - Math.floor(random() * 4) : 0,
    speed: 0.75 + random() * 0.55,
    word,
    tone: Math.floor(random() * TONES.length),
    shape,
  };
}

function seedStaticGrid(grid: Array<Cell | null>, columns: number, rows: number, random: () => number) {
  for (let count = 0; count < rows * 2; count += 1) {
    const piece = createPiece(random, columns, false);
    piece.y = 0;

    while (canPlace(grid, columns, rows, piece, 1)) {
      piece.y += 1;
    }

    settlePiece(grid, columns, piece);
  }
}

function drawScene(
  canvas: HTMLCanvasElement,
  grid: Array<Cell | null>,
  columns: number,
  rows: number,
  cellSize: number,
  piece?: Piece,
) {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const dpr = window.devicePixelRatio || 1;

  context.save();
  context.scale(dpr, dpr);
  context.clearRect(0, 0, width, height);
  context.fillStyle = 'rgba(255, 253, 248, 0.76)';
  context.fillRect(0, 0, width / dpr, height / dpr);

  context.strokeStyle = 'rgba(16, 24, 32, 0.055)';
  context.lineWidth = 1;
  for (let x = 0; x <= columns; x += 1) {
    const lineX = x * cellSize + 0.5;
    context.beginPath();
    context.moveTo(lineX, 0);
    context.lineTo(lineX, rows * cellSize);
    context.stroke();
  }

  for (let y = 0; y <= rows; y += 1) {
    const lineY = y * cellSize + 0.5;
    context.beginPath();
    context.moveTo(0, lineY);
    context.lineTo(columns * cellSize, lineY);
    context.stroke();
  }

  context.font = `800 ${Math.max(9, cellSize * 0.58)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  grid.forEach((cell, index) => {
    if (!cell) {
      return;
    }

    const x = (index % columns) * cellSize;
    const y = Math.floor(index / columns) * cellSize;
    drawCell(context, cell, x, y, cellSize, 0.78);
  });

  if (piece) {
    piece.shape.points.forEach(([pointX, pointY], index) => {
      const y = (piece.y + pointY) * cellSize;

      if (y > -cellSize) {
        drawCell(
          context,
          { glyph: getGlyph(piece.word, index), tone: piece.tone },
          (piece.x + pointX) * cellSize,
          y,
          cellSize,
          0.92,
        );
      }
    });
  }

  const gradient = context.createLinearGradient(0, 0, 0, rows * cellSize);
  gradient.addColorStop(0, 'rgba(255, 253, 248, 0.58)');
  gradient.addColorStop(0.28, 'rgba(255, 253, 248, 0)');
  gradient.addColorStop(1, 'rgba(255, 253, 248, 0.22)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, columns * cellSize, rows * cellSize);
  context.restore();
}

export default function ForesightTextMaterialCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const random = createRandom(240521);
    let animationFrame = 0;
    let lastTime = 0;
    let columns = 1;
    let rows = 1;
    let cellSize = 18;
    let grid = createGrid(columns, rows);
    let piece = createPiece(random, columns);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cellSize = Math.max(16, Math.min(21, Math.floor(rect.width / 20)));
      columns = Math.max(12, Math.floor(rect.width / cellSize));
      rows = Math.max(7, Math.floor(rect.height / cellSize));
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      grid = createGrid(columns, rows);
      seedStaticGrid(grid, columns, rows, createRandom(5206));
      piece = createPiece(random, columns);

      if (reducedMotionQuery.matches) {
        drawScene(canvas, grid, columns, rows, cellSize);
      }
    };

    const animate = (time: number) => {
      if (reducedMotionQuery.matches) {
        return;
      }

      const delta = lastTime ? Math.min(48, time - lastTime) : 16;
      lastTime = time;
      piece.y += (delta / 1000) * piece.speed;

      if (!canPlace(grid, columns, rows, piece, 0)) {
        grid = createGrid(columns, rows);
        piece = createPiece(random, columns);
      } else if (!canPlace(grid, columns, rows, piece, 1)) {
        settlePiece(grid, columns, piece);
        trimSettledRows(grid, columns, rows);
        piece = createPiece(random, columns);
      }

      drawScene(canvas, grid, columns, rows, cellSize, piece);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      lastTime = 0;
      resize();

      if (!reducedMotionQuery.matches) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const resizeObserver = new ResizeObserver(restart);
    resizeObserver.observe(canvas);
    reducedMotionQuery.addEventListener('change', restart);
    restart();

    return () => {
      resizeObserver.disconnect();
      reducedMotionQuery.removeEventListener('change', restart);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div className="foresight-gate-text-material" aria-label="Foresight baseline forecast signal">
      <canvas ref={canvasRef} className="foresight-gate-text-material-canvas" aria-hidden="true" />
    </div>
  );
}

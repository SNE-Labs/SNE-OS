import { useEffect, useRef } from 'react';

export type AtmosphereKey =
  | 'shell-frame--home'
  | 'shell-frame--radar'
  | 'shell-frame--intel'
  | 'shell-frame--passport'
  | 'shell-frame--vault'
  | 'shell-frame--keys'
  | 'shell-frame--docs';

type Palette = {
  glyphs: string[];
  colors: Array<[number, number, number]>;
};

type GroupNode = {
  dx: number;
  dy: number;
  glyphIndex: number;
  colorIndex: number;
  size: number;
  phase: number;
};

type Group = {
  x: number;
  y: number;
  bornAt: number;
  duration: number;
  driftX: number;
  driftY: number;
  pulseOffset: number;
  nodes: GroupNode[];
};

const PALETTES: Record<AtmosphereKey, Palette> = {
  'shell-frame--home': {
    glyphs: ['·', '.', ':', '+', '/'],
    colors: [[255, 148, 82], [86, 168, 226], [102, 192, 150]],
  },
  'shell-frame--radar': {
    glyphs: ['·', ':', '+', 'x', '='],
    colors: [[82, 224, 154], [76, 156, 214], [108, 214, 166]],
  },
  'shell-frame--intel': {
    glyphs: ['·', '.', ':', ';', '/'],
    colors: [[255, 164, 94], [92, 160, 214], [132, 146, 232]],
  },
  'shell-frame--passport': {
    glyphs: ['·', ':', '+', '|', '/'],
    colors: [[255, 150, 92], [134, 146, 160], [104, 146, 210]],
  },
  'shell-frame--vault': {
    glyphs: ['·', '.', '+', '#', '|'],
    colors: [[94, 226, 166], [72, 156, 214], [114, 196, 156]],
  },
  'shell-frame--keys': {
    glyphs: ['0', '1', '[', ']', '/'],
    colors: [[102, 164, 242], [76, 132, 214], [255, 154, 92]],
  },
  'shell-frame--docs': {
    glyphs: ['·', '.', ':', '/', '-'],
    colors: [[150, 162, 180], [86, 138, 194], [212, 154, 96]],
  },
};

function mixRgb(a: [number, number, number], b: [number, number, number], ratio: number) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * ratio),
    Math.round(a[1] + (b[1] - a[1]) * ratio),
    Math.round(a[2] + (b[2] - a[2]) * ratio),
  ] as [number, number, number];
}

function createGroup(width: number, height: number, palette: Palette, bornAt: number): Group {
  const edgeBias = Math.random() > 0.55;
  const x = edgeBias
    ? (Math.random() > 0.5 ? 0.14 + Math.random() * 0.18 : 0.68 + Math.random() * 0.18) * width
    : (0.2 + Math.random() * 0.6) * width;
  const y = (0.14 + Math.random() * 0.72) * height;
  const nodeCount = 9 + Math.floor(Math.random() * 8);
  const spread = Math.min(width, height) * (0.035 + Math.random() * 0.05);
  const nodes: GroupNode[] = [];

  for (let index = 0; index < nodeCount; index += 1) {
    const angle = (Math.PI * 2 * index) / nodeCount + Math.random() * 0.45;
    const radius = spread * (0.22 + Math.random());
    nodes.push({
      dx: Math.cos(angle) * radius * (0.8 + Math.random() * 0.35),
      dy: Math.sin(angle) * radius * (0.6 + Math.random() * 0.55),
      glyphIndex: Math.floor(Math.random() * palette.glyphs.length),
      colorIndex: Math.floor(Math.random() * palette.colors.length),
      size: 11 + Math.floor(Math.random() * 5),
      phase: Math.random() * Math.PI * 2,
    });
  }

  return {
    x,
    y,
    bornAt,
    duration: 6200 + Math.random() * 7200,
    driftX: (Math.random() - 0.5) * 18,
    driftY: (Math.random() - 0.5) * 14,
    pulseOffset: Math.random() * Math.PI * 2,
    nodes,
  };
}

function envelope(progress: number) {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < 0.22) return progress / 0.22;
  if (progress > 0.76) return (1 - progress) / 0.24;
  return 1;
}

export function AsciiHaze({ atmosphereKey }: { atmosphereKey: AtmosphereKey }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const palette = PALETTES[atmosphereKey] ?? PALETTES['shell-frame--home'];
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let width = 0;
    let height = 0;
    let frameId = 0;
    let lastFrame = 0;
    let groups: Group[] = [];
    let nextSpawnAt = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
    };

    const seedGroups = (timestamp: number) => {
      groups = Array.from({ length: 6 }, (_, index) =>
        createGroup(width, height, palette, timestamp - index * 1100)
      );
      nextSpawnAt = timestamp + 1100;
    };

    const draw = (timestamp: number) => {
      if (!width || !height) {
        resize();
        seedGroups(timestamp);
      }
      if (!prefersReducedMotion && timestamp - lastFrame < 40) {
        frameId = window.requestAnimationFrame(draw);
        return;
      }
      lastFrame = timestamp;

      if (timestamp >= nextSpawnAt && groups.length < 9) {
        groups.push(createGroup(width, height, palette, timestamp));
        nextSpawnAt = timestamp + 900 + Math.random() * 1700;
      }

      groups = groups.filter((group) => timestamp - group.bornAt < group.duration);
      context.clearRect(0, 0, width, height);

      groups.forEach((group) => {
        const progress = prefersReducedMotion ? 0.45 : (timestamp - group.bornAt) / group.duration;
        const visible = envelope(progress);
        if (visible <= 0.02) return;

        const pulse = 0.5 + 0.5 * Math.sin(timestamp * 0.0018 + group.pulseOffset);
        const baseX = group.x + group.driftX * progress;
        const baseY = group.y + group.driftY * progress;

        group.nodes.forEach((node, index) => {
          const colorPhase = 0.5 + 0.5 * Math.sin(timestamp * 0.0012 + node.phase);
          const left = palette.colors[node.colorIndex % palette.colors.length];
          const right = palette.colors[(node.colorIndex + 1) % palette.colors.length];
          const rgb = mixRgb(left, right, colorPhase);
          const alpha = visible * (0.1 + pulse * 0.22);
          const glow = visible * (4 + pulse * 7);
          const wobbleX = Math.cos(timestamp * 0.00052 + node.phase + index * 0.1) * (0.8 + pulse * 1.8);
          const wobbleY = Math.sin(timestamp * 0.00046 + node.phase + index * 0.08) * (0.8 + pulse * 1.6);
          const glyph = pulse > 0.78 && node.glyphIndex < palette.glyphs.length - 1
            ? palette.glyphs[node.glyphIndex + 1]
            : palette.glyphs[node.glyphIndex];
          const color = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;

          context.font = `${node.size}px 'JetBrains Mono', 'SFMono-Regular', monospace`;
          context.shadowBlur = glow;
          context.shadowColor = color;
          context.fillStyle = color;
          context.fillText(glyph, baseX + node.dx + wobbleX, baseY + node.dy + wobbleY);
        });
      });

      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    seedGroups(0);
    frameId = window.requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [atmosphereKey]);

  return <canvas aria-hidden ref={canvasRef} className="shell-frame__ascii" />;
}

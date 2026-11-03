import { useMemo } from 'react';

interface AudioWaveformProps {
  widthPx: number;
  heightPx?: number;
  color?: string;
  seed: string;
}

/**
 * Générateur déterministe de forme d'onde audio pour les clips de la timeline (style CapCut).
 * Produit un profil harmonique réaliste sans latence,
 * parfaitement réactif aux opérations de zoom et de rognage.
 */
export function AudioWaveform({
  widthPx,
  heightPx = 26,
  color = 'rgba(52, 211, 153, 0.45)', // Vert émeraude CapCut
  seed,
}: AudioWaveformProps) {
  const bars = useMemo(() => {
    if (widthPx < 10) return [];

    // Hash déterministe du seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }

    const barWidth = 3;
    const barGap = 1.5;
    const step = barWidth + barGap;
    const count = Math.floor(widthPx / step);
    const result: { x: number; height: number; y: number }[] = [];

    for (let i = 0; i < count; i++) {
      // Modélisation d'enveloppe sonore (fondamentale + harmoniques)
      const n1 = Math.sin(i * 0.28 + hash * 0.02) * 0.25;
      const n2 = Math.cos(i * 0.65 + hash * 0.05) * 0.2;
      const n3 = Math.abs(Math.sin(i * 1.45 + hash * 0.1)) * 0.35;
      const amp = Math.max(0.12, Math.min(0.95, 0.4 + n1 + n2 + n3));

      const h = Math.round(amp * heightPx);
      const y = Math.round((heightPx - h) / 2);
      result.push({
        x: i * step,
        height: Math.max(2, h),
        y,
      });
    }

    return result;
  }, [widthPx, heightPx, seed]);

  if (bars.length === 0) return null;

  return (
    <svg
      className="timeline-clip__waveform"
      width={widthPx}
      height={heightPx}
      viewBox={`0 0 ${widthPx} ${heightPx}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x}
          y={bar.y}
          width={2.5}
          height={bar.height}
          rx={1}
          fill={color}
        />
      ))}
    </svg>
  );
}


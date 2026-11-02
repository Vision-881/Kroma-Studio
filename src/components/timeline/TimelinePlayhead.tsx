/**
 * Tête de lecture (Playhead) rouge CapCut-style traversant toutes les pistes.
 */
import { useProjectStore } from '../../store/projectStore';

interface TimelinePlayheadProps {
  totalHeightPx: number;
}

export function TimelinePlayhead({ totalHeightPx }: TimelinePlayheadProps) {
  const { currentTimeUs, zoomPixelsPerSecond } = useProjectStore();
  const playheadX = (currentTimeUs / 1_000_000) * zoomPixelsPerSecond;

  return (
    <div
      className="timeline-playhead-line"
      style={{
        transform: `translateX(${playheadX}px)`,
        height: `${totalHeightPx}px`,
      }}
    />
  );
}


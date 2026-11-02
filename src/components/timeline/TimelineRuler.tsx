/**
 * Réglette graduée de la timeline (style CapCut).
 * Affiche l'échelle temporelle dynamique et permet le déplacement interactif (scrubbing).
 */
import React, { useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman } from '../../core/time/timeUtils';

interface TimelineRulerProps {
  totalWidthPx: number;
}

export function TimelineRuler({ totalWidthPx }: TimelineRulerProps) {
  const { zoomPixelsPerSecond, currentTimeUs, setCurrentTimeUs } = useProjectStore();
  const rulerRef = useRef<HTMLDivElement>(null);

  // Intervalle de graduation en secondes selon le zoom
  let stepSeconds = 1;
  if (zoomPixelsPerSecond < 20) stepSeconds = 10;
  else if (zoomPixelsPerSecond < 40) stepSeconds = 5;
  else if (zoomPixelsPerSecond < 80) stepSeconds = 2;
  else stepSeconds = 1;

  const totalSeconds = Math.ceil(totalWidthPx / zoomPixelsPerSecond) + 5;
  const tickCount = Math.floor(totalSeconds / stepSeconds);

  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    const sec = i * stepSeconds;
    const xPos = sec * zoomPixelsPerSecond;
    ticks.push({
      second: sec,
      x: xPos,
      isMajor: sec % (stepSeconds * 5) === 0 || sec === 0,
    });
  }

  // Gestion du clic et glisser sur la réglette
  const handleSeek = useCallback(
    (clientX: number) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const clampedX = Math.max(0, relativeX);
      const targetSeconds = clampedX / zoomPixelsPerSecond;
      const targetUs = Math.round(targetSeconds * 1_000_000);
      setCurrentTimeUs(targetUs);
    },
    [zoomPixelsPerSecond, setCurrentTimeUs],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    handleSeek(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const playheadX = (currentTimeUs / 1_000_000) * zoomPixelsPerSecond;

  return (
    <div
      ref={rulerRef}
      className="timeline-ruler"
      style={{ width: `${totalWidthPx}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Ticks de la réglette */}
      {ticks.map((tick) => (
        <div
          key={tick.second}
          className={`timeline-ruler__tick${tick.isMajor ? ' timeline-ruler__tick--major' : ''}`}
          style={{ left: `${tick.x}px` }}
        >
          {tick.isMajor && (
            <span className="timeline-ruler__label">
              {formatDurationHuman(tick.second * 1_000_000)}
            </span>
          )}
        </div>
      ))}

      {/* Pointeur supérieur de la tête de lecture sur la réglette */}
      <div
        className="timeline-ruler__playhead-head"
        style={{ transform: `translateX(${playheadX}px)` }}
      />
    </div>
  );
}

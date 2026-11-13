/**
 * Tête de lecture (Playhead) rouge CapCut-style traversant la réglette et toutes les pistes.
 * Comprend le curseur supérieur (pentagone/flèche rouge) et la ligne verticale continue,
 * entièrement saisissables et déplaçables à la souris (scrubbing temps réel fluide).
 */
import React, { useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';

export function TimelinePlayhead() {
  const { currentTimeUs, setCurrentTimeUs, zoomPixelsPerSecond } = useProjectStore();
  const isDraggingRef = useRef(false);

  const playheadX = (currentTimeUs / 1_000_000) * zoomPixelsPerSecond;

  const handleSeek = useCallback(
    (clientX: number, canvasEl: HTMLElement) => {
      const rect = canvasEl.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const clampedX = Math.max(0, relativeX);
      const targetSeconds = clampedX / zoomPixelsPerSecond;
      const targetUs = Math.round(targetSeconds * 1_000_000);
      setCurrentTimeUs(targetUs);
    },
    [zoomPixelsPerSecond, setCurrentTimeUs],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    // Empêcher la sélection de texte ou le drag & drop de navigateur
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;

    const canvasEl = (e.currentTarget as HTMLElement).closest('.timeline-tracks-canvas') as HTMLElement;
    if (!canvasEl) return;

    handleSeek(e.clientX, canvasEl);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      handleSeek(moveEvent.clientX, canvasEl);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div
      className="timeline-playhead"
      style={{
        transform: `translateX(${playheadX}px)`,
      }}
    >
      {/* Tête supérieure en forme de flèche/pentagone (zone réglette) */}
      <div
        className="timeline-playhead__head"
        onMouseDown={handleMouseDown}
        title="Tête de lecture (Glisser pour parcourir la timeline)"
      />

      {/* Ligne rouge verticale continue traversant toutes les pistes jusqu'en bas */}
      <div className="timeline-playhead__line" />

      {/* Zone de préhension invisible élargie pour attraper la ligne sur les pistes */}
      <div
        className="timeline-playhead__hitbox"
        onMouseDown={handleMouseDown}
        title="Glisser la tête de lecture"
      />
    </div>
  );
}

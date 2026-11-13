/**
 * Tête de lecture (Playhead) rouge CapCut-style traversant la réglette et toutes les pistes.
 * Comprend le curseur supérieur (pentagone/flèche rouge) et la ligne verticale continue,
 * entièrement saisissables et déplaçables à la souris (scrubbing temps réel fluide).
 */
import React, { useRef, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { collectSnapTargets, snapPlayhead } from '../../core/timeline/snapping';

export function TimelinePlayhead() {
  const {
    currentTimeUs,
    setCurrentTimeUs,
    zoomPixelsPerSecond,
    isSnappingEnabled,
    setActiveSnapLineUs,
    project,
  } = useProjectStore();
  const isDraggingRef = useRef(false);

  const playheadX = (currentTimeUs / 1_000_000) * zoomPixelsPerSecond;

  const handleSeek = useCallback(
    (clientX: number, canvasEl: HTMLElement) => {
      const rect = canvasEl.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const clampedX = Math.max(0, relativeX);
      const targetSeconds = clampedX / zoomPixelsPerSecond;
      let targetUs = Math.round(targetSeconds * 1_000_000);

      if (isSnappingEnabled) {
        // Seuil d'aimantation confortable de 18 pixels
        const thresholdUs = Math.round((18 / zoomPixelsPerSecond) * 1_000_000);
        const snapTargets = collectSnapTargets(project, { playheadTimeUs: -1 });
        const snap = snapPlayhead(targetUs, snapTargets, thresholdUs);
        if (snap) {
          targetUs = snap.snapped_time_us;
          setActiveSnapLineUs(snap.snapped_time_us);
        } else {
          setActiveSnapLineUs(null);
        }
      }

      setCurrentTimeUs(targetUs);
    },
    [zoomPixelsPerSecond, setCurrentTimeUs, isSnappingEnabled, setActiveSnapLineUs, project],
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
      setActiveSnapLineUs(null);
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

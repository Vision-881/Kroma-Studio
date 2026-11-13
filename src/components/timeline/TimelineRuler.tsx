/**
 * Réglette graduée de la timeline (style CapCut).
 * Affiche l'échelle temporelle dynamique et permet le déplacement interactif (scrubbing).
 */
import React, { useRef, useCallback, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman } from '../../core/time/timeUtils';
import { MARKER_PRESET_COLORS, type TimelineMarker } from '../../core/types/timeline';
import { collectSnapTargets, snapPlayhead } from '../../core/timeline/snapping';
import { Trash2, Check, X } from 'lucide-react';

interface TimelineRulerProps {
  totalWidthPx: number;
}

export function TimelineRuler({ totalWidthPx }: TimelineRulerProps) {
  const {
    zoomPixelsPerSecond,
    setCurrentTimeUs,
    project,
    updateTimelineMarker,
    removeTimelineMarker,
    isSnappingEnabled,
    setActiveSnapLineUs,
  } = useProjectStore();
  const rulerRef = useRef<HTMLDivElement>(null);

  const [editingMarker, setEditingMarker] = useState<TimelineMarker | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

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
      let targetUs = Math.round(targetSeconds * 1_000_000);

      if (isSnappingEnabled) {
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
    handleSeek(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setActiveSnapLineUs(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleOpenEdit = (marker: TimelineMarker, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMarker(marker);
    setEditLabel(marker.label);
    setEditColor(marker.color);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMarker) return;
    updateTimelineMarker(editingMarker.marker_id, {
      label: editLabel.trim() || 'Marqueur',
      color: editColor,
    });
    setEditingMarker(null);
  };

  const handleDeleteMarker = (markerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTimelineMarker(markerId);
    setEditingMarker(null);
  };

  const markers = project.sequence.markers || [];

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

      {/* Marqueurs temporels (Étape 17) */}
      {markers.map((marker) => {
        const markerX = (marker.time_us / 1_000_000) * zoomPixelsPerSecond;
        return (
          <div
            key={marker.marker_id}
            className="timeline-marker-pin"
            style={{
              left: `${markerX}px`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentTimeUs(marker.time_us);
            }}
            onDoubleClick={(e) => handleOpenEdit(marker, e)}
            title={`Marqueur : "${marker.label}" (${formatDurationHuman(marker.time_us)})\nClic : sauter ici · Double-clic : éditer`}
          >
            <div
              className="timeline-marker-pin__diamond"
              style={{
                backgroundColor: marker.color,
                borderColor: '#ffffff',
              }}
            />
            <span className="timeline-marker-pin__label">{marker.label}</span>
          </div>
        );
      })}

      {/* Popover d'édition d'un marqueur */}
      {editingMarker && (() => {
        const markerX = (editingMarker.time_us / 1_000_000) * zoomPixelsPerSecond;
        return (
          <div
            className="timeline-marker-edit-popover"
            style={{
              left: `${Math.max(10, Math.min(totalWidthPx - 260, markerX - 100))}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="timeline-marker-edit-popover__header">
              <span>Éditer le marqueur</span>
              <button
                type="button"
                className="kroma-icon-btn"
                style={{ width: 20, height: 20 }}
                onClick={() => setEditingMarker(null)}
              >
                <X size={12} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <input
                type="text"
                className="timeline-marker-edit-input"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Nom du marqueur..."
                autoFocus
              />

              {/* Palette de couleurs */}
              <div className="timeline-marker-color-grid">
                {MARKER_PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`timeline-marker-color-btn${editColor === c.hex ? ' timeline-marker-color-btn--active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setEditColor(c.hex)}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="timeline-marker-edit-actions">
                <button
                  type="button"
                  className="timeline-marker-delete-btn"
                  onClick={(e) => handleDeleteMarker(editingMarker.marker_id, e)}
                  title="Supprimer ce marqueur"
                >
                  <Trash2 size={12} />
                  <span>Supprimer</span>
                </button>
                <button type="submit" className="timeline-marker-save-btn">
                  <Check size={12} />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        );
      })()}
    </div>
  );
}


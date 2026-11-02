/**
 * Moniteur de prévisualisation vidéo (style CapCut).
 * Affiche l'image ou la vidéo active à la position temporelle courante,
 * et intègre une barre de transport complète avec timecode et contrôle de lecture.
 */
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { usToTimecode } from '../../core/time/timeUtils';
import type { TimelineItem } from '../../core/types/timeline';

export function PreviewMonitor() {
  const {
    project,
    currentTimeUs,
    setCurrentTimeUs,
  } = useProjectStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

  // Recherche du clip visuel actif sous la tête de lecture
  let activeVisualItem: TimelineItem | null = null;
  const visualLanes = project.sequence.lanes
    .filter((l) => l.lane_type === 'visual')
    .sort((a, b) => b.stack_index - a.stack_index); // Pistes supérieures au-dessus

  for (const lane of visualLanes) {
    if (lane.is_muted) continue;
    const found = lane.items.find(
      (item) =>
        currentTimeUs >= item.placement_time_us &&
        currentTimeUs <= item.placement_time_us + item.play_duration_us,
    );
    if (found) {
      activeVisualItem = found;
      break;
    }
  }

  const activeAsset = activeVisualItem
    ? project.asset_catalog.find((a) => a.asset_id === activeVisualItem?.referenced_asset_id)
    : null;

  // Boucle de lecture Play/Pause
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTickTimeRef.current = null;
      return;
    }

    const tick = (nowMs: number) => {
      if (lastTickTimeRef.current !== null) {
        const deltaMs = nowMs - lastTickTimeRef.current;
        const deltaUs = Math.round(deltaMs * 1000);
        const maxDurationUs = project.sequence.total_length_us;

        const nextTimeUs = currentTimeUs + deltaUs;
        if (maxDurationUs > 0 && nextTimeUs >= maxDurationUs) {
          setCurrentTimeUs(maxDurationUs);
          setIsPlaying(false);
          return;
        } else {
          setCurrentTimeUs(nextTimeUs);
        }
      }

      lastTickTimeRef.current = nowMs;
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTimeUs, project.sequence.total_length_us, setCurrentTimeUs]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTimeUs >= project.sequence.total_length_us && project.sequence.total_length_us > 0) {
        setCurrentTimeUs(0);
      }
      setIsPlaying(true);
    }
  };

  const handleSkipBack = () => {
    setCurrentTimeUs(Math.max(0, currentTimeUs - 1_000_000));
  };

  const handleSkipForward = () => {
    setCurrentTimeUs(currentTimeUs + 1_000_000);
  };

  const handleResetToStart = () => {
    setCurrentTimeUs(0);
  };

  const fps = project.timeline_canvas.frame_rate_fps;
  const currentTimecode = usToTimecode(currentTimeUs, fps);
  const totalTimecode = usToTimecode(project.sequence.total_length_us, fps);

  return (
    <div className="preview-monitor">
      {/* Écran vidéo 16:9 */}
      <div className="preview-monitor__screen-container">
        <div className="preview-monitor__screen">
          {activeAsset?.thumbnail_url ? (
            <img
              src={activeAsset.thumbnail_url}
              alt="Aperçu vidéo"
              className="preview-monitor__image"
              style={{
                opacity: activeVisualItem?.spatial_placement?.opacity_ratio ?? 1,
                transform: `scale(${activeVisualItem?.spatial_placement?.zoom_factor_x ?? 1}) rotate(${activeVisualItem?.spatial_placement?.rotation_degrees ?? 0}deg)`,
              }}
            />
          ) : (
            <div className="preview-monitor__placeholder">
              <span className="preview-monitor__canvas-info">
                {project.timeline_canvas.viewport_width} × {project.timeline_canvas.viewport_height}
              </span>
              <p className="preview-monitor__hint">
                {project.sequence.total_length_us === 0
                  ? 'Glissez un clip sur la timeline pour commencer'
                  : 'Aucun média actif à cet instant'}
              </p>
            </div>
          )}

          {/* Badge format d'affichage */}
          <div className="preview-monitor__ratio-badge">16:9</div>
        </div>
      </div>

      {/* Barre de transport inférieure */}
      <div className="preview-monitor__transport">
        {/* Contrôles de saut et lecture */}
        <div className="preview-monitor__controls">
          <button
            className="kroma-icon-btn"
            onClick={handleResetToStart}
            title="Revenir au début (Début)"
          >
            <RotateCcw size={15} />
          </button>

          <button
            className="kroma-icon-btn"
            onClick={handleSkipBack}
            title="Reculer de 1 seconde (Flèche gauche)"
          >
            <SkipBack size={16} />
          </button>

          <button
            className="preview-monitor__play-btn"
            onClick={togglePlay}
            title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="play-icon-offset" />}
          </button>

          <button
            className="kroma-icon-btn"
            onClick={handleSkipForward}
            title="Avancer de 1 seconde (Flèche droite)"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Compteur temporel double */}
        <div className="preview-monitor__timecode">
          <span className="timecode-current">{currentTimecode}</span>
          <span className="timecode-divider">/</span>
          <span className="timecode-total">{totalTimecode}</span>
        </div>
      </div>
    </div>
  );
}

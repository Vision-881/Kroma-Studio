/**
 * Représentation visuelle d'un segment de clip sur la timeline (style CapCut).
 * Supporte la sélection, le déplacement temporel, le rognage (trim) gauche/droite,
 * et la découpe directe au rasoir.
 */
import { useRef } from 'react';
import type { TimelineItem, LaneType } from '../../core/types/timeline';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman } from '../../core/time/timeUtils';
import { AudioWaveform } from '../audio/AudioWaveform';

interface TimelineClipProps {
  item: TimelineItem;
  laneType: LaneType;
  laneId: string;
  isLocked: boolean;
}

export function TimelineClip({ item, laneType, laneId, isLocked }: TimelineClipProps) {
  const {
    project,
    zoomPixelsPerSecond,
    selectedItemId,
    setSelectedItemId,
    activeTool,
    removeTimelineItem,
    moveTimelineItem,
    trimTimelineItem,
    setCurrentTimeUs,
    splitTimelineItemAtCurrentTime,
  } = useProjectStore();

  const isSelected = selectedItemId === item.item_id;
  const clipRef = useRef<HTMLDivElement>(null);

  // Recherche de l'asset source lié pour le nom et la miniature
  const sourceAsset = project.asset_catalog.find(
    (a) => a.asset_id === item.referenced_asset_id,
  );

  const displayName = item.text_layer_data?.raw_string || sourceAsset?.display_name || 'Clip sans nom';
  const durationLabel = formatDurationHuman(item.play_duration_us);

  // Position et dimensions en pixels
  const leftPx = (item.placement_time_us / 1_000_000) * zoomPixelsPerSecond;
  const widthPx = Math.max(12, (item.play_duration_us / 1_000_000) * zoomPixelsPerSecond);

  // ── Gestion des clics et outils ──────────────────────────────────────────
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLocked) return;

    if (activeTool === 'delete') {
      removeTimelineItem(item.item_id);
      return;
    }

    if (activeTool === 'split') {
      // Découper à l'endroit cliqué
      if (clipRef.current) {
        const rect = clipRef.current.getBoundingClientRect();
        const clickOffsetPx = e.clientX - rect.left;
        const clickOffsetSeconds = clickOffsetPx / zoomPixelsPerSecond;
        const splitTimeUs = item.placement_time_us + Math.round(clickOffsetSeconds * 1_000_000);
        setCurrentTimeUs(splitTimeUs);
        splitTimelineItemAtCurrentTime(item.item_id);
      }
      return;
    }

    // Outil sélection standard
    setSelectedItemId(item.item_id);
  };

  // ── Rognage (Trim) interactif ─────────────────────────────────────────────
  const handleTrimMouseDown = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    if (isLocked) return;

    const startClientX = e.clientX;
    let accumulatedDeltaPx = 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX - accumulatedDeltaPx;
      if (Math.abs(deltaPx) >= 2) {
        const deltaSeconds = deltaPx / zoomPixelsPerSecond;
        const deltaUs = Math.round(deltaSeconds * 1_000_000);
        trimTimelineItem(item.item_id, handle, deltaUs);
        accumulatedDeltaPx += deltaPx;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── Déplacement (Move) interactif ────────────────────────────────────────
  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if (isLocked || activeTool !== 'select') return;
    if ((e.target as HTMLElement).classList.contains('timeline-clip__trim-handle')) return;

    e.stopPropagation();
    setSelectedItemId(item.item_id);

    const startClientX = e.clientX;
    const initialPlacementUs = item.placement_time_us;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      const deltaSeconds = deltaPx / zoomPixelsPerSecond;
      const deltaUs = Math.round(deltaSeconds * 1_000_000);
      const newPlacementUs = Math.max(0, initialPlacementUs + deltaUs);
      moveTimelineItem(item.item_id, laneId, newPlacementUs);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Classe CSS de coloration selon le type de piste
  const typeClass = `timeline-clip--${laneType}`;

  // Calcul des largeurs graphiques des fondus audio (Fade in / Fade out)
  const fadeInPx = item.fade_in_duration_us && item.fade_in_duration_us > 0
    ? Math.min(widthPx, (item.fade_in_duration_us / 1_000_000) * zoomPixelsPerSecond)
    : 0;

  const fadeOutPx = item.fade_out_duration_us && item.fade_out_duration_us > 0
    ? Math.min(widthPx, (item.fade_out_duration_us / 1_000_000) * zoomPixelsPerSecond)
    : 0;

  const hasAudio = laneType === 'audio' || (sourceAsset?.media_kind === 'video' && (sourceAsset.audio_channels ?? 0) > 0);

  return (
    <div
      ref={clipRef}
      className={`timeline-clip ${typeClass}${isSelected ? ' timeline-clip--selected' : ''}${isLocked ? ' timeline-clip--locked' : ''}`}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      onClick={handleClick}
      onMouseDown={handleBodyMouseDown}
      title={`${displayName} (${durationLabel})`}
    >
      {/* Poignée de rognage gauche (Trim In) */}
      {!isLocked && (
        <div
          className="timeline-clip__trim-handle timeline-clip__trim-handle--left"
          onMouseDown={(e) => handleTrimMouseDown(e, 'start')}
          title="Régler le point de début (Trim in)"
        />
      )}

      {/* Zone visuelle et badge de transition d'entrée (Étape 10) */}
      {item.transition_in && item.transition_in.transition_type !== 'none' && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${Math.min(
                widthPx,
                Math.max(16, ((item.transition_in.duration_us || 1_000_000) / 1_000_000) * zoomPixelsPerSecond),
              )}px`,
              background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.4) 0%, rgba(168, 85, 247, 0.05) 100%)',
              borderRight: '1px dashed rgba(168, 85, 247, 0.7)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 6,
              top: 4,
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'rgba(168, 85, 247, 0.85)',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
            title={`Transition : ${item.transition_in.transition_type} (${(
              (item.transition_in.duration_us || 1_000_000) / 1_000_000
            ).toFixed(1)}s)`}
          >
            <span>✨</span>
            <span>
              {item.transition_in.transition_type === 'crossfade'
                ? 'Fondu'
                : item.transition_in.transition_type === 'fade_to_black'
                ? 'Noir'
                : item.transition_in.transition_type === 'dip_to_white'
                ? 'Flash'
                : 'Wipe'}
            </span>
          </div>
        </>
      )}

      {/* Rendu de la forme d'onde audio (Waveform) */}
      {hasAudio && (
        <AudioWaveform
          widthPx={widthPx}
          heightPx={24}
          color={laneType === 'audio' ? 'rgba(52, 211, 153, 0.45)' : 'rgba(96, 165, 250, 0.35)'}
          seed={item.item_id}
        />
      )}

      {/* Pente graphique du fondu d'entrée (Fade In Slope) */}
      {fadeInPx > 0 && (
        <svg
          className="timeline-clip__fade-overlay timeline-clip__fade-overlay--in"
          style={{ width: `${fadeInPx}px` }}
          aria-hidden="true"
        >
          <polygon points={`0,0 ${fadeInPx},0 0,56`} fill="rgba(0, 0, 0, 0.35)" />
          <line x1="0" y1="56" x2={fadeInPx} y2="0" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      )}

      {/* Pente graphique du fondu de sortie (Fade Out Slope) */}
      {fadeOutPx > 0 && (
        <svg
          className="timeline-clip__fade-overlay timeline-clip__fade-overlay--out"
          style={{ width: `${fadeOutPx}px` }}
          aria-hidden="true"
        >
          <polygon points={`0,0 ${fadeOutPx},0 ${fadeOutPx},56`} fill="rgba(0, 0, 0, 0.35)" />
          <line x1="0" y1="0" x2={fadeOutPx} y2="56" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      )}

      {/* Corps du clip */}
      <div className="timeline-clip__content">
        {/* Miniature si disponible */}
        {sourceAsset?.thumbnail_url && widthPx > 50 && (
          <img
            src={sourceAsset.thumbnail_url}
            alt=""
            className="timeline-clip__thumb"
          />
        )}

        <div className="timeline-clip__info">
          <span className="timeline-clip__title">{displayName}</span>
          {widthPx > 80 && (
            <span className="timeline-clip__duration">{durationLabel}</span>
          )}
        </div>
      </div>

      {/* Poignée de rognage droite (Trim Out) */}
      {!isLocked && (
        <div
          className="timeline-clip__trim-handle timeline-clip__trim-handle--right"
          onMouseDown={(e) => handleTrimMouseDown(e, 'end')}
          title="Régler le point de fin (Trim out)"
        />
      )}
    </div>
  );
}

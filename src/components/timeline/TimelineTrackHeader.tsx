/**
 * En-tête d'une piste sur la Timeline (style CapCut).
 * Affiche le titre de la piste, son type, les contrôles Mute/Solo/Lock
 * ainsi que le curseur de réglage du volume de la piste.
 */
import { Film, Type, Music, Volume2, VolumeX, Lock, Unlock } from 'lucide-react';
import type { TimelineLane } from '../../core/types/timeline';
import { useProjectStore } from '../../store/projectStore';

interface TimelineTrackHeaderProps {
  lane: TimelineLane;
}

export function TimelineTrackHeader({ lane }: TimelineTrackHeaderProps) {
  const { project, toggleLaneMute, toggleLaneSolo, toggleLaneLock, updateLaneGain } = useProjectStore();

  const hasSoloActive = project.sequence.lanes.some((l) => Boolean(l.is_solo));
  const isMutedBySolo = hasSoloActive && !lane.is_solo;
  const gainPercent = Math.round((lane.gain_level ?? 1.0) * 100);

  const renderIcon = () => {
    switch (lane.lane_type) {
      case 'visual':
        return <Film size={13} className="track-icon track-icon--visual" />;
      case 'text_overlay':
        return <Type size={13} className="track-icon track-icon--text" />;
      case 'audio':
        return <Music size={13} className="track-icon track-icon--audio" />;
    }
  };

  return (
    <div
      className={`timeline-track-header${lane.is_locked ? ' timeline-track-header--locked' : ''}${isMutedBySolo ? ' timeline-track-header--dimmed' : ''}`}
    >
      {/* Ligne 1 : Titre et type de piste */}
      <div className="timeline-track-header__info">
        {renderIcon()}
        <span className="timeline-track-header__title" title={lane.lane_title}>
          {lane.lane_title}
        </span>
        {isMutedBySolo && (
          <span className="track-solo-muted-badge" title="Piste muette car une autre piste est en Solo">
            M
          </span>
        )}
      </div>

      {/* Ligne 2 : Actions Mute, Solo, Lock et Volume de piste */}
      <div className="timeline-track-header__controls-row">
        <div className="timeline-track-header__actions">
          {/* Mute */}
          <button
            className={`track-action-btn${lane.is_muted ? ' track-action-btn--active' : ''}`}
            onClick={() => toggleLaneMute(lane.lane_id)}
            title={lane.is_muted ? 'Réactiver le son de la piste' : 'Couper le son de la piste (Mute)'}
          >
            {lane.is_muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
          </button>

          {/* Solo */}
          <button
            className={`track-action-btn track-action-btn--solo${lane.is_solo ? ' track-action-btn--solo-active' : ''}`}
            onClick={() => toggleLaneSolo(lane.lane_id)}
            title={lane.is_solo ? 'Désactiver le mode Solo' : 'Isoler cette piste (Solo)'}
          >
            S
          </button>

          {/* Lock */}
          <button
            className={`track-action-btn${lane.is_locked ? ' track-action-btn--active' : ''}`}
            onClick={() => toggleLaneLock(lane.lane_id)}
            title={lane.is_locked ? 'Déverrouiller la piste' : 'Verrouiller la piste'}
          >
            {lane.is_locked ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>

        {/* Curseur de volume de la piste (pistes vidéo & audio) */}
        {lane.lane_type !== 'text_overlay' && (
          <div className="track-volume-slider-wrap" title={`Volume de la piste : ${gainPercent}%`}>
            <input
              type="range"
              min="0"
              max="200"
              value={gainPercent}
              onChange={(e) => updateLaneGain(lane.lane_id, Number(e.target.value) / 100)}
              className="track-volume-slider"
            />
            <span className="track-volume-badge">{gainPercent}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

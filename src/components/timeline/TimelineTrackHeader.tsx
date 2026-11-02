/**
 * En-tête d'une piste sur la Timeline (style CapCut).
 * Affiche le titre de la piste, son type et les contrôles Mute/Lock.
 */
import { Film, Type, Music, Volume2, VolumeX, Lock, Unlock } from 'lucide-react';
import type { TimelineLane } from '../../core/types/timeline';
import { useProjectStore } from '../../store/projectStore';

interface TimelineTrackHeaderProps {
  lane: TimelineLane;
}

export function TimelineTrackHeader({ lane }: TimelineTrackHeaderProps) {
  const { toggleLaneMute, toggleLaneLock } = useProjectStore();

  const renderIcon = () => {
    switch (lane.lane_type) {
      case 'visual':
        return <Film size={14} className="track-icon track-icon--visual" />;
      case 'text_overlay':
        return <Type size={14} className="track-icon track-icon--text" />;
      case 'audio':
        return <Music size={14} className="track-icon track-icon--audio" />;
    }
  };

  return (
    <div className={`timeline-track-header${lane.is_locked ? ' timeline-track-header--locked' : ''}`}>
      <div className="timeline-track-header__info">
        {renderIcon()}
        <span className="timeline-track-header__title" title={lane.lane_title}>
          {lane.lane_title}
        </span>
      </div>

      <div className="timeline-track-header__actions">
        {/* Mute */}
        <button
          className={`track-action-btn${lane.is_muted ? ' track-action-btn--active' : ''}`}
          onClick={() => toggleLaneMute(lane.lane_id)}
          title={lane.is_muted ? 'Réactiver le son de la piste' : 'Couper le son de la piste'}
        >
          {lane.is_muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>

        {/* Lock */}
        <button
          className={`track-action-btn${lane.is_locked ? ' track-action-btn--active' : ''}`}
          onClick={() => toggleLaneLock(lane.lane_id)}
          title={lane.is_locked ? 'Déverrouiller la piste' : 'Verrouiller la piste'}
        >
          {lane.is_locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </div>
    </div>
  );
}

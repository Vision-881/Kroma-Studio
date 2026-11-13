/**
 * Représentation visuelle d'un segment de clip sur la timeline (style CapCut).
 * Supporte la sélection, le déplacement temporel, le rognage (trim) gauche/droite,
 * et la découpe directe au rasoir.
 */
import { useRef, useState, useCallback } from 'react';
import type { TimelineItem, LaneType, KeyframeProperty } from '../../core/types/timeline';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman } from '../../core/time/timeUtils';
import { hasKeyframes, getAllKeyframeOffsets } from '../../core/animation/keyframeInterpolation';
import {
  collectSnapTargets,
  snapClipMovement,
  findNearestSnap,
} from '../../core/timeline/snapping';
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
    selectedItemIds,
    setSelectedItemId,
    toggleItemSelection,
    activeTool,
    removeTimelineItem,
    removeSelectedItems,
    moveTimelineItem,
    moveMultipleTimelineItems,
    trimTimelineItem,
    setCurrentTimeUs,
    splitTimelineItemAtCurrentTime,
    moveClipKeyframes,
    pushHistorySnapshot,
    currentTimeUs,
    isSnappingEnabled,
    setActiveSnapLineUs,
  } = useProjectStore();

  const isSelected = selectedItemIds.includes(item.item_id) || selectedItemId === item.item_id;
  const clipRef = useRef<HTMLDivElement>(null);

  // État du losange en cours de déplacement : offset courant affiché pendant le drag
  const [draggingKf, setDraggingKf] = useState<{ startOffsetUs: number; currentOffsetUs: number } | null>(null);

  /**
   * Démarre le drag d'un losange d'image-clé sur la timeline (style CapCut).
   * - Permet de déplacer l'instant temporel (time_offset_us) de toutes les images-clés associées.
   * - Met à jour la position en temps réel avec synchronisation du moniteur Canvas et de l'Inspecteur.
   * - Enregistre un snapshot d'historique au premier mouvement effectif pour un Undo/Redo propre.
   * - Un simple clic sélectionne le clip et place la tête de lecture sur l'image-clé.
   */
  const handleKfMouseDown = useCallback(
    (e: React.MouseEvent, originalOffsetUs: number) => {
      e.stopPropagation();
      e.preventDefault();
      if (isLocked) return;

      const startClientX = e.clientX;
      const kfPropKeys: KeyframeProperty[] = ['scale', 'position_x', 'position_y', 'rotation', 'opacity'];

      // Identifier les identifiants de toutes les images-clés regroupées sous ce losange
      const targetIds: string[] = [];
      for (const prop of kfPropKeys) {
        const propList = item.keyframes?.[prop];
        if (!propList) continue;
        const match = propList.find((k) => Math.abs(k.time_offset_us - originalOffsetUs) <= 40_000);
        if (match) {
          targetIds.push(match.id);
        }
      }

      if (targetIds.length === 0) return;

      let hasMoved = false;
      let lastOffsetUs = originalOffsetUs;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaPx = moveEvent.clientX - startClientX;
        if (!hasMoved && Math.abs(deltaPx) >= 2) {
          hasMoved = true;
          pushHistorySnapshot();
        }
        if (!hasMoved) return;

        const deltaSeconds = deltaPx / zoomPixelsPerSecond;
        const deltaUs = Math.round(deltaSeconds * 1_000_000);
        const newOffsetUs = Math.max(0, Math.min(item.play_duration_us, originalOffsetUs + deltaUs));

        if (newOffsetUs === lastOffsetUs) return;
        lastOffsetUs = newOffsetUs;

        // Déplacement temps réel de toutes les propriétés liées à cette image-clé
        moveClipKeyframes(item.item_id, targetIds, newOffsetUs, false);
        setDraggingKf({ startOffsetUs: originalOffsetUs, currentOffsetUs: newOffsetUs });

        // Synchronisation de la tête de lecture pour rafraîchir en direct le Canvas et l'Inspecteur
        setCurrentTimeUs(item.placement_time_us + newOffsetUs);
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        if (!hasMoved) {
          // Clic sans déplacement : jump tête de lecture + sélection du clip
          setSelectedItemId(item.item_id);
          setCurrentTimeUs(item.placement_time_us + originalOffsetUs);
        }

        setDraggingKf(null);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [isLocked, item, zoomPixelsPerSecond, pushHistorySnapshot, moveClipKeyframes, setCurrentTimeUs, setSelectedItemId],
  );

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

    // Ctrl+Clic / Cmd+Clic / Shift+Clic est déjà géré dans handleBodyMouseDown
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }

    if (activeTool === 'delete') {
      if (selectedItemIds.includes(item.item_id) && selectedItemIds.length > 1) {
        removeSelectedItems();
      } else {
        removeTimelineItem(item.item_id);
      }
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

    // Si on a simplement cliqué (sans drag) sur un clip qui faisait partie d'une multi-sélection,
    // on restreint la sélection à ce clip unique (comportement standard CapCut / OS)
    if (selectedItemIds.length > 1 && selectedItemIds.includes(item.item_id)) {
      setSelectedItemId(item.item_id);
    }
  };

  // ── Rognage (Trim) interactif avec aimantation magnétique ─────────────────
  const handleTrimMouseDown = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation();
    if (isLocked) return;

    const startClientX = e.clientX;
    let accumulatedDeltaPx = 0;
    let hasMoved = false;

    // Seuil d'aimantation sensible et réactif : 20px
    const snapThresholdUs = Math.round((20 / zoomPixelsPerSecond) * 1_000_000);
    const snapTargets = isSnappingEnabled
      ? collectSnapTargets(project, { excludeItemId: item.item_id, playheadTimeUs: currentTimeUs })
      : [];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX - accumulatedDeltaPx;
      if (Math.abs(deltaPx) >= 2) {
        if (!hasMoved) {
          hasMoved = true;
          pushHistorySnapshot();
        }

        const deltaSeconds = deltaPx / zoomPixelsPerSecond;
        let deltaUs = Math.round(deltaSeconds * 1_000_000);

        if (isSnappingEnabled) {
          const currentEdgeUs =
            handle === 'start'
              ? item.placement_time_us + deltaUs
              : item.placement_time_us + item.play_duration_us + deltaUs;

          const snap = findNearestSnap(currentEdgeUs, snapTargets, snapThresholdUs);
          if (snap) {
            deltaUs =
              handle === 'start'
                ? snap.snapped_time_us - item.placement_time_us
                : snap.snapped_time_us - (item.placement_time_us + item.play_duration_us);
            setActiveSnapLineUs(snap.snapped_time_us);
          } else {
            setActiveSnapLineUs(null);
          }
        }

        trimTimelineItem(item.item_id, handle, deltaUs, false);
        accumulatedDeltaPx += deltaPx;
      }
    };

    const onMouseUp = () => {
      if (isSnappingEnabled) {
        setActiveSnapLineUs(null);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── Déplacement (Move) interactif (Support Mono & Multi-sélection) ────────
  const handleBodyMouseDown = (e: React.MouseEvent) => {
    if (isLocked || activeTool !== 'select') return;
    if ((e.target as HTMLElement).classList.contains('timeline-clip__trim-handle')) return;

    e.stopPropagation();

    // 1. Gestion Ctrl+Clic / Cmd+Clic / Shift+Clic : bascule la sélection
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      toggleItemSelection(item.item_id);
      return;
    }

    // 2. Si le clip n'est pas déjà dans la sélection, on sélectionne uniquement ce clip
    const isAlreadySelected = selectedItemIds.includes(item.item_id);
    if (!isAlreadySelected) {
      setSelectedItemId(item.item_id);
    }

    const startClientX = e.clientX;
    let hasMoved = false;

    // Déterminer les clips à déplacer ensemble :
    // Si ce clip fait partie d'une multi-sélection active, déplacer TOUS les clips sélectionnés
    const isMultiDrag = isAlreadySelected && selectedItemIds.length > 1;

    const movingItems = isMultiDrag
      ? project.sequence.lanes.flatMap((lane) =>
          lane.items
            .filter((it) => selectedItemIds.includes(it.item_id))
            .map((it) => ({
              itemId: it.item_id,
              laneId: lane.lane_id,
              initialPlacementUs: it.placement_time_us,
              durationUs: it.play_duration_us,
            }))
        )
      : [
          {
            itemId: item.item_id,
            laneId,
            initialPlacementUs: item.placement_time_us,
            durationUs: item.play_duration_us,
          },
        ];

    const movingIds = movingItems.map((m) => m.itemId);
    const primaryInitialUs = item.placement_time_us;
    const minInitialPlacementUs = Math.min(...movingItems.map((m) => m.initialPlacementUs));

    // Seuil d'aimantation sensible et réactif de 20px
    const snapThresholdUs = Math.round((20 / zoomPixelsPerSecond) * 1_000_000);
    const snapTargets = isSnappingEnabled
      ? collectSnapTargets(project, { excludeItemIds: movingIds, playheadTimeUs: currentTimeUs })
      : [];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      if (!hasMoved && Math.abs(deltaPx) >= 2) {
        hasMoved = true;
        pushHistorySnapshot();
      }
      if (!hasMoved) return;

      const deltaSeconds = deltaPx / zoomPixelsPerSecond;
      const rawDeltaUs = Math.round(deltaSeconds * 1_000_000);

      // Calcul du déplacement candidat du clip principal cliqué
      const candidatePlacementUs = Math.max(0, primaryInitialUs + rawDeltaUs);
      let effectivePlacementUs = candidatePlacementUs;

      if (isSnappingEnabled) {
        const snap = snapClipMovement(candidatePlacementUs, item.play_duration_us, snapTargets, snapThresholdUs);
        if (snap) {
          effectivePlacementUs = snap.placementUs;
          setActiveSnapLineUs(snap.snapLineUs);
        } else {
          setActiveSnapLineUs(null);
        }
      }

      // Delta effectif à appliquer au clip principal
      const effectiveDeltaUs = effectivePlacementUs - primaryInitialUs;
      // Clamper pour qu'aucun clip sélectionné ne descende sous 0 us
      const clampedDeltaUs = Math.max(-minInitialPlacementUs, effectiveDeltaUs);

      if (isMultiDrag) {
        const shifts = movingItems.map((m) => ({
          itemId: m.itemId,
          targetLaneId: m.laneId,
          newPlacementTimeUs: Math.max(0, m.initialPlacementUs + clampedDeltaUs),
        }));
        moveMultipleTimelineItems(shifts, false);
      } else {
        moveTimelineItem(item.item_id, laneId, Math.max(0, primaryInitialUs + clampedDeltaUs), false);
      }
    };

    const onMouseUp = () => {
      if (isSnappingEnabled) {
        setActiveSnapLineUs(null);
      }
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
            <span>
              {(() => {
                switch (item.transition_in.transition_type) {
                  case 'crossfade': return '✨ Fondu';
                  case 'fade_to_black': return '🌑 Noir';
                  case 'dip_to_white': return '⚡ Flash';
                  case 'strobe': return '⚡ Strobe';
                  case 'zoom_in': return '🔍 Zoom In';
                  case 'zoom_out': return '🔎 Zoom Out';
                  case 'spin': return '🌀 Spin';
                  case 'wipe_left': return '👈 Wipe G';
                  case 'wipe_right': return '👉 Wipe D';
                  case 'wipe_up': return '👆 Wipe H';
                  case 'wipe_down': return '👇 Wipe B';
                  default: return '✨ Trans';
                }
              })()}
            </span>
          </div>
        </>
      )}

      {/* Badge Effets FX / Dynamiques / Miroir (Étape 11 & 13) */}
      {(() => {
        const hasFlip = item.spatial_placement?.flip_horizontal || item.spatial_placement?.flip_vertical;
        const fxPreset = item.video_effects?.preset;
        const hasFx = fxPreset && fxPreset !== 'none';
        const hasVignetteOnly = !hasFx && item.video_effects?.vignette_amount && item.video_effects.vignette_amount > 0;
        if (!hasFlip && !hasFx && !hasVignetteOnly) return null;

        const isDynamic =
          fxPreset === 'x_shake' ||
          fxPreset === 'y_shake' ||
          fxPreset === 'camera_shake' ||
          fxPreset === 'tremor_strobe' ||
          fxPreset === 'strobe_white' ||
          fxPreset === 'strobe_black';

        let fxLabel = '';
        if (hasFlip && isDynamic) {
          fxLabel = '🪞+⚡';
        } else if (hasFlip && (hasFx || hasVignetteOnly)) {
          fxLabel = '🪞+🪄';
        } else if (hasFlip) {
          fxLabel = item.spatial_placement?.flip_horizontal && item.spatial_placement?.flip_vertical
            ? '🪞 H+V'
            : item.spatial_placement?.flip_horizontal
            ? '🪞 Miroir'
            : '↕️ Flip V';
        } else if (isDynamic) {
          switch (fxPreset) {
            case 'x_shake': fxLabel = '⚡ Shake X'; break;
            case 'y_shake': fxLabel = '↕️ Shake Y'; break;
            case 'camera_shake': fxLabel = '📳 Cam Shake'; break;
            case 'tremor_strobe': fxLabel = '⚡ Tremor'; break;
            case 'strobe_white': fxLabel = '⚡ Flash B.'; break;
            case 'strobe_black': fxLabel = '🖤 Strobe N.'; break;
            default: fxLabel = '⚡ Shake'; break;
          }
        } else {
          switch (fxPreset) {
            case 'monochrome': fxLabel = '🪄 N&B'; break;
            case 'sepia': fxLabel = '🪄 Sépia'; break;
            case 'vintage': fxLabel = '🪄 Rétro'; break;
            case 'invert': fxLabel = '🪄 Négatif'; break;
            default: fxLabel = '🎬 Vignet.'; break;
          }
        }

        const badgeBg = isDynamic
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.9))'
          : hasFlip && !hasFx
          ? 'rgba(99, 102, 241, 0.9)'
          : 'rgba(236, 72, 153, 0.85)';

        return (
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              right: 6,
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '1px 5px',
              borderRadius: 3,
              background: badgeBg,
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
            title={`Effets : ${hasFlip ? 'Miroir ' : ''}${hasFx ? fxPreset : ''}`}
          >
            <span>{fxLabel}</span>
          </div>
        );
      })()}

      {/* Marqueurs et Badge Images-Clés / Keyframing (Étape 14) */}
      {hasKeyframes(item) && (
        <>
          {/* Ligne de repères losanges sur le clip — déplaçables par drag */}
          <div
            className="timeline-clip__keyframes-track"
            style={{
              position: 'absolute',
              top: 3,
              left: 0,
              right: 0,
              height: 14,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {getAllKeyframeOffsets(item).map((offsetUs) => {
              // Pendant le drag, afficher la position courante du losange glissé
              const displayOffsetUs =
                draggingKf && Math.abs(offsetUs - draggingKf.startOffsetUs) <= 40_000
                  ? draggingKf.currentOffsetUs
                  : offsetUs;

              const kfLeftPercent = Math.max(0, Math.min(100, (displayOffsetUs / item.play_duration_us) * 100));
              const isDraggingThis =
                draggingKf !== null && Math.abs(offsetUs - draggingKf.startOffsetUs) <= 40_000;

              return (
                <div
                  key={offsetUs}
                  style={{
                    position: 'absolute',
                    left: `${kfLeftPercent}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    width: isDraggingThis ? 13 : 9,
                    height: isDraggingThis ? 13 : 9,
                    backgroundColor: isDraggingThis ? '#22d3ee' : '#06b6d4',
                    border: `${isDraggingThis ? 2 : 1.5}px solid #ffffff`,
                    boxShadow: isDraggingThis
                      ? '0 0 10px rgba(6, 182, 212, 1), 0 0 20px rgba(6, 182, 212, 0.6)'
                      : '0 0 4px rgba(6, 182, 212, 0.9)',
                    cursor: isLocked ? 'not-allowed' : 'ew-resize',
                    pointerEvents: 'all',
                    transition: isDraggingThis ? 'none' : 'width 0.1s, height 0.1s',
                    zIndex: isDraggingThis ? 20 : 6,
                  }}
                  onMouseDown={(e) => handleKfMouseDown(e, offsetUs)}
                  title={`Image-clé à +${(displayOffsetUs / 1_000_000).toFixed(2)}s — Glisser pour déplacer`}
                >
                  {isDraggingThis && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%) translateY(-6px) rotate(-45deg)',
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        color: '#22d3ee',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(34, 211, 238, 0.6)',
                        pointerEvents: 'none',
                        zIndex: 25,
                      }}
                    >
                      +{(displayOffsetUs / 1_000_000).toFixed(2)}s
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Badge Keyframes Cyan */}
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '1px 5px',
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.95), rgba(14, 116, 144, 0.9))',
              color: '#ffffff',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
            title="Clip animé par images-clés"
          >
            <span>💎 Anim</span>
          </div>
        </>
      )}

      {/* Badge Incrustation Fond Vert / Chroma Key (Étape 15) */}
      {item.chroma_key?.enabled && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 6,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '1px 5px',
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.9))',
            color: '#ffffff',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
          title={`Incrustation Fond Vert/Bleu active (${item.chroma_key.target_color})`}
        >
          <span>🟢 Chroma</span>
        </div>
      )}

      {/* Badge Masque Géométrique / PiP (Étape 16) */}
      {item.mask && item.mask.mask_type !== 'none' && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: item.chroma_key?.enabled ? 76 : 6,
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '1px 5px',
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.95), rgba(194, 65, 12, 0.9))',
            color: '#ffffff',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.02em',
            boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
          title={`Masque PiP : ${item.mask.mask_type}${item.mask.inverted ? ' (inversé)' : ''}`}
        >
          <span>
            {item.mask.mask_type === 'rectangle'
              ? '🔲 Masque'
              : item.mask.mask_type === 'circle'
              ? '⚪ Cercle'
              : item.mask.mask_type === 'star'
              ? '⭐ Étoile'
              : item.mask.mask_type === 'heart'
              ? '❤️ Cœur'
              : '✂️ Scission'}
          </span>
        </div>
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

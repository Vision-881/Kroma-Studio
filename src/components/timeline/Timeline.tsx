/**
 * Composant Timeline multipiste complet (style CapCut).
 * Intègre la barre d'outils, la réglette graduée, les en-têtes de pistes,
 * les pistes réceptrices de drag & drop et la tête de lecture synchronisée.
 */
import React, { useRef, useState, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TimelinePlayhead } from './TimelinePlayhead';
import { TimelineTrackHeader } from './TimelineTrackHeader';
import { TimelineClip } from './TimelineClip';

export function Timeline() {
  const {
    project,
    zoomPixelsPerSecond,
    addItemFromAsset,
    setSelectedItemId,
    currentTimeUs,
  } = useProjectStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Recalculer la largeur totale nécessaire pour la timeline
  const maxProjectLengthUs = project.sequence.total_length_us || 30_000_000;
  // Prévoir toujours au moins 60s ou 20% d'espace libre au-delà du dernier clip
  const totalTimelineDurationUs = Math.max(maxProjectLengthUs * 1.3, 60_000_000);
  const totalTimelineWidthPx = Math.max(
    containerWidth,
    (totalTimelineDurationUs / 1_000_000) * zoomPixelsPerSecond,
  );

  // Mettre à jour la largeur réelle du conteneur
  useEffect(() => {
    const updateWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Défilement automatique pour suivre la tête de lecture si elle sort de l'écran
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const playheadPx = (currentTimeUs / 1_000_000) * zoomPixelsPerSecond;
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const viewWidth = scrollContainerRef.current.clientWidth;

    if (playheadPx < scrollLeft) {
      scrollContainerRef.current.scrollLeft = Math.max(0, playheadPx - 50);
    } else if (playheadPx > scrollLeft + viewWidth - 50) {
      scrollContainerRef.current.scrollLeft = playheadPx - viewWidth + 100;
    }
  }, [currentTimeUs, zoomPixelsPerSecond]);

  // Hauteur totale calculée des pistes pour la tête de lecture
  const tracksHeight = project.sequence.lanes.length * 56 + 32;

  // ── Gestion du Drag & Drop d'un asset vers une piste ───────────────────────
  const handleTrackDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/kroma-asset-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleTrackDrop = (e: React.DragEvent, laneId: string) => {
    const assetId = e.dataTransfer.getData('application/kroma-asset-id');
    if (!assetId) return;

    e.preventDefault();
    const asset = project.asset_catalog.find((a) => a.asset_id === assetId);
    if (!asset) return;

    // Calcul de la position temporelle sous le curseur de la souris
    const trackRect = e.currentTarget.getBoundingClientRect();
    const dropOffsetPx = e.clientX - trackRect.left;
    const dropSeconds = Math.max(0, dropOffsetPx / zoomPixelsPerSecond);
    const dropTimeUs = Math.round(dropSeconds * 1_000_000);

    addItemFromAsset(asset, laneId, dropTimeUs);
  };

  const handleTimelineBackgroundClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('timeline-track-body')) {
      setSelectedItemId(null);
    }
  };

  return (
    <div className="timeline-container">
      {/* Barre d'outils supérieure */}
      <TimelineToolbar />

      {/* Corps principal : en-têtes à gauche, pistes à défilement à droite */}
      <div className="timeline-workspace">
        {/* Colonne fixe des en-têtes de pistes */}
        <div className="timeline-headers-column">
          <div className="timeline-headers-filler" />
          {project.sequence.lanes.map((lane) => (
            <TimelineTrackHeader key={lane.lane_id} lane={lane} />
          ))}
        </div>

        {/* Zone défilante des pistes */}
        <div
          ref={scrollContainerRef}
          className="timeline-tracks-scroll"
          onClick={handleTimelineBackgroundClick}
        >
          <div
            className="timeline-tracks-canvas"
            style={{ width: `${totalTimelineWidthPx}px` }}
          >
            {/* Réglette temporelle graduée */}
            <TimelineRuler totalWidthPx={totalTimelineWidthPx} />

            {/* Tête de lecture rouge */}
            <TimelinePlayhead totalHeightPx={tracksHeight} />

            {/* Rangées de pistes */}
            <div className="timeline-lanes-list">
              {project.sequence.lanes.map((lane) => (
                <div
                  key={lane.lane_id}
                  className={`timeline-track-body${lane.is_locked ? ' timeline-track-body--locked' : ''}`}
                  onDragOver={handleTrackDragOver}
                  onDrop={(e) => handleTrackDrop(e, lane.lane_id)}
                >
                  {/* Clips placés sur la piste */}
                  {lane.items.map((item) => (
                    <TimelineClip
                      key={item.item_id}
                      item={item}
                      laneType={lane.lane_type}
                      laneId={lane.lane_id}
                      isLocked={lane.is_locked}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Barre d'outils supérieure de la Timeline (style CapCut).
 * Fournit les outils Sélection, Découpe (Rasoir), Suppression,
 * le bouton d'ajout de calque Texte, ainsi que le contrôle du zoom temporel.
 */
import { useEffect } from 'react';
import {
  MousePointer2,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Split,
  Type,
  Undo2,
  Redo2,
  Magnet,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useProjectStore, type TimelineTool } from '../../store/projectStore';
import { usToTimecode } from '../../core/time/timeUtils';

export function TimelineToolbar() {
  const {
    activeTool,
    setActiveTool,
    currentTimeUs,
    zoomPixelsPerSecond,
    setZoomPixelsPerSecond,
    selectedItemId,
    splitTimelineItemAtCurrentTime,
    removeTimelineItem,
    addTextItem,
    canUndo,
    canRedo,
    undo,
    redo,
    project,
    isSnappingEnabled,
    toggleSnapping,
    addTimelineMarker,
    jumpToNextMarker,
    jumpToPrevMarker,
  } = useProjectStore();

  const markersCount = project.sequence.markers?.length || 0;

  // Raccourcis clavier N (Aimant) et M (Marqueur)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable;
      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          toggleSnapping();
        }
      } else if (e.key === 'm' || e.key === 'M') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          addTimelineMarker(currentTimeUs);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSnapping, addTimelineMarker, currentTimeUs]);

  const handleToolChange = (tool: TimelineTool) => {
    setActiveTool(tool);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomPixelsPerSecond(Number(e.target.value));
  };

  const handleZoomIn = () => {
    setZoomPixelsPerSecond(zoomPixelsPerSecond * 1.25);
  };

  const handleZoomOut = () => {
    setZoomPixelsPerSecond(zoomPixelsPerSecond * 0.8);
  };

  const handleFitZoom = () => {
    const totalUs = project.sequence.total_length_us || 10_000_000;
    const totalSeconds = totalUs / 1_000_000;
    // Approximativement 800px disponibles pour la timeline
    const optimalZoom = Math.max(10, Math.min(300, 800 / Math.max(5, totalSeconds)));
    setZoomPixelsPerSecond(optimalZoom);
  };

  const handleDeleteSelected = () => {
    if (selectedItemId) {
      removeTimelineItem(selectedItemId);
    }
  };

  const handleQuickSplit = () => {
    splitTimelineItemAtCurrentTime();
  };

  const handleAddText = () => {
    addTextItem('Nouveau Titre');
  };

  return (
    <div className="timeline-toolbar">
      {/* Outils de gauche */}
      <div className="timeline-toolbar__tools">
        {/* Annuler / Rétablir */}
        <button
          className="timeline-tool-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Annuler la dernière action (Ctrl+Z)"
        >
          <Undo2 size={15} />
          <span className="timeline-tool-btn__label">Annuler</span>
        </button>

        <button
          className="timeline-tool-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Rétablir l'action (Ctrl+Y)"
        >
          <Redo2 size={15} />
          <span className="timeline-tool-btn__label">Rétablir</span>
        </button>

        <div className="timeline-toolbar__separator" />

        <button
          className={`timeline-tool-btn${activeTool === 'select' ? ' timeline-tool-btn--active' : ''}`}
          onClick={() => handleToolChange('select')}
          title="Outil Sélection (V)"
        >
          <MousePointer2 size={15} />
          <span className="timeline-tool-btn__label">Sélection</span>
        </button>

        <button
          className={`timeline-tool-btn${activeTool === 'split' ? ' timeline-tool-btn--active' : ''}`}
          onClick={() => handleToolChange('split')}
          title="Outil Rasoir / Découpe (B)"
        >
          <Scissors size={15} />
          <span className="timeline-tool-btn__label">Rasoir</span>
        </button>

        <div className="timeline-toolbar__separator" />

        {/* Bouton de scission immédiate à la tête de lecture */}
        <button
          className="timeline-tool-btn"
          onClick={handleQuickSplit}
          title="Diviser le clip à la tête de lecture (Ctrl+B)"
        >
          <Split size={15} />
          <span className="timeline-tool-btn__label">Diviser</span>
        </button>

        {/* Bouton de suppression */}
        <button
          className="timeline-tool-btn"
          onClick={handleDeleteSelected}
          disabled={!selectedItemId}
          title="Supprimer le clip sélectionné (Suppr)"
        >
          <Trash2 size={15} />
          <span className="timeline-tool-btn__label">Supprimer</span>
        </button>

        <div className="timeline-toolbar__separator" />

        {/* Bouton Ajouter un calque texte */}
        <button
          className="timeline-tool-btn timeline-tool-btn--text"
          onClick={handleAddText}
          title="Ajouter un calque texte à la position de la tête de lecture"
        >
          <Type size={15} />
          <span className="timeline-tool-btn__label">Texte</span>
        </button>

        <div className="timeline-toolbar__separator" />

        {/* Aimantation magnétique (Snapping) */}
        <button
          className={`timeline-tool-btn${isSnappingEnabled ? ' timeline-tool-btn--snapping-active' : ''}`}
          onClick={toggleSnapping}
          title={`Aimantation magnétique (N) : ${isSnappingEnabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`}
        >
          <Magnet size={15} />
          <span className="timeline-tool-btn__label">Aimant</span>
        </button>

        {/* Marqueurs de timeline */}
        <button
          className="timeline-tool-btn"
          onClick={() => addTimelineMarker(currentTimeUs)}
          title="Ajouter un marqueur à la tête de lecture (M)"
        >
          <BookmarkPlus size={15} />
          <span className="timeline-tool-btn__label">Marqueur</span>
        </button>

        {markersCount > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
            <button
              className="timeline-tool-btn"
              style={{ minWidth: 24, padding: '4px 4px' }}
              onClick={jumpToPrevMarker}
              title="Aller au marqueur précédent"
            >
              <ChevronLeft size={13} />
            </button>
            <span
              style={{
                fontSize: 10,
                color: '#eab308',
                fontWeight: 700,
                padding: '0 4px',
                background: 'rgba(234, 179, 8, 0.15)',
                borderRadius: 3,
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
              title={`${markersCount} marqueur(s) posé(s)`}
            >
              {markersCount}
            </span>
            <button
              className="timeline-tool-btn"
              style={{ minWidth: 24, padding: '4px 4px' }}
              onClick={jumpToNextMarker}
              title="Aller au marqueur suivant"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Timecode courant au centre */}
      <div className="timeline-toolbar__timecode">
        <span className="timecode-badge">
          {usToTimecode(currentTimeUs, project.timeline_canvas.frame_rate_fps)}
        </span>
      </div>

      {/* Contrôles de zoom à droite */}
      <div className="timeline-toolbar__zoom">
        <button
          className="kroma-icon-btn"
          onClick={handleZoomOut}
          title="Zoom arrière (-)"
        >
          <ZoomOut size={15} />
        </button>

        <input
          type="range"
          min="10"
          max="300"
          value={zoomPixelsPerSecond}
          onChange={handleZoomChange}
          className="timeline-zoom-slider"
          title={`Zoom : ${Math.round(zoomPixelsPerSecond)} px/s`}
        />

        <button
          className="kroma-icon-btn"
          onClick={handleZoomIn}
          title="Zoom avant (+)"
        >
          <ZoomIn size={15} />
        </button>

        <button
          className="kroma-icon-btn"
          onClick={handleFitZoom}
          title="Ajuster la vue à la timeline (Maj+Z)"
        >
          <Maximize2 size={15} />
        </button>
      </div>
    </div>
  );
}


/**
 * Moniteur de prévisualisation vidéo haute performance (style CapCut).
 * Synchronisation fluide du son et de l'image vidéo sans clignotement,
 * rendu Canvas 2D multi-couches et support complet des raccourcis clavier.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { usToTimecode } from '../../core/time/timeUtils';
import { getActiveItemsAtTime, type ActiveVisualItem, type ActiveAudioItem } from '../../core/playback/playbackEngine';
import { mediaSession } from '../../core/media/mediaSession';

export function PreviewMonitor() {
  const {
    project,
    currentTimeUs,
    setCurrentTimeUs,
    selectedItemId,
    removeTimelineItem,
    setActiveTool,
    splitTimelineItemAtCurrentTime,
    undo,
    redo,
    saveProjectToFile,
  } = useProjectStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastWallTimeRef = useRef<number | null>(null);

  const canvasWidth = project.timeline_canvas.viewport_width || 1920;
  const canvasHeight = project.timeline_canvas.viewport_height || 1080;

  // ── Rendu graphique sur le Canvas ─────────────────────────────────────────
  const renderCanvasFrame = useCallback(
    (visualItems: ActiveVisualItem[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Fond du canevas
      ctx.fillStyle = project.timeline_canvas.background_color_hex || '#000000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Si aucun média actif, afficher repère discret
      if (visualItems.length === 0) {
        ctx.fillStyle = '#14141d';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.strokeStyle = '#272738';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, canvasWidth - 60, canvasHeight - 60);
        return;
      }

      // 2. Dessiner chaque couche visuelle (du bas vers le haut)
      for (const active of visualItems) {
        if (active.isMuted) continue;

        const item = active.item;
        const asset = active.asset;
        const placement = item.spatial_placement || {
          offset_x_px: 0,
          offset_y_px: 0,
          zoom_factor_x: 1.0,
          zoom_factor_y: 1.0,
          rotation_degrees: 0,
          opacity_ratio: 1.0,
        };

        ctx.save();

        // Positionnement au centre + décalage X/Y
        const centerX = canvasWidth / 2 + placement.offset_x_px;
        const centerY = canvasHeight / 2 + placement.offset_y_px;
        ctx.translate(centerX, centerY);

        // Rotation
        if (placement.rotation_degrees !== 0) {
          ctx.rotate((placement.rotation_degrees * Math.PI) / 180);
        }

        // Échelle / Zoom
        ctx.scale(placement.zoom_factor_x, placement.zoom_factor_y);

        // Opacité
        ctx.globalAlpha = Math.max(0, Math.min(1, placement.opacity_ratio));

        // Rendu Vidéo ou Image
        if (asset) {
          let sourceElement: CanvasImageSource | null = null;

          if (asset.media_kind === 'video') {
            const video = mediaSession.getVideoElement(asset.asset_id);
            // On vérifie que la vidéo a des frames disponibles (readyState >= 2)
            if (video && video.readyState >= 2) {
              sourceElement = video;
            }
          } else if (asset.media_kind === 'image') {
            const img = mediaSession.getImageElement(asset.asset_id);
            if (img && img.complete && img.naturalWidth > 0) {
              sourceElement = img;
            }
          }

          // Dessin avec ratio 'contain' centré
          if (sourceElement) {
            const srcWidth = asset.native_width || canvasWidth;
            const srcHeight = asset.native_height || canvasHeight;

            const scale = Math.min(canvasWidth / srcWidth, canvasHeight / srcHeight);
            const drawW = srcWidth * scale;
            const drawH = srcHeight * scale;

            ctx.drawImage(sourceElement, -drawW / 2, -drawH / 2, drawW, drawH);
          }
        }

        // Rendu Calque de Texte
        if (item.text_layer_data) {
          const textData = item.text_layer_data;

          // Position normalisée → coordonnées canvas absolues
          // normalized_center : 0.0 = bord gauche/haut, 1.0 = bord droit/bas
          const nc = textData.normalized_center || { x_ratio: 0.5, y_ratio: 0.5 };
          // On remet ctx en coordonnées canvas brutes (on a déjà fait ctx.translate au centre)
          // → on compense la translation courante et on repositionne au ratio absolu
          const textAbsX = nc.x_ratio * canvasWidth - canvasWidth / 2 - placement.offset_x_px;
          const textAbsY = nc.y_ratio * canvasHeight - canvasHeight / 2 - placement.offset_y_px;

          ctx.font = `${textData.is_bold ? 'bold ' : ''}${textData.font_size_pt * 2}px ${textData.font_name || 'sans-serif'}`;
          ctx.textAlign = textData.text_align || 'center';
          ctx.textBaseline = 'middle';

          if (textData.outline_thickness_px > 0) {
            ctx.strokeStyle = textData.outline_color_hex || '#000000';
            ctx.lineWidth = textData.outline_thickness_px * 2;
            ctx.lineJoin = 'round';
            ctx.strokeText(textData.raw_string, textAbsX, textAbsY);
          }

          ctx.fillStyle = textData.fill_color_hex || '#FFFFFF';
          ctx.fillText(textData.raw_string, textAbsX, textAbsY);
        }

        ctx.restore();
      }
    },
    [canvasWidth, canvasHeight, project.timeline_canvas.background_color_hex],
  );

  // ── Synchronisation des médias et gestion du son ──────────────────────────
  const syncMedia = useCallback(
    (visualItems: ActiveVisualItem[], audioItems: ActiveAudioItem[], playing: boolean) => {
      // 1. Vidéos actives (Image + Son intégré de la vidéo)
      for (const vis of visualItems) {
        if (vis.asset?.media_kind === 'video') {
          const video = mediaSession.getVideoElement(vis.asset.asset_id);
          if (video) {
            // Gestion du son de la vidéo
            video.muted = isMasterMuted || vis.isMuted;
            video.volume = isMasterMuted ? 0 : Math.max(0, Math.min(1, vis.effectiveGain));

            const targetSec = vis.sourceTimeUs / 1_000_000;

            if (playing) {
              // Pendant la lecture : ne seek QUE si le décalage dépasse 250ms (évite saccades/clignotement)
              if (Math.abs(video.currentTime - targetSec) > 0.25) {
                video.currentTime = targetSec;
              }
              if (video.paused) {
                video.play().catch(() => {});
              }
            } else {
              // En pause : synchronisation immédiate à la frame
              if (Math.abs(video.currentTime - targetSec) > 0.03) {
                video.currentTime = targetSec;
              }
              if (!video.paused) {
                video.pause();
              }
            }
          }
        }
      }

      // 2. Pistes audio dédiées
      for (const aud of audioItems) {
        if (aud.asset?.media_kind === 'audio') {
          const audio = mediaSession.getAudioElement(aud.asset.asset_id);
          if (audio) {
            audio.muted = isMasterMuted || aud.isMuted;
            audio.volume = isMasterMuted ? 0 : Math.max(0, Math.min(1, aud.effectiveGain));

            const targetSec = aud.sourceTimeUs / 1_000_000;

            if (playing) {
              if (Math.abs(audio.currentTime - targetSec) > 0.25) {
                audio.currentTime = targetSec;
              }
              if (audio.paused) {
                audio.play().catch(() => {});
              }
            } else {
              if (Math.abs(audio.currentTime - targetSec) > 0.03) {
                audio.currentTime = targetSec;
              }
              if (!audio.paused) {
                audio.pause();
              }
            }
          }
        }
      }
    },
    [isMasterMuted],
  );

  // Mise à jour de l'affichage à chaque changement de position ou d'état
  useEffect(() => {
    const { visualItems, audioItems } = getActiveItemsAtTime(
      project.sequence,
      project.asset_catalog,
      currentTimeUs,
    );

    syncMedia(visualItems, audioItems, isPlaying);
    renderCanvasFrame(visualItems);
  }, [
    currentTimeUs,
    isPlaying,
    project.sequence,
    project.asset_catalog,
    syncMedia,
    renderCanvasFrame,
  ]);

  // ── Boucle de lecture fluide (Clock maîtresse adaptative) ──────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastWallTimeRef.current = null;

      // Stopper tous les flux en cours
      const { visualItems, audioItems } = getActiveItemsAtTime(
        project.sequence,
        project.asset_catalog,
        useProjectStore.getState().currentTimeUs,
      );
      syncMedia(visualItems, audioItems, false);
      return;
    }

    const tick = (nowMs: number) => {
      const state = useProjectStore.getState();
      const maxDurationUs = state.project.sequence.total_length_us;

      // Détecter si une vidéo principale est active et en cours de lecture
      const { visualItems } = getActiveItemsAtTime(
        state.project.sequence,
        state.project.asset_catalog,
        state.currentTimeUs,
      );
      const activeVideoItem = visualItems.find((v) => v.asset?.media_kind === 'video');
      const videoEl = activeVideoItem?.asset
        ? mediaSession.getVideoElement(activeVideoItem.asset.asset_id)
        : null;

      let nextTimeUs: number;

      if (videoEl && !videoEl.paused && videoEl.readyState >= 2) {
        // Horloge vidéo matérielle exacte : élimine 100% des saccades et clignotements
        const videoCurrentUs = Math.round(videoEl.currentTime * 1_000_000);
        const elapsedSinceInPoint = videoCurrentUs - activeVideoItem!.item.source_in_point_us;
        nextTimeUs = activeVideoItem!.item.placement_time_us + elapsedSinceInPoint;
      } else {
        // Horloge murale basée sur performance.now
        const deltaMs = lastWallTimeRef.current !== null ? nowMs - lastWallTimeRef.current : 16;
        nextTimeUs = state.currentTimeUs + Math.round(deltaMs * 1000);
      }

      lastWallTimeRef.current = nowMs;

      // Fin de lecture atteinte
      if (maxDurationUs > 0 && nextTimeUs >= maxDurationUs) {
        setCurrentTimeUs(maxDurationUs);
        setIsPlaying(false);
        return;
      }

      setCurrentTimeUs(Math.max(0, nextTimeUs));
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, setCurrentTimeUs, syncMedia]);

  // ── Gestionnaire complet des Raccourcis Clavier ───────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur saisit du texte dans un champ de formulaire
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // 1. Barre d'espace : Lecture / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => {
          const state = useProjectStore.getState();
          if (!prev && state.currentTimeUs >= state.project.sequence.total_length_us && state.project.sequence.total_length_us > 0) {
            state.setCurrentTimeUs(0);
          }
          return !prev;
        });
        return;
      }

      // 2. Flèche Gauche : Reculer de 1 seconde (ou 5s avec Shift)
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const stepUs = e.shiftKey ? 5_000_000 : 1_000_000;
        setCurrentTimeUs(Math.max(0, useProjectStore.getState().currentTimeUs - stepUs));
        return;
      }

      // 3. Flèche Droite : Avancer de 1 seconde (ou 5s avec Shift)
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const stepUs = e.shiftKey ? 5_000_000 : 1_000_000;
        setCurrentTimeUs(useProjectStore.getState().currentTimeUs + stepUs);
        return;
      }

      // 4. Touche Début (Home) : Revenir au tout début (00:00:00:00)
      if (e.code === 'Home') {
        e.preventDefault();
        setCurrentTimeUs(0);
        return;
      }

      // 5. Touche Suppr ou Retour Arrière : Supprimer le clip sélectionné
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          removeTimelineItem(selectedItemId);
        }
        return;
      }

      // 6. Raccourcis d'outils CapCut : V (Sélection) et B (Rasoir / Split)
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('select');
        return;
      }
      if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('split');
        return;
      }

      // 7. Scission rapide : Ctrl+B ou Ctrl+K
      if ((e.code === 'KeyB' || e.code === 'KeyK') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        splitTimelineItemAtCurrentTime();
        return;
      }

      // 8. Annuler : Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // 9. Rétablir : Ctrl+Y ou Ctrl+Maj+Z
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // 10. Enregistrer : Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        saveProjectToFile();
        return;
      }

      // 11. Touche M : Mute / Démute Master
      if (e.code === 'KeyM' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsMasterMuted((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedItemId,
    setCurrentTimeUs,
    removeTimelineItem,
    setActiveTool,
    splitTimelineItemAtCurrentTime,
    undo,
    redo,
    saveProjectToFile,
  ]);

  const togglePlay = () => {
    setIsPlaying((prev) => {
      if (!prev && currentTimeUs >= project.sequence.total_length_us && project.sequence.total_length_us > 0) {
        setCurrentTimeUs(0);
      }
      return !prev;
    });
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
      {/* Écran Canvas vidéo 16:9 */}
      <div className="preview-monitor__screen-container">
        <div className="preview-monitor__screen">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="preview-monitor__canvas"
          />

          {/* Badge format et ratio */}
          <div className="preview-monitor__ratio-badge">16:9 · 1080p</div>
        </div>
      </div>

      {/* Barre de transport inférieure */}
      <div className="preview-monitor__transport">
        {/* Contrôles de lecture */}
        <div className="preview-monitor__controls">
          <button
            className="kroma-icon-btn"
            onClick={handleResetToStart}
            title="Revenir au début (Touche Début)"
          >
            <RotateCcw size={15} />
          </button>

          <button
            className="kroma-icon-btn"
            onClick={handleSkipBack}
            title="Reculer de 1s (Flèche gauche / Maj+Gauche pour 5s)"
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
            title="Avancer de 1s (Flèche droite / Maj+Droite pour 5s)"
          >
            <SkipForward size={16} />
          </button>

          <button
            className={`kroma-icon-btn${isMasterMuted ? ' kroma-icon-btn--active' : ''}`}
            onClick={() => setIsMasterMuted(!isMasterMuted)}
            title={isMasterMuted ? 'Réactiver le son master (M)' : 'Couper le son master (M)'}
          >
            {isMasterMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Compteur temporel SMPTE double */}
        <div className="preview-monitor__timecode">
          <span className="timecode-current">{currentTimecode}</span>
          <span className="timecode-divider">/</span>
          <span className="timecode-total">{totalTimecode}</span>
        </div>
      </div>
    </div>
  );
}

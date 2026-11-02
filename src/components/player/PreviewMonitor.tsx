/**
 * Moniteur de prévisualisation vidéo haute performance (style CapCut).
 * Effectue un rendu temps réel multi-couches sur un <canvas> HTML5 à partir
 * des flux vidéo, audio et images synchronisés sous la tête de lecture.
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
  } = useProjectStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMasterMuted, setIsMasterMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

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

      // Si aucun média actif, afficher une grille discrète de repère
      if (visualItems.length === 0) {
        ctx.fillStyle = '#161622';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.strokeStyle = '#252538';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, canvasWidth - 80, canvasHeight - 80);
        return;
      }

      // 2. Dessiner chaque couche visuelle (du bas vers le haut)
      for (const active of visualItems) {
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

        // Positionnement au centre + offset
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
            if (video && video.readyState >= 2) {
              sourceElement = video;
            }
          } else if (asset.media_kind === 'image') {
            const img = mediaSession.getImageElement(asset.asset_id);
            if (img && img.complete && img.naturalWidth > 0) {
              sourceElement = img;
            }
          }

          // Dessin avec centrage
          if (sourceElement) {
            const srcWidth = asset.native_width || canvasWidth;
            const srcHeight = asset.native_height || canvasHeight;

            // Calcul du ratio 'contain' pour s'adapter élégamment au viewport
            const scale = Math.min(canvasWidth / srcWidth, canvasHeight / srcHeight);
            const drawW = srcWidth * scale;
            const drawH = srcHeight * scale;

            ctx.drawImage(sourceElement, -drawW / 2, -drawH / 2, drawW, drawH);
          } else if (asset.thumbnail_url) {
            // Fallback vignette si le média natif se charge
            const thumbImg = new Image();
            thumbImg.src = asset.thumbnail_url;
            if (thumbImg.complete) {
              ctx.drawImage(thumbImg, -canvasWidth / 4, -canvasHeight / 4, canvasWidth / 2, canvasHeight / 2);
            }
          }
        }

        // Rendu Calque de Texte
        if (item.text_layer_data) {
          const textData = item.text_layer_data;
          ctx.font = `${textData.is_bold ? 'bold ' : ''}${textData.font_size_pt * 2}px ${textData.font_name || 'sans-serif'}`;
          ctx.textAlign = textData.text_align || 'center';
          ctx.textBaseline = 'middle';

          if (textData.outline_thickness_px > 0) {
            ctx.strokeStyle = textData.outline_color_hex || '#000000';
            ctx.lineWidth = textData.outline_thickness_px * 2;
            ctx.strokeText(textData.raw_string, 0, 0);
          }

          ctx.fillStyle = textData.fill_color_hex || '#FFFFFF';
          ctx.fillText(textData.raw_string, 0, 0);
        }

        ctx.restore();
      }
    },
    [canvasWidth, canvasHeight, project.timeline_canvas.background_color_hex],
  );

  // ── Synchronisation des éléments vidéo et audio natifs ────────────────────
  const syncMediaElements = useCallback(
    (visualItems: ActiveVisualItem[], audioItems: ActiveAudioItem[], playing: boolean) => {
      // 1. Synchroniser les vidéos
      for (const vis of visualItems) {
        if (vis.asset?.media_kind === 'video') {
          const video = mediaSession.getVideoElement(vis.asset.asset_id);
          if (video) {
            const targetSec = vis.sourceTimeUs / 1_000_000;
            // Ne seek que si le décalage est supérieur à 1 frame (33ms) pour éviter les micro-saccades
            if (Math.abs(video.currentTime - targetSec) > 0.05) {
              video.currentTime = targetSec;
            }

            if (playing && video.paused) {
              video.play().catch(() => {});
            } else if (!playing && !video.paused) {
              video.pause();
            }
          }
        }
      }

      // 2. Synchroniser les audios
      for (const aud of audioItems) {
        if (aud.asset?.media_kind === 'audio') {
          const audio = mediaSession.getAudioElement(aud.asset.asset_id);
          if (audio) {
            const targetSec = aud.sourceTimeUs / 1_000_000;
            if (Math.abs(audio.currentTime - targetSec) > 0.06) {
              audio.currentTime = targetSec;
            }

            audio.volume = isMasterMuted ? 0 : Math.max(0, Math.min(1, aud.effectiveGain));

            if (playing && audio.paused) {
              audio.play().catch(() => {});
            } else if (!playing && !audio.paused) {
              audio.pause();
            }
          }
        }
      }
    },
    [isMasterMuted],
  );

  // Mettre à jour l'image à chaque frame ou seek
  useEffect(() => {
    const { visualItems, audioItems } = getActiveItemsAtTime(
      project.sequence,
      project.asset_catalog,
      currentTimeUs,
    );

    syncMediaElements(visualItems, audioItems, isPlaying);
    renderCanvasFrame(visualItems);
  }, [
    currentTimeUs,
    isPlaying,
    project.sequence,
    project.asset_catalog,
    syncMediaElements,
    renderCanvasFrame,
  ]);

  // ── Boucle de lecture Play/Pause (60 FPS haute précision) ─────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      lastTickTimeRef.current = null;

      // Pause de sécurité sur tous les médias
      const { visualItems, audioItems } = getActiveItemsAtTime(
        project.sequence,
        project.asset_catalog,
        currentTimeUs,
      );
      syncMediaElements(visualItems, audioItems, false);
      return;
    }

    const tick = (nowMs: number) => {
      if (lastTickTimeRef.current !== null) {
        const deltaMs = nowMs - lastTickTimeRef.current;
        const deltaUs = Math.round(deltaMs * 1000);
        const maxDurationUs = project.sequence.total_length_us;

        const nextTimeUs = useProjectStore.getState().currentTimeUs + deltaUs;

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
  }, [isPlaying, project.sequence.total_length_us, setCurrentTimeUs, syncMediaElements]);

  // ── Raccourci clavier universel : Barre d'espace pour Play/Pause ──────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Éviter de déclencher si l'utilisateur est en train d'écrire dans un input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/* Écran Canvas vidéo 16:9 */}
      <div className="preview-monitor__screen-container">
        <div className="preview-monitor__screen">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="preview-monitor__canvas"
          />

          {/* Badge de résolution et ratio */}
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

          <button
            className={`kroma-icon-btn${isMasterMuted ? ' kroma-icon-btn--active' : ''}`}
            onClick={() => setIsMasterMuted(!isMasterMuted)}
            title={isMasterMuted ? 'Réactiver le son master' : 'Couper le son master'}
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

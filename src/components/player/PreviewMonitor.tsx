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
    openExportDialog,
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

        const tSec = currentTimeUs / 1_000_000;
        const fx = item.video_effects;
        const fxPreset = fx?.preset;
        const fxIntensity = fx?.intensity ?? 1.0;
        const fxSpeed = fx?.speed ?? 1.0;

        // Effets dynamiques de secousse / Shake CapCut (Étape 12)
        if (fxPreset === 'x_shake') {
          const freq = 28 * fxSpeed;
          const amp = 22 * fxIntensity;
          const dx = (Math.sin(tSec * freq) * 0.6 + Math.sin(tSec * freq * 1.7) * 0.4) * amp;
          ctx.translate(dx, 0);
          ctx.scale(1.08, 1.0);
        } else if (fxPreset === 'y_shake') {
          const freq = 28 * fxSpeed;
          const amp = 18 * fxIntensity;
          const dy = (Math.cos(tSec * freq) * 0.6 + Math.cos(tSec * freq * 1.7) * 0.4) * amp;
          ctx.translate(0, dy);
          ctx.scale(1.0, 1.08);
        } else if (fxPreset === 'camera_shake') {
          const dx = (Math.sin(tSec * 23 * fxSpeed) * 16 + Math.cos(tSec * 47 * fxSpeed) * 8) * fxIntensity;
          const dy = (Math.cos(tSec * 29 * fxSpeed) * 14 + Math.sin(tSec * 53 * fxSpeed) * 7) * fxIntensity;
          const drot = Math.sin(tSec * 19 * fxSpeed) * 1.2 * fxIntensity;
          ctx.translate(dx, dy);
          ctx.rotate((drot * Math.PI) / 180);
          ctx.scale(1.10, 1.10);
        } else if (fxPreset === 'tremor_strobe') {
          const dx = (Math.sin(tSec * 35 * fxSpeed) * 20 + Math.cos(tSec * 61 * fxSpeed) * 10) * fxIntensity;
          const dy = (Math.cos(tSec * 42 * fxSpeed) * 16 + Math.sin(tSec * 71 * fxSpeed) * 8) * fxIntensity;
          const drot = Math.sin(tSec * 27 * fxSpeed) * 1.8 * fxIntensity;
          ctx.translate(dx, dy);
          ctx.rotate((drot * Math.PI) / 180);
          ctx.scale(1.12, 1.12);
        }

        // Rotation
        if (placement.rotation_degrees !== 0) {
          ctx.rotate((placement.rotation_degrees * Math.PI) / 180);
        }

        // Échelle / Zoom et Miroir Horizontal / Vertical (Étape 11)
        const scaleX = placement.zoom_factor_x * (placement.flip_horizontal ? -1 : 1);
        const scaleY = placement.zoom_factor_y * (placement.flip_vertical ? -1 : 1);
        ctx.scale(scaleX, scaleY);

        // Opacité de base combinée avec la transition
        let baseAlpha = Math.max(0, Math.min(1, placement.opacity_ratio));

        // Transition visuelle d'entrée (Étape 10 & 12)
        let transitionProgress = 1.0;
        let transitionType = 'none';
        if (item.transition_in && item.transition_in.transition_type !== 'none') {
          const transDur = item.transition_in.duration_us || 1_000_000;
          const timeSincePlacement = currentTimeUs - item.placement_time_us;
          if (timeSincePlacement >= 0 && timeSincePlacement < transDur) {
            transitionProgress = Math.max(0, Math.min(1.0, timeSincePlacement / transDur));
            transitionType = item.transition_in.transition_type;
          }
        }

        if (transitionType === 'crossfade') {
          baseAlpha *= transitionProgress;
        } else if (transitionType === 'zoom_in') {
          const zoomScale = 0.35 + 0.65 * transitionProgress;
          ctx.scale(zoomScale, zoomScale);
          baseAlpha *= Math.min(1.0, transitionProgress * 1.5);
        } else if (transitionType === 'zoom_out') {
          const zoomScale = 2.0 - 1.0 * transitionProgress;
          ctx.scale(zoomScale, zoomScale);
          baseAlpha *= Math.min(1.0, transitionProgress * 1.5);
        } else if (transitionType === 'spin') {
          const spinRot = (1.0 - transitionProgress) * -Math.PI;
          ctx.rotate(spinRot);
          const spinScale = 0.5 + 0.5 * transitionProgress;
          ctx.scale(spinScale, spinScale);
          baseAlpha *= Math.min(1.0, transitionProgress * 1.5);
        }

        ctx.globalAlpha = baseAlpha;

        // Filtres d'étalonnage et de couleur (Étape 8) combinés avec Effets FX (Étape 11)
        const filterParts: string[] = [];
        if (item.color_adjustments) {
          const adj = item.color_adjustments;
          const b = Math.max(0, 1 + (adj.brightness || 0));
          const c = Math.max(0, 1 + (adj.contrast || 0));
          const s = Math.max(0, 1 + (adj.saturation || 0));
          const h = adj.hue_degrees || 0;
          const blur = Math.max(0, adj.blur_px || 0);
          filterParts.push(`brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${h}deg)${blur > 0 ? ` blur(${blur}px)` : ''}`);
        }

        if (item.video_effects?.preset) {
          const preset = item.video_effects.preset;
          if (preset === 'monochrome') {
            filterParts.push('grayscale(100%)');
          } else if (preset === 'sepia') {
            filterParts.push('sepia(90%) contrast(110%)');
          } else if (preset === 'invert') {
            filterParts.push('invert(100%)');
          } else if (preset === 'vintage') {
            filterParts.push('sepia(45%) contrast(115%) brightness(95%)');
          }
        }

        ctx.filter = filterParts.length > 0 ? filterParts.join(' ') : 'none';

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

            // Masques de balayage multidirectionnels (Wipe - Étape 10 & 12)
            if (transitionProgress < 1.0) {
              if (transitionType === 'wipe_left') {
                ctx.beginPath();
                ctx.rect(
                  -drawW / 2 + drawW * (1.0 - transitionProgress),
                  -drawH / 2,
                  drawW * transitionProgress,
                  drawH,
                );
                ctx.clip();
              } else if (transitionType === 'wipe_right') {
                ctx.beginPath();
                ctx.rect(
                  -drawW / 2,
                  -drawH / 2,
                  drawW * transitionProgress,
                  drawH,
                );
                ctx.clip();
              } else if (transitionType === 'wipe_up') {
                ctx.beginPath();
                ctx.rect(
                  -drawW / 2,
                  -drawH / 2 + drawH * (1.0 - transitionProgress),
                  drawW,
                  drawH * transitionProgress,
                );
                ctx.clip();
              } else if (transitionType === 'wipe_down') {
                ctx.beginPath();
                ctx.rect(
                  -drawW / 2,
                  -drawH / 2,
                  drawW,
                  drawH * transitionProgress,
                );
                ctx.clip();
              }
            }

            ctx.drawImage(sourceElement, -drawW / 2, -drawH / 2, drawW, drawH);

            // Voiles pour fondus et flashs de transition (Étape 10 & 12)
            if (transitionType === 'fade_to_black' && transitionProgress < 1.0) {
              const blackAlpha = 1.0 - transitionProgress;
              ctx.fillStyle = `rgba(0, 0, 0, ${blackAlpha.toFixed(3)})`;
              ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
            } else if (transitionType === 'dip_to_white' && transitionProgress < 1.0) {
              const whiteAlpha = 1.0 - transitionProgress;
              ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha.toFixed(3)})`;
              ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
            } else if (transitionType === 'strobe' && transitionProgress < 1.0) {
              const strobeBurst = Math.sin(transitionProgress * Math.PI * 6);
              if (strobeBurst > 0.3) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
              }
            }

            // Effets stroboscopiques dynamiques CapCut (Tremor Strobe, Strobe Blanc, Strobe Noir - Étape 12)
            if (fxPreset === 'tremor_strobe' || fxPreset === 'strobe_white') {
              const strobePulse = Math.sin(tSec * 45 * fxSpeed);
              if (strobePulse > 0.35) {
                const flashAlpha = Math.min(0.85, 0.65 * fxIntensity);
                ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha.toFixed(3)})`;
                ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
              }
            } else if (fxPreset === 'strobe_black') {
              const strobePulse = Math.sin(tSec * 45 * fxSpeed);
              if (strobePulse > 0.35) {
                const flashAlpha = Math.min(0.9, 0.75 * fxIntensity);
                ctx.fillStyle = `rgba(0, 0, 0, ${flashAlpha.toFixed(3)})`;
                ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
              }
            }

            // Effet Vignettage cinéma (Étape 11)
            const hasVignette = item.video_effects?.preset === 'vignette' || (item.video_effects?.vignette_amount && item.video_effects.vignette_amount > 0);
            if (hasVignette) {
              const vigAmount = item.video_effects?.vignette_amount ?? 0.65;
              const radius = Math.max(drawW, drawH) * 0.7;
              const vignetteGrad = ctx.createRadialGradient(0, 0, radius * 0.35, 0, 0, radius);
              vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
              vignetteGrad.addColorStop(1, `rgba(0, 0, 0, ${vigAmount.toFixed(2)})`);
              ctx.fillStyle = vignetteGrad;
              ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
            }
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
    [canvasWidth, canvasHeight, project.timeline_canvas.background_color_hex, currentTimeUs],
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

            // Vitesse de lecture dynamique (Étape 9)
            const speed = vis.item.playback_speed ?? 1.0;
            if (video.playbackRate !== speed) {
              video.playbackRate = speed;
            }

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

            // Vitesse de lecture dynamique (Étape 9)
            const speed = aud.item.playback_speed ?? 1.0;
            if (audio.playbackRate !== speed) {
              audio.playbackRate = speed;
            }

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

      // Détecter si un média avec vitesse modifiée est actif sous la tête de lecture
      const { visualItems, audioItems } = getActiveItemsAtTime(
        state.project.sequence,
        state.project.asset_catalog,
        state.currentTimeUs,
      );
      const activeVideoItem = visualItems.find((v) => v.asset?.media_kind === 'video');
      const activeAudioItem = audioItems.find((a) => a.asset?.media_kind === 'audio');
      const videoEl = activeVideoItem?.asset
        ? mediaSession.getVideoElement(activeVideoItem.asset.asset_id)
        : null;

      const activeSpeed = activeVideoItem?.item.playback_speed ?? activeAudioItem?.item.playback_speed ?? 1.0;

      let nextTimeUs: number;

      if (videoEl && !videoEl.paused && videoEl.readyState >= 2) {
        // Horloge vidéo matérielle exacte : videoEl.currentTime avance au rythme accéléré/ralenti (playbackRate)
        // Donc elapsedSinceInPoint avance au rythme réel * activeSpeed
        // La jauge de progression de la timeline avance directement au rythme accéléré de la vidéo !
        const videoCurrentUs = Math.round(videoEl.currentTime * 1_000_000);
        const elapsedSinceInPoint = videoCurrentUs - activeVideoItem!.item.source_in_point_us;
        nextTimeUs = activeVideoItem!.item.placement_time_us + elapsedSinceInPoint;
      } else {
        // Horloge murale basée sur performance.now pondérée par la vitesse active
        const deltaMs = lastWallTimeRef.current !== null ? nowMs - lastWallTimeRef.current : 16;
        nextTimeUs = state.currentTimeUs + Math.round(deltaMs * 1000 * activeSpeed);
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
      // Ignorer si l'utilisateur saisit du texte dans un champ de saisie texte
      const isTextInput =
        (e.target instanceof HTMLInputElement && e.target.type !== 'range') ||
        e.target instanceof HTMLTextAreaElement;

      if (isTextInput) {
        return;
      }

      // On utilise e.key (en minuscule) pour respecter la disposition réelle du clavier (QWERTZ, AZERTY, QWERTY)
      const keyLower = e.key ? e.key.toLowerCase() : '';

      // 1. Barre d'espace : Lecture / Pause
      if (e.code === 'Space' || e.key === ' ') {
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
      if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
        e.preventDefault();
        const stepUs = e.shiftKey ? 5_000_000 : 1_000_000;
        setCurrentTimeUs(Math.max(0, useProjectStore.getState().currentTimeUs - stepUs));
        return;
      }

      // 3. Flèche Droite : Avancer de 1 seconde (ou 5s avec Shift)
      if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
        e.preventDefault();
        const stepUs = e.shiftKey ? 5_000_000 : 1_000_000;
        setCurrentTimeUs(useProjectStore.getState().currentTimeUs + stepUs);
        return;
      }

      // 4. Touche Début (Home) : Revenir au tout début (00:00:00:00)
      if (e.key === 'Home' || e.code === 'Home') {
        e.preventDefault();
        setCurrentTimeUs(0);
        return;
      }

      // 5. Touche Suppr ou Retour Arrière : Supprimer le clip sélectionné
      if (e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          removeTimelineItem(selectedItemId);
        }
        return;
      }

      // 6. Raccourcis d'outils CapCut : V (Sélection) et B (Rasoir / Split)
      if (keyLower === 'v' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('select');
        return;
      }
      if (keyLower === 'b' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveTool('split');
        return;
      }

      // 7. Scission rapide : Ctrl+B ou Ctrl+K
      if ((keyLower === 'b' || keyLower === 'k') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        splitTimelineItemAtCurrentTime();
        return;
      }

      // 8. Annuler : Ctrl+Z / Cmd+Z (adapté QWERTZ, AZERTY et QWERTY via e.key)
      if ((e.ctrlKey || e.metaKey) && keyLower === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // 9. Rétablir : Ctrl+Y ou Ctrl+Maj+Z (adapté QWERTZ, AZERTY et QWERTY via e.key)
      if ((e.ctrlKey || e.metaKey) && (keyLower === 'y' || (keyLower === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // 10. Enregistrer : Ctrl+S
      if ((e.ctrlKey || e.metaKey) && keyLower === 's') {
        e.preventDefault();
        saveProjectToFile();
        return;
      }

      // 11. Exporter : Ctrl+E
      if ((e.ctrlKey || e.metaKey) && keyLower === 'e') {
        e.preventDefault();
        openExportDialog();
        return;
      }

      // 12. Touche M : Mute / Démute Master
      if (keyLower === 'm' && !e.ctrlKey && !e.metaKey) {
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
    openExportDialog,
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

/**
 * ffmpegCommandBuilder.ts — Générateur de commande et filtre complexe FFmpeg
 * pour l'exportation vidéo de projets Kroma Studio.
 *
 * Conforme à l'architecture déclarative non-destructive de Kroma :
 * - Respect strict de l'isolation subprocess (aucun lien binaire C/C++ direct, respect LGPL/GPL)
 * - Conversion rigoureuse des microsecondes (us) vers secondes décimales
 * - Composition multi-couches : canvas de fond, overlays vidéo/image ordonnés par stack_index, calques drawtext
 * - Mixage audio DSP : trims, gains effectifs (clip × piste), rampes de fondu (afade in/out), calage temporel (adelay) et amix
 * - Formats cibles : MP4 H.264 / AAC avec faststart pour diffusion web immédiate
 */

import type { KromaProject } from '../types/project';
import type { TimelineItem, TimelineLane } from '../types/timeline';
import type { MediaAsset } from '../types/asset';

export interface ExportOptions {
  /** Résolution de sortie en pixels : largeur (défaut : valeur du projet ou 1920) */
  width?: number;
  /** Résolution de sortie en pixels : hauteur (défaut : valeur du projet ou 1080) */
  height?: number;
  /** Fréquence d'images par seconde (défaut : valeur du projet ou 60) */
  fps?: number;
  /** Codec vidéo : libx264 (recommandé H.264) ou libx265 (HEVC) */
  videoCodec?: 'libx264' | 'libx265';
  /** Profil de vitesse d'encodage FFmpeg (medium par défaut) */
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  /** Facteur de qualité constante (CRF, 0 à 51, défaut 23) */
  crf?: number;
  /** Codec audio : aac par défaut */
  audioCodec?: 'aac' | 'mp3';
  /** Débit binaire audio (ex: '192k', '256k', '320k') */
  audioBitrate?: string;
  /** Fréquence d'échantillonnage audio en Hz (défaut : 48000) */
  audioSampleRate?: number;
  /** Nom du fichier MP4 de destination */
  outputFilename?: string;
  /** Générer une piste audio silencieuse si le projet ne contient aucun élément audio */
  includeSilentAudioIfEmpty?: boolean;
}

export interface FFmpegExportResult {
  /** Arguments bruts pour exécution en sous-processus (ex: child_process.spawn ou Tauri Command) */
  args: string[];
  /** Commande complète formatée pour terminal Unix / Bash / macOS */
  bashCommand: string;
  /** Commande complète formatée pour Invite de commandes Windows / PowerShell */
  windowsCommand: string;
  /** Chaîne du filtre complexe (-filter_complex) */
  filterComplex: string;
  /** Chemins des fichiers sources requis en entrée */
  inputFiles: string[];
  /** Nom du fichier final de sortie */
  outputFilename: string;
  /** Durée totale du rendu en secondes */
  totalDurationSeconds: number;
  /** Résolution de sortie */
  resolution: { width: number; height: number };
  /** Cadence d'images */
  fps: number;
}

/** Convertit les microsecondes en secondes décimales formatées */
export function usToSeconds(us: number): number {
  return Number((Math.max(0, us) / 1_000_000).toFixed(6));
}

/** Convertit les microsecondes en millisecondes entières pour adelay */
export function usToMs(us: number): number {
  return Math.max(0, Math.round(us / 1_000));
}

/** Échappe les caractères spéciaux pour le filtre drawtext FFmpeg */
export function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/%/g, '%%');
}

/**
 * Construit une chaîne de filtres atempo FFmpeg pour adapter la vitesse audio.
 * Le filtre FFmpeg atempo accepte uniquement un multiplicateur entre 0.5 et 2.0.
 * Pour les vitesses < 0.5 ou > 2.0, plusieurs filtres atempo sont chaînés.
 */
export function buildAtempoFilter(speed: number): string {
  if (Math.abs(speed - 1.0) < 0.001) return '';
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${Number(remaining.toFixed(4))}`);
  return filters.join(',');
}

/**
 * Construit la commande complète FFmpeg et le graphe de filtre complexe
 * à partir de la structure d'un projet KromaProject.
 */
export function buildFFmpegCommand(
  project: KromaProject,
  options: ExportOptions = {},
): FFmpegExportResult {
  const width = options.width ?? project.timeline_canvas?.viewport_width ?? 1920;
  const height = options.height ?? project.timeline_canvas?.viewport_height ?? 1080;
  const fps = options.fps ?? project.timeline_canvas?.frame_rate_fps ?? 60.0;
  const videoCodec = options.videoCodec ?? 'libx264';
  const preset = options.preset ?? 'medium';
  const crf = options.crf ?? 23;
  const audioCodec = options.audioCodec ?? 'aac';
  const audioBitrate = options.audioBitrate ?? '192k';
  const audioSampleRate = options.audioSampleRate ?? project.timeline_canvas?.audio_sample_rate_hz ?? 48000;
  const includeSilentAudio = options.includeSilentAudioIfEmpty ?? true;

  // Nom de fichier de sortie par défaut
  const sanitizedProjectName = (project.project_name || 'kroma_export')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_');
  const outputFilename = options.outputFilename || `${sanitizedProjectName}.mp4`;

  // Calcul de la durée totale de la séquence
  let totalLengthUs = project.sequence.total_length_us || 0;
  if (totalLengthUs <= 0) {
    for (const lane of project.sequence.lanes) {
      for (const item of lane.items) {
        const itemEndUs = item.placement_time_us + item.play_duration_us;
        if (itemEndUs > totalLengthUs) {
          totalLengthUs = itemEndUs;
        }
      }
    }
  }

  // Si la timeline est vide, fixer une durée minimale de sécurité de 5s
  if (totalLengthUs <= 0) {
    totalLengthUs = 5_000_000;
  }
  const totalDurationSeconds = usToSeconds(totalLengthUs);

  // 1. Inventaire des ressources sources utilisées
  // ───────────────────────────────────────────────────────────────────────────
  const usedAssetIds = new Set<string>();
  for (const lane of project.sequence.lanes) {
    for (const item of lane.items) {
      if (item.referenced_asset_id) {
        usedAssetIds.add(item.referenced_asset_id);
      }
    }
  }

  interface InputDescriptor {
    asset: MediaAsset;
    inputIndex: number;
    isImage: boolean;
  }

  const inputDescriptors: InputDescriptor[] = [];
  const assetIdToInputIndex = new Map<string, number>();

  for (const asset of project.asset_catalog) {
    if (usedAssetIds.has(asset.asset_id)) {
      const idx = inputDescriptors.length;
      inputDescriptors.push({
        asset,
        inputIndex: idx,
        isImage: asset.media_kind === 'image',
      });
      assetIdToInputIndex.set(asset.asset_id, idx);
    }
  }

  // 2. Gestion du Solo/Mute pour l'audio
  // ───────────────────────────────────────────────────────────────────────────
  const hasSoloLane = project.sequence.lanes.some((l) => Boolean(l.is_solo));
  const isLaneAudible = (lane: TimelineLane) =>
    hasSoloLane ? Boolean(lane.is_solo) && !lane.is_muted : !lane.is_muted;

  // 3. Comptage des utilisations de chaque entrée pour les filtres split/asplit
  // ───────────────────────────────────────────────────────────────────────────
  const videoInputUsage = new Map<number, number>();
  const audioInputUsage = new Map<number, number>();

  for (const lane of project.sequence.lanes) {
    for (const item of lane.items) {
      if (!item.referenced_asset_id) continue;
      const inputIdx = assetIdToInputIndex.get(item.referenced_asset_id);
      if (inputIdx === undefined) continue;

      if (lane.lane_type === 'visual') {
        videoInputUsage.set(inputIdx, (videoInputUsage.get(inputIdx) || 0) + 1);
        if (isLaneAudible(lane)) {
          const asset = inputDescriptors[inputIdx]?.asset;
          if (asset && asset.media_kind === 'video' && (asset.audio_channels > 0 || asset.audio_channels === undefined)) {
            audioInputUsage.set(inputIdx, (audioInputUsage.get(inputIdx) || 0) + 1);
          }
        }
      } else if (lane.lane_type === 'audio' && isLaneAudible(lane)) {
        audioInputUsage.set(inputIdx, (audioInputUsage.get(inputIdx) || 0) + 1);
      }
    }
  }

  const filterParts: string[] = [];

  // Création des splits vidéo
  const videoStreamPool = new Map<number, string[]>();
  videoInputUsage.forEach((count, inputIdx) => {
    if (count > 1) {
      const labels = Array.from({ length: count }, (_, i) => `[v_in_${inputIdx}_${i}]`);
      filterParts.push(`[${inputIdx}:v]split=${count}${labels.join('')}`);
      videoStreamPool.set(inputIdx, [...labels]);
    } else if (count === 1) {
      videoStreamPool.set(inputIdx, [`[${inputIdx}:v]`]);
    }
  });

  // Création des splits audio
  const audioStreamPool = new Map<number, string[]>();
  audioInputUsage.forEach((count, inputIdx) => {
    if (count > 1) {
      const labels = Array.from({ length: count }, (_, i) => `[a_in_${inputIdx}_${i}]`);
      filterParts.push(`[${inputIdx}:a]asplit=${count}${labels.join('')}`);
      audioStreamPool.set(inputIdx, [...labels]);
    } else if (count === 1) {
      audioStreamPool.set(inputIdx, [`[${inputIdx}:a]`]);
    }
  });

  // 4. Construction de la chaîne vidéo
  // ───────────────────────────────────────────────────────────────────────────
  let bgColorHex = project.timeline_canvas?.background_color_hex || '#000000';
  if (bgColorHex.startsWith('#')) {
    bgColorHex = '0x' + bgColorHex.slice(1);
  }

  // Canevas de base
  filterParts.push(`color=c=${bgColorHex}:s=${width}x${height}:r=${fps}:d=${totalDurationSeconds.toFixed(3)}[v_base_0]`);
  let currentVideoTag = '[v_base_0]';
  let videoStep = 0;

  // Récupérer et trier les éléments visuels et textes par stack_index croissant
  interface VisualItemEntry {
    lane: TimelineLane;
    item: TimelineItem;
  }
  const visualEntries: VisualItemEntry[] = [];
  for (const lane of project.sequence.lanes) {
    if (lane.lane_type === 'visual' || lane.lane_type === 'text_overlay') {
      for (const item of lane.items) {
        visualEntries.push({ lane, item });
      }
    }
  }

  visualEntries.sort((a, b) => {
    if (a.lane.stack_index !== b.lane.stack_index) {
      return a.lane.stack_index - b.lane.stack_index;
    }
    return a.item.placement_time_us - b.item.placement_time_us;
  });

  for (const entry of visualEntries) {
    const { lane, item } = entry;
    const startSec = usToSeconds(item.placement_time_us);
    const durationSec = usToSeconds(item.play_duration_us);
    const endSec = Number((startSec + durationSec).toFixed(6));
    const inSec = usToSeconds(item.source_in_point_us);

    if (lane.lane_type === 'visual' && item.referenced_asset_id) {
      const inputIdx = assetIdToInputIndex.get(item.referenced_asset_id);
      if (inputIdx === undefined) continue;
      const streamLabel = videoStreamPool.get(inputIdx)?.shift() || `[${inputIdx}:v]`;
      const isImg = inputDescriptors[inputIdx]?.isImage;

      const speed = item.playback_speed ?? 1.0;
      const isSpeedModified = Math.abs(speed - 1.0) > 0.001;

      const clipSubFilters: string[] = [];
      if (!isImg) {
        const sourceDurationSec = isSpeedModified ? durationSec * speed : durationSec;
        clipSubFilters.push(`trim=start=${inSec.toFixed(3)}:duration=${sourceDurationSec.toFixed(3)}`);
      } else {
        clipSubFilters.push(`trim=duration=${durationSec.toFixed(3)}`);
      }

      if (!isImg && isSpeedModified) {
        clipSubFilters.push(`setpts=(PTS-STARTPTS)/${speed.toFixed(4)}+${startSec.toFixed(3)}/TB`);
      } else {
        clipSubFilters.push(`setpts=PTS-STARTPTS+${startSec.toFixed(3)}/TB`);
      }

      // Contain & Pad vers la résolution cible
      clipSubFilters.push(
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${bgColorHex}@0`,
      );

      // Transformations spatiales
      const placement = item.spatial_placement;
      if (placement) {
        if (placement.zoom_factor_x !== 1.0 || placement.zoom_factor_y !== 1.0) {
          const zx = (placement.zoom_factor_x || 1.0).toFixed(3);
          const zy = (placement.zoom_factor_y || 1.0).toFixed(3);
          clipSubFilters.push(`scale=iw*${zx}:ih*${zy}`);
        }
        if (placement.rotation_degrees && placement.rotation_degrees !== 0) {
          const rad = ((placement.rotation_degrees * Math.PI) / 180).toFixed(4);
          clipSubFilters.push(`rotate=${rad}:c=none:ow=rotw(iw):oh=roth(ih)`);
        }
        if (placement.opacity_ratio !== undefined && placement.opacity_ratio < 1.0) {
          const alpha = Math.max(0, Math.min(1.0, placement.opacity_ratio)).toFixed(2);
          clipSubFilters.push(`format=rgba,colorchannelmixer=aa=${alpha}`);
        }
        if (placement.flip_horizontal) {
          clipSubFilters.push('hflip');
        }
        if (placement.flip_vertical) {
          clipSubFilters.push('vflip');
        }
      }

      // Filtres d'étalonnage et de couleur (Étape 8)
      const color = item.color_adjustments;
      if (color) {
        const eqParts: string[] = [];
        if (color.brightness && color.brightness !== 0) {
          eqParts.push(`brightness=${color.brightness.toFixed(3)}`);
        }
        if (color.contrast && color.contrast !== 0) {
          eqParts.push(`contrast=${(1 + color.contrast).toFixed(3)}`);
        }
        if (color.saturation && color.saturation !== 0) {
          eqParts.push(`saturation=${(1 + color.saturation).toFixed(3)}`);
        }
        if (eqParts.length > 0) {
          clipSubFilters.push(`eq=${eqParts.join(':')}`);
        }
        if (color.hue_degrees && color.hue_degrees !== 0) {
          clipSubFilters.push(`hue=h=${color.hue_degrees}`);
        }
        if (color.blur_px && color.blur_px > 0) {
          clipSubFilters.push(`gblur=sigma=${color.blur_px}`);
        }
      }

      // Effets vidéo artistiques et créatifs (Étape 11 & 12)
      const fx = item.video_effects;
      if (fx) {
        const fxSpeed = fx.speed ?? 1.0;
        const fxIntensity = fx.intensity ?? 1.0;

        if (fx.preset === 'monochrome') {
          clipSubFilters.push('hue=s=0');
        } else if (fx.preset === 'sepia') {
          clipSubFilters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
        } else if (fx.preset === 'invert') {
          clipSubFilters.push('negate');
        } else if (fx.preset === 'vintage') {
          clipSubFilters.push('curves=vintage');
        } else if (fx.preset === 'x_shake') {
          const amp = Math.round(18 * fxIntensity);
          const freq = (28 * fxSpeed).toFixed(1);
          clipSubFilters.push(
            `crop=w=in_w*0.92:h=in_h:x='(in_w-out_w)/2+sin(t*${freq})*${amp}':y='(in_h-out_h)/2',scale=${width}:${height}`,
          );
        } else if (fx.preset === 'y_shake') {
          const amp = Math.round(16 * fxIntensity);
          const freq = (28 * fxSpeed).toFixed(1);
          clipSubFilters.push(
            `crop=w=in_w:h=in_h*0.92:x='(in_w-out_w)/2':y='(in_h-out_h)/2+sin(t*${freq})*${amp}',scale=${width}:${height}`,
          );
        } else if (fx.preset === 'camera_shake') {
          const ampX = Math.round(14 * fxIntensity);
          const ampY = Math.round(12 * fxIntensity);
          const freq1 = (23 * fxSpeed).toFixed(1);
          const freq2 = (29 * fxSpeed).toFixed(1);
          clipSubFilters.push(
            `crop=w=in_w*0.90:h=in_h*0.90:x='(in_w-out_w)/2+sin(t*${freq1})*${ampX}':y='(in_h-out_h)/2+cos(t*${freq2})*${ampY}',scale=${width}:${height}`,
          );
        } else if (fx.preset === 'tremor_strobe') {
          const ampX = Math.round(18 * fxIntensity);
          const ampY = Math.round(14 * fxIntensity);
          const freq1 = (35 * fxSpeed).toFixed(1);
          const freq2 = (42 * fxSpeed).toFixed(1);
          const strobeFreq = (45 * fxSpeed).toFixed(1);
          clipSubFilters.push(
            `crop=w=in_w*0.88:h=in_h*0.88:x='(in_w-out_w)/2+sin(t*${freq1})*${ampX}':y='(in_h-out_h)/2+cos(t*${freq2})*${ampY}',scale=${width}:${height}`,
          );
          clipSubFilters.push(`drawbox=t=fill:c=white@0.65:enable='gt(sin(t*${strobeFreq}),0.35)'`);
        } else if (fx.preset === 'strobe_white') {
          const strobeFreq = (35 * fxSpeed).toFixed(1);
          clipSubFilters.push(`drawbox=t=fill:c=white@0.70:enable='gt(sin(t*${strobeFreq}),0.35)'`);
        } else if (fx.preset === 'strobe_black') {
          const strobeFreq = (35 * fxSpeed).toFixed(1);
          clipSubFilters.push(`drawbox=t=fill:c=black@0.75:enable='gt(sin(t*${strobeFreq}),0.35)'`);
        }

        if (fx.preset === 'vignette' || (fx.vignette_amount && fx.vignette_amount > 0)) {
          const angle = fx.vignette_amount ? ((fx.vignette_amount * Math.PI) / 2).toFixed(4) : 'PI/4';
          clipSubFilters.push(`vignette=${angle}`);
        }
      }

      // Transition d'entrée (Étape 10 & 12)
      if (item.transition_in && item.transition_in.transition_type !== 'none') {
        const transSec = usToSeconds(item.transition_in.duration_us || 1_000_000);
        const transType = item.transition_in.transition_type;
        if (
          transType === 'crossfade' ||
          transType === 'wipe_left' ||
          transType === 'wipe_right' ||
          transType === 'wipe_up' ||
          transType === 'wipe_down' ||
          transType === 'zoom_in' ||
          transType === 'zoom_out' ||
          transType === 'spin'
        ) {
          clipSubFilters.push(
            `format=rgba,fade=t=in:st=${startSec.toFixed(3)}:d=${transSec.toFixed(3)}:alpha=1`,
          );
        } else if (transType === 'fade_to_black') {
          clipSubFilters.push(
            `fade=t=in:st=${startSec.toFixed(3)}:d=${transSec.toFixed(3)}:color=black`,
          );
        } else if (transType === 'dip_to_white') {
          clipSubFilters.push(
            `fade=t=in:st=${startSec.toFixed(3)}:d=${transSec.toFixed(3)}:color=white`,
          );
        } else if (transType === 'strobe') {
          clipSubFilters.push(
            `format=rgba,fade=t=in:st=${startSec.toFixed(3)}:d=${transSec.toFixed(3)}:alpha=1,drawbox=t=fill:c=white@0.75:enable='between(t,${startSec.toFixed(3)},${(startSec + transSec).toFixed(3)})*gt(sin((t-${startSec.toFixed(3)})/${transSec.toFixed(3)}*PI*6),0.3)'`,
          );
        }
      }

      const clipFilteredTag = `[v_clip_${videoStep}]`;
      filterParts.push(`${streamLabel}${clipSubFilters.join(',')}${clipFilteredTag}`);

      // Overlay sur le canevas en cours
      const nextBaseTag = `[v_base_${videoStep + 1}]`;
      const offX = placement?.offset_x_px || 0;
      const offY = placement?.offset_y_px || 0;
      const xExpr = offX === 0 ? '(W-w)/2' : `(W-w)/2+(${offX})`;
      const yExpr = offY === 0 ? '(H-h)/2' : `(H-h)/2+(${offY})`;

      filterParts.push(
        `${currentVideoTag}${clipFilteredTag}overlay=x='${xExpr}':y='${yExpr}':enable='between(t,${startSec.toFixed(3)},${endSec.toFixed(3)})'${nextBaseTag}`,
      );

      currentVideoTag = nextBaseTag;
      videoStep++;
    } else if (lane.lane_type === 'text_overlay' && item.text_layer_data) {
      const textData = item.text_layer_data;
      const escapedText = escapeDrawText(textData.raw_string || '');
      // Mise à l'échelle de la taille de police proportionnellement à la hauteur de résolution
      const fontSize = Math.round(textData.font_size_pt * (height / 1080) * 2);

      const nc = textData.normalized_center || { x_ratio: 0.5, y_ratio: 0.5 };
      const offX = item.spatial_placement?.offset_x_px || 0;
      const offY = item.spatial_placement?.offset_y_px || 0;

      let xExpr: string;
      if (textData.text_align === 'left') {
        xExpr = offX === 0 ? `w*${nc.x_ratio.toFixed(4)}` : `w*${nc.x_ratio.toFixed(4)}+(${offX})`;
      } else if (textData.text_align === 'right') {
        xExpr = offX === 0 ? `w*${nc.x_ratio.toFixed(4)}-tw` : `w*${nc.x_ratio.toFixed(4)}-tw+(${offX})`;
      } else {
        // center
        xExpr = offX === 0 ? `w*${nc.x_ratio.toFixed(4)}-tw/2` : `w*${nc.x_ratio.toFixed(4)}-tw/2+(${offX})`;
      }

      const yExpr = offY === 0 ? `h*${nc.y_ratio.toFixed(4)}-th/2` : `h*${nc.y_ratio.toFixed(4)}-th/2+(${offY})`;

      const borderPart =
        textData.outline_thickness_px > 0
          ? `:borderw=${Math.round(textData.outline_thickness_px * 2)}:bordercolor=${textData.outline_color_hex || '#000000'}`
          : '';

      const fontPart = textData.font_name ? `:font='${textData.font_name}'` : '';
      const nextBaseTag = `[v_base_${videoStep + 1}]`;

      filterParts.push(
        `${currentVideoTag}drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${textData.fill_color_hex || '#FFFFFF'}${borderPart}${fontPart}:x='${xExpr}':y='${yExpr}':enable='between(t,${startSec.toFixed(3)},${endSec.toFixed(3)})'${nextBaseTag}`,
      );

      currentVideoTag = nextBaseTag;
      videoStep++;
    }
  }

  // Renommer le tag vidéo final en [v_out]
  const finalVideoTag = currentVideoTag;
  filterParts.push(`${finalVideoTag}null[v_out]`);

  // 5. Construction de la chaîne audio
  // ───────────────────────────────────────────────────────────────────────────
  const audioClipTags: string[] = [];
  let audioStep = 0;

  for (const lane of project.sequence.lanes) {
    if (!isLaneAudible(lane)) continue;

    for (const item of lane.items) {
      if (!item.referenced_asset_id) continue;
      const inputIdx = assetIdToInputIndex.get(item.referenced_asset_id);
      if (inputIdx === undefined) continue;

      const asset = inputDescriptors[inputIdx]?.asset;
      if (!asset) continue;

      // Piste audio ou vidéo disposant d'audio
      const hasAudio =
        lane.lane_type === 'audio' ||
        (lane.lane_type === 'visual' && asset.media_kind === 'video' && (asset.audio_channels > 0 || asset.audio_channels === undefined));

      if (!hasAudio) continue;

      const streamLabel = audioStreamPool.get(inputIdx)?.shift();
      if (!streamLabel) continue;

      const durationSec = usToSeconds(item.play_duration_us);
      const inSec = usToSeconds(item.source_in_point_us);
      const delayMs = usToMs(item.placement_time_us);
      const effectiveGain = (item.item_gain ?? 1.0) * (lane.gain_level ?? 1.0);
      const fadeInSec = usToSeconds(item.fade_in_duration_us || 0);
      const fadeOutSec = usToSeconds(item.fade_out_duration_us || 0);

      const speed = item.playback_speed ?? 1.0;
      const isSpeedModified = Math.abs(speed - 1.0) > 0.001;
      const sourceDurationSec = isSpeedModified ? durationSec * speed : durationSec;

      const aSubFilters: string[] = [];
      aSubFilters.push(`atrim=start=${inSec.toFixed(3)}:duration=${sourceDurationSec.toFixed(3)},asetpts=PTS-STARTPTS`);

      const atempoFilter = buildAtempoFilter(speed);
      if (atempoFilter) {
        aSubFilters.push(atempoFilter);
      }

      if (effectiveGain !== 1.0) {
        aSubFilters.push(`volume=${effectiveGain.toFixed(3)}`);
      }

      if (fadeInSec > 0) {
        aSubFilters.push(`afade=t=in:st=0:d=${fadeInSec.toFixed(3)}`);
      }

      if (fadeOutSec > 0) {
        const fadeOutStart = Math.max(0, durationSec - fadeOutSec);
        aSubFilters.push(`afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOutSec.toFixed(3)}`);
      }

      if (delayMs > 0) {
        aSubFilters.push(`adelay=${delayMs}|${delayMs}`);
      }

      const aTag = `[a_clip_${audioStep}]`;
      filterParts.push(`${streamLabel}${aSubFilters.join(',')}${aTag}`);
      audioClipTags.push(aTag);
      audioStep++;
    }
  }

  let hasAudioStream = false;
  if (audioClipTags.length > 1) {
    filterParts.push(
      `${audioClipTags.join('')}amix=inputs=${audioClipTags.length}:duration=longest:dropout_transition=0:normalize=0[a_out]`,
    );
    hasAudioStream = true;
  } else if (audioClipTags.length === 1) {
    filterParts.push(`${audioClipTags[0]}anull[a_out]`);
    hasAudioStream = true;
  } else if (includeSilentAudio) {
    filterParts.push(
      `anullsrc=channel_layout=stereo:sample_rate=${audioSampleRate}:d=${totalDurationSeconds.toFixed(3)}[a_out]`,
    );
    hasAudioStream = true;
  }

  const filterComplex = filterParts.join(';');

  // 6. Assemblage des arguments FFmpeg
  // ───────────────────────────────────────────────────────────────────────────
  const args: string[] = ['-y'];

  // Entrées fichiers
  for (const desc of inputDescriptors) {
    if (desc.isImage) {
      args.push('-loop', '1');
    }
    const path = desc.asset.source_path || desc.asset.display_name;
    args.push('-i', path);
  }

  // Filtre complexe
  args.push('-filter_complex', filterComplex);

  // Mappage et encodage vidéo
  args.push('-map', '[v_out]');
  args.push('-c:v', videoCodec);
  args.push('-preset', preset);
  args.push('-crf', crf.toString());
  args.push('-pix_fmt', 'yuv420p');
  args.push('-r', fps.toString());

  // Mappage et encodage audio
  if (hasAudioStream) {
    args.push('-map', '[a_out]');
    args.push('-c:a', audioCodec);
    args.push('-b:a', audioBitrate);
    args.push('-ar', audioSampleRate.toString());
  } else {
    args.push('-an');
  }

  // Conteneur MP4 optimisé web
  args.push('-movflags', '+faststart');
  args.push(outputFilename);

  // 7. Formatage des chaînes de commande pour Windows et Bash
  // ───────────────────────────────────────────────────────────────────────────
  const inputFiles = inputDescriptors.map((d) => d.asset.source_path || d.asset.display_name);

  const formatArgsForCli = (quoteChar: '"' | "'") => {
    return args
      .map((arg) => {
        if (arg.includes(' ') || arg.includes(';') || arg.includes('=') || arg.includes('|') || arg.includes('&')) {
          return `${quoteChar}${arg}${quoteChar}`;
        }
        return arg;
      })
      .join(' ');
  };

  const windowsCommand = `ffmpeg ${formatArgsForCli('"')}`;
  const bashCommand = `ffmpeg ${formatArgsForCli('"')}`;

  return {
    args,
    bashCommand,
    windowsCommand,
    filterComplex,
    inputFiles,
    outputFilename,
    totalDurationSeconds,
    resolution: { width, height },
    fps,
  };
}

/**
 * Génère le script de commande Windows Batch (.bat) prêt à l'emploi.
 */
export function generateWindowsBatch(result: FFmpegExportResult): string {
  return `@echo off
chcp 65001 > nul
echo ========================================================
echo  Kroma Studio — Exportation video MP4 via FFmpeg
echo  Fichier de sortie : ${result.outputFilename}
echo  Resolution        : ${result.resolution.width}x${result.resolution.height} @ ${result.fps} FPS
echo  Duree totale      : ${result.totalDurationSeconds}s
echo ========================================================
echo.
echo Verification de la presence de FFmpeg...
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] FFmpeg n'a pas ete trouve dans le PATH systeme.
    echo Veuillez installer FFmpeg et l'ajouter a votre PATH.
    pause
    exit /b 1
)

echo Lancement de l'encodage...
${result.windowsCommand}

if %errorlevel% equ 0 (
    echo.
    echo [SUCCES] Exportation terminee avec succes : ${result.outputFilename}
) else (
    echo.
    echo [ERREUR] L'encodage a echoue avec le code %errorlevel%.
)
pause
`;
}

/**
 * Génère le script shell Linux/macOS (.sh) prêt à l'emploi.
 */
export function generateBashScript(result: FFmpegExportResult): string {
  return `#!/usr/bin/env bash
set -e

echo "========================================================"
echo " Kroma Studio — Exportation vidéo MP4 via FFmpeg"
echo " Fichier de sortie : ${result.outputFilename}"
echo " Résolution        : ${result.resolution.width}x${result.resolution.height} @ ${result.fps} FPS"
echo " Durée totale      : ${result.totalDurationSeconds}s"
echo "========================================================"
echo ""

if ! command -v ffmpeg &> /dev/null; then
    echo "[ERREUR] FFmpeg n'a pas été trouvé dans le PATH."
    echo "Installez FFmpeg (ex: apt install ffmpeg, brew install ffmpeg)."
    exit 1
fi

echo "Lancement de l'encodage..."
${result.bashCommand}

echo ""
echo "[SUCCÈS] Exportation terminée : ${result.outputFilename}"
`;
}


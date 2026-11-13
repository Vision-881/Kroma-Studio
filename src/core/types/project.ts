import type { MediaAsset } from './asset';
import type { TimelineSequence } from './timeline';

export type CanvasAspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9' | 'custom';

export interface AspectRatioPreset {
  id: CanvasAspectRatio;
  label: string;
  name: string;
  sublabel: string;
  width: number;
  height: number;
}

export const CANVAS_RATIO_PRESETS: Record<Exclude<CanvasAspectRatio, 'custom'>, AspectRatioPreset> = {
  '16:9': {
    id: '16:9',
    label: '16:9',
    name: 'YouTube / Paysage',
    sublabel: '1920×1080',
    width: 1920,
    height: 1080,
  },
  '9:16': {
    id: '9:16',
    label: '9:16',
    name: 'TikTok / Shorts / Reels',
    sublabel: '1080×1920',
    width: 1080,
    height: 1920,
  },
  '1:1': {
    id: '1:1',
    label: '1:1',
    name: 'Carré / Feed Instagram',
    sublabel: '1080×1080',
    width: 1080,
    height: 1080,
  },
  '4:5': {
    id: '4:5',
    label: '4:5',
    name: 'Portrait Instagram',
    sublabel: '1080×1350',
    width: 1080,
    height: 1350,
  },
  '4:3': {
    id: '4:3',
    label: '4:3',
    name: 'Standard / Rétro',
    sublabel: '1440×1080',
    width: 1440,
    height: 1080,
  },
  '21:9': {
    id: '21:9',
    label: '21:9',
    name: 'Cinéma / Ultrawide',
    sublabel: '2560×1080',
    width: 2560,
    height: 1080,
  },
};

/**
 * Détecte le ratio d'aspect correspondant à des dimensions données,
 * avec une tolérance pour les arrondis de résolutions.
 */
export function detectAspectRatio(width: number, height: number): CanvasAspectRatio {
  if (width <= 0 || height <= 0) return '16:9';
  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.02) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.02) return '9:16';
  if (Math.abs(ratio - 1.0) < 0.02) return '1:1';
  if (Math.abs(ratio - 4 / 5) < 0.02) return '4:5';
  if (Math.abs(ratio - 4 / 3) < 0.02) return '4:3';
  if (Math.abs(ratio - 21 / 9) < 0.05 || Math.abs(ratio - 2560 / 1080) < 0.02) return '21:9';

  return 'custom';
}

export interface TimelineCanvasSettings {
  /** Largeur de la composition vidéo en pixels */
  viewport_width: number;
  /** Hauteur de la composition vidéo en pixels */
  viewport_height: number;
  /** Cadence d'images par seconde de la composition */
  frame_rate_fps: number;
  /** Fréquence d'échantillonnage audio en Hz */
  audio_sample_rate_hz: number;
  /** Couleur d'arrière-plan du canevas en hexadécimal */
  background_color_hex: string;
  /** Format ou ratio d'aspect cible */
  aspect_ratio?: CanvasAspectRatio;
}

export interface KromaProject {
  /** Version du schéma de projet pour rétrocompatibilité */
  kroma_version: string;
  /** Identifiant universel unique du projet */
  project_uuid: string;
  /** Nom du projet attribué par l'utilisateur */
  project_name: string;
  /** Date de création en microsecondes UTC */
  created_timestamp_utc: number;
  /** Date de dernière modification en microsecondes UTC */
  modified_timestamp_utc: number;
  /** Paramètres de rendu du canevas */
  timeline_canvas: TimelineCanvasSettings;
  /** Catalogue normalisé des médias importés */
  asset_catalog: MediaAsset[];
  /** Séquence de montage (pistes et clips) */
  sequence: TimelineSequence;
}

export function createDefaultProject(name: string = 'Nouveau Projet Kroma'): KromaProject {
  const nowUs = Date.now() * 1000;
  return {
    kroma_version: '1.0.0',
    project_uuid: crypto.randomUUID ? crypto.randomUUID() : 'proj_' + Math.random().toString(36).substring(2, 9),
    project_name: name,
    created_timestamp_utc: nowUs,
    modified_timestamp_utc: nowUs,
    timeline_canvas: {
      viewport_width: 1920,
      viewport_height: 1080,
      aspect_ratio: '16:9',
      frame_rate_fps: 60.0,
      audio_sample_rate_hz: 48000,
      background_color_hex: '#000000',
    },
    asset_catalog: [],
    sequence: {
      total_length_us: 0,
      markers: [],
      lanes: [
        {
          lane_id: 'lane_video_1',
          lane_title: 'Piste Vidéo 1',
          lane_type: 'visual',
          stack_index: 0,
          is_muted: false,
          is_solo: false,
          is_locked: false,
          gain_level: 1.0,
          items: [],
        },
        {
          lane_id: 'lane_text_1',
          lane_title: 'Piste Titres',
          lane_type: 'text_overlay',
          stack_index: 1,
          is_muted: false,
          is_solo: false,
          is_locked: false,
          gain_level: 1.0,
          items: [],
        },
        {
          lane_id: 'lane_audio_1',
          lane_title: 'Piste Audio 1',
          lane_type: 'audio',
          stack_index: 2,
          is_muted: false,
          is_solo: false,
          is_locked: false,
          gain_level: 1.0,
          items: [],
        },
      ],
    },
  };
}


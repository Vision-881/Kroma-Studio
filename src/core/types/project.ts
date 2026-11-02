import type { MediaAsset } from './asset';
import type { TimelineSequence } from './timeline';

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
      frame_rate_fps: 60.0,
      audio_sample_rate_hz: 48000,
      background_color_hex: '#000000',
    },
    asset_catalog: [],
    sequence: {
      total_length_us: 0,
      lanes: [
        {
          lane_id: 'lane_video_1',
          lane_title: 'Piste Vidéo 1',
          lane_type: 'visual',
          stack_index: 0,
          is_muted: false,
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
          is_locked: false,
          gain_level: 1.0,
          items: [],
        },
      ],
    },
  };
}


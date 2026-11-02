export type MediaKind = 'video' | 'audio' | 'image';

export interface MediaAsset {
  /** Identifiant unique de la ressource dans le projet */
  asset_id: string;
  /** Nom du fichier affiché à l'utilisateur */
  display_name: string;
  /** Type de média */
  media_kind: MediaKind;
  /** Chemin absolu ou URI vers le fichier source */
  source_path: string;
  /** Durée du média en microsecondes (0 pour une image fixe) */
  duration_us: number;
  /** Largeur native en pixels (0 pour l'audio) */
  native_width: number;
  /** Hauteur native en pixels (0 pour l'audio) */
  native_height: number;
  /** Cadence d'images native détectée */
  detected_fps: number;
  /** Nombre de canaux audio (0 si pas de piste sonore) */
  audio_channels: number;
  /** Fréquence d'échantillonnage audio en Hz */
  audio_sample_rate_hz: number;
  /** Vignette miniature encodée en data-URL ou chemin d'accès */
  thumbnail_url?: string;
  /** Poids du fichier en octets */
  file_size_bytes?: number;
}


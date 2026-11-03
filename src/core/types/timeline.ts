export type LaneType = 'visual' | 'audio' | 'text_overlay';

export interface TimeRangeUs {
  /** Point de départ temporel en microsecondes */
  start_us: number;
  /** Durée du segment en microsecondes */
  duration_us: number;
}

export interface SpatialPlacement {
  /** Décalage horizontal par rapport au centre en pixels */
  offset_x_px: number;
  /** Décalage vertical par rapport au centre en pixels */
  offset_y_px: number;
  /** Facteur d'échelle horizontal (1.0 = 100%) */
  zoom_factor_x: number;
  /** Facteur d'échelle vertical (1.0 = 100%) */
  zoom_factor_y: number;
  /** Rotation en degrés */
  rotation_degrees: number;
  /** Opacité de 0.0 (transparent) à 1.0 (opaque) */
  opacity_ratio: number;
}

export interface TextLayerData {
  /** Chaîne textuelle affichée */
  raw_string: string;
  /** Famille de police de caractères */
  font_name: string;
  /** Taille de police en points/pixels */
  font_size_pt: number;
  /** Graisse de police */
  is_bold: boolean;
  /** Couleur hexadécimale du texte (ex: #FFFFFF) */
  fill_color_hex: string;
  /** Couleur du contour (ex: #000000) */
  outline_color_hex: string;
  /** Épaisseur du contour en pixels */
  outline_thickness_px: number;
  /** Alignement textuel */
  text_align: 'left' | 'center' | 'right';
  /** Position normalisée du centre du texte (0.0 à 1.0) */
  normalized_center: {
    x_ratio: number;
    y_ratio: number;
  };
}

export interface TimelineItem {
  /** Identifiant unique du segment sur la timeline */
  item_id: string;
  /** Référence vers l'asset_id dans le catalogue (null si calque texte généré) */
  referenced_asset_id: string | null;
  /** Position de début sur la timeline en microsecondes */
  placement_time_us: number;
  /** Durée sur la timeline en microsecondes */
  play_duration_us: number;
  /** Point d'entrée dans le média source en microsecondes */
  source_in_point_us: number;
  /** Durée découpée dans le média source en microsecondes */
  source_duration_us: number;
  /** Placement et transformation géométrique 2D */
  spatial_placement?: SpatialPlacement;
  /** Données spécifiques aux calques de texte */
  text_layer_data?: TextLayerData;
  /** Gain audio individuel du clip (1.0 = volume original) */
  item_gain: number;
  /** Durée du fondu audio d'entrée en microsecondes (0 = pas de fondu) */
  fade_in_duration_us?: number;
  /** Durée du fondu audio de sortie en microsecondes (0 = pas de fondu) */
  fade_out_duration_us?: number;
}

export interface TimelineLane {
  /** Identifiant unique de la piste */
  lane_id: string;
  /** Titre affiché de la piste */
  lane_title: string;
  /** Type de contenu supporté par la piste */
  lane_type: LaneType;
  /** Ordre d'empilement vertical (0 = bas, valeurs plus élevées = calques au-dessus) */
  stack_index: number;
  /** Piste coupée (silence) */
  is_muted: boolean;
  /** Mode solo : si actif sur au moins une piste, seules les pistes en solo sont audibles */
  is_solo?: boolean;
  /** Piste verrouillée contre les modifications */
  is_locked: boolean;
  /** Volume global de la piste (0.0 à 2.0, 1.0 = 100%) */
  gain_level: number;
  /** Liste ordonnée des clips placés sur cette piste */
  items: TimelineItem[];
}

export interface TimelineSequence {
  /** Durée totale de la timeline en microsecondes */
  total_length_us: number;
  /** Ensemble des pistes de montage */
  lanes: TimelineLane[];
}


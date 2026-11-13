/**
 * Types canoniques pour le moteur de sous-titres et légendes (Étape 18).
 * Représente les segments textuels synchronisés (cues) et leurs styles de rendu.
 */

export interface SubtitleCue {
  /** Identifiant unique du segment de sous-titre */
  cue_id: string;
  /** Début sur la timeline en microsecondes */
  start_time_us: number;
  /** Fin sur la timeline en microsecondes */
  end_time_us: number;
  /** Contenu textuel (supporte les retours à la ligne) */
  text: string;
  /** Numéro d'index séquentiel (ex: 1, 2, 3...) */
  index?: number;
}

export interface SubtitleStyle {
  /** Famille de police de caractères (ex: 'Inter', 'Roboto', 'Arial') */
  font_name: string;
  /** Taille de la police en points */
  font_size_pt: number;
  /** Style en gras */
  is_bold: boolean;
  /** Couleur hexadécimale du texte (ex: '#FFFFFF') */
  fill_color_hex: string;
  /** Couleur hexadécimale du contour (ex: '#000000') */
  outline_color_hex: string;
  /** Épaisseur du contour en pixels */
  outline_thickness_px: number;
  /** Présence d'un fond rectangulaire semi-transparent sous le texte */
  has_background_box: boolean;
  /** Couleur hexadécimale ou RGBA du fond */
  background_color_rgba: string;
  /** Position verticale normalisée (0.0 = haut, 1.0 = bas, défaut : 0.88) */
  position_y_ratio: number;
  /** Alignement horizontal du texte */
  text_align: 'center' | 'left' | 'right';
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  font_name: 'Inter, sans-serif',
  font_size_pt: 24,
  is_bold: true,
  fill_color_hex: '#FFFFFF',
  outline_color_hex: '#000000',
  outline_thickness_px: 2,
  has_background_box: true,
  background_color_rgba: 'rgba(0, 0, 0, 0.75)',
  position_y_ratio: 0.88,
  text_align: 'center',
};

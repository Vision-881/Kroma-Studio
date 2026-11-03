/**
 * Moteur de lecture et de composition d'aperçu Kroma.
 * Calcule les éléments actifs à un instant T et gère la synchronisation temporelle
 * multi-couches entre la timeline et les flux médias.
 */
import type { TimelineSequence, TimelineItem } from '../types/timeline';
import type { MediaAsset } from '../types/asset';

export interface ActiveVisualItem {
  item: TimelineItem;
  asset: MediaAsset | null;
  laneId: string;
  stackIndex: number;
  sourceTimeUs: number;
  effectiveGain: number;
  isMuted: boolean;
}

export interface ActiveAudioItem {
  item: TimelineItem;
  asset: MediaAsset | null;
  laneId: string;
  sourceTimeUs: number;
  effectiveGain: number;
  isMuted: boolean;
}

export interface ActivePlaybackState {
  visualItems: ActiveVisualItem[];
  audioItems: ActiveAudioItem[];
}

/**
 * Calcule le coefficient d'atténuation d'un fondu audio (Fade In et/ou Fade Out)
 * pour un instant relatif donné à l'intérieur d'un clip.
 * Retourne une valeur flottante entre 0.0 (silence) et 1.0 (plein volume).
 *
 * @param offsetUs Décalage temporel depuis le début du clip en microsecondes
 * @param durationUs Durée totale de lecture du clip en microsecondes
 * @param fadeInUs Durée du fondu d'entrée en microsecondes (0 si aucun)
 * @param fadeOutUs Durée du fondu de sortie en microsecondes (0 si aucun)
 */
export function calculateFadeGain(
  offsetUs: number,
  durationUs: number,
  fadeInUs: number = 0,
  fadeOutUs: number = 0,
): number {
  if (offsetUs < 0 || offsetUs > durationUs || durationUs <= 0) return 0;

  let factor = 1.0;

  // Fondu d'entrée (rampe de 0.0 à 1.0)
  if (fadeInUs > 0 && offsetUs < fadeInUs) {
    factor *= Math.max(0, Math.min(1.0, offsetUs / fadeInUs));
  }

  // Fondu de sortie (rampe de 1.0 à 0.0)
  const remainingUs = durationUs - offsetUs;
  if (fadeOutUs > 0 && remainingUs < fadeOutUs) {
    factor *= Math.max(0, Math.min(1.0, remainingUs / fadeOutUs));
  }

  return factor;
}

/**
 * Calcule le temps source en microsecondes à l'intérieur du fichier d'origine
 * pour un instant donné sur la timeline.
 */
export function calculateSourceTimeUs(item: TimelineItem, timelineTimeUs: number): number {
  const offsetFromStartUs = timelineTimeUs - item.placement_time_us;
  return item.source_in_point_us + Math.max(0, offsetFromStartUs);
}

/**
 * Détermine tous les clips visuels et audios actifs à un instant précis de la timeline,
 * en appliquant le mixage de volume (gain de clip, gain de piste, fondu et règles de Solo/Mute).
 */
export function getActiveItemsAtTime(
  sequence: TimelineSequence,
  assetCatalog: MediaAsset[],
  timelineTimeUs: number,
): ActivePlaybackState {
  const visualItems: ActiveVisualItem[] = [];
  const audioItems: ActiveAudioItem[] = [];

  // Vérifier si au moins une piste a le mode Solo activé
  const hasSoloLane = sequence.lanes.some((l) => Boolean(l.is_solo));

  for (const lane of sequence.lanes) {
    // Une piste est audible si :
    // - Pas de mode Solo dans le projet ET la piste n'est pas Mute
    // - OU le mode Solo est actif ET cette piste est Solo ET pas Mute
    const isLaneAudible = hasSoloLane
      ? Boolean(lane.is_solo) && !lane.is_muted
      : !lane.is_muted;

    for (const item of lane.items) {
      const startUs = item.placement_time_us;
      const endUs = item.placement_time_us + item.play_duration_us;

      // Le clip est actif si la tête de lecture est comprise dans son intervalle
      if (timelineTimeUs >= startUs && timelineTimeUs < endUs) {
        const sourceTimeUs = calculateSourceTimeUs(item, timelineTimeUs);
        const asset = item.referenced_asset_id
          ? assetCatalog.find((a) => a.asset_id === item.referenced_asset_id) || null
          : null;

        // Calcul de l'atténuation du fondu audio (Fade in / Fade out)
        const offsetInItemUs = timelineTimeUs - startUs;
        const fadeGain = calculateFadeGain(
          offsetInItemUs,
          item.play_duration_us,
          item.fade_in_duration_us,
          item.fade_out_duration_us,
        );

        // Mixage : gain clip × gain piste × atténuation fondu (0 si piste muette ou masquée par Solo)
        const laneGain = lane.gain_level ?? 1.0;
        const clipGain = item.item_gain ?? 1.0;
        const effectiveGain = isLaneAudible ? clipGain * laneGain * fadeGain : 0;

        if (lane.lane_type === 'visual' || lane.lane_type === 'text_overlay') {
          visualItems.push({
            item,
            asset,
            laneId: lane.lane_id,
            stackIndex: lane.stack_index,
            sourceTimeUs,
            effectiveGain,
            isMuted: !isLaneAudible,
          });
        } else if (lane.lane_type === 'audio') {
          audioItems.push({
            item,
            asset,
            laneId: lane.lane_id,
            sourceTimeUs,
            effectiveGain,
            isMuted: !isLaneAudible,
          });
        }
      }
    }
  }

  // Trier les éléments visuels par ordre d'empilement (du bas vers le haut)
  visualItems.sort((a, b) => a.stackIndex - b.stackIndex);

  return { visualItems, audioItems };
}

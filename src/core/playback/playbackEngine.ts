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
 * Calcule le temps source en microsecondes à l'intérieur du fichier d'origine
 * pour un instant donné sur la timeline.
 */
export function calculateSourceTimeUs(item: TimelineItem, timelineTimeUs: number): number {
  const offsetFromStartUs = timelineTimeUs - item.placement_time_us;
  return item.source_in_point_us + Math.max(0, offsetFromStartUs);
}

/**
 * Détermine tous les clips visuels et audios actifs à un instant précis de la timeline.
 */
export function getActiveItemsAtTime(
  sequence: TimelineSequence,
  assetCatalog: MediaAsset[],
  timelineTimeUs: number,
): ActivePlaybackState {
  const visualItems: ActiveVisualItem[] = [];
  const audioItems: ActiveAudioItem[] = [];

  for (const lane of sequence.lanes) {
    for (const item of lane.items) {
      const startUs = item.placement_time_us;
      const endUs = item.placement_time_us + item.play_duration_us;

      // Le clip est actif si la tête de lecture est comprise dans son intervalle
      if (timelineTimeUs >= startUs && timelineTimeUs < endUs) {
        const sourceTimeUs = calculateSourceTimeUs(item, timelineTimeUs);
        const asset = item.referenced_asset_id
          ? assetCatalog.find((a) => a.asset_id === item.referenced_asset_id) || null
          : null;

        const effectiveGain = lane.is_muted
          ? 0
          : (item.item_gain ?? 1.0) * (lane.gain_level ?? 1.0);

        if (lane.lane_type === 'visual' || lane.lane_type === 'text_overlay') {
          visualItems.push({
            item,
            asset,
            laneId: lane.lane_id,
            stackIndex: lane.stack_index,
            sourceTimeUs,
            effectiveGain,
            isMuted: lane.is_muted,
          });
        } else if (lane.lane_type === 'audio') {
          audioItems.push({
            item,
            asset,
            laneId: lane.lane_id,
            sourceTimeUs,
            effectiveGain,
            isMuted: lane.is_muted,
          });
        }
      }
    }
  }

  // Trier les éléments visuels par ordre d'empilement (du bas vers le haut)
  visualItems.sort((a, b) => a.stackIndex - b.stackIndex);

  return { visualItems, audioItems };
}

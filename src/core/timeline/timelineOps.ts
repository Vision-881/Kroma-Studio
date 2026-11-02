/**
 * Utilitaires et opérations de manipulation de la Timeline Kroma.
 * Toutes les durées et positions sont exprimées en microsecondes entières.
 */
import type { TimelineSequence, TimelineItem, LaneType } from '../types/timeline';
import type { MediaAsset } from '../types/asset';

/**
 * Recalcule la durée totale de la séquence en microsecondes.
 * La durée totale correspond à l'extrémité la plus éloignée parmi tous les clips.
 */
export function calculateSequenceDurationUs(sequence: TimelineSequence): number {
  let maxEndUs = 0;
  for (const lane of sequence.lanes) {
    for (const item of lane.items) {
      const itemEndUs = item.placement_time_us + item.play_duration_us;
      if (itemEndUs > maxEndUs) {
        maxEndUs = itemEndUs;
      }
    }
  }
  return maxEndUs;
}

/**
 * Crée un nouvel élément de timeline à partir d'un MediaAsset.
 */
export function createItemFromAsset(
  asset: MediaAsset,
  placementTimeUs: number = 0,
): TimelineItem {
  // Pour une image fixe, durée par défaut de 5 secondes (5 000 000 us)
  const defaultDurationUs = asset.media_kind === 'image' 
    ? 5_000_000 
    : (asset.duration_us > 0 ? asset.duration_us : 5_000_000);

  const itemId = 'item_' + Math.random().toString(36).substring(2, 9);

  return {
    item_id: itemId,
    referenced_asset_id: asset.asset_id,
    placement_time_us: Math.max(0, Math.round(placementTimeUs)),
    play_duration_us: defaultDurationUs,
    source_in_point_us: 0,
    source_duration_us: defaultDurationUs,
    item_gain: 1.0,
    spatial_placement: {
      offset_x_px: 0,
      offset_y_px: 0,
      zoom_factor_x: 1.0,
      zoom_factor_y: 1.0,
      rotation_degrees: 0,
      opacity_ratio: 1.0,
    },
  };
}

/**
 * Détermine le type de piste cible recommandé pour un type de média.
 */
export function getRecommendedLaneType(mediaKind: MediaAsset['media_kind']): LaneType {
  if (mediaKind === 'audio') return 'audio';
  return 'visual';
}

/**
 * Ajoute un clip sur une piste spécifique et met à jour la durée totale.
 */
export function addItemToLane(
  sequence: TimelineSequence,
  laneId: string,
  item: TimelineItem,
): TimelineSequence {
  const lanes = sequence.lanes.map((lane) => {
    if (lane.lane_id !== laneId) return lane;
    const newItems = [...lane.items, item].sort(
      (a, b) => a.placement_time_us - b.placement_time_us,
    );
    return { ...lane, items: newItems };
  });

  const updatedSequence = { ...sequence, lanes };
  return {
    ...updatedSequence,
    total_length_us: calculateSequenceDurationUs(updatedSequence),
  };
}

/**
 * Supprime un clip de la séquence par son identifiant.
 */
export function removeItemFromSequence(
  sequence: TimelineSequence,
  itemId: string,
): TimelineSequence {
  const lanes = sequence.lanes.map((lane) => ({
    ...lane,
    items: lane.items.filter((item) => item.item_id !== itemId),
  }));

  const updatedSequence = { ...sequence, lanes };
  return {
    ...updatedSequence,
    total_length_us: calculateSequenceDurationUs(updatedSequence),
  };
}

/**
 * Déplace un clip vers une nouvelle position temporelle et éventuellement vers une autre piste.
 */
export function moveItemInSequence(
  sequence: TimelineSequence,
  itemId: string,
  targetLaneId: string,
  newPlacementTimeUs: number,
): TimelineSequence {
  let itemToMove: TimelineItem | null = null;

  // Extraire l'élément de sa piste d'origine
  const lanesWithoutItem = sequence.lanes.map((lane) => {
    const found = lane.items.find((i) => i.item_id === itemId);
    if (found) {
      itemToMove = {
        ...found,
        placement_time_us: Math.max(0, Math.round(newPlacementTimeUs)),
      };
      return {
        ...lane,
        items: lane.items.filter((i) => i.item_id !== itemId),
      };
    }
    return lane;
  });

  if (!itemToMove) return sequence;

  // Insérer l'élément dans la piste cible
  const updatedLanes = lanesWithoutItem.map((lane) => {
    if (lane.lane_id !== targetLaneId) return lane;
    const newItems = [...lane.items, itemToMove!].sort(
      (a, b) => a.placement_time_us - b.placement_time_us,
    );
    return { ...lane, items: newItems };
  });

  const updatedSequence = { ...sequence, lanes: updatedLanes };
  return {
    ...updatedSequence,
    total_length_us: calculateSequenceDurationUs(updatedSequence),
  };
}

/**
 * Scission (Split) d'un clip en deux segments au temps de coupe donné.
 * Si la coupe ne tombe pas strictement à l'intérieur du clip, la séquence reste inchangée.
 */
export function splitItemInSequence(
  sequence: TimelineSequence,
  itemId: string,
  splitTimeUs: number,
): TimelineSequence {
  let didSplit = false;

  const lanes = sequence.lanes.map((lane) => {
    const itemIndex = lane.items.findIndex((i) => i.item_id === itemId);
    if (itemIndex === -1) return lane;

    const original = lane.items[itemIndex];
    const itemStartUs = original.placement_time_us;
    const itemEndUs = original.placement_time_us + original.play_duration_us;

    // Vérifie que le point de coupe est strictement à l'intérieur du segment
    if (splitTimeUs <= itemStartUs || splitTimeUs >= itemEndUs) {
      return lane;
    }

    const firstSegmentDurationUs = splitTimeUs - itemStartUs;
    const secondSegmentDurationUs = itemEndUs - splitTimeUs;

    const firstItem: TimelineItem = {
      ...original,
      play_duration_us: firstSegmentDurationUs,
      source_duration_us: firstSegmentDurationUs,
    };

    const secondItem: TimelineItem = {
      ...original,
      item_id: 'item_' + Math.random().toString(36).substring(2, 9),
      placement_time_us: splitTimeUs,
      play_duration_us: secondSegmentDurationUs,
      source_in_point_us: original.source_in_point_us + firstSegmentDurationUs,
      source_duration_us: secondSegmentDurationUs,
    };

    const newItems = [...lane.items];
    newItems.splice(itemIndex, 1, firstItem, secondItem);
    didSplit = true;

    return { ...lane, items: newItems };
  });

  if (!didSplit) return sequence;

  const updatedSequence = { ...sequence, lanes };
  return {
    ...updatedSequence,
    total_length_us: calculateSequenceDurationUs(updatedSequence),
  };
}

/**
 * Ajuste les extrémités (Trim) d'un segment sur la timeline.
 * - handle 'start' : ajuste le point d'entrée temporel et rogne le début du média.
 * - handle 'end' : ajuste la durée de fin du segment.
 */
export function trimItemInSequence(
  sequence: TimelineSequence,
  itemId: string,
  handle: 'start' | 'end',
  deltaUs: number,
  maxSourceDurationUs?: number,
): TimelineSequence {
  const lanes = sequence.lanes.map((lane) => {
    const itemIndex = lane.items.findIndex((i) => i.item_id === itemId);
    if (itemIndex === -1) return lane;

    const original = lane.items[itemIndex];
    const minDurationUs = 100_000; // Durée minimale de 0.1s pour un clip

    let updatedItem: TimelineItem;

    if (handle === 'start') {
      // Déplacement du point de début
      // deltaUs positif = raccourcit par la gauche (avance le début)
      // deltaUs négatif = allonge vers la gauche (recule le début)
      let actualDelta = deltaUs;

      // Limite : ne peut pas reculer avant 0 dans le fichier source
      if (original.source_in_point_us + actualDelta < 0) {
        actualDelta = -original.source_in_point_us;
      }

      // Limite : durée restante minimale
      if (original.play_duration_us - actualDelta < minDurationUs) {
        actualDelta = original.play_duration_us - minDurationUs;
      }

      // Limite : placement_time ne peut pas être négatif
      if (original.placement_time_us + actualDelta < 0) {
        actualDelta = -original.placement_time_us;
      }

      const newPlacement = original.placement_time_us + actualDelta;
      const newDuration = original.play_duration_us - actualDelta;
      const newSourceIn = original.source_in_point_us + actualDelta;

      updatedItem = {
        ...original,
        placement_time_us: newPlacement,
        play_duration_us: newDuration,
        source_in_point_us: newSourceIn,
        source_duration_us: newDuration,
      };
    } else {
      // handle === 'end' : déplacement de la fin
      let newDuration = original.play_duration_us + deltaUs;
      if (newDuration < minDurationUs) {
        newDuration = minDurationUs;
      }

      // Limite par rapport à la durée source max disponible si fournie
      if (maxSourceDurationUs !== undefined) {
        const availableSource = maxSourceDurationUs - original.source_in_point_us;
        if (newDuration > availableSource) {
          newDuration = availableSource;
        }
      }

      updatedItem = {
        ...original,
        play_duration_us: newDuration,
        source_duration_us: newDuration,
      };
    }

    const newItems = [...lane.items];
    newItems[itemIndex] = updatedItem;
    return { ...lane, items: newItems };
  });

  const updatedSequence = { ...sequence, lanes };
  return {
    ...updatedSequence,
    total_length_us: calculateSequenceDurationUs(updatedSequence),
  };
}

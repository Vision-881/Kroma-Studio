/**
 * Moteur d'interpolation et d'évaluation des images-clés (Keyframing) — Kroma Studio.
 * Supporte l'interpolation linéaire, ease-in, ease-out, ease-in-out et hold
 * sur les transformations géométriques 2D (Position X/Y, Échelle, Rotation, Opacité).
 */
import type {
  TimelineItem,
  SpatialPlacement,
  Keyframe,
  KeyframeInterpolation,
} from '../types/timeline';

/**
 * Applique une fonction d'atténuation temporelle (easing) à un ratio t in [0, 1].
 */
export function applyEasing(t: number, type: KeyframeInterpolation = 'linear'): number {
  const clamped = Math.max(0, Math.min(1, t));

  switch (type) {
    case 'linear':
      return clamped;
    case 'ease_in':
      return clamped * clamped;
    case 'ease_out':
      return clamped * (2 - clamped);
    case 'ease_in_out':
      return clamped < 0.5
        ? 2 * clamped * clamped
        : -1 + (4 - 2 * clamped) * clamped;
    case 'hold':
      return clamped >= 1.0 ? 1.0 : 0.0;
    default:
      return clamped;
  }
}

/**
 * Évalue la valeur interpolée d'une propriété à un instant relatif (timeOffsetUs)
 * à partir d'une liste ordonnée d'images-clés.
 */
export function interpolateKeyframeValue(
  keyframes: Keyframe<number>[] | undefined,
  timeOffsetUs: number,
  defaultValue: number,
): number {
  if (!keyframes || keyframes.length === 0) {
    return defaultValue;
  }

  // Si une seule image-clé, sa valeur prévaut
  if (keyframes.length === 1) {
    return keyframes[0].value;
  }

  // Avant la première image-clé : valeur bloquée sur la première
  if (timeOffsetUs <= keyframes[0].time_offset_us) {
    return keyframes[0].value;
  }

  // Après la dernière image-clé : valeur bloquée sur la dernière
  const lastIndex = keyframes.length - 1;
  if (timeOffsetUs >= keyframes[lastIndex].time_offset_us) {
    return keyframes[lastIndex].value;
  }

  // Recherche de l'intervalle encadrant [k1, k2]
  for (let i = 0; i < lastIndex; i++) {
    const k1 = keyframes[i];
    const k2 = keyframes[i + 1];

    if (timeOffsetUs >= k1.time_offset_us && timeOffsetUs <= k2.time_offset_us) {
      const dt = k2.time_offset_us - k1.time_offset_us;
      if (dt <= 0) return k2.value;

      const progress = (timeOffsetUs - k1.time_offset_us) / dt;
      const eased = applyEasing(progress, k1.interpolation || 'linear');
      return k1.value + (k2.value - k1.value) * eased;
    }
  }

  return keyframes[lastIndex].value;
}

/**
 * Calcule l'état spatial complet et résolu d'un clip à un instant précis de la timeline,
 * en combinant le placement de base et les images-clés d'animation actives.
 */
export function getInterpolatedPlacement(
  item: TimelineItem,
  timelineTimeUs: number,
): SpatialPlacement {
  const base: SpatialPlacement = {
    offset_x_px: item.spatial_placement?.offset_x_px ?? 0,
    offset_y_px: item.spatial_placement?.offset_y_px ?? 0,
    zoom_factor_x: item.spatial_placement?.zoom_factor_x ?? 1.0,
    zoom_factor_y: item.spatial_placement?.zoom_factor_y ?? 1.0,
    rotation_degrees: item.spatial_placement?.rotation_degrees ?? 0,
    opacity_ratio: item.spatial_placement?.opacity_ratio ?? 1.0,
    flip_horizontal: item.spatial_placement?.flip_horizontal ?? false,
    flip_vertical: item.spatial_placement?.flip_vertical ?? false,
  };

  const keyframes = item.keyframes;
  if (!keyframes) {
    return base;
  }

  const offsetUs = timelineTimeUs - item.placement_time_us;

  const result: SpatialPlacement = { ...base };

  if (keyframes.position_x && keyframes.position_x.length > 0) {
    result.offset_x_px = interpolateKeyframeValue(keyframes.position_x, offsetUs, base.offset_x_px);
  }

  if (keyframes.position_y && keyframes.position_y.length > 0) {
    result.offset_y_px = interpolateKeyframeValue(keyframes.position_y, offsetUs, base.offset_y_px);
  }

  if (keyframes.scale && keyframes.scale.length > 0) {
    let scaleVal = interpolateKeyframeValue(keyframes.scale, offsetUs, base.zoom_factor_x);
    // Sanity check de robustesse : si une valeur a été enregistrée en pourcent (> 10 au lieu d'un facteur 1.0)
    if (scaleVal > 10) {
      scaleVal = scaleVal / 100;
    }
    result.zoom_factor_x = scaleVal;
    result.zoom_factor_y = scaleVal;
  }

  if (keyframes.rotation && keyframes.rotation.length > 0) {
    result.rotation_degrees = interpolateKeyframeValue(keyframes.rotation, offsetUs, base.rotation_degrees);
  }

  if (keyframes.opacity && keyframes.opacity.length > 0) {
    let opacityVal = interpolateKeyframeValue(keyframes.opacity, offsetUs, base.opacity_ratio);
    if (opacityVal > 1.0) {
      opacityVal = opacityVal / 100;
    }
    result.opacity_ratio = Math.max(0, Math.min(1.0, opacityVal));
  }

  return result;
}

/**
 * Insère ou met à jour une image-clé dans une liste ordonnée.
 * Si une image-clé existe déjà dans la tolérance temporelle (par défaut 20 ms / 20 000 us),
 * sa valeur et son interpolation sont mises à jour sur place.
 */
export function addOrUpdateKeyframe(
  list: Keyframe<number>[] | undefined,
  timeOffsetUs: number,
  value: number,
  interpolation: KeyframeInterpolation = 'linear',
  toleranceUs: number = 20_000,
): Keyframe<number>[] {
  const currentList = list ? [...list] : [];
  const roundedOffset = Math.max(0, Math.round(timeOffsetUs));

  const existingIndex = currentList.findIndex(
    (kf) => Math.abs(kf.time_offset_us - roundedOffset) <= toleranceUs,
  );

  if (existingIndex >= 0) {
    currentList[existingIndex] = {
      ...currentList[existingIndex],
      time_offset_us: roundedOffset,
      value,
      interpolation,
    };
  } else {
    const newKf: Keyframe<number> = {
      id: `kf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      time_offset_us: roundedOffset,
      value,
      interpolation,
    };
    currentList.push(newKf);
  }

  // Tri ascendant par time_offset_us
  currentList.sort((a, b) => a.time_offset_us - b.time_offset_us);
  return currentList;
}

/**
 * Retire une image-clé par son identifiant unique.
 */
export function removeKeyframe(
  list: Keyframe<number>[] | undefined,
  keyframeId: string,
): Keyframe<number>[] {
  if (!list) return [];
  return list.filter((kf) => kf.id !== keyframeId);
}

/**
 * Déplace une ou plusieurs images-clés vers un nouvel offset temporel en conservant
 * leur identifiant unique, leur valeur et leur type d'interpolation.
 * Re-trie la liste chronologiquement.
 */
export function moveKeyframesInList(
  list: Keyframe<number>[] | undefined,
  targetIds: string[],
  newOffsetUs: number,
): Keyframe<number>[] {
  if (!list || list.length === 0) return [];
  const idSet = new Set(targetIds);
  const roundedOffset = Math.max(0, Math.round(newOffsetUs));
  const updated = list.map((kf) => {
    if (idSet.has(kf.id)) {
      return {
        ...kf,
        time_offset_us: roundedOffset,
      };
    }
    return kf;
  });
  return updated.sort((a, b) => a.time_offset_us - b.time_offset_us);
}

/**
 * Recherche une image-clé proche d'un offset temporel donné.
 */
export function findKeyframeNear(
  list: Keyframe<number>[] | undefined,
  timeOffsetUs: number,
  toleranceUs: number = 40_000,
): Keyframe<number> | undefined {
  if (!list || list.length === 0) return undefined;
  return list.find((kf) => Math.abs(kf.time_offset_us - timeOffsetUs) <= toleranceUs);
}

/**
 * Vérifie si un clip possède au moins une image-clé sur l'une de ses propriétés.
 */
export function hasKeyframes(item: TimelineItem): boolean {
  if (!item.keyframes) return false;
  return Object.values(item.keyframes).some((list) => Array.isArray(list) && list.length > 0);
}

/**
 * Retourne la liste unique et triée de tous les décalages d'images-clés présents sur le clip.
 */
export function getAllKeyframeOffsets(item: TimelineItem): number[] {
  if (!item.keyframes) return [];
  const set = new Set<number>();
  for (const list of Object.values(item.keyframes)) {
    if (Array.isArray(list)) {
      for (const kf of list) {
        set.add(kf.time_offset_us);
      }
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

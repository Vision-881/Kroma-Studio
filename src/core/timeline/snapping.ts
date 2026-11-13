/**
 * Moteur d'Aimantation Temporelle Intelligente (Smart Snapping) — Kroma Studio (Étape 17).
 * Permet d'aimanter magnétiquement la tête de lecture, les bords de clips et le rognage
 * sur les repères clés (tête de lecture, coupes de clips, marqueurs et début de timeline).
 */
import type { KromaProject } from '../types/project';

export interface SnapTarget {
  time_us: number;
  kind: 'playhead' | 'clip_start' | 'clip_end' | 'marker' | 'origin';
  description?: string;
}

export interface SnapResult {
  /** Le temps calé / aimanté */
  snapped_time_us: number;
  /** La cible d'aimantation */
  target_time_us: number;
  /** Écart temporel en microsecondes */
  delta_us: number;
  /** Nature de la cible */
  kind: SnapTarget['kind'];
  /** Description de la cible */
  description?: string;
}

/**
 * Priorité relative des types de cibles en cas de distance équivalente
 */
const KIND_PRIORITY: Record<SnapTarget['kind'], number> = {
  playhead: 5,
  marker: 4,
  clip_start: 3,
  clip_end: 3,
  origin: 2,
};

/**
 * Trouve la cible d'aimantation la plus proche d'un temps donné dans la limite du seuil (thresholdUs).
 */
export function findNearestSnap(
  candidateTimeUs: number,
  targets: SnapTarget[],
  thresholdUs: number,
): SnapResult | null {
  if (thresholdUs <= 0 || targets.length === 0) {
    return null;
  }

  let bestMatch: SnapResult | null = null;
  let minAbsDist = Infinity;

  for (const target of targets) {
    const dist = Math.abs(candidateTimeUs - target.time_us);
    if (dist <= thresholdUs) {
      if (dist < minAbsDist) {
        minAbsDist = dist;
        bestMatch = {
          snapped_time_us: target.time_us,
          target_time_us: target.time_us,
          delta_us: target.time_us - candidateTimeUs,
          kind: target.kind,
          description: target.description,
        };
      } else if (dist === minAbsDist && bestMatch) {
        // En cas d'égalité stricte, départager par priorité de type
        if (KIND_PRIORITY[target.kind] > KIND_PRIORITY[bestMatch.kind]) {
          bestMatch = {
            snapped_time_us: target.time_us,
            target_time_us: target.time_us,
            delta_us: target.time_us - candidateTimeUs,
            kind: target.kind,
            description: target.description,
          };
        }
      }
    }
  }

  return bestMatch;
}

export interface CollectSnapTargetsOptions {
  excludeItemId?: string;
  playheadTimeUs?: number;
  includeOrigin?: boolean;
}

/**
 * Récolte l'ensemble des cibles d'aimantation valides sur la timeline :
 * - Début de la timeline (0 us)
 * - Tête de lecture active
 * - Marqueurs temporels
 * - Points d'entrée (starts) et de sortie (ends) de tous les clips des pistes
 */
export function collectSnapTargets(
  project: KromaProject,
  options: CollectSnapTargetsOptions = {},
): SnapTarget[] {
  const targets: SnapTarget[] = [];
  const { excludeItemId, playheadTimeUs, includeOrigin = true } = options;

  // 1. Origine de la timeline (0s)
  if (includeOrigin) {
    targets.push({
      time_us: 0,
      kind: 'origin',
      description: 'Début de timeline',
    });
  }

  // 2. Tête de lecture
  if (typeof playheadTimeUs === 'number' && playheadTimeUs >= 0) {
    targets.push({
      time_us: playheadTimeUs,
      kind: 'playhead',
      description: 'Tête de lecture',
    });
  }

  // 3. Marqueurs temporels
  const markers = project.sequence.markers || [];
  for (const marker of markers) {
    targets.push({
      time_us: marker.time_us,
      kind: 'marker',
      description: marker.label ? `Marqueur: ${marker.label}` : 'Marqueur',
    });
  }

  // 4. Bords de clips
  const lanes = project.sequence.lanes || [];
  for (const lane of lanes) {
    for (const item of lane.items) {
      if (excludeItemId && item.item_id === excludeItemId) {
        continue;
      }

      targets.push({
        time_us: item.placement_time_us,
        kind: 'clip_start',
        description: `Début clip (${lane.lane_title})`,
      });

      const endUs = item.placement_time_us + item.play_duration_us;
      targets.push({
        time_us: endUs,
        kind: 'clip_end',
        description: `Fin clip (${lane.lane_title})`,
      });
    }
  }

  return targets;
}

export interface ClipSnapResult {
  /** Nouveau placement_time_us ajusté */
  placementUs: number;
  /** Coordonnée temporelle de la ligne repère à tracer en surimpression */
  snapLineUs: number;
  /** Détails de l'aimantation */
  snapResult: SnapResult;
}

/**
 * Calcule l'aimantation d'un clip lors de son déplacement interactif :
 * Teste si le début (placement) ou la fin (placement + durée) s'aimante sur une cible.
 */
export function snapClipMovement(
  candidatePlacementUs: number,
  clipDurationUs: number,
  targets: SnapTarget[],
  thresholdUs: number,
): ClipSnapResult | null {
  if (thresholdUs <= 0) return null;

  // Test 1 : Aimantation du bord gauche (début du clip)
  const startSnap = findNearestSnap(candidatePlacementUs, targets, thresholdUs);

  // Test 2 : Aimantation du bord droit (fin du clip)
  const candidateEndUs = candidatePlacementUs + clipDurationUs;
  const endSnap = findNearestSnap(candidateEndUs, targets, thresholdUs);

  if (startSnap && endSnap) {
    // Si les deux s'aimantent, retenir le plus proche
    if (Math.abs(startSnap.delta_us) <= Math.abs(endSnap.delta_us)) {
      return {
        placementUs: Math.max(0, startSnap.snapped_time_us),
        snapLineUs: startSnap.snapped_time_us,
        snapResult: startSnap,
      };
    } else {
      const placementFromEnd = Math.max(0, endSnap.snapped_time_us - clipDurationUs);
      return {
        placementUs: placementFromEnd,
        snapLineUs: endSnap.snapped_time_us,
        snapResult: endSnap,
      };
    }
  }

  if (startSnap) {
    return {
      placementUs: Math.max(0, startSnap.snapped_time_us),
      snapLineUs: startSnap.snapped_time_us,
      snapResult: startSnap,
    };
  }

  if (endSnap) {
    const placementFromEnd = Math.max(0, endSnap.snapped_time_us - clipDurationUs);
    return {
      placementUs: placementFromEnd,
      snapLineUs: endSnap.snapped_time_us,
      snapResult: endSnap,
    };
  }

  return null;
}

import { describe, it, expect } from 'vitest';
import {
  applyEasing,
  interpolateKeyframeValue,
  getInterpolatedPlacement,
  addOrUpdateKeyframe,
  removeKeyframe,
  moveKeyframesInList,
  findKeyframeNear,
  hasKeyframes,
  getAllKeyframeOffsets,
} from './keyframeInterpolation';
import type { TimelineItem, Keyframe } from '../types/timeline';

describe('keyframeInterpolation (Étape 14 — Keyframing)', () => {
  describe('applyEasing()', () => {
    it('applique correctement le lissage linéaire', () => {
      expect(applyEasing(0, 'linear')).toBe(0);
      expect(applyEasing(0.5, 'linear')).toBe(0.5);
      expect(applyEasing(1, 'linear')).toBe(1);
    });

    it('borne les valeurs en dehors de [0, 1]', () => {
      expect(applyEasing(-0.5, 'linear')).toBe(0);
      expect(applyEasing(1.5, 'linear')).toBe(1);
    });

    it('calcule ease_in et ease_out', () => {
      expect(applyEasing(0.5, 'ease_in')).toBeCloseTo(0.25);
      expect(applyEasing(0.5, 'ease_out')).toBeCloseTo(0.75);
    });

    it('calcule ease_in_out et hold', () => {
      expect(applyEasing(0.5, 'ease_in_out')).toBeCloseTo(0.5);
      expect(applyEasing(0.25, 'ease_in_out')).toBeCloseTo(0.125);
      expect(applyEasing(0.75, 'ease_in_out')).toBeCloseTo(0.875);

      expect(applyEasing(0.99, 'hold')).toBe(0);
      expect(applyEasing(1.0, 'hold')).toBe(1);
    });
  });

  describe('interpolateKeyframeValue()', () => {
    it('retourne defaultValue si la liste est vide ou indéfinie', () => {
      expect(interpolateKeyframeValue(undefined, 500_000, 10)).toBe(10);
      expect(interpolateKeyframeValue([], 500_000, 42)).toBe(42);
    });

    it('retourne la valeur unique si une seule image-clé est présente', () => {
      const singleKf: Keyframe<number>[] = [
        { id: '1', time_offset_us: 1_000_000, value: 50, interpolation: 'linear' },
      ];
      expect(interpolateKeyframeValue(singleKf, 0, 0)).toBe(50);
      expect(interpolateKeyframeValue(singleKf, 2_000_000, 0)).toBe(50);
    });

    it('maintient les valeurs aux bornes (clamp)', () => {
      const kfs: Keyframe<number>[] = [
        { id: '1', time_offset_us: 1_000_000, value: 10, interpolation: 'linear' },
        { id: '2', time_offset_us: 3_000_000, value: 30, interpolation: 'linear' },
      ];
      expect(interpolateKeyframeValue(kfs, 500_000, 0)).toBe(10);
      expect(interpolateKeyframeValue(kfs, 4_000_000, 0)).toBe(30);
    });

    it('interpole linéairement entre deux points', () => {
      const kfs: Keyframe<number>[] = [
        { id: '1', time_offset_us: 1_000_000, value: 100, interpolation: 'linear' },
        { id: '2', time_offset_us: 2_000_000, value: 200, interpolation: 'linear' },
      ];
      expect(interpolateKeyframeValue(kfs, 1_500_000, 0)).toBe(150);
      expect(interpolateKeyframeValue(kfs, 1_250_000, 0)).toBe(125);
    });

    it('interpole avec ease_in et ease_out', () => {
      const kfsEaseIn: Keyframe<number>[] = [
        { id: '1', time_offset_us: 0, value: 0, interpolation: 'ease_in' },
        { id: '2', time_offset_us: 1_000_000, value: 100, interpolation: 'linear' },
      ];
      // à 0.5s, progression = 0.5^2 = 0.25 => valeur = 25
      expect(interpolateKeyframeValue(kfsEaseIn, 500_000, 0)).toBeCloseTo(25);

      const kfsEaseOut: Keyframe<number>[] = [
        { id: '1', time_offset_us: 0, value: 0, interpolation: 'ease_out' },
        { id: '2', time_offset_us: 1_000_000, value: 100, interpolation: 'linear' },
      ];
      // à 0.5s, progression = 0.5*(2-0.5) = 0.75 => valeur = 75
      expect(interpolateKeyframeValue(kfsEaseOut, 500_000, 0)).toBeCloseTo(75);
    });

    it('gère une trajectoire multi-segments', () => {
      const trajectory: Keyframe<number>[] = [
        { id: '1', time_offset_us: 0, value: 0, interpolation: 'linear' },
        { id: '2', time_offset_us: 1_000_000, value: 100, interpolation: 'linear' },
        { id: '3', time_offset_us: 2_000_000, value: 50, interpolation: 'linear' },
      ];
      expect(interpolateKeyframeValue(trajectory, 500_000, 0)).toBe(50);
      expect(interpolateKeyframeValue(trajectory, 1_000_000, 0)).toBe(100);
      expect(interpolateKeyframeValue(trajectory, 1_500_000, 0)).toBe(75);
      expect(interpolateKeyframeValue(trajectory, 2_000_000, 0)).toBe(50);
    });
  });

  describe('getInterpolatedPlacement()', () => {
    it('renvoie le placement statique lorsque le clip ne contient aucune image-clé', () => {
      const item: TimelineItem = {
        item_id: 'clip_1',
        referenced_asset_id: 'a1',
        placement_time_us: 1_000_000,
        play_duration_us: 5_000_000,
        source_in_point_us: 0,
        source_duration_us: 5_000_000,
        item_gain: 1.0,
        spatial_placement: {
          offset_x_px: 50,
          offset_y_px: -20,
          zoom_factor_x: 1.2,
          zoom_factor_y: 1.2,
          rotation_degrees: 15,
          opacity_ratio: 0.8,
          flip_horizontal: true,
          flip_vertical: false,
        },
      };

      const resolved = getInterpolatedPlacement(item, 2_000_000);
      expect(resolved.offset_x_px).toBe(50);
      expect(resolved.offset_y_px).toBe(-20);
      expect(resolved.zoom_factor_x).toBe(1.2);
      expect(resolved.rotation_degrees).toBe(15);
      expect(resolved.opacity_ratio).toBe(0.8);
      expect(resolved.flip_horizontal).toBe(true);
    });

    it('évalue dynamiquement plusieurs propriétés animées simultanément', () => {
      const item: TimelineItem = {
        item_id: 'clip_anim',
        referenced_asset_id: 'a1',
        placement_time_us: 1_000_000,
        play_duration_us: 4_000_000,
        source_in_point_us: 0,
        source_duration_us: 4_000_000,
        item_gain: 1.0,
        spatial_placement: {
          offset_x_px: 0,
          offset_y_px: 0,
          zoom_factor_x: 1.0,
          zoom_factor_y: 1.0,
          rotation_degrees: 0,
          opacity_ratio: 1.0,
        },
        keyframes: {
          position_x: [
            { id: 'k1', time_offset_us: 0, value: -100, interpolation: 'linear' },
            { id: 'k2', time_offset_us: 2_000_000, value: 100, interpolation: 'linear' },
          ],
          scale: [
            { id: 'k3', time_offset_us: 0, value: 1.0, interpolation: 'linear' },
            { id: 'k4', time_offset_us: 2_000_000, value: 2.0, interpolation: 'linear' },
          ],
          rotation: [
            { id: 'k5', time_offset_us: 0, value: 0, interpolation: 'linear' },
            { id: 'k6', time_offset_us: 2_000_000, value: 180, interpolation: 'linear' },
          ],
          opacity: [
            { id: 'k7', time_offset_us: 0, value: 0.2, interpolation: 'linear' },
            { id: 'k8', time_offset_us: 2_000_000, value: 1.0, interpolation: 'linear' },
          ],
        },
      };

      // À timelineTimeUs = 2_000_000, offsetUs = 1_000_000 (mi-chemin)
      const mid = getInterpolatedPlacement(item, 2_000_000);
      expect(mid.offset_x_px).toBe(0);
      expect(mid.zoom_factor_x).toBe(1.5);
      expect(mid.zoom_factor_y).toBe(1.5);
      expect(mid.rotation_degrees).toBe(90);
      expect(mid.opacity_ratio).toBeCloseTo(0.6);
    });

    it('normalise avec robustesse les valeurs d\'anciennes keyframes enregistrées en pourcentages (>10 pour scale, >1 pour opacity)', () => {
      const itemWithLegacyValues: TimelineItem = {
        item_id: 'legacy_clip',
        referenced_asset_id: 'a1',
        placement_time_us: 0,
        play_duration_us: 3_000_000,
        source_in_point_us: 0,
        source_duration_us: 3_000_000,
        item_gain: 1.0,
        keyframes: {
          scale: [{ id: 'k1', time_offset_us: 0, value: 100 }], // 100 au lieu de 1.0
          opacity: [{ id: 'k2', time_offset_us: 0, value: 80 }], // 80 au lieu de 0.8
        },
      };

      const resolved = getInterpolatedPlacement(itemWithLegacyValues, 1_000_000);
      expect(resolved.zoom_factor_x).toBe(1.0);
      expect(resolved.zoom_factor_y).toBe(1.0);
      expect(resolved.opacity_ratio).toBe(0.8);
    });
  });

  describe('Utilitaires et gestion de liste d\'images-clés', () => {
    it('addOrUpdateKeyframe() insère en triant et met à jour si proche', () => {
      let list = addOrUpdateKeyframe(undefined, 2_000_000, 50);
      expect(list).toHaveLength(1);
      expect(list[0].value).toBe(50);

      // Insertion avant (1s)
      list = addOrUpdateKeyframe(list, 1_000_000, 25);
      expect(list).toHaveLength(2);
      expect(list[0].time_offset_us).toBe(1_000_000);
      expect(list[1].time_offset_us).toBe(2_000_000);

      // Mise à jour sur place (offset très proche : 2_005_000 us vs 2_000_000 us)
      list = addOrUpdateKeyframe(list, 2_005_000, 80);
      expect(list).toHaveLength(2);
      expect(list[1].value).toBe(80);
      expect(list[1].time_offset_us).toBe(2_005_000);
    });

    it('removeKeyframe() supprime par id', () => {
      const list: Keyframe<number>[] = [
        { id: 'a', time_offset_us: 0, value: 0 },
        { id: 'b', time_offset_us: 1_000_000, value: 10 },
      ];
      const updated = removeKeyframe(list, 'a');
      expect(updated).toHaveLength(1);
      expect(updated[0].id).toBe('b');
    });

    it('findKeyframeNear() localise les images-clés proches', () => {
      const list: Keyframe<number>[] = [
        { id: 'a', time_offset_us: 1_000_000, value: 10 },
      ];
      expect(findKeyframeNear(list, 1_020_000, 30_000)?.id).toBe('a');
      expect(findKeyframeNear(list, 1_200_000, 30_000)).toBeUndefined();
    });

    it('moveKeyframesInList() déplace les images-clés ciblées et réordonne la liste', () => {
      const list: Keyframe<number>[] = [
        { id: 'k1', time_offset_us: 1_000_000, value: 1.0, interpolation: 'linear' },
        { id: 'k2', time_offset_us: 3_000_000, value: 2.0, interpolation: 'ease_in' },
      ];

      // Déplacer k1 de 1.0s à 4.0s (il doit passer après k2)
      const moved = moveKeyframesInList(list, ['k1'], 4_000_000);
      expect(moved).toHaveLength(2);
      expect(moved[0].id).toBe('k2');
      expect(moved[0].time_offset_us).toBe(3_000_000);
      expect(moved[1].id).toBe('k1');
      expect(moved[1].time_offset_us).toBe(4_000_000);
      expect(moved[1].value).toBe(1.0);
      expect(moved[1].interpolation).toBe('linear');
    });

    it('hasKeyframes() et getAllKeyframeOffsets()', () => {
      const itemWithout: TimelineItem = {
        item_id: 'c1', referenced_asset_id: null, placement_time_us: 0,
        play_duration_us: 1_000_000, source_in_point_us: 0, source_duration_us: 1_000_000, item_gain: 1,
      };
      expect(hasKeyframes(itemWithout)).toBe(false);
      expect(getAllKeyframeOffsets(itemWithout)).toEqual([]);

      const itemWith: TimelineItem = {
        ...itemWithout,
        keyframes: {
          position_x: [{ id: '1', time_offset_us: 500_000, value: 10 }],
          scale: [
            { id: '2', time_offset_us: 200_000, value: 1.5 },
            { id: '3', time_offset_us: 500_000, value: 2.0 },
          ],
        },
      };
      expect(hasKeyframes(itemWith)).toBe(true);
      expect(getAllKeyframeOffsets(itemWith)).toEqual([200_000, 500_000]);
    });
  });
});

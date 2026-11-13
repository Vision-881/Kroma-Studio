import { describe, it, expect } from 'vitest';
import {
  findNearestSnap,
  collectSnapTargets,
  snapClipMovement,
  type SnapTarget,
} from './snapping';
import { createDefaultProject } from '../types/project';
import type { TimelineItem } from '../types/timeline';

describe('Smart Snapping Engine (Étape 17)', () => {
  describe('findNearestSnap()', () => {
    const targets: SnapTarget[] = [
      { time_us: 0, kind: 'origin' },
      { time_us: 2_000_000, kind: 'marker', description: 'Beat 1' },
      { time_us: 5_000_000, kind: 'playhead' },
      { time_us: 8_000_000, kind: 'clip_start' },
      { time_us: 10_000_000, kind: 'clip_end' },
    ];

    it('retourne null si le temps candidat est au-delà du seuil de tolérance', () => {
      const snap = findNearestSnap(3_500_000, targets, 200_000);
      expect(snap).toBeNull();
    });

    it('s\'aimante sur une cible exacte avec un delta de 0', () => {
      const snap = findNearestSnap(5_000_000, targets, 100_000);
      expect(snap).not.toBeNull();
      expect(snap?.snapped_time_us).toBe(5_000_000);
      expect(snap?.delta_us).toBe(0);
      expect(snap?.kind).toBe('playhead');
    });

    it('s\'aimante sur la cible la plus proche dans la fenêtre de tolérance', () => {
      // 2.05s est à 50ms de Beat 1 (2.0s)
      const snap = findNearestSnap(2_050_000, targets, 100_000);
      expect(snap).not.toBeNull();
      expect(snap?.snapped_time_us).toBe(2_000_000);
      expect(snap?.delta_us).toBe(-50_000);
      expect(snap?.kind).toBe('marker');
    });

    it('départage par priorité en cas d\'égalité de distance', () => {
      const equidistantTargets: SnapTarget[] = [
        { time_us: 1_000_000, kind: 'clip_start' },
        { time_us: 1_200_000, kind: 'playhead' },
      ];
      // 1.1s est à 100ms de clip_start et 100ms de playhead. Playhead doit primer.
      const snap = findNearestSnap(1_100_000, equidistantTargets, 150_000);
      expect(snap?.kind).toBe('playhead');
      expect(snap?.snapped_time_us).toBe(1_200_000);
    });
  });

  describe('collectSnapTargets()', () => {
    it('récolte l\'origine, la tête de lecture, les marqueurs et les bords de clips', () => {
      const project = createDefaultProject('Test Snapping');
      project.sequence.markers = [
        { marker_id: 'm1', time_us: 3_000_000, label: 'Intro', color: '#eab308' },
      ];

      const dummyItem: TimelineItem = {
        item_id: 'item_1',
        referenced_asset_id: 'asset_1',
        placement_time_us: 1_000_000,
        source_in_point_us: 0,
        source_duration_us: 4_000_000,
        play_duration_us: 4_000_000, // Fin à 5.0s
        item_gain: 1.0,
      };
      project.sequence.lanes[0].items.push(dummyItem);

      const targets = collectSnapTargets(project, {
        playheadTimeUs: 2_500_000,
        includeOrigin: true,
      });

      expect(targets.some((t) => t.kind === 'origin' && t.time_us === 0)).toBe(true);
      expect(targets.some((t) => t.kind === 'playhead' && t.time_us === 2_500_000)).toBe(true);
      expect(targets.some((t) => t.kind === 'marker' && t.time_us === 3_000_000)).toBe(true);
      expect(targets.some((t) => t.kind === 'clip_start' && t.time_us === 1_000_000)).toBe(true);
      expect(targets.some((t) => t.kind === 'clip_end' && t.time_us === 5_000_000)).toBe(true);
    });

    it('exclut le clip en cours de manipulation (excludeItemId)', () => {
      const project = createDefaultProject('Test Exclude');
      const dummyItem: TimelineItem = {
        item_id: 'dragged_clip',
        referenced_asset_id: 'asset_1',
        placement_time_us: 1_000_000,
        source_in_point_us: 0,
        source_duration_us: 2_000_000,
        play_duration_us: 2_000_000,
        item_gain: 1.0,
      };
      project.sequence.lanes[0].items.push(dummyItem);

      const targets = collectSnapTargets(project, { excludeItemId: 'dragged_clip' });
      expect(targets.some((t) => t.kind === 'clip_start')).toBe(false);
      expect(targets.some((t) => t.kind === 'clip_end')).toBe(false);
    });
  });

  describe('snapClipMovement()', () => {
    const targets: SnapTarget[] = [
      { time_us: 0, kind: 'origin' },
      { time_us: 5_000_000, kind: 'marker' },
      { time_us: 10_000_000, kind: 'clip_start' },
    ];
    const clipDurationUs = 3_000_000; // 3s

    it('aimante le début du clip quand il approche d\'une cible', () => {
      // Candidat à 4.95s -> doit s'aimanter à 5.0s
      const result = snapClipMovement(4_950_000, clipDurationUs, targets, 100_000);
      expect(result).not.toBeNull();
      expect(result?.placementUs).toBe(5_000_000);
      expect(result?.snapLineUs).toBe(5_000_000);
      expect(result?.snapResult.kind).toBe('marker');
    });

    it('aimante la fin du clip quand sa fin approche d\'une cible', () => {
      // Début candidat à 6.96s -> fin à 9.96s -> à 40ms de la cible à 10.0s
      const result = snapClipMovement(6_960_000, clipDurationUs, targets, 100_000);
      expect(result).not.toBeNull();
      // Le début doit être calé à 10.0s - 3.0s = 7.0s
      expect(result?.placementUs).toBe(7_000_000);
      expect(result?.snapLineUs).toBe(10_000_000);
      expect(result?.snapResult.kind).toBe('clip_start');
    });

    it('retourne null si ni le début ni la fin ne sont dans la tolérance', () => {
      const result = snapClipMovement(2_500_000, clipDurationUs, targets, 100_000);
      expect(result).toBeNull();
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  createItemFromAsset,
  createTextItem,
  addItemToLane,
  removeItemFromSequence,
  moveItemInSequence,
  splitItemInSequence,
  trimItemInSequence,
} from './timelineOps';
import type { TimelineSequence } from '../types/timeline';
import type { MediaAsset } from '../types/asset';

function createTestSequence(): TimelineSequence {
  return {
    total_length_us: 0,
    lanes: [
      {
        lane_id: 'lane_v1',
        lane_title: 'Piste Vidéo 1',
        lane_type: 'visual',
        stack_index: 0,
        is_muted: false,
        is_locked: false,
        gain_level: 1.0,
        items: [],
      },
      {
        lane_id: 'lane_a1',
        lane_title: 'Piste Audio 1',
        lane_type: 'audio',
        stack_index: 1,
        is_muted: false,
        is_locked: false,
        gain_level: 1.0,
        items: [],
      },
    ],
  };
}

const dummyAsset: MediaAsset = {
  asset_id: 'asset_test',
  display_name: 'test.mp4',
  media_kind: 'video',
  source_path: 'C:/test.mp4',
  duration_us: 10_000_000, // 10 secondes
  native_width: 1920,
  native_height: 1080,
  detected_fps: 30,
  audio_channels: 2,
  audio_sample_rate_hz: 48000,
};

describe('Timeline Operations', () => {
  it('crée un élément depuis un asset avec placement et durées valides', () => {
    const item = createItemFromAsset(dummyAsset, 2_000_000);
    expect(item.referenced_asset_id).toBe('asset_test');
    expect(item.placement_time_us).toBe(2_000_000);
    expect(item.play_duration_us).toBe(10_000_000);
    expect(item.source_in_point_us).toBe(0);
  });

  it('ajoute un item et recalcule la durée totale de la séquence', () => {
    const seq = createTestSequence();
    const item = createItemFromAsset(dummyAsset, 1_000_000);
    const updated = addItemToLane(seq, 'lane_v1', item);

    expect(updated.lanes[0].items).toHaveLength(1);
    expect(updated.total_length_us).toBe(11_000_000); // 1s + 10s = 11s
  });

  it('déplace un item temporellement et vers une autre piste', () => {
    const seq = createTestSequence();
    const item = createItemFromAsset(dummyAsset, 0);
    const withItem = addItemToLane(seq, 'lane_v1', item);

    const moved = moveItemInSequence(withItem, item.item_id, 'lane_a1', 5_000_000);
    expect(moved.lanes[0].items).toHaveLength(0);
    expect(moved.lanes[1].items).toHaveLength(1);
    expect(moved.lanes[1].items[0].placement_time_us).toBe(5_000_000);
    expect(moved.total_length_us).toBe(15_000_000); // 5s + 10s = 15s
  });

  it('scinde (split) un item en deux segments exacts sans perte de temps', () => {
    const seq = createTestSequence();
    const item = createItemFromAsset(dummyAsset, 0); // 0 à 10s
    const withItem = addItemToLane(seq, 'lane_v1', item);

    // Coupe à 4 secondes (4 000 000 us)
    const splitSeq = splitItemInSequence(withItem, item.item_id, 4_000_000);
    const items = splitSeq.lanes[0].items;

    expect(items).toHaveLength(2);
    // Premier segment
    expect(items[0].placement_time_us).toBe(0);
    expect(items[0].play_duration_us).toBe(4_000_000);
    expect(items[0].source_in_point_us).toBe(0);

    // Second segment
    expect(items[1].placement_time_us).toBe(4_000_000);
    expect(items[1].play_duration_us).toBe(6_000_000);
    expect(items[1].source_in_point_us).toBe(4_000_000);

    // La somme des durées égale la durée initiale
    expect(items[0].play_duration_us + items[1].play_duration_us).toBe(10_000_000);
    expect(splitSeq.total_length_us).toBe(10_000_000);
  });

  it('rogne (trim) la fin d\'un segment sans dépasser la source', () => {
    const seq = createTestSequence();
    const item = createItemFromAsset(dummyAsset, 0);
    const withItem = addItemToLane(seq, 'lane_v1', item);

    // Raccourcir de 3s
    const trimmed = trimItemInSequence(withItem, item.item_id, 'end', -3_000_000, 10_000_000);
    expect(trimmed.lanes[0].items[0].play_duration_us).toBe(7_000_000);
    expect(trimmed.total_length_us).toBe(7_000_000);
  });

  it('supprime un item et met à jour la durée totale', () => {
    const seq = createTestSequence();
    const item = createItemFromAsset(dummyAsset, 0);
    const withItem = addItemToLane(seq, 'lane_v1', item);
    expect(withItem.total_length_us).toBe(10_000_000);

    const removed = removeItemFromSequence(withItem, item.item_id);
    expect(removed.lanes[0].items).toHaveLength(0);
    expect(removed.total_length_us).toBe(0);
  });

  describe('createTextItem', () => {
    it('crée un item texte avec les bonnes valeurs par défaut', () => {
      const item = createTextItem('Bonjour', 2_000_000);
      expect(item.item_id).toMatch(/^item_text_/);
      expect(item.referenced_asset_id).toBeNull();
      expect(item.placement_time_us).toBe(2_000_000);
      expect(item.play_duration_us).toBe(4_000_000); // durée par défaut = 4s
      expect(item.text_layer_data).toBeDefined();
      expect(item.text_layer_data!.raw_string).toBe('Bonjour');
      expect(item.text_layer_data!.font_name).toBe('system-ui');
      expect(item.text_layer_data!.is_bold).toBe(true);
      expect(item.text_layer_data!.fill_color_hex).toBe('#FFFFFF');
      expect(item.text_layer_data!.text_align).toBe('center');
      expect(item.text_layer_data!.normalized_center.x_ratio).toBe(0.5);
      expect(item.text_layer_data!.normalized_center.y_ratio).toBe(0.5);
    });

    it('accepte une durée personnalisée', () => {
      const item = createTextItem('Test', 0, 8_000_000);
      expect(item.play_duration_us).toBe(8_000_000);
      expect(item.source_duration_us).toBe(8_000_000);
    });

    it('utilise "Nouveau Titre" comme texte par défaut', () => {
      const item = createTextItem();
      expect(item.text_layer_data!.raw_string).toBe('Nouveau Titre');
    });
  });
});

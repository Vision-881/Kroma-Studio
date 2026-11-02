import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import type { MediaAsset } from '../core/types/asset';

const dummyVideoAsset: MediaAsset = {
  asset_id: 'asset_1',
  display_name: 'test.mp4',
  media_kind: 'video',
  source_path: '/path/test.mp4',
  duration_us: 10_000_000,
  native_width: 1920,
  native_height: 1080,
  detected_fps: 30,
  audio_channels: 2,
  audio_sample_rate_hz: 48000,
};

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it('initialise avec un catalogue de médias vide', () => {
    const state = useProjectStore.getState();
    expect(state.project.asset_catalog).toEqual([]);
    expect(state.selectedAssetId).toBeNull();
    expect(state.selectedItemId).toBeNull();
    expect(state.currentTimeUs).toBe(0);
    expect(state.isDirty).toBe(false);
  });

  it('ajoute un asset et marque le projet comme modifié', () => {
    useProjectStore.getState().addAsset(dummyVideoAsset);
    const state = useProjectStore.getState();
    expect(state.project.asset_catalog).toHaveLength(1);
    expect(state.project.asset_catalog[0].asset_id).toBe('asset_1');
    expect(state.isDirty).toBe(true);
  });

  it('sélectionne et supprime un asset correctement', () => {
    useProjectStore.getState().addAsset(dummyVideoAsset);
    useProjectStore.getState().setSelectedAsset('asset_1');
    expect(useProjectStore.getState().selectedAssetId).toBe('asset_1');

    useProjectStore.getState().removeAsset('asset_1');
    const state = useProjectStore.getState();
    expect(state.project.asset_catalog).toHaveLength(0);
    expect(state.selectedAssetId).toBeNull();
  });

  it('ajoute un élément sur la timeline depuis un asset', () => {
    useProjectStore.getState().addAsset(dummyVideoAsset);
    useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 1_000_000);

    const state = useProjectStore.getState();
    const visualLane = state.project.sequence.lanes.find((l) => l.lane_type === 'visual');
    expect(visualLane?.items).toHaveLength(1);
    expect(visualLane?.items[0].placement_time_us).toBe(1_000_000);
    expect(state.selectedItemId).toBe(visualLane?.items[0].item_id);
    expect(state.project.sequence.total_length_us).toBe(11_000_000);
  });

  it('scinde un élément à la position de la tête de lecture', () => {
    useProjectStore.getState().addAsset(dummyVideoAsset);
    useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

    // Positionner la tête de lecture à 4 secondes
    useProjectStore.getState().setCurrentTimeUs(4_000_000);
    useProjectStore.getState().splitTimelineItemAtCurrentTime();

    const state = useProjectStore.getState();
    const visualLane = state.project.sequence.lanes.find((l) => l.lane_type === 'visual');
    expect(visualLane?.items).toHaveLength(2);
    expect(visualLane?.items[0].play_duration_us).toBe(4_000_000);
    expect(visualLane?.items[1].play_duration_us).toBe(6_000_000);
  });

  it('supprime un élément de la timeline', () => {
    useProjectStore.getState().addAsset(dummyVideoAsset);
    useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

    const itemId = useProjectStore.getState().selectedItemId!;
    useProjectStore.getState().removeTimelineItem(itemId);

    const state = useProjectStore.getState();
    const visualLane = state.project.sequence.lanes.find((l) => l.lane_type === 'visual');
    expect(visualLane?.items).toHaveLength(0);
    expect(state.selectedItemId).toBeNull();
    expect(state.project.sequence.total_length_us).toBe(0);
  });
});

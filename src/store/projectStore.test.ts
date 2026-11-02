import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import type { MediaAsset } from '../core/types/asset';

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.getState().resetProject();
  });

  it('initialise avec un catalogue de médias vide', () => {
    const state = useProjectStore.getState();
    expect(state.project.asset_catalog).toEqual([]);
    expect(state.selectedAssetId).toBeNull();
    expect(state.isDirty).toBe(false);
  });

  it('ajoute un asset et marque le projet comme modifié', () => {
    const dummyAsset: MediaAsset = {
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

    useProjectStore.getState().addAsset(dummyAsset);

    const state = useProjectStore.getState();
    expect(state.project.asset_catalog).toHaveLength(1);
    expect(state.project.asset_catalog[0].asset_id).toBe('asset_1');
    expect(state.isDirty).toBe(true);
  });

  it('sélectionne et supprime un asset correctement', () => {
    const dummyAsset: MediaAsset = {
      asset_id: 'asset_to_delete',
      display_name: 'audio.mp3',
      media_kind: 'audio',
      source_path: '/path/audio.mp3',
      duration_us: 5_000_000,
      native_width: 0,
      native_height: 0,
      detected_fps: 0,
      audio_channels: 2,
      audio_sample_rate_hz: 44100,
    };

    useProjectStore.getState().addAsset(dummyAsset);
    useProjectStore.getState().setSelectedAsset('asset_to_delete');
    expect(useProjectStore.getState().selectedAssetId).toBe('asset_to_delete');

    // Suppression
    useProjectStore.getState().removeAsset('asset_to_delete');
    const state = useProjectStore.getState();
    expect(state.project.asset_catalog).toHaveLength(0);
    expect(state.selectedAssetId).toBeNull(); // Doit être désélectionné
  });
});

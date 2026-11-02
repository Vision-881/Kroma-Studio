import { describe, it, expect } from 'vitest';
import { createDefaultProject, type KromaProject } from './project';
import type { MediaAsset } from './asset';

describe('Kroma Project Format', () => {
  it('crée un projet par défaut valide avec toutes ses sections obligatoires', () => {
    const project = createDefaultProject('Projet Test');
    expect(project.kroma_version).toBe('1.0.0');
    expect(project.project_name).toBe('Projet Test');
    expect(project.timeline_canvas.viewport_width).toBe(1920);
    expect(project.timeline_canvas.viewport_height).toBe(1080);
    expect(project.timeline_canvas.frame_rate_fps).toBe(60.0);
    expect(project.asset_catalog).toEqual([]);
    expect(project.sequence.lanes.length).toBe(3);
  });

  it('peut être sérialisé et désérialisé en JSON sans altération des types ni des entiers', () => {
    const project = createDefaultProject('Sérialisation Test');
    
    // Ajout d'un asset
    const videoAsset: MediaAsset = {
      asset_id: 'asset_test_1',
      display_name: 'rush1.mp4',
      media_kind: 'video',
      source_path: 'C:/Vidéos/rush1.mp4',
      duration_us: 15_000_000,
      native_width: 3840,
      native_height: 2160,
      detected_fps: 59.94,
      audio_channels: 2,
      audio_sample_rate_hz: 48000,
    };
    project.asset_catalog.push(videoAsset);

    // Ajout d'un clip sur la piste vidéo
    project.sequence.lanes[0].items.push({
      item_id: 'item_1',
      referenced_asset_id: videoAsset.asset_id,
      placement_time_us: 0,
      play_duration_us: 5_000_000,
      source_in_point_us: 1_000_000,
      source_duration_us: 5_000_000,
      item_gain: 1.0,
      spatial_placement: {
        offset_x_px: 0,
        offset_y_px: 0,
        zoom_factor_x: 1.0,
        zoom_factor_y: 1.0,
        rotation_degrees: 0,
        opacity_ratio: 1.0,
      },
    });

    const jsonString = JSON.stringify(project, null, 2);
    const parsed: KromaProject = JSON.parse(jsonString);

    expect(parsed.project_name).toBe('Sérialisation Test');
    expect(parsed.asset_catalog[0].asset_id).toBe('asset_test_1');
    expect(parsed.asset_catalog[0].duration_us).toBe(15_000_000);
    expect(parsed.sequence.lanes[0].items[0].play_duration_us).toBe(5_000_000);
    expect(parsed.sequence.lanes[0].items[0].source_in_point_us).toBe(1_000_000);
  });
});


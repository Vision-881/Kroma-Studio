import { describe, it, expect } from 'vitest';
import {
  createDefaultProject,
  detectAspectRatio,
  CANVAS_RATIO_PRESETS,
  type KromaProject,
} from './project';
import type { MediaAsset } from './asset';

describe('Kroma Project Format', () => {
  it('crée un projet par défaut valide avec toutes ses sections obligatoires et ratio 16:9', () => {
    const project = createDefaultProject('Projet Test');
    expect(project.kroma_version).toBe('1.0.0');
    expect(project.project_name).toBe('Projet Test');
    expect(project.timeline_canvas.viewport_width).toBe(1920);
    expect(project.timeline_canvas.viewport_height).toBe(1080);
    expect(project.timeline_canvas.aspect_ratio).toBe('16:9');
    expect(project.timeline_canvas.frame_rate_fps).toBe(60.0);
    expect(project.asset_catalog).toEqual([]);
    expect(project.sequence.lanes.length).toBe(3);
  });

  it('fournit les préréglages de ratios multi-formats standard (Étape 12)', () => {
    expect(CANVAS_RATIO_PRESETS['16:9']).toEqual({
      id: '16:9',
      label: '16:9',
      name: 'YouTube / Paysage',
      sublabel: '1920×1080',
      width: 1920,
      height: 1080,
    });
    expect(CANVAS_RATIO_PRESETS['9:16']).toEqual({
      id: '9:16',
      label: '9:16',
      name: 'TikTok / Shorts / Reels',
      sublabel: '1080×1920',
      width: 1080,
      height: 1920,
    });
    expect(CANVAS_RATIO_PRESETS['1:1']).toEqual({
      id: '1:1',
      label: '1:1',
      name: 'Carré / Feed Instagram',
      sublabel: '1080×1080',
      width: 1080,
      height: 1080,
    });
    expect(CANVAS_RATIO_PRESETS['4:5']).toEqual({
      id: '4:5',
      label: '4:5',
      name: 'Portrait Instagram',
      sublabel: '1080×1350',
      width: 1080,
      height: 1350,
    });
    expect(CANVAS_RATIO_PRESETS['4:3'].width).toBe(1440);
    expect(CANVAS_RATIO_PRESETS['21:9'].width).toBe(2560);
  });

  it('detectAspectRatio identifie correctement les résolutions standards et personnalisées (Étape 12)', () => {
    expect(detectAspectRatio(1920, 1080)).toBe('16:9');
    expect(detectAspectRatio(1280, 720)).toBe('16:9');
    expect(detectAspectRatio(3840, 2160)).toBe('16:9');

    expect(detectAspectRatio(1080, 1920)).toBe('9:16');
    expect(detectAspectRatio(720, 1280)).toBe('9:16');

    expect(detectAspectRatio(1080, 1080)).toBe('1:1');
    expect(detectAspectRatio(500, 500)).toBe('1:1');

    expect(detectAspectRatio(1080, 1350)).toBe('4:5');
    expect(detectAspectRatio(1440, 1080)).toBe('4:3');
    expect(detectAspectRatio(2560, 1080)).toBe('21:9');

    expect(detectAspectRatio(1234, 567)).toBe('custom');
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


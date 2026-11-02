import { describe, it, expect } from 'vitest';
import { calculateSourceTimeUs, getActiveItemsAtTime } from './playbackEngine';
import type { TimelineSequence, TimelineItem } from '../types/timeline';
import type { MediaAsset } from '../types/asset';

const testAsset: MediaAsset = {
  asset_id: 'asset_vid_1',
  display_name: 'drone.mp4',
  media_kind: 'video',
  source_path: 'C:/drone.mp4',
  duration_us: 20_000_000,
  native_width: 1920,
  native_height: 1080,
  detected_fps: 30,
  audio_channels: 2,
  audio_sample_rate_hz: 48000,
};

const testItem: TimelineItem = {
  item_id: 'item_1',
  referenced_asset_id: 'asset_vid_1',
  placement_time_us: 5_000_000, // Démarre à 5s sur la timeline
  play_duration_us: 6_000_000,  // Dure 6s (finit à 11s)
  source_in_point_us: 2_000_000, // Démarre à 2s dans la vidéo source
  source_duration_us: 6_000_000,
  item_gain: 1.0,
};

describe('Playback Engine', () => {
  it('calcule exactement le temps source correspondant à la position timeline', () => {
    // À 5s sur la timeline (début du clip), le temps source doit être 2s
    expect(calculateSourceTimeUs(testItem, 5_000_000)).toBe(2_000_000);

    // À 8s sur la timeline (+3s), le temps source doit être 5s (2s + 3s)
    expect(calculateSourceTimeUs(testItem, 8_000_000)).toBe(5_000_000);
  });

  it('détecte correctement les clips actifs et ignore les pistes muettes', () => {
    const sequence: TimelineSequence = {
      total_length_us: 20_000_000,
      lanes: [
        {
          lane_id: 'lane_v1',
          lane_title: 'Vidéo 1',
          lane_type: 'visual',
          stack_index: 0,
          is_muted: false,
          is_locked: false,
          gain_level: 1.0,
          items: [testItem],
        },
        {
          lane_id: 'lane_a1',
          lane_title: 'Audio 1',
          lane_type: 'audio',
          stack_index: 1,
          is_muted: true, // Piste coupée
          is_locked: false,
          gain_level: 1.0,
          items: [
            {
              item_id: 'audio_item_1',
              referenced_asset_id: null,
              placement_time_us: 4_000_000,
              play_duration_us: 8_000_000,
              source_in_point_us: 0,
              source_duration_us: 8_000_000,
              item_gain: 0.8,
            },
          ],
        },
      ],
    };

    // Avant le clip (< 5s)
    const before = getActiveItemsAtTime(sequence, [testAsset], 2_000_000);
    expect(before.visualItems).toHaveLength(0);

    // Pendant le clip (7s)
    const during = getActiveItemsAtTime(sequence, [testAsset], 7_000_000);
    expect(during.visualItems).toHaveLength(1);
    expect(during.visualItems[0].sourceTimeUs).toBe(4_000_000); // 2s in + (7s - 5s) = 4s
    // Piste audio muette -> gain effectif 0
    expect(during.audioItems[0].effectiveGain).toBe(0);

    // Après le clip (>= 11s)
    const after = getActiveItemsAtTime(sequence, [testAsset], 12_000_000);
    expect(after.visualItems).toHaveLength(0);
  });
});

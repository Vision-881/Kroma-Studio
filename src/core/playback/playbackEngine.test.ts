import { describe, it, expect } from 'vitest';
import { calculateSourceTimeUs, getActiveItemsAtTime, calculateFadeGain } from './playbackEngine';
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

  describe('calculateFadeGain', () => {
    it('calcule la rampe progressive du fondu d\'entrée (Fade In)', () => {
      const durationUs = 10_000_000; // 10s
      const fadeInUs = 2_000_000;    // 2s de fondu

      // Au tout début : silence total
      expect(calculateFadeGain(0, durationUs, fadeInUs, 0)).toBe(0);
      // À mi-parcours du fondu (1s) : 50%
      expect(calculateFadeGain(1_000_000, durationUs, fadeInUs, 0)).toBeCloseTo(0.5, 3);
      // À la fin exacte du fondu (2s) : 100%
      expect(calculateFadeGain(2_000_000, durationUs, fadeInUs, 0)).toBe(1.0);
      // Bien après le fondu (5s) : toujours 100%
      expect(calculateFadeGain(5_000_000, durationUs, fadeInUs, 0)).toBe(1.0);
    });

    it('calcule la rampe progressive du fondu de sortie (Fade Out)', () => {
      const durationUs = 10_000_000; // 10s
      const fadeOutUs = 2_000_000;   // 2s de fondu (commence à 8s)

      // Avant le fondu de sortie (6s) : 100%
      expect(calculateFadeGain(6_000_000, durationUs, 0, fadeOutUs)).toBe(1.0);
      // Au début du fondu de sortie (8s) : 100%
      expect(calculateFadeGain(8_000_000, durationUs, 0, fadeOutUs)).toBe(1.0);
      // À mi-parcours du fondu de sortie (9s) : 50%
      expect(calculateFadeGain(9_000_000, durationUs, 0, fadeOutUs)).toBeCloseTo(0.5, 3);
      // À la toute fin du clip (10s) : 0%
      expect(calculateFadeGain(10_000_000, durationUs, 0, fadeOutUs)).toBe(0);
    });

    it('combine le fondu d\'entrée et de sortie sur un même clip', () => {
      const durationUs = 10_000_000;
      const fadeInUs = 2_000_000;
      const fadeOutUs = 2_000_000;

      expect(calculateFadeGain(0, durationUs, fadeInUs, fadeOutUs)).toBe(0);
      expect(calculateFadeGain(1_000_000, durationUs, fadeInUs, fadeOutUs)).toBeCloseTo(0.5, 3);
      expect(calculateFadeGain(5_000_000, durationUs, fadeInUs, fadeOutUs)).toBe(1.0);
      expect(calculateFadeGain(9_000_000, durationUs, fadeInUs, fadeOutUs)).toBeCloseTo(0.5, 3);
      expect(calculateFadeGain(10_000_000, durationUs, fadeInUs, fadeOutUs)).toBe(0);
    });

    it('renvoie 1.0 si aucun fondu n\'est configuré', () => {
      expect(calculateFadeGain(5_000_000, 10_000_000, 0, 0)).toBe(1.0);
    });
  });

  describe('Mixage audio et mode Solo / Mute', () => {
    it('isole la piste en Solo et coupe les pistes ordinaires', () => {
      const sequenceWithSolo: TimelineSequence = {
        total_length_us: 10_000_000,
        lanes: [
          {
            lane_id: 'lane_v1',
            lane_title: 'Vidéo',
            lane_type: 'visual',
            stack_index: 0,
            is_muted: false,
            is_solo: false,
            is_locked: false,
            gain_level: 1.0,
            items: [
              {
                item_id: 'v_item',
                referenced_asset_id: 'asset_vid_1',
                placement_time_us: 0,
                play_duration_us: 10_000_000,
                source_in_point_us: 0,
                source_duration_us: 10_000_000,
                item_gain: 1.0,
              },
            ],
          },
          {
            lane_id: 'lane_a1',
            lane_title: 'Audio Musique',
            lane_type: 'audio',
            stack_index: 1,
            is_muted: false,
            is_solo: true, // PISTE EN SOLO !
            is_locked: false,
            gain_level: 0.8,
            items: [
              {
                item_id: 'a_item',
                referenced_asset_id: null,
                placement_time_us: 0,
                play_duration_us: 10_000_000,
                source_in_point_us: 0,
                source_duration_us: 10_000_000,
                item_gain: 1.0,
              },
            ],
          },
        ],
      };

      const result = getActiveItemsAtTime(sequenceWithSolo, [testAsset], 2_000_000);

      // La piste vidéo n'est pas en solo -> rendue muette
      expect(result.visualItems[0].isMuted).toBe(true);
      expect(result.visualItems[0].effectiveGain).toBe(0);

      // La piste audio est en solo -> audible avec son gain combiné (1.0 clip * 0.8 piste = 0.8)
      expect(result.audioItems[0].isMuted).toBe(false);
      expect(result.audioItems[0].effectiveGain).toBeCloseTo(0.8, 3);
    });

    it('applique le gain combiné (clip × piste × fondu)', () => {
      const sequenceGain: TimelineSequence = {
        total_length_us: 10_000_000,
        lanes: [
          {
            lane_id: 'lane_a1',
            lane_title: 'Audio',
            lane_type: 'audio',
            stack_index: 0,
            is_muted: false,
            is_locked: false,
            gain_level: 1.5, // 150% sur la piste
            items: [
              {
                item_id: 'a_item',
                referenced_asset_id: null,
                placement_time_us: 0,
                play_duration_us: 10_000_000,
                source_in_point_us: 0,
                source_duration_us: 10_000_000,
                item_gain: 0.5, // 50% sur le clip
                fade_in_duration_us: 2_000_000, // 2s de fondu
              },
            ],
          },
        ],
      };

      // À 1s (mi-fondu d'entrée -> 0.5)
      // Gain = 0.5 (clip) * 1.5 (piste) * 0.5 (fondu) = 0.375
      const at1s = getActiveItemsAtTime(sequenceGain, [], 1_000_000);
      expect(at1s.audioItems[0].effectiveGain).toBeCloseTo(0.375, 3);

      // À 5s (plein régime -> 1.0)
      // Gain = 0.5 * 1.5 * 1.0 = 0.75
      const at5s = getActiveItemsAtTime(sequenceGain, [], 5_000_000);
      expect(at5s.audioItems[0].effectiveGain).toBeCloseTo(0.75, 3);
    });
  });
});


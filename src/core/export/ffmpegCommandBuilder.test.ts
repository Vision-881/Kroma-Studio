import { describe, it, expect } from 'vitest';
import {
  usToSeconds,
  usToMs,
  escapeDrawText,
  buildAtempoFilter,
  buildFFmpegCommand,
  generateWindowsBatch,
  generateBashScript,
} from './ffmpegCommandBuilder';
import { createDefaultProject, type KromaProject } from '../types/project';
import type { MediaAsset } from '../types/asset';
import type { TimelineItem } from '../types/timeline';

describe('ffmpegCommandBuilder', () => {
  describe('Fonctions utilitaires', () => {
    it('usToSeconds convertit correctement les microsecondes en secondes', () => {
      expect(usToSeconds(0)).toBe(0);
      expect(usToSeconds(1_000_000)).toBe(1);
      expect(usToSeconds(2_500_000)).toBe(2.5);
      expect(usToSeconds(100_000)).toBe(0.1);
    });

    it('usToMs convertit correctement les microsecondes en millisecondes entières', () => {
      expect(usToMs(0)).toBe(0);
      expect(usToMs(1_000_000)).toBe(1000);
      expect(usToMs(2_543_210)).toBe(2543);
    });

    it('escapeDrawText échappe les caractères sensibles FFmpeg', () => {
      expect(escapeDrawText('Hello World')).toBe('Hello World');
      expect(escapeDrawText("L'été")).toBe("L\\'été");
      expect(escapeDrawText('Ratio: 16:9')).toBe('Ratio\\: 16\\:9');
      expect(escapeDrawText('100% Promo')).toBe('100%% Promo');
      expect(escapeDrawText('C:\\Footage')).toBe('C\\:\\\\Footage');
    });

    it('buildAtempoFilter construit la chaîne atempo appropriée selon le facteur de vitesse', () => {
      expect(buildAtempoFilter(1.0)).toBe('');
      expect(buildAtempoFilter(1.5)).toBe('atempo=1.5');
      expect(buildAtempoFilter(2.0)).toBe('atempo=2');
      expect(buildAtempoFilter(4.0)).toBe('atempo=2.0,atempo=2');
      expect(buildAtempoFilter(0.5)).toBe('atempo=0.5');
      expect(buildAtempoFilter(0.25)).toBe('atempo=0.5,atempo=0.5');
    });
  });

  describe('Projet vide ou minimal', () => {
    it('génère une commande valide avec canevas de fond pour un projet vide', () => {
      const proj = createDefaultProject('Projet Vide');
      const result = buildFFmpegCommand(proj);

      expect(result.outputFilename).toBe('projet_vide.mp4');
      expect(result.totalDurationSeconds).toBe(5); // Durée de sécurité
      expect(result.args).toContain('-y');
      expect(result.args).toContain('-c:v');
      expect(result.args).toContain('libx264');
      expect(result.args).toContain('-movflags');
      expect(result.args).toContain('+faststart');
      expect(result.filterComplex).toContain('color=c=0x000000:s=1920x1080');
      expect(result.filterComplex).toContain('anullsrc=channel_layout=stereo');
      expect(result.windowsCommand).toContain('ffmpeg');
      expect(result.bashCommand).toContain('ffmpeg');
    });
  });

  describe('Projet avec clip vidéo et audio', () => {
    function createTestProject(): KromaProject {
      const proj = createDefaultProject('Projet Test');
      const asset1: MediaAsset = {
        asset_id: 'vid-1',
        display_name: 'vacances.mp4',
        media_kind: 'video',
        source_path: 'C:/Media/vacances.mp4',
        duration_us: 10_000_000,
        native_width: 1920,
        native_height: 1080,
        detected_fps: 30,
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
      };

      const assetAudio: MediaAsset = {
        asset_id: 'aud-1',
        display_name: 'musique.mp3',
        media_kind: 'audio',
        source_path: 'C:/Media/musique.mp3',
        duration_us: 20_000_000,
        native_width: 0,
        native_height: 0,
        detected_fps: 0,
        audio_channels: 2,
        audio_sample_rate_hz: 44100,
      };

      proj.asset_catalog = [asset1, assetAudio];

      const itemVideo: TimelineItem = {
        item_id: 'item-v1',
        referenced_asset_id: 'vid-1',
        placement_time_us: 1_000_000, // 1s
        play_duration_us: 4_000_000,  // 4s
        source_in_point_us: 2_000_000, // 2s
        source_duration_us: 4_000_000,
        item_gain: 0.8,
        fade_in_duration_us: 500_000, // 0.5s
        fade_out_duration_us: 500_000,
      };

      const itemAudio: TimelineItem = {
        item_id: 'item-a1',
        referenced_asset_id: 'aud-1',
        placement_time_us: 0,
        play_duration_us: 8_000_000, // 8s
        source_in_point_us: 0,
        source_duration_us: 8_000_000,
        item_gain: 1.0,
      };

      proj.sequence.lanes[0].items = [itemVideo];
      proj.sequence.lanes[2].items = [itemAudio];
      proj.sequence.total_length_us = 8_000_000;

      return proj;
    }

    it('génère les filtres trim, scale, overlay, et le mixage audio amix', () => {
      const proj = createTestProject();
      const result = buildFFmpegCommand(proj, {
        outputFilename: 'montage_final.mp4',
        preset: 'fast',
        crf: 20,
      });

      expect(result.outputFilename).toBe('montage_final.mp4');
      expect(result.totalDurationSeconds).toBe(8);

      // Entrées
      expect(result.inputFiles).toContain('C:/Media/vacances.mp4');
      expect(result.inputFiles).toContain('C:/Media/musique.mp3');

      // Filtre vidéo : trim de 2.0s à 4.0s de durée, calé à 1.0s sur la timeline
      expect(result.filterComplex).toContain('trim=start=2.000:duration=4.000');
      expect(result.filterComplex).toContain('setpts=PTS-STARTPTS+1.000/TB');
      expect(result.filterComplex).toContain("overlay=x='(W-w)/2':y='(H-h)/2':enable='between(t,1.000,5.000)'");

      // Filtre audio : fade in, fade out, adelay
      expect(result.filterComplex).toContain('afade=t=in:st=0:d=0.500');
      expect(result.filterComplex).toContain('afade=t=out:st=3.500:d=0.500');
      expect(result.filterComplex).toContain('adelay=1000|1000');
      expect(result.filterComplex).toContain('amix=inputs=2');

      // Options CLI
      expect(result.args).toContain('-preset');
      expect(result.args).toContain('fast');
      expect(result.args).toContain('-crf');
      expect(result.args).toContain('20');
    });

    it('génère un split lorsqu’un média est utilisé plusieurs fois', () => {
      const proj = createTestProject();
      // On duplique le clip vidéo sur la timeline
      const itemVideo2: TimelineItem = {
        item_id: 'item-v2',
        referenced_asset_id: 'vid-1',
        placement_time_us: 5_000_000,
        play_duration_us: 2_000_000,
        source_in_point_us: 6_000_000,
        source_duration_us: 2_000_000,
        item_gain: 1.0,
      };
      proj.sequence.lanes[0].items.push(itemVideo2);

      const result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('split=2');
    });
  });

  describe('Calques de texte et drawtext', () => {
    it('génère le filtre drawtext avec position normalisée et contour', () => {
      const proj = createDefaultProject('Projet Titre');
      const textItem: TimelineItem = {
        item_id: 'text-1',
        referenced_asset_id: null,
        placement_time_us: 1_000_000, // 1s à 4s
        play_duration_us: 3_000_000,
        source_in_point_us: 0,
        source_duration_us: 3_000_000,
        item_gain: 1.0,
        text_layer_data: {
          raw_string: "Kroma: L'Aventure",
          font_name: 'Arial',
          font_size_pt: 48,
          is_bold: true,
          fill_color_hex: '#FFD700',
          outline_color_hex: '#000000',
          outline_thickness_px: 3,
          text_align: 'center',
          normalized_center: {
            x_ratio: 0.5,
            y_ratio: 0.8,
          },
        },
      };

      proj.sequence.lanes[1].items = [textItem];
      proj.sequence.total_length_us = 5_000_000;

      const result = buildFFmpegCommand(proj);

      expect(result.filterComplex).toContain('drawtext=text=\'Kroma\\: L\\\'Aventure\'');
      expect(result.filterComplex).toContain("fontcolor=#FFD700");
      expect(result.filterComplex).toContain("borderw=6:bordercolor=#000000");
      expect(result.filterComplex).toContain("x='w*0.5000-tw/2'");
      expect(result.filterComplex).toContain("y='h*0.8000-th/2'");
      expect(result.filterComplex).toContain("enable='between(t,1.000,4.000)'");
    });
  });

  describe('Transformations spatiales (Zoom, Rotation, Opacité)', () => {
    it('applique les filtres d’échelle, rotation et opacité', () => {
      const proj = createDefaultProject('Projet FX');
      const asset: MediaAsset = {
        asset_id: 'img-1',
        display_name: 'logo.png',
        media_kind: 'image',
        source_path: 'C:/Images/logo.png',
        duration_us: 0,
        native_width: 500,
        native_height: 500,
        detected_fps: 0,
        audio_channels: 0,
        audio_sample_rate_hz: 0,
      };
      proj.asset_catalog = [asset];

      const item: TimelineItem = {
        item_id: 'item-img',
        referenced_asset_id: 'img-1',
        placement_time_us: 0,
        play_duration_us: 5_000_000,
        source_in_point_us: 0,
        source_duration_us: 5_000_000,
        item_gain: 1.0,
        spatial_placement: {
          offset_x_px: 50,
          offset_y_px: -30,
          zoom_factor_x: 1.5,
          zoom_factor_y: 1.5,
          rotation_degrees: 45,
          opacity_ratio: 0.75,
        },
        color_adjustments: {
          brightness: 0.1,
          contrast: 0.2,
          saturation: 0.3,
          temperature: 0,
          hue_degrees: 25,
          blur_px: 3,
        },
      };
      proj.sequence.lanes[0].items = [item];
      proj.sequence.total_length_us = 5_000_000;

      const result = buildFFmpegCommand(proj);

      expect(result.args).toContain('-loop');
      expect(result.filterComplex).toContain('scale=iw*1.500:ih*1.500');
      expect(result.filterComplex).toContain('rotate=0.7854:c=none');
      expect(result.filterComplex).toContain('colorchannelmixer=aa=0.75');
      expect(result.filterComplex).toContain('(W-w)/2+(50)');
      expect(result.filterComplex).toContain('(H-h)/2+(-30)');

      // Filtres de couleur eq, hue, gblur
      expect(result.filterComplex).toContain('eq=brightness=0.100:contrast=1.200:saturation=1.300');
      expect(result.filterComplex).toContain('hue=h=25');
      expect(result.filterComplex).toContain('gblur=sigma=3');
    });

    it('génère les filtres de vitesse variable (setpts et atempo) pour l\'accéléré et le ralenti', () => {
      const proj = createDefaultProject('Projet Speed');
      const vidAsset: MediaAsset = {
        asset_id: 'vid-speed',
        display_name: 'clip.mp4',
        media_kind: 'video',
        source_path: 'C:/clip.mp4',
        duration_us: 20_000_000,
        native_width: 1920,
        native_height: 1080,
        detected_fps: 30,
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
      };
      proj.asset_catalog = [vidAsset];

      // Clip vidéo accéléré 2x : dure 3s sur timeline, donc consomme 6s de source
      const fastItem: TimelineItem = {
        item_id: 'item-fast',
        referenced_asset_id: 'vid-speed',
        placement_time_us: 1_000_000, // 1s
        play_duration_us: 3_000_000,  // 3s
        source_in_point_us: 0,
        source_duration_us: 6_000_000,
        item_gain: 1.0,
        playback_speed: 2.0,
      };

      proj.sequence.lanes[0].items = [fastItem];
      proj.sequence.total_length_us = 5_000_000;

      const result = buildFFmpegCommand(proj);

      // Vidéo : trim de 6s source, puis setpts divisé par 2
      expect(result.filterComplex).toContain('trim=start=0.000:duration=6.000');
      expect(result.filterComplex).toContain('setpts=(PTS-STARTPTS)/2.0000+1.000/TB');

      // Audio : atrim de 6s source, puis atempo=2
      expect(result.filterComplex).toContain('atrim=start=0.000:duration=6.000');
      expect(result.filterComplex).toContain('atempo=2');
    });
  });

  describe('Transitions visuelles entre clips (Étape 10)', () => {
    it('génère les filtres FFmpeg de fondu appropriés pour chaque type de transition', () => {
      const proj = createDefaultProject('Projet Transitions');
      const assetVid: MediaAsset = {
        asset_id: 'vid-trans',
        display_name: 'clip.mp4',
        media_kind: 'video',
        source_path: 'C:/clip.mp4',
        duration_us: 10_000_000,
        native_width: 1920,
        native_height: 1080,
        detected_fps: 30,
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
      };
      proj.asset_catalog = [assetVid];

      // Test 1: Fondu enchaîné (crossfade)
      const itemCrossfade: TimelineItem = {
        item_id: 'item-cf',
        referenced_asset_id: 'vid-trans',
        placement_time_us: 2_000_000, // 2s
        play_duration_us: 5_000_000,
        source_in_point_us: 0,
        source_duration_us: 5_000_000,
        item_gain: 1.0,
        transition_in: {
          transition_type: 'crossfade',
          duration_us: 1_500_000, // 1.5s
        },
      };

      proj.sequence.lanes[0].items = [itemCrossfade];
      proj.sequence.total_length_us = 7_000_000;

      let result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('format=rgba,fade=t=in:st=2.000:d=1.500:alpha=1');

      // Test 2: Fondu au noir (fade_to_black)
      itemCrossfade.transition_in = {
        transition_type: 'fade_to_black',
        duration_us: 1_000_000,
      };
      result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('fade=t=in:st=2.000:d=1.000:color=black');

      // Test 3: Fondu au blanc (dip_to_white)
      itemCrossfade.transition_in = {
        transition_type: 'dip_to_white',
        duration_us: 800_000,
      };
      result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('fade=t=in:st=2.000:d=0.800:color=white');

      // Test 4: Balayage gauche (wipe_left)
      itemCrossfade.transition_in = {
        transition_type: 'wipe_left',
        duration_us: 1_200_000,
      };
      result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('format=rgba,fade=t=in:st=2.000:d=1.200:alpha=1');
    });
  });

  describe('Effets vidéo, Filtres FX et Miroir H/V (Étape 11)', () => {
    it('génère les filtres FFmpeg de miroir (hflip, vflip) et les effets artistiques', () => {
      const proj = createDefaultProject('Projet FX');
      const assetVid: MediaAsset = {
        asset_id: 'vid-fx',
        display_name: 'scene.mp4',
        media_kind: 'video',
        source_path: 'C:/scene.mp4',
        duration_us: 10_000_000,
        native_width: 1920,
        native_height: 1080,
        detected_fps: 30,
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
      };
      proj.asset_catalog = [assetVid];

      // Test 1: Miroir H & V
      const itemFx: TimelineItem = {
        item_id: 'item-fx-1',
        referenced_asset_id: 'vid-fx',
        placement_time_us: 0,
        play_duration_us: 5_000_000,
        source_in_point_us: 0,
        source_duration_us: 5_000_000,
        item_gain: 1.0,
        spatial_placement: {
          offset_x_px: 0,
          offset_y_px: 0,
          zoom_factor_x: 1.0,
          zoom_factor_y: 1.0,
          rotation_degrees: 0,
          opacity_ratio: 1.0,
          flip_horizontal: true,
          flip_vertical: true,
        },
        video_effects: {
          preset: 'sepia',
          vignette_amount: 0.6,
        },
      };

      proj.sequence.lanes[0].items = [itemFx];
      proj.sequence.total_length_us = 5_000_000;

      let result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('hflip');
      expect(result.filterComplex).toContain('vflip');
      expect(result.filterComplex).toContain('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
      expect(result.filterComplex).toContain('vignette=');

      // Test 2: Monochrome & Invert
      itemFx.spatial_placement = {
        offset_x_px: 0,
        offset_y_px: 0,
        zoom_factor_x: 1.0,
        zoom_factor_y: 1.0,
        rotation_degrees: 0,
        opacity_ratio: 1.0,
        flip_horizontal: false,
        flip_vertical: false,
      };
      itemFx.video_effects = { preset: 'monochrome' };
      result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('hue=s=0');
      expect(result.filterComplex).not.toContain('hflip');

      itemFx.video_effects = { preset: 'invert' };
      result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('negate');

      itemFx.video_effects = { preset: 'vintage' };
      result = buildFFmpegCommand(proj);
      expect(result.filterComplex).toContain('curves=vintage');
    });
  });

  describe('Isolation Solo et Mute pour l\'audio', () => {
    it('ignore les pistes rendues silencieuses par le mode Solo ou Mute', () => {
      const proj = createDefaultProject('Projet Audio Mute');
      const assetA: MediaAsset = {
        asset_id: 'a1',
        display_name: 'a1.mp3',
        media_kind: 'audio',
        source_path: 'C:/a1.mp3',
        duration_us: 5_000_000,
        native_width: 0,
        native_height: 0,
        detected_fps: 0,
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
      };
      const assetB: MediaAsset = {
        asset_id: 'a2',
        display_name: 'a2.mp3',
        media_kind: 'audio',
        source_path: 'C:/a2.mp3',
        duration_us: 5_000_000,
        native_width: 0,
        native_height: 0,
        detected_fps: 0,
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
      };
      proj.asset_catalog = [assetA, assetB];

      // Piste 2 avec assetA en Solo
      proj.sequence.lanes[2].is_solo = true;
      proj.sequence.lanes[2].items = [{
        item_id: 'ia1',
        referenced_asset_id: 'a1',
        placement_time_us: 0,
        play_duration_us: 5_000_000,
        source_in_point_us: 0,
        source_duration_us: 5_000_000,
        item_gain: 1.0,
      }];

      // Piste 0 non solo avec assetB (qui a de l'audio)
      proj.sequence.lanes[0].items = [{
        item_id: 'ia2',
        referenced_asset_id: 'a2',
        placement_time_us: 0,
        play_duration_us: 5_000_000,
        source_in_point_us: 0,
        source_duration_us: 5_000_000,
        item_gain: 1.0,
      }];

      proj.sequence.total_length_us = 5_000_000;

      const result = buildFFmpegCommand(proj);
      // Seul a1.mp3 doit être présent dans le flux audio mixé
      expect(result.inputFiles).toContain('C:/a1.mp3');
      expect(result.filterComplex).toContain('[0:a]atrim');
      expect(result.filterComplex).not.toContain('amix=inputs=2');
    });
  });

  describe('Génération des scripts batch et shell', () => {
    it('produit un script Windows .bat et un script Linux/macOS .sh valides', () => {
      const proj = createDefaultProject('Mon Export');
      const result = buildFFmpegCommand(proj, { outputFilename: 'rendu.mp4' });

      const batContent = generateWindowsBatch(result);
      expect(batContent).toContain('@echo off');
      expect(batContent).toContain('rendu.mp4');
      expect(batContent).toContain('where ffmpeg');

      const shContent = generateBashScript(result);
      expect(shContent).toContain('#!/usr/bin/env bash');
      expect(shContent).toContain('rendu.mp4');
      expect(shContent).toContain('command -v ffmpeg');
    });
  });
});

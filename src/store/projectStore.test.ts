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

  describe('calques texte', () => {
    it('addTextItem — ajoute un item texte sur la piste text_overlay et le sélectionne', () => {
      useProjectStore.getState().addTextItem('Hello Kroma', 1_000_000);

      const state = useProjectStore.getState();
      const textLane = state.project.sequence.lanes.find((l) => l.lane_type === 'text_overlay');
      expect(textLane).toBeDefined();
      expect(textLane!.items).toHaveLength(1);

      const item = textLane!.items[0];
      expect(item.text_layer_data!.raw_string).toBe('Hello Kroma');
      expect(item.placement_time_us).toBe(1_000_000);
      expect(item.play_duration_us).toBe(4_000_000);

      // Le nouvel item doit être sélectionné
      expect(state.selectedItemId).toBe(item.item_id);
    });

    it('updateTextLayerData — met à jour le contenu et la police du calque texte', () => {
      useProjectStore.getState().addTextItem('Initial');
      const itemId = useProjectStore.getState().selectedItemId!;

      useProjectStore.getState().updateTextLayerData(itemId, {
        raw_string: 'Modifié',
        font_name: 'Georgia, serif',
        fill_color_hex: '#FF0000',
        is_bold: false,
      });

      const state = useProjectStore.getState();
      const textLane = state.project.sequence.lanes.find((l) => l.lane_type === 'text_overlay');
      const item = textLane!.items.find((i) => i.item_id === itemId);
      expect(item!.text_layer_data!.raw_string).toBe('Modifié');
      expect(item!.text_layer_data!.font_name).toBe('Georgia, serif');
      expect(item!.text_layer_data!.fill_color_hex).toBe('#FF0000');
      expect(item!.text_layer_data!.is_bold).toBe(false);
      // Les champs non modifiés restent inchangés
      expect(item!.text_layer_data!.text_align).toBe('center');
    });

    it('updateTextLayerData — sans effet si l\'itemId est invalide', () => {
      useProjectStore.getState().addTextItem('Test');
      const stateBefore = useProjectStore.getState().project;
      useProjectStore.getState().updateTextLayerData('item_inexistant', { raw_string: 'Hack' });
      const stateAfter = useProjectStore.getState().project;
      // La séquence ne doit pas être modifiée
      const textLane = stateAfter.sequence.lanes.find((l) => l.lane_type === 'text_overlay');
      expect(textLane!.items[0].text_layer_data!.raw_string).toBe('Test');
      // modified_timestamp peut changer (set() est appelé), on vérifie juste le contenu
      expect(stateBefore.sequence.lanes.length).toBe(stateAfter.sequence.lanes.length);
    });
  });

  describe('mixage audio & contrôles de volume (Étape 5)', () => {
    it('toggleLaneSolo — bascule l\'état solo de la piste', () => {
      const state = useProjectStore.getState();
      const laneId = state.project.sequence.lanes[0].lane_id;

      expect(state.project.sequence.lanes[0].is_solo).toBeFalsy();
      useProjectStore.getState().toggleLaneSolo(laneId);

      const updated = useProjectStore.getState();
      expect(updated.project.sequence.lanes[0].is_solo).toBe(true);

      useProjectStore.getState().toggleLaneSolo(laneId);
      expect(useProjectStore.getState().project.sequence.lanes[0].is_solo).toBe(false);
    });

    it('updateLaneGain — met à jour et borne le gain de la piste', () => {
      const state = useProjectStore.getState();
      const laneId = state.project.sequence.lanes[0].lane_id;

      // Réglage à 1.5 (150%)
      useProjectStore.getState().updateLaneGain(laneId, 1.5);
      expect(useProjectStore.getState().project.sequence.lanes[0].gain_level).toBe(1.5);

      // Borne supérieure à 2.0
      useProjectStore.getState().updateLaneGain(laneId, 3.5);
      expect(useProjectStore.getState().project.sequence.lanes[0].gain_level).toBe(2.0);

      // Borne inférieure à 0.0
      useProjectStore.getState().updateLaneGain(laneId, -0.5);
      expect(useProjectStore.getState().project.sequence.lanes[0].gain_level).toBe(0.0);
    });

    it('updateClipFade — configure le fondu d\'entrée et de sortie', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

      const itemId = useProjectStore.getState().selectedItemId!;
      useProjectStore.getState().updateClipFade(itemId, 1_500_000, 2_000_000);

      const state = useProjectStore.getState();
      const lane = state.project.sequence.lanes.find((l) => l.lane_type === 'visual')!;
      const item = lane.items.find((i) => i.item_id === itemId)!;

      expect(item.fade_in_duration_us).toBe(1_500_000);
      expect(item.fade_out_duration_us).toBe(2_000_000);
    });
  });

  describe('historique Undo / Redo & Persistance (Étape 6)', () => {
    it('undo() et redo() rétablissent les états précédents du projet', () => {
      // 1. Initialement vide
      expect(useProjectStore.getState().canUndo).toBe(false);
      expect(useProjectStore.getState().canRedo).toBe(false);

      // 2. Ajout d'un asset
      useProjectStore.getState().addAsset(dummyVideoAsset);
      expect(useProjectStore.getState().project.asset_catalog).toHaveLength(1);
      expect(useProjectStore.getState().canUndo).toBe(true);
      expect(useProjectStore.getState().canRedo).toBe(false);

      // 3. Annuler (Undo) -> Catalogue redevient vide
      useProjectStore.getState().undo();
      expect(useProjectStore.getState().project.asset_catalog).toHaveLength(0);
      expect(useProjectStore.getState().canUndo).toBe(false);
      expect(useProjectStore.getState().canRedo).toBe(true);

      // 4. Rétablir (Redo) -> Asset restauré
      useProjectStore.getState().redo();
      expect(useProjectStore.getState().project.asset_catalog).toHaveLength(1);
      expect(useProjectStore.getState().canUndo).toBe(true);
      expect(useProjectStore.getState().canRedo).toBe(false);
    });

    it('undo() rétablit la position temporelle d\'un clip déplacé', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

      const itemId = useProjectStore.getState().selectedItemId!;
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;

      // Déplacer à 5s
      useProjectStore.getState().moveTimelineItem(itemId, laneId, 5_000_000);
      expect(useProjectStore.getState().project.sequence.lanes[0].items[0].placement_time_us).toBe(5_000_000);

      // Annuler -> revient à 0s
      useProjectStore.getState().undo();
      expect(useProjectStore.getState().project.sequence.lanes[0].items[0].placement_time_us).toBe(0);

      // Rétablir -> revient à 5s
      useProjectStore.getState().redo();
      expect(useProjectStore.getState().project.sequence.lanes[0].items[0].placement_time_us).toBe(5_000_000);
    });

    it('loadProjectFromJson() charge un projet valide et réinitialise l\'historique', () => {
      const validKproj = JSON.stringify({
        kroma_version: '1.0.0',
        project_uuid: 'test_uuid_123',
        project_name: 'Projet Importé',
        created_timestamp_utc: 1000000,
        modified_timestamp_utc: 1000000,
        timeline_canvas: {
          viewport_width: 1920,
          viewport_height: 1080,
          frame_rate_fps: 60,
          audio_sample_rate_hz: 48000,
          background_color_hex: '#000000',
        },
        asset_catalog: [dummyVideoAsset],
        sequence: {
          total_length_us: 10_000_000,
          lanes: [
            {
              lane_id: 'l1',
              lane_title: 'Vidéo',
              lane_type: 'visual',
              stack_index: 0,
              is_muted: false,
              is_locked: false,
              gain_level: 1.0,
              items: [],
            },
          ],
        },
      });

      const success = useProjectStore.getState().loadProjectFromJson(validKproj);
      expect(success).toBe(true);

      const state = useProjectStore.getState();
      expect(state.project.project_name).toBe('Projet Importé');
      expect(state.project.project_uuid).toBe('test_uuid_123');
      expect(state.project.asset_catalog).toHaveLength(1);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.isDirty).toBe(false);
    });

    it('loadProjectFromJson() rejette un JSON invalide ou corrompu sans planter', () => {
      const invalidJson = '{ "mauvais": "format" }';
      const success = useProjectStore.getState().loadProjectFromJson(invalidJson);
      expect(success).toBe(false);

      const corrupted = 'Ceci n\'est pas du JSON';
      const success2 = useProjectStore.getState().loadProjectFromJson(corrupted);
      expect(success2).toBe(false);
    });

    it('createNewProject() réinitialise complètement le projet et l\'historique', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      expect(useProjectStore.getState().canUndo).toBe(true);

      useProjectStore.getState().createNewProject('Tout Nouveau');
      const state = useProjectStore.getState();
      expect(state.project.project_name).toBe('Tout Nouveau');
      expect(state.project.asset_catalog).toHaveLength(0);
      expect(state.canUndo).toBe(false);
      expect(state.canRedo).toBe(false);
      expect(state.isDirty).toBe(false);
    });

    it('openExportDialog() et closeExportDialog() gèrent l\'affichage de la boîte d\'export', () => {
      expect(useProjectStore.getState().isExportDialogOpen).toBe(false);

      useProjectStore.getState().openExportDialog();
      expect(useProjectStore.getState().isExportDialogOpen).toBe(true);

      useProjectStore.getState().closeExportDialog();
      expect(useProjectStore.getState().isExportDialogOpen).toBe(false);
    });

    it('updateClipColorAdjustments() et resetClipColorAdjustments() modifient l\'étalonnage avec support Undo', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // Application de réglages de couleur
      useProjectStore.getState().updateClipColorAdjustments(itemId, {
        brightness: 0.2,
        contrast: 0.15,
        saturation: 0.5,
        hue_degrees: 30,
        blur_px: 4,
      });

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.color_adjustments).toBeDefined();
      expect(item.color_adjustments?.brightness).toBe(0.2);
      expect(item.color_adjustments?.contrast).toBe(0.15);
      expect(item.color_adjustments?.saturation).toBe(0.5);
      expect(item.color_adjustments?.hue_degrees).toBe(30);
      expect(item.color_adjustments?.blur_px).toBe(4);

      // Réinitialisation
      useProjectStore.getState().resetClipColorAdjustments(itemId);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.color_adjustments).toBeUndefined();

      // Undo restaure les réglages
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.color_adjustments?.brightness).toBe(0.2);
    });

    it('resetClipPlacement() réinitialise l\'échelle, la position, la rotation et l\'opacité avec Undo/Redo', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // Modifier la transformation
      useProjectStore.getState().updateClipPlacement(itemId, {
        zoom_factor_x: 1.8,
        zoom_factor_y: 1.8,
        offset_x_px: 120,
        offset_y_px: -50,
        rotation_degrees: 45,
        opacity_ratio: 0.7,
      });

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.zoom_factor_x).toBe(1.8);
      expect(item.spatial_placement?.offset_x_px).toBe(120);
      expect(item.spatial_placement?.rotation_degrees).toBe(45);

      // Réinitialisation
      useProjectStore.getState().resetClipPlacement(itemId);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.zoom_factor_x).toBe(1.0);
      expect(item.spatial_placement?.zoom_factor_y).toBe(1.0);
      expect(item.spatial_placement?.offset_x_px).toBe(0);
      expect(item.spatial_placement?.offset_y_px).toBe(0);
      expect(item.spatial_placement?.rotation_degrees).toBe(0);
      expect(item.spatial_placement?.opacity_ratio).toBe(1.0);

      // Undo restaure les transformations personnalisées
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.zoom_factor_x).toBe(1.8);
      expect(item.spatial_placement?.offset_x_px).toBe(120);
    });

    it('updateClipSpeed() modifie la vitesse de lecture avec bornage et support Undo/Redo', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // Passage à 2.0x (accéléré)
      useProjectStore.getState().updateClipSpeed(itemId, 2.0);
      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBe(2.0);

      // Bornage inférieur à 0.25x
      useProjectStore.getState().updateClipSpeed(itemId, 0.1);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBe(0.25);

      // Bornage supérieur à 4.0x
      useProjectStore.getState().updateClipSpeed(itemId, 10.0);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBe(4.0);

      // Annuler (Undo) revient à 0.25x
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBe(0.25);

      // Rétablir (Redo) revient à 4.0x
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBe(4.0);
    });

    it('pushHistorySnapshot() permet de restaurer le réglage de slider précédent en un seul Undo sans pollution d\'historique', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);
      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Début d'interaction slider : capture de snapshot initial (vitesse = 1.0)
      useProjectStore.getState().pushHistorySnapshot();

      // 2. Glissement continu du slider (plusieurs micro-étapes avec commitHistory = false)
      useProjectStore.getState().updateClipSpeed(itemId, 1.25, false);
      useProjectStore.getState().updateClipSpeed(itemId, 1.5, false);
      useProjectStore.getState().updateClipSpeed(itemId, 2.0, false);
      useProjectStore.getState().updateClipSpeed(itemId, 2.75, false);

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBe(2.75);

      // 3. Un seul Ctrl+Z (undo) doit restaurer DIRECTEMENT l'état initial avant le glisser
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.playback_speed).toBeUndefined(); // Vitesse originale par défaut (1.0x)
    });

    it('updateClipTransition() configure, modifie et supprime les transitions avec Undo/Redo', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);
      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Ajout d'une transition enchaînée (crossfade de 1.5s)
      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'crossfade',
        duration_us: 1_500_000,
      });

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in).toBeDefined();
      expect(item.transition_in?.transition_type).toBe('crossfade');
      expect(item.transition_in?.duration_us).toBe(1_500_000);

      // 2. Changement de transition (fondu au noir de 2s)
      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'fade_to_black',
        duration_us: 2_000_000,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('fade_to_black');
      expect(item.transition_in?.duration_us).toBe(2_000_000);

      // 3. Suppression de la transition
      useProjectStore.getState().updateClipTransition(itemId, undefined);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in).toBeUndefined();

      // 4. Undo rétablit le fondu au noir
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('fade_to_black');

      // 5. Redo rétablit la suppression
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in).toBeUndefined();
    });

    it('toggleClipFlipHorizontal() et toggleClipFlipVertical() inversent l\'orientation avec Undo/Redo (Étape 11)', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);
      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Activer le miroir horizontal
      useProjectStore.getState().toggleClipFlipHorizontal(itemId);
      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.flip_horizontal).toBe(true);

      // 2. Activer le miroir vertical
      useProjectStore.getState().toggleClipFlipVertical(itemId);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.flip_vertical).toBe(true);

      // 3. Annuler (Undo) le miroir vertical
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.flip_vertical).toBeFalsy();
      expect(item.spatial_placement?.flip_horizontal).toBe(true);

      // 4. Annuler (Undo) le miroir horizontal
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.flip_horizontal).toBeFalsy();

      // 5. Rétablir (Redo)
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.spatial_placement?.flip_horizontal).toBe(true);
    });

    it('updateClipEffects() applique des presets FX et du vignettage avec Undo/Redo (Étape 11)', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);
      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Appliquer le preset Monochrome
      useProjectStore.getState().updateClipEffects(itemId, { preset: 'monochrome' });
      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('monochrome');

      // 2. Changer pour Sépia et ajouter un vignettage
      useProjectStore.getState().updateClipEffects(itemId, { preset: 'sepia', vignette_amount: 0.8 });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('sepia');
      expect(item.video_effects?.vignette_amount).toBe(0.8);

      // 3. Réinitialiser les effets (suppression)
      useProjectStore.getState().updateClipEffects(itemId, undefined);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects).toBeUndefined();

      // 4. Undo rétablit les effets précédents
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('sepia');
      expect(item.video_effects?.vignette_amount).toBe(0.8);
    });
  });

  describe('Ratios de Canevas Multi-formats (Étape 12)', () => {
    it('setCanvasAspectRatio() met à jour les dimensions vers 9:16 (TikTok/Shorts) et gère Undo/Redo', () => {
      // Canevas initial : 16:9 1920x1080
      expect(useProjectStore.getState().project.timeline_canvas.viewport_width).toBe(1920);
      expect(useProjectStore.getState().project.timeline_canvas.viewport_height).toBe(1080);
      expect(useProjectStore.getState().project.timeline_canvas.aspect_ratio).toBe('16:9');

      // Bascule vers 9:16 (format vertical)
      useProjectStore.getState().setCanvasAspectRatio('9:16');
      let canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1080);
      expect(canvas.viewport_height).toBe(1920);
      expect(canvas.aspect_ratio).toBe('9:16');
      expect(useProjectStore.getState().canUndo).toBe(true);

      // Bascule vers 1:1 (format carré)
      useProjectStore.getState().setCanvasAspectRatio('1:1');
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1080);
      expect(canvas.viewport_height).toBe(1080);
      expect(canvas.aspect_ratio).toBe('1:1');

      // Bascule vers 4:5 (format portrait feed)
      useProjectStore.getState().setCanvasAspectRatio('4:5');
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1080);
      expect(canvas.viewport_height).toBe(1350);
      expect(canvas.aspect_ratio).toBe('4:5');

      // Undo -> revient à 1:1
      useProjectStore.getState().undo();
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1080);
      expect(canvas.viewport_height).toBe(1080);
      expect(canvas.aspect_ratio).toBe('1:1');

      // Undo -> revient à 9:16
      useProjectStore.getState().undo();
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1080);
      expect(canvas.viewport_height).toBe(1920);
      expect(canvas.aspect_ratio).toBe('9:16');

      // Undo -> revient à 16:9
      useProjectStore.getState().undo();
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1920);
      expect(canvas.viewport_height).toBe(1080);
      expect(canvas.aspect_ratio).toBe('16:9');

      // Redo -> réapplique 9:16
      useProjectStore.getState().redo();
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1080);
      expect(canvas.viewport_height).toBe(1920);
      expect(canvas.aspect_ratio).toBe('9:16');
    });

    it('setCanvasDimensions() ajuste des dimensions arbitraires et détecte le bon ratio', () => {
      // Dimensions 4:3
      useProjectStore.getState().setCanvasDimensions(1440, 1080);
      let canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1440);
      expect(canvas.viewport_height).toBe(1080);
      expect(canvas.aspect_ratio).toBe('4:3');

      // Dimensions personnalisées exotiques
      useProjectStore.getState().setCanvasDimensions(800, 600);
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(800);
      expect(canvas.viewport_height).toBe(600);
      expect(canvas.aspect_ratio).toBe('4:3'); // 800/600 = 1.333 = 4:3

      useProjectStore.getState().setCanvasDimensions(1200, 700);
      canvas = useProjectStore.getState().project.timeline_canvas;
      expect(canvas.viewport_width).toBe(1200);
      expect(canvas.viewport_height).toBe(700);
      expect(canvas.aspect_ratio).toBe('custom');
    });
  });

  describe('Effets dynamiques & Transitions CapCut (Étape 13)', () => {
    it('applique des effets dynamiques de secousse et stroboscope avec intensité et vitesse (Étape 13)', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);
      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Appliquer x_shake avec intensité 1.5 et vitesse 1.8
      useProjectStore.getState().updateClipEffects(itemId, {
        preset: 'x_shake',
        intensity: 1.5,
        speed: 1.8,
      });

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('x_shake');
      expect(item.video_effects?.intensity).toBe(1.5);
      expect(item.video_effects?.speed).toBe(1.8);

      // 2. Modifier vers camera_shake
      useProjectStore.getState().updateClipEffects(itemId, {
        preset: 'camera_shake',
        intensity: 2.0,
        speed: 1.2,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('camera_shake');
      expect(item.video_effects?.intensity).toBe(2.0);

      // 3. Modifier vers tremor_strobe
      useProjectStore.getState().updateClipEffects(itemId, {
        preset: 'tremor_strobe',
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('tremor_strobe');

      // 4. Modifier vers strobe_white puis strobe_black
      useProjectStore.getState().updateClipEffects(itemId, {
        preset: 'strobe_white',
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('strobe_white');

      useProjectStore.getState().updateClipEffects(itemId, {
        preset: 'strobe_black',
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('strobe_black');

      // 5. Undo revient à strobe_white
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('strobe_white');

      // 6. Undo revient à tremor_strobe
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('tremor_strobe');

      // 7. Redo réapplique strobe_white
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.video_effects?.preset).toBe('strobe_white');
    });

    it('applique les transitions avancées CapCut (zoom, spin, strobe, balayages) avec Undo/Redo (Étape 13)', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);
      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Transition zoom_in
      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'zoom_in',
        duration_us: 800_000,
      });
      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('zoom_in');
      expect(item.transition_in?.duration_us).toBe(800_000);

      // 2. Transition spin
      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'spin',
        duration_us: 1_200_000,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('spin');
      expect(item.transition_in?.duration_us).toBe(1_200_000);

      // 3. Transition strobe
      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'strobe',
        duration_us: 500_000,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('strobe');

      // 4. Balayages multidirectionnels : wipe_right, wipe_up, wipe_down
      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'wipe_right',
        duration_us: 600_000,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('wipe_right');

      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'wipe_up',
        duration_us: 600_000,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('wipe_up');

      useProjectStore.getState().updateClipTransition(itemId, {
        transition_type: 'wipe_down',
        duration_us: 600_000,
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('wipe_down');

      // 5. Annuler la transition (suppression)
      useProjectStore.getState().updateClipTransition(itemId, undefined);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in).toBeUndefined();

      // 6. Undo rétablit wipe_down
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.transition_in?.transition_type).toBe('wipe_down');
    });
  });

  describe('Animation par Images-Clés / Keyframing (Étape 14)', () => {
    it('ajoute, met à jour et supprime des images-clés avec support complet Undo / Redo', () => {
      useProjectStore.getState().createNewProject('Test Keyframing');
      useProjectStore.getState().addAsset(dummyVideoAsset);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Ajouter deux images-clés d'échelle (Zoom en facteur : 1.0 = 100%, 2.0 = 200%)
      useProjectStore.getState().addOrUpdateClipKeyframe(itemId, 'scale', 0, 1.0, 'linear');
      useProjectStore.getState().addOrUpdateClipKeyframe(itemId, 'scale', 2_000_000, 2.0, 'ease_in');

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale).toBeDefined();
      expect(item.keyframes?.scale).toHaveLength(2);
      expect(item.keyframes?.scale?.[0].value).toBe(1.0);
      expect(item.keyframes?.scale?.[1].value).toBe(2.0);
      expect(item.keyframes?.scale?.[1].interpolation).toBe('ease_in');

      // 2. Ajouter une image-clé de Position X
      useProjectStore.getState().addOrUpdateClipKeyframe(itemId, 'position_x', 1_000_000, 50, 'ease_out');
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.position_x).toHaveLength(1);
      expect(item.keyframes?.position_x?.[0].value).toBe(50);

      // 3. Supprimer une image-clé
      const scaleKfId = item.keyframes?.scale?.[1].id!;
      useProjectStore.getState().removeClipKeyframe(itemId, 'scale', scaleKfId);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale).toHaveLength(1);

      // 4. Undo rétablit la 2ème image-clé
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale).toHaveLength(2);
      expect(item.keyframes?.scale?.[1].value).toBe(2.0);

      // 5. Redo re-supprime
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale).toHaveLength(1);

      // 6. clearAllClipKeyframes supprime toutes les animations
      useProjectStore.getState().clearAllClipKeyframes(itemId);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes).toBeUndefined();

      // 7. Undo rétablit les images-clés
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.position_x).toHaveLength(1);
    });

    it('une image-clé seule préserve la valeur par défaut sans déformation (zoom 100%), puis une seconde crée l\'interpolation', async () => {
      useProjectStore.getState().createNewProject('Test Single Keyframe');
      useProjectStore.getState().addAsset(dummyVideoAsset);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // Ajouter UNE SEULE image-clé à 1.5s avec zoom normal (1.0 = 100%)
      useProjectStore.getState().addOrUpdateClipKeyframe(itemId, 'scale', 1_500_000, 1.0, 'linear');

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale).toHaveLength(1);
      expect(item.keyframes?.scale?.[0].value).toBe(1.0);

      // Résolution temporelle via getInterpolatedPlacement :
      // À 0s (avant la keyframe) -> doit rester 1.0 (100%), pas 10000%
      const { getInterpolatedPlacement } = await import('../core/animation/keyframeInterpolation');
      let placementAt0 = getInterpolatedPlacement(item, 0);
      expect(placementAt0.zoom_factor_x).toBe(1.0);

      // À 1.5s (sur la keyframe) -> 1.0
      let placementAt15 = getInterpolatedPlacement(item, 1_500_000);
      expect(placementAt15.zoom_factor_x).toBe(1.0);

      // À 4s (après la keyframe) -> 1.0
      let placementAt4 = getInterpolatedPlacement(item, 4_000_000);
      expect(placementAt4.zoom_factor_x).toBe(1.0);

      // Maintenant, ajouter une deuxième image-clé à 3.0s avec zoom 1.8 (180%)
      useProjectStore.getState().addOrUpdateClipKeyframe(itemId, 'scale', 3_000_000, 1.8, 'linear');
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale).toHaveLength(2);

      // Vérifier l'interpolation progressive :
      // À 1.5s -> 1.0
      expect(getInterpolatedPlacement(item, 1_500_000).zoom_factor_x).toBe(1.0);
      // À 2.25s (mi-chemin) -> 1.4 (140%)
      expect(getInterpolatedPlacement(item, 2_250_000).zoom_factor_x).toBeCloseTo(1.4);
      // À 3.0s -> 1.8 (180%)
      expect(getInterpolatedPlacement(item, 3_000_000).zoom_factor_x).toBe(1.8);
      // À 4.0s (après la 2ème keyframe) -> 1.8
      expect(getInterpolatedPlacement(item, 4_000_000).zoom_factor_x).toBe(1.8);
    });

    it('moveClipKeyframes() déplace une image-clé dans le temps et supporte Undo / Redo', () => {
      useProjectStore.getState().createNewProject('Test Move Keyframe');
      useProjectStore.getState().addAsset(dummyVideoAsset);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // Ajouter une keyframe de scale à 1.0s
      useProjectStore.getState().addOrUpdateClipKeyframe(itemId, 'scale', 1_000_000, 1.5, 'linear');
      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      const kfId = item.keyframes?.scale?.[0].id!;

      // Enregistrer un snapshot d'historique (comme fait au début du drag à la souris)
      useProjectStore.getState().pushHistorySnapshot();

      // Déplacer la keyframe vers 2.5s (drag en temps réel)
      useProjectStore.getState().moveClipKeyframes(itemId, [kfId], 2_500_000, false);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale?.[0].time_offset_us).toBe(2_500_000);
      expect(item.keyframes?.scale?.[0].value).toBe(1.5);

      // Undo -> revient à 1.0s
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale?.[0].time_offset_us).toBe(1_000_000);

      // Redo -> ré-applique 2.5s
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.keyframes?.scale?.[0].time_offset_us).toBe(2_500_000);
    });
  });

  describe('Incrustation Fond Vert / Chroma Key (Étape 15)', () => {
    it('active, met à jour et désactive le Chroma Key avec support Undo / Redo', () => {
      useProjectStore.getState().createNewProject('Test Chroma Key');
      useProjectStore.getState().addAsset(dummyVideoAsset);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, undefined, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Activer le Chroma Key avec vert studio
      useProjectStore.getState().updateClipChromaKey(itemId, {
        enabled: true,
        target_color: '#00B140',
        similarity: 0.35,
        smoothness: 0.12,
        spill_reduction: 0.6,
      });

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.chroma_key).toBeDefined();
      expect(item.chroma_key?.enabled).toBe(true);
      expect(item.chroma_key?.target_color).toBe('#00B140');
      expect(item.chroma_key?.similarity).toBe(0.35);
      expect(item.chroma_key?.smoothness).toBe(0.12);
      expect(item.chroma_key?.spill_reduction).toBe(0.6);

      // 2. Mettre à jour vers bleu studio
      useProjectStore.getState().updateClipChromaKey(itemId, {
        target_color: '#0047BB',
      });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.chroma_key?.target_color).toBe('#0047BB');

      // 3. Undo rétablit le vert #00B140
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.chroma_key?.target_color).toBe('#00B140');

      // 4. Désactiver le Chroma Key
      useProjectStore.getState().updateClipChromaKey(itemId, { enabled: false });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.chroma_key?.enabled).toBe(false);

      // 5. Supprimer le chroma key
      useProjectStore.getState().updateClipChromaKey(itemId, undefined);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.chroma_key).toBeUndefined();
    });

    it('updateClipMask() et resetClipMask() configurent le masque géométrique avec Undo/Redo (Étape 16)', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const laneId = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, laneId, 0);

      const itemId = useProjectStore.getState().project.sequence.lanes[0].items[0].item_id;

      // 1. Définir un masque circulaire
      useProjectStore.getState().updateClipMask(itemId, {
        mask_type: 'circle',
        width_percent: 65,
        height_percent: 65,
        center_x_percent: 10,
        center_y_percent: -5,
        feather_px: 8,
        inverted: false,
      });

      let item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.mask).toBeDefined();
      expect(item.mask?.mask_type).toBe('circle');
      expect(item.mask?.width_percent).toBe(65);
      expect(item.mask?.height_percent).toBe(65);
      expect(item.mask?.center_x_percent).toBe(10);
      expect(item.mask?.center_y_percent).toBe(-5);
      expect(item.mask?.feather_px).toBe(8);
      expect(item.mask?.inverted).toBe(false);

      // 2. Bascule en masque inversé
      useProjectStore.getState().updateClipMask(itemId, { inverted: true });
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.mask?.inverted).toBe(true);

      // 3. Undo rétablit inverted: false
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.mask?.inverted).toBe(false);

      // 4. Redo réapplique inverted: true
      useProjectStore.getState().redo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.mask?.inverted).toBe(true);

      // 5. Réinitialiser le masque
      useProjectStore.getState().resetClipMask(itemId);
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.mask).toBeUndefined();

      // 6. Undo rétablit le masque
      useProjectStore.getState().undo();
      item = useProjectStore.getState().project.sequence.lanes[0].items[0];
      expect(item.mask?.mask_type).toBe('circle');
    });

    it('gère l\'aimantation (snapping) et les marqueurs temporels avec Undo/Redo (Étape 17)', () => {
      // 1. Snapping toggle
      expect(useProjectStore.getState().isSnappingEnabled).toBe(true);
      useProjectStore.getState().toggleSnapping();
      expect(useProjectStore.getState().isSnappingEnabled).toBe(false);
      useProjectStore.getState().setSnappingEnabled(true);
      expect(useProjectStore.getState().isSnappingEnabled).toBe(true);

      // 2. Ajout de marqueurs
      useProjectStore.getState().addTimelineMarker(2_000_000, 'Intro', '#eab308');
      useProjectStore.getState().addTimelineMarker(5_000_000, 'Drop', '#ef4444');
      useProjectStore.getState().addTimelineMarker(1_000_000, 'Titre', '#06b6d4');

      let markers = useProjectStore.getState().project.sequence.markers || [];
      expect(markers.length).toBe(3);
      // Doivent être triés par ordre croissant de time_us
      expect(markers[0].time_us).toBe(1_000_000);
      expect(markers[0].label).toBe('Titre');
      expect(markers[1].time_us).toBe(2_000_000);
      expect(markers[2].time_us).toBe(5_000_000);

      // 3. Navigation entre marqueurs (jumpToNextMarker / jumpToPrevMarker)
      useProjectStore.getState().setCurrentTimeUs(0);
      useProjectStore.getState().jumpToNextMarker();
      expect(useProjectStore.getState().currentTimeUs).toBe(1_000_000);

      useProjectStore.getState().jumpToNextMarker();
      expect(useProjectStore.getState().currentTimeUs).toBe(2_000_000);

      useProjectStore.getState().jumpToPrevMarker();
      expect(useProjectStore.getState().currentTimeUs).toBe(1_000_000);

      // 4. Mise à jour de marqueur
      const markerId = markers[1].marker_id; // Marqueur à 2.0s
      useProjectStore.getState().updateTimelineMarker(markerId, { label: 'Intro Modifiée', color: '#22c55e' });
      markers = useProjectStore.getState().project.sequence.markers || [];
      const updated = markers.find((m) => m.marker_id === markerId);
      expect(updated?.label).toBe('Intro Modifiée');
      expect(updated?.color).toBe('#22c55e');

      // 5. Suppression d'un marqueur
      useProjectStore.getState().removeTimelineMarker(markerId);
      markers = useProjectStore.getState().project.sequence.markers || [];
      expect(markers.length).toBe(2);
      expect(markers.some((m) => m.marker_id === markerId)).toBe(false);

      // 6. Undo restaure le marqueur supprimé
      useProjectStore.getState().undo();
      markers = useProjectStore.getState().project.sequence.markers || [];
      expect(markers.length).toBe(3);
      expect(markers.some((m) => m.marker_id === markerId)).toBe(true);

      // 7. Redo réapplique la suppression
      useProjectStore.getState().redo();
      markers = useProjectStore.getState().project.sequence.markers || [];
      expect(markers.length).toBe(2);

      // 8. Tout effacer avec Undo
      useProjectStore.getState().clearTimelineMarkers();
      markers = useProjectStore.getState().project.sequence.markers || [];
      expect(markers.length).toBe(0);

      useProjectStore.getState().undo();
      markers = useProjectStore.getState().project.sequence.markers || [];
      expect(markers.length).toBe(2);
    });

    it('gère la sélection multiple (Ctrl+Clic), le déplacement groupé et la suppression multiple', () => {
      useProjectStore.getState().addAsset(dummyVideoAsset);
      const visualLane = useProjectStore.getState().project.sequence.lanes[0].lane_id;
      const audioLane = useProjectStore.getState().project.sequence.lanes[2].lane_id;

      // Ajouter 2 clips vidéo et 1 clip audio
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, visualLane, 0);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, visualLane, 5_000_000);
      useProjectStore.getState().addItemFromAsset(dummyVideoAsset, audioLane, 0);

      const itemsLane0 = useProjectStore.getState().project.sequence.lanes[0].items;
      const itemsLane2 = useProjectStore.getState().project.sequence.lanes[2].items;
      const id1 = itemsLane0[0].item_id;
      const id2 = itemsLane0[1].item_id;
      const id3 = itemsLane2[0].item_id;

      // 1. Sélection unique initiale
      useProjectStore.getState().setSelectedItemId(id1);
      expect(useProjectStore.getState().selectedItemId).toBe(id1);
      expect(useProjectStore.getState().selectedItemIds).toEqual([id1]);

      // 2. Ctrl+Clic pour ajouter id2
      useProjectStore.getState().toggleItemSelection(id2);
      expect(useProjectStore.getState().selectedItemIds).toContain(id1);
      expect(useProjectStore.getState().selectedItemIds).toContain(id2);
      expect(useProjectStore.getState().selectedItemIds.length).toBe(2);

      // 3. Ctrl+Clic pour ajouter id3
      useProjectStore.getState().toggleItemSelection(id3);
      expect(useProjectStore.getState().selectedItemIds.length).toBe(3);

      // 4. Ctrl+Clic pour retirer id2
      useProjectStore.getState().toggleItemSelection(id2);
      expect(useProjectStore.getState().selectedItemIds.length).toBe(2);
      expect(useProjectStore.getState().selectedItemIds).not.toContain(id2);

      // 5. Tout sélectionner (Ctrl+A)
      useProjectStore.getState().selectAllItems();
      expect(useProjectStore.getState().selectedItemIds.length).toBe(3);

      // 6. Déplacement groupé (moveMultipleTimelineItems)
      useProjectStore.getState().moveMultipleTimelineItems([
        { itemId: id1, targetLaneId: visualLane, newPlacementTimeUs: 1_000_000 },
        { itemId: id3, targetLaneId: audioLane, newPlacementTimeUs: 1_000_000 },
      ]);
      let item1 = useProjectStore.getState().project.sequence.lanes[0].items.find((i) => i.item_id === id1);
      let item3 = useProjectStore.getState().project.sequence.lanes[2].items.find((i) => i.item_id === id3);
      expect(item1?.placement_time_us).toBe(1_000_000);
      expect(item3?.placement_time_us).toBe(1_000_000);

      // 7. Désélectionner tout
      useProjectStore.getState().clearSelection();
      expect(useProjectStore.getState().selectedItemIds.length).toBe(0);
      expect(useProjectStore.getState().selectedItemId).toBeNull();

      // 8. Suppression multiple (removeSelectedItems) avec Undo/Redo
      useProjectStore.getState().setSelectedItemIds([id1, id3]);
      useProjectStore.getState().removeSelectedItems();
      expect(useProjectStore.getState().project.sequence.lanes[0].items.some((i) => i.item_id === id1)).toBe(false);
      expect(useProjectStore.getState().project.sequence.lanes[2].items.some((i) => i.item_id === id3)).toBe(false);
      expect(useProjectStore.getState().selectedItemIds.length).toBe(0);

      // Undo restaure les éléments
      useProjectStore.getState().undo();
      expect(useProjectStore.getState().project.sequence.lanes[0].items.some((i) => i.item_id === id1)).toBe(true);
      expect(useProjectStore.getState().project.sequence.lanes[2].items.some((i) => i.item_id === id3)).toBe(true);
    });

    it('gère le moteur de sous-titres (Étape 18) : ajout, import, export, édition et Undo/Redo', () => {
      // 1. Ajout d'un sous-titre unitaire
      useProjectStore.getState().setCurrentTimeUs(1_500_000);
      useProjectStore.getState().addSubtitleCue('Bonjour le monde', 1_500_000, 2_000_000);

      const subLane = useProjectStore.getState().project.sequence.lanes.find((l) => l.lane_type === 'subtitles');
      expect(subLane).toBeDefined();
      expect(subLane?.items.length).toBe(1);
      const cue1 = subLane?.items[0];
      expect(cue1?.text_layer_data?.raw_string).toBe('Bonjour le monde');
      expect(cue1?.placement_time_us).toBe(1_500_000);
      expect(cue1?.play_duration_us).toBe(2_000_000);

      // 2. Modification du texte
      useProjectStore.getState().updateSubtitleText(cue1!.item_id, 'Texte mis à jour');
      const updatedCue = useProjectStore.getState().project.sequence.lanes.find((l) => l.lane_type === 'subtitles')?.items[0];
      expect(updatedCue?.text_layer_data?.raw_string).toBe('Texte mis à jour');

      // 3. Import groupé de sous-titres (importSubtitles)
      const importedCues = [
        { cue_id: 'sub_a', start_time_us: 4_000_000, end_time_us: 6_000_000, text: 'Premier sous-titre importé' },
        { cue_id: 'sub_b', start_time_us: 7_000_000, end_time_us: 9_500_000, text: 'Deuxième sous-titre importé' },
      ];
      useProjectStore.getState().importSubtitles(importedCues, true);

      const importedLane = useProjectStore.getState().project.sequence.lanes.find((l) => l.lane_type === 'subtitles');
      expect(importedLane?.items.length).toBe(2);
      expect(importedLane?.items[0].text_layer_data?.raw_string).toBe('Premier sous-titre importé');
      expect(importedLane?.items[1].text_layer_data?.raw_string).toBe('Deuxième sous-titre importé');

      // 4. Exportation .SRT et .VTT
      const srtOutput = useProjectStore.getState().exportSubtitles('srt');
      expect(srtOutput).toContain('00:00:04,000 --> 00:00:06,000');
      expect(srtOutput).toContain('Premier sous-titre importé');

      const vttOutput = useProjectStore.getState().exportSubtitles('vtt');
      expect(vttOutput.startsWith('WEBVTT')).toBe(true);
      expect(vttOutput).toContain('00:00:07.000 --> 00:00:09.500');

      // 5. Mise à jour globale du style (taille, couleur, contour)
      useProjectStore.getState().updateSubtitlesStyle({
        font_size_pt: 32,
        fill_color_hex: '#f59e0b',
        has_background_box: true,
      });
      const styleUpdatedItem = useProjectStore.getState().project.sequence.lanes.find((l) => l.lane_type === 'subtitles')?.items[0];
      expect(styleUpdatedItem?.text_layer_data?.font_size_pt).toBe(32);
      expect(styleUpdatedItem?.text_layer_data?.fill_color_hex).toBe('#f59e0b');

      // 6. Nettoyage de la piste (clearSubtitlesLane) avec Undo
      useProjectStore.getState().clearSubtitlesLane();
      const clearedLane = useProjectStore.getState().project.sequence.lanes.find((l) => l.lane_type === 'subtitles');
      expect(clearedLane?.items.length).toBe(0);

      // Undo restaure les sous-titres
      useProjectStore.getState().undo();
      const restoredLane = useProjectStore.getState().project.sequence.lanes.find((l) => l.lane_type === 'subtitles');
      expect(restoredLane?.items.length).toBe(2);
    });
  });
});

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
  });
});

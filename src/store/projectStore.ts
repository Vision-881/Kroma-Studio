/**
 * Store Zustand principal du projet Kroma.
 * Gère l'état global du projet : catalogue d'assets, timeline multipiste,
 * tête de lecture et sélection d'éléments.
 */
import { create } from 'zustand';
import type { MediaAsset } from '../core/types/asset';
import { type KromaProject, createDefaultProject } from '../core/types/project';
import type { SpatialPlacement, TextLayerData } from '../core/types/timeline';
import {
  createItemFromAsset,
  createTextItem,
  addItemToLane,
  removeItemFromSequence,
  moveItemInSequence,
  splitItemInSequence,
  trimItemInSequence,
} from '../core/timeline/timelineOps';

export type TimelineTool = 'select' | 'split' | 'delete';

/** État complet du store projet */
interface ProjectState {
  /** Projet actuellement ouvert */
  project: KromaProject;
  /** Indique si le projet comporte des modifications non sauvegardées */
  isDirty: boolean;
  /** Identifiant de l'asset sélectionné dans la médiathèque, ou null */
  selectedAssetId: string | null;
  /** Identifiant du clip sélectionné sur la timeline, ou null */
  selectedItemId: string | null;
  /** Position courante de la tête de lecture en microsecondes */
  currentTimeUs: number;
  /** Facteur de zoom horizontal de la timeline (pixels par seconde) */
  zoomPixelsPerSecond: number;
  /** Outil actif dans la barre d'outils de timeline */
  activeTool: TimelineTool;

  // --- Actions Médiathèque ---
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (assetId: string) => void;
  setSelectedAsset: (id: string | null) => void;

  // --- Actions Tête de lecture & Vue ---
  setCurrentTimeUs: (timeUs: number) => void;
  setSelectedItemId: (id: string | null) => void;
  setZoomPixelsPerSecond: (zoom: number) => void;
  setActiveTool: (tool: TimelineTool) => void;

  // --- Actions Timeline ---
  addItemFromAsset: (asset: MediaAsset, targetLaneId?: string, placementTimeUs?: number) => void;
  moveTimelineItem: (itemId: string, targetLaneId: string, newPlacementTimeUs: number) => void;
  splitTimelineItemAtCurrentTime: (itemId?: string) => void;
  trimTimelineItem: (itemId: string, handle: 'start' | 'end', deltaUs: number) => void;
  removeTimelineItem: (itemId: string) => void;
  toggleLaneMute: (laneId: string) => void;
  toggleLaneSolo: (laneId: string) => void;
  toggleLaneLock: (laneId: string) => void;
  updateLaneGain: (laneId: string, gain: number) => void;
  updateClipPlacement: (itemId: string, updates: Partial<SpatialPlacement>) => void;
  updateClipGain: (itemId: string, gain: number) => void;
  updateClipFade: (itemId: string, fadeInUs: number, fadeOutUs: number) => void;
  addTextItem: (text?: string, placementTimeUs?: number) => void;
  updateTextLayerData: (itemId: string, updates: Partial<TextLayerData>) => void;

  // --- Gestion du Projet ---
  resetProject: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  // État initial
  project: createDefaultProject(),
  isDirty: false,
  selectedAssetId: null,
  selectedItemId: null,
  currentTimeUs: 0,
  zoomPixelsPerSecond: 60, // 60 pixels = 1 seconde par défaut
  activeTool: 'select',

  // --- Actions Médiathèque ---
  addAsset: (asset: MediaAsset) =>
    set((state) => ({
      project: {
        ...state.project,
        asset_catalog: [...state.project.asset_catalog, asset],
        modified_timestamp_utc: Date.now() * 1000,
      },
      isDirty: true,
    })),

  removeAsset: (assetId: string) =>
    set((state) => {
      // Retirer aussi les clips de la timeline qui référencent cet asset
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.filter((item) => item.referenced_asset_id !== assetId),
      }));

      return {
        project: {
          ...state.project,
          asset_catalog: state.project.asset_catalog.filter((a) => a.asset_id !== assetId),
          sequence: {
            ...state.project.sequence,
            lanes: updatedLanes,
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
        selectedAssetId: state.selectedAssetId === assetId ? null : state.selectedAssetId,
      };
    }),

  setSelectedAsset: (id: string | null) =>
    set(() => ({
      selectedAssetId: id,
      // Si on sélectionne un asset de la médiathèque, on désélectionne le clip de timeline
      ...(id ? { selectedItemId: null } : {}),
    })),

  // --- Actions Tête de lecture & Vue ---
  setCurrentTimeUs: (timeUs: number) =>
    set((state) => {
      const maxUs = Math.max(state.project.sequence.total_length_us, 60_000_000); // Au moins 60s navigables
      const clamped = Math.max(0, Math.min(timeUs, maxUs));
      return { currentTimeUs: clamped };
    }),

  setSelectedItemId: (id: string | null) =>
    set(() => ({
      selectedItemId: id,
      // Si on sélectionne un clip de timeline, on désélectionne l'asset de la médiathèque
      ...(id ? { selectedAssetId: null } : {}),
    })),

  setZoomPixelsPerSecond: (zoom: number) =>
    set(() => ({
      // Zoom borné entre 10 px/s (très dézoomé) et 300 px/s (zoom fin à la frame)
      zoomPixelsPerSecond: Math.max(10, Math.min(300, zoom)),
    })),

  setActiveTool: (tool: TimelineTool) =>
    set(() => ({
      activeTool: tool,
    })),

  // --- Actions Timeline ---
  addItemFromAsset: (asset: MediaAsset, targetLaneId?: string, placementTimeUs?: number) => {
    const state = get();
    // Déterminer la piste par défaut selon le type de média si non spécifié
    let laneId = targetLaneId;
    if (!laneId) {
      if (asset.media_kind === 'audio') {
        const audioLane = state.project.sequence.lanes.find((l) => l.lane_type === 'audio');
        laneId = audioLane ? audioLane.lane_id : state.project.sequence.lanes[0].lane_id;
      } else {
        const visualLane = state.project.sequence.lanes.find((l) => l.lane_type === 'visual');
        laneId = visualLane ? visualLane.lane_id : state.project.sequence.lanes[0].lane_id;
      }
    }

    const posUs = placementTimeUs !== undefined ? placementTimeUs : state.currentTimeUs;
    const newItem = createItemFromAsset(asset, posUs);
    const updatedSequence = addItemToLane(state.project.sequence, laneId, newItem);

    set({
      project: {
        ...state.project,
        sequence: updatedSequence,
        modified_timestamp_utc: Date.now() * 1000,
      },
      selectedItemId: newItem.item_id,
      selectedAssetId: null,
      isDirty: true,
    });
  },

  moveTimelineItem: (itemId: string, targetLaneId: string, newPlacementTimeUs: number) =>
    set((state) => {
      const updatedSequence = moveItemInSequence(
        state.project.sequence,
        itemId,
        targetLaneId,
        newPlacementTimeUs,
      );
      return {
        project: {
          ...state.project,
          sequence: updatedSequence,
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  splitTimelineItemAtCurrentTime: (targetItemId?: string) =>
    set((state) => {
      const splitTimeUs = state.currentTimeUs;
      let itemIdToSplit = targetItemId || state.selectedItemId;

      // Si aucun item spécifié ou sélectionné, chercher l'item situé sous la tête de lecture
      if (!itemIdToSplit) {
        for (const lane of state.project.sequence.lanes) {
          const underPlayhead = lane.items.find(
            (item) =>
              splitTimeUs > item.placement_time_us &&
              splitTimeUs < item.placement_time_us + item.play_duration_us,
          );
          if (underPlayhead) {
            itemIdToSplit = underPlayhead.item_id;
            break;
          }
        }
      }

      if (!itemIdToSplit) return state;

      const updatedSequence = splitItemInSequence(
        state.project.sequence,
        itemIdToSplit,
        splitTimeUs,
      );

      return {
        project: {
          ...state.project,
          sequence: updatedSequence,
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  trimTimelineItem: (itemId: string, handle: 'start' | 'end', deltaUs: number) =>
    set((state) => {
      // Trouver l'asset référencé pour borner la durée source max
      let maxSourceUs: number | undefined = undefined;
      for (const lane of state.project.sequence.lanes) {
        const item = lane.items.find((i) => i.item_id === itemId);
        if (item && item.referenced_asset_id) {
          const asset = state.project.asset_catalog.find(
            (a) => a.asset_id === item.referenced_asset_id,
          );
          if (asset && asset.media_kind !== 'image') {
            maxSourceUs = asset.duration_us;
          }
          break;
        }
      }

      const updatedSequence = trimItemInSequence(
        state.project.sequence,
        itemId,
        handle,
        deltaUs,
        maxSourceUs,
      );

      return {
        project: {
          ...state.project,
          sequence: updatedSequence,
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  removeTimelineItem: (itemId: string) =>
    set((state) => {
      const updatedSequence = removeItemFromSequence(state.project.sequence, itemId);
      return {
        project: {
          ...state.project,
          sequence: updatedSequence,
          modified_timestamp_utc: Date.now() * 1000,
        },
        selectedItemId: state.selectedItemId === itemId ? null : state.selectedItemId,
        isDirty: true,
      };
    }),

  toggleLaneMute: (laneId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((l) =>
        l.lane_id === laneId ? { ...l, is_muted: !l.is_muted } : l,
      );
      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  toggleLaneSolo: (laneId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((l) =>
        l.lane_id === laneId ? { ...l, is_solo: !l.is_solo } : l,
      );
      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  toggleLaneLock: (laneId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((l) =>
        l.lane_id === laneId ? { ...l, is_locked: !l.is_locked } : l,
      );
      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateLaneGain: (laneId: string, gain: number) =>
    set((state) => {
      const clampedGain = Math.max(0, Math.min(2.0, gain));
      const updatedLanes = state.project.sequence.lanes.map((l) =>
        l.lane_id === laneId ? { ...l, gain_level: clampedGain } : l,
      );
      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipPlacement: (itemId: string, updates: Partial<SpatialPlacement>) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          return {
            ...item,
            spatial_placement: {
              ...(item.spatial_placement || {
                offset_x_px: 0,
                offset_y_px: 0,
                zoom_factor_x: 1.0,
                zoom_factor_y: 1.0,
                rotation_degrees: 0,
                opacity_ratio: 1.0,
              }),
              ...updates,
            },
          };
        }),
      }));

      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipGain: (itemId: string, gain: number) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          return {
            ...item,
            item_gain: Math.max(0, Math.min(2.0, gain)),
          };
        }),
      }));

      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipFade: (itemId: string, fadeInUs: number, fadeOutUs: number) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          return {
            ...item,
            fade_in_duration_us: Math.max(0, fadeInUs),
            fade_out_duration_us: Math.max(0, fadeOutUs),
          };
        }),
      }));

      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  addTextItem: (text?: string, placementTimeUs?: number) => {
    const state = get();
    // Trouver la piste dédiée aux titres/textes (ou la première piste text_overlay)
    let textLane = state.project.sequence.lanes.find((l) => l.lane_type === 'text_overlay');
    if (!textLane) {
      textLane = state.project.sequence.lanes[0];
    }

    const posUs = placementTimeUs !== undefined ? placementTimeUs : state.currentTimeUs;
    const newItem = createTextItem(text || 'Nouveau Titre', posUs);
    const updatedSequence = addItemToLane(state.project.sequence, textLane.lane_id, newItem);

    set({
      project: {
        ...state.project,
        sequence: updatedSequence,
        modified_timestamp_utc: Date.now() * 1000,
      },
      selectedItemId: newItem.item_id,
      selectedAssetId: null,
      isDirty: true,
    });
  },

  updateTextLayerData: (itemId: string, updates: Partial<TextLayerData>) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId || !item.text_layer_data) return item;
          return {
            ...item,
            text_layer_data: {
              ...item.text_layer_data,
              ...updates,
            },
          };
        }),
      }));

      return {
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  resetProject: () =>
    set(() => ({
      project: createDefaultProject(),
      isDirty: false,
      selectedAssetId: null,
      selectedItemId: null,
      currentTimeUs: 0,
    })),
}));

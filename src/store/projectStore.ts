/**
 * Store Zustand principal du projet Kroma.
 * Gère l'état global du projet : catalogue d'assets, timeline multipiste,
 * tête de lecture et sélection d'éléments.
 */
import { create } from 'zustand';
import type { MediaAsset } from '../core/types/asset';
import { type KromaProject, createDefaultProject } from '../core/types/project';
import type { SpatialPlacement, TextLayerData, ColorAdjustments, TransitionData } from '../core/types/timeline';
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

/**
 * Empile l'état précédent dans l'historique en bornant la pile à 50 états.
 */
function pushPast(past: KromaProject[], current: KromaProject): KromaProject[] {
  const maxHistory = 50;
  const newPast = [...past, current];
  if (newPast.length > maxHistory) {
    return newPast.slice(newPast.length - maxHistory);
  }
  return newPast;
}

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

  // --- Historique Annuler / Rétablir ---
  past: KromaProject[];
  future: KromaProject[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushHistorySnapshot: () => void;

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
  updateClipPlacement: (itemId: string, updates: Partial<SpatialPlacement>, commitHistory?: boolean) => void;
  updateClipGain: (itemId: string, gain: number, commitHistory?: boolean) => void;
  updateClipFade: (itemId: string, fadeInUs: number, fadeOutUs: number, commitHistory?: boolean) => void;
  updateClipColorAdjustments: (itemId: string, updates: Partial<ColorAdjustments>, commitHistory?: boolean) => void;
  resetClipColorAdjustments: (itemId: string) => void;
  updateClipSpeed: (itemId: string, speed: number, commitHistory?: boolean) => void;
  updateClipTransition: (itemId: string, transition: TransitionData | undefined, commitHistory?: boolean) => void;
  addTextItem: (text?: string, placementTimeUs?: number) => void;
  updateTextLayerData: (itemId: string, updates: Partial<TextLayerData>) => void;

  // --- Gestion du Projet & Fichiers ---
  setProjectName: (name: string) => void;
  saveProjectToFile: () => void;
  loadProjectFromJson: (jsonString: string) => boolean;
  createNewProject: (name?: string) => void;
  resetProject: () => void;

  // --- Exportation FFmpeg ---
  isExportDialogOpen: boolean;
  openExportDialog: () => void;
  closeExportDialog: () => void;
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
  isExportDialogOpen: false,
  openExportDialog: () => set({ isExportDialogOpen: true }),
  closeExportDialog: () => set({ isExportDialogOpen: false }),

  // Historique
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const newFuture = [state.project, ...state.future];
      return {
        project: previous,
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: true,
        isDirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const newPast = pushPast(state.past, state.project);
      return {
        project: next,
        past: newPast,
        future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
        isDirty: true,
      };
    }),

  pushHistorySnapshot: () =>
    set((state) => ({
      past: pushPast(state.past, state.project),
      future: [],
      canUndo: true,
      canRedo: false,
    })),

  // --- Actions Médiathèque ---
  addAsset: (asset: MediaAsset) =>
    set((state) => ({
      past: pushPast(state.past, state.project),
      future: [],
      canUndo: true,
      canRedo: false,
      project: {
        ...state.project,
        asset_catalog: [...state.project.asset_catalog, asset],
        modified_timestamp_utc: Date.now() * 1000,
      },
      isDirty: true,
    })),

  removeAsset: (assetId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.filter((item) => item.referenced_asset_id !== assetId),
      }));

      return {
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
      ...(id ? { selectedItemId: null } : {}),
    })),

  // --- Actions Tête de lecture & Vue ---
  setCurrentTimeUs: (timeUs: number) =>
    set((state) => {
      const maxUs = Math.max(state.project.sequence.total_length_us, 60_000_000);
      const clamped = Math.max(0, Math.min(timeUs, maxUs));
      return { currentTimeUs: clamped };
    }),

  setSelectedItemId: (id: string | null) =>
    set(() => ({
      selectedItemId: id,
      ...(id ? { selectedAssetId: null } : {}),
    })),

  setZoomPixelsPerSecond: (zoom: number) =>
    set(() => ({
      zoomPixelsPerSecond: Math.max(10, Math.min(300, zoom)),
    })),

  setActiveTool: (tool: TimelineTool) =>
    set(() => ({
      activeTool: tool,
    })),

  // --- Actions Timeline ---
  addItemFromAsset: (asset: MediaAsset, targetLaneId?: string, placementTimeUs?: number) => {
    const state = get();
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
      past: pushPast(state.past, state.project),
      future: [],
      canUndo: true,
      canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipPlacement: (itemId: string, updates: Partial<SpatialPlacement>, commitHistory: boolean = true) =>
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
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipGain: (itemId: string, gain: number, commitHistory: boolean = true) =>
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
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipFade: (itemId: string, fadeInUs: number, fadeOutUs: number, commitHistory: boolean = true) =>
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
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipColorAdjustments: (itemId: string, updates: Partial<ColorAdjustments>, commitHistory: boolean = true) =>
    set((state) => {
      const defaultAdjustments: ColorAdjustments = {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        hue_degrees: 0,
        blur_px: 0,
      };

      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const current = item.color_adjustments || defaultAdjustments;
          return {
            ...item,
            color_adjustments: {
              ...current,
              ...updates,
            },
          };
        }),
      }));

      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  resetClipColorAdjustments: (itemId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const { color_adjustments: _, ...rest } = item;
          return rest as typeof item;
        }),
      }));

      return {
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipSpeed: (itemId: string, speed: number, commitHistory: boolean = true) =>
    set((state) => {
      const clampedSpeed = Math.max(0.25, Math.min(4.0, Number(speed) || 1.0));
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) =>
          item.item_id === itemId
            ? { ...item, playback_speed: clampedSpeed }
            : item,
        ),
      }));

      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateClipTransition: (itemId: string, transition: TransitionData | undefined, commitHistory: boolean = true) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) =>
          item.item_id === itemId
            ? { ...item, transition_in: transition && transition.transition_type !== 'none' ? transition : undefined }
            : item,
        ),
      }));

      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
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
    let textLane = state.project.sequence.lanes.find((l) => l.lane_type === 'text_overlay');
    if (!textLane) {
      textLane = state.project.sequence.lanes[0];
    }

    const posUs = placementTimeUs !== undefined ? placementTimeUs : state.currentTimeUs;
    const newItem = createTextItem(text || 'Nouveau Titre', posUs);
    const updatedSequence = addItemToLane(state.project.sequence, textLane.lane_id, newItem);

    set({
      past: pushPast(state.past, state.project),
      future: [],
      canUndo: true,
      canRedo: false,
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
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
        project: {
          ...state.project,
          sequence: { ...state.project.sequence, lanes: updatedLanes },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  // --- Gestion du Projet & Fichiers ---
  setProjectName: (name: string) =>
    set((state) => ({
      past: pushPast(state.past, state.project),
      future: [],
      canUndo: true,
      canRedo: false,
      project: {
        ...state.project,
        project_name: name,
        modified_timestamp_utc: Date.now() * 1000,
      },
      isDirty: true,
    })),

  saveProjectToFile: () => {
    const { project } = get();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = (project.project_name || 'kroma_projet')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, '_');

    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.kproj`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    set({ isDirty: false });
  },

  loadProjectFromJson: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString) as KromaProject;
      // Validation minimale de structure
      if (!parsed || typeof parsed !== 'object') return false;
      if (!parsed.kroma_version || !parsed.project_uuid) return false;
      if (!parsed.sequence || !Array.isArray(parsed.sequence.lanes)) return false;
      if (!Array.isArray(parsed.asset_catalog)) return false;

      set({
        project: parsed,
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        isDirty: false,
        currentTimeUs: 0,
        selectedItemId: null,
        selectedAssetId: null,
      });
      return true;
    } catch (err) {
      console.error('Erreur lors de la lecture du fichier projet Kroma :', err);
      return false;
    }
  },

  createNewProject: (name?: string) =>
    set(() => ({
      project: createDefaultProject(name || 'Nouveau Projet Kroma'),
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      isDirty: false,
      selectedAssetId: null,
      selectedItemId: null,
      currentTimeUs: 0,
    })),

  resetProject: () =>
    set(() => ({
      project: createDefaultProject(),
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      isDirty: false,
      selectedAssetId: null,
      selectedItemId: null,
      currentTimeUs: 0,
    })),
}));

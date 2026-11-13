/**
 * Store Zustand principal du projet Kroma.
 * Gère l'état global du projet : catalogue d'assets, timeline multipiste,
 * tête de lecture et sélection d'éléments.
 */
import { create } from 'zustand';
import type { MediaAsset } from '../core/types/asset';
import {
  type KromaProject,
  createDefaultProject,
  type CanvasAspectRatio,
  CANVAS_RATIO_PRESETS,
  detectAspectRatio,
} from '../core/types/project';
import type {
  SpatialPlacement,
  TextLayerData,
  ColorAdjustments,
  TransitionData,
  VideoEffects,
  KeyframeProperty,
  KeyframeInterpolation,
  ChromaKeyData,
  MaskData,
  TimelineMarker,
} from '../core/types/timeline';
import { addOrUpdateKeyframe, removeKeyframe, moveKeyframesInList } from '../core/animation/keyframeInterpolation';
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
  /** Liste des identifiants des clips sélectionnés (sélection multiple Ctrl+Clic) */
  selectedItemIds: string[];
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
  toggleItemSelection: (id: string) => void;
  setSelectedItemIds: (ids: string[]) => void;
  clearSelection: () => void;
  selectAllItems: () => void;
  removeSelectedItems: () => void;
  setZoomPixelsPerSecond: (zoom: number) => void;
  setActiveTool: (tool: TimelineTool) => void;

  // --- Actions Timeline ---
  addItemFromAsset: (asset: MediaAsset, targetLaneId?: string, placementTimeUs?: number) => void;
  moveTimelineItem: (itemId: string, targetLaneId: string, newPlacementTimeUs: number, commitHistory?: boolean) => void;
  moveMultipleTimelineItems: (shifts: Array<{ itemId: string; targetLaneId: string; newPlacementTimeUs: number }>, commitHistory?: boolean) => void;
  splitTimelineItemAtCurrentTime: (itemId?: string) => void;
  trimTimelineItem: (itemId: string, handle: 'start' | 'end', deltaUs: number, commitHistory?: boolean) => void;
  removeTimelineItem: (itemId: string) => void;
  toggleLaneMute: (laneId: string) => void;
  toggleLaneSolo: (laneId: string) => void;
  toggleLaneLock: (laneId: string) => void;
  updateLaneGain: (laneId: string, gain: number) => void;
  updateClipPlacement: (itemId: string, updates: Partial<SpatialPlacement>, commitHistory?: boolean) => void;
  resetClipPlacement: (itemId: string) => void;
  updateClipGain: (itemId: string, gain: number, commitHistory?: boolean) => void;
  updateClipFade: (itemId: string, fadeInUs: number, fadeOutUs: number, commitHistory?: boolean) => void;
  updateClipColorAdjustments: (itemId: string, updates: Partial<ColorAdjustments>, commitHistory?: boolean) => void;
  resetClipColorAdjustments: (itemId: string) => void;
  updateClipSpeed: (itemId: string, speed: number, commitHistory?: boolean) => void;
  updateClipTransition: (itemId: string, transition: TransitionData | undefined, commitHistory?: boolean) => void;
  toggleClipFlipHorizontal: (itemId: string) => void;
  toggleClipFlipVertical: (itemId: string) => void;
  updateClipEffects: (itemId: string, effects: Partial<VideoEffects> | undefined, commitHistory?: boolean) => void;
  updateClipChromaKey: (itemId: string, chromaKey: Partial<ChromaKeyData> | undefined, commitHistory?: boolean) => void;
  updateClipMask: (itemId: string, mask: Partial<MaskData> | undefined, commitHistory?: boolean) => void;
  resetClipMask: (itemId: string) => void;
  addTextItem: (text?: string, placementTimeUs?: number) => void;
  updateTextLayerData: (itemId: string, updates: Partial<TextLayerData>) => void;

  // --- Animation par Images-Clés / Keyframing (Étape 14) ---
  addOrUpdateClipKeyframe: (
    itemId: string,
    property: KeyframeProperty,
    timeOffsetUs: number,
    value: number,
    interpolation?: KeyframeInterpolation,
    commitHistory?: boolean,
  ) => void;
  removeClipKeyframe: (
    itemId: string,
    property: KeyframeProperty,
    keyframeId: string,
    commitHistory?: boolean,
  ) => void;
  moveClipKeyframes: (
    itemId: string,
    keyframeIds: string[],
    newOffsetUs: number,
    commitHistory?: boolean,
  ) => void;
  clearClipPropertyKeyframes: (
    itemId: string,
    property: KeyframeProperty,
    commitHistory?: boolean,
  ) => void;
  clearAllClipKeyframes: (itemId: string, commitHistory?: boolean) => void;

  // --- Aimantation Temporelle & Marqueurs (Étape 17) ---
  isSnappingEnabled: boolean;
  activeSnapLineUs: number | null;
  toggleSnapping: () => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setActiveSnapLineUs: (timeUs: number | null) => void;
  addTimelineMarker: (timeUs: number, label?: string, color?: string, commitHistory?: boolean) => void;
  updateTimelineMarker: (markerId: string, updates: Partial<TimelineMarker>, commitHistory?: boolean) => void;
  removeTimelineMarker: (markerId: string, commitHistory?: boolean) => void;
  clearTimelineMarkers: (commitHistory?: boolean) => void;
  jumpToNextMarker: () => void;
  jumpToPrevMarker: () => void;

  // --- Gestion du Projet & Fichiers ---
  setProjectName: (name: string) => void;
  setCanvasAspectRatio: (ratio: CanvasAspectRatio, customDimensions?: { width: number; height: number }) => void;
  setCanvasDimensions: (width: number, height: number) => void;
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
  selectedItemIds: [],
  currentTimeUs: 0,
  zoomPixelsPerSecond: 60, // 60 pixels = 1 seconde par défaut
  activeTool: 'select',
  isSnappingEnabled: true,
  activeSnapLineUs: null,
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
      ...(id ? { selectedItemId: null, selectedItemIds: [] } : {}),
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
      selectedItemIds: id ? [id] : [],
      ...(id ? { selectedAssetId: null } : {}),
    })),

  toggleItemSelection: (id: string) =>
    set((state) => {
      const exists = state.selectedItemIds.includes(id);
      const newIds = exists
        ? state.selectedItemIds.filter((itemId) => itemId !== id)
        : [...state.selectedItemIds, id];
      const primaryId = newIds.length > 0 ? newIds[newIds.length - 1] : null;
      return {
        selectedItemIds: newIds,
        selectedItemId: primaryId,
        selectedAssetId: null,
      };
    }),

  setSelectedItemIds: (ids: string[]) =>
    set(() => ({
      selectedItemIds: ids,
      selectedItemId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedAssetId: null,
    })),

  clearSelection: () =>
    set(() => ({
      selectedItemId: null,
      selectedItemIds: [],
      selectedAssetId: null,
    })),

  selectAllItems: () =>
    set((state) => {
      const allIds: string[] = [];
      for (const lane of state.project.sequence.lanes) {
        for (const item of lane.items) {
          allIds.push(item.item_id);
        }
      }
      return {
        selectedItemIds: allIds,
        selectedItemId: allIds[0] || null,
        selectedAssetId: null,
      };
    }),

  removeSelectedItems: () =>
    set((state) => {
      const idsToRemove = state.selectedItemIds.length > 0
        ? new Set(state.selectedItemIds)
        : state.selectedItemId
        ? new Set([state.selectedItemId])
        : null;

      if (!idsToRemove || idsToRemove.size === 0) return state;

      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.filter((item) => !idsToRemove.has(item.item_id)),
      }));

      const updatedSequence = {
        ...state.project.sequence,
        lanes: updatedLanes,
      };

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
        selectedItemId: null,
        selectedItemIds: [],
        isDirty: true,
      };
    }),

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
      selectedItemIds: [newItem.item_id],
      selectedAssetId: null,
      isDirty: true,
    });
  },

  moveTimelineItem: (
    itemId: string,
    targetLaneId: string,
    newPlacementTimeUs: number,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const updatedSequence = moveItemInSequence(
        state.project.sequence,
        itemId,
        targetLaneId,
        newPlacementTimeUs,
      );
      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: updatedSequence,
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  moveMultipleTimelineItems: (
    shifts: Array<{ itemId: string; targetLaneId: string; newPlacementTimeUs: number }>,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      let currentSequence = state.project.sequence;
      for (const shift of shifts) {
        currentSequence = moveItemInSequence(
          currentSequence,
          shift.itemId,
          shift.targetLaneId,
          shift.newPlacementTimeUs,
        );
      }
      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: currentSequence,
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

  trimTimelineItem: (
    itemId: string,
    handle: 'start' | 'end',
    deltaUs: number,
    commitHistory: boolean = true,
  ) =>
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
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
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
        selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
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

  resetClipPlacement: (itemId: string) =>
    set((state) => {
      const defaultPlacement: SpatialPlacement = {
        offset_x_px: 0,
        offset_y_px: 0,
        zoom_factor_x: 1.0,
        zoom_factor_y: 1.0,
        rotation_degrees: 0,
        opacity_ratio: 1.0,
      };

      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          return {
            ...item,
            spatial_placement: { ...defaultPlacement },
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

  toggleClipFlipHorizontal: (itemId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const current = item.spatial_placement || {
            offset_x_px: 0,
            offset_y_px: 0,
            zoom_factor_x: 1.0,
            zoom_factor_y: 1.0,
            rotation_degrees: 0,
            opacity_ratio: 1.0,
          };
          return {
            ...item,
            spatial_placement: {
              ...current,
              flip_horizontal: !current.flip_horizontal,
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

  toggleClipFlipVertical: (itemId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const current = item.spatial_placement || {
            offset_x_px: 0,
            offset_y_px: 0,
            zoom_factor_x: 1.0,
            zoom_factor_y: 1.0,
            rotation_degrees: 0,
            opacity_ratio: 1.0,
          };
          return {
            ...item,
            spatial_placement: {
              ...current,
              flip_vertical: !current.flip_vertical,
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

  updateClipEffects: (itemId: string, effects: Partial<VideoEffects> | undefined, commitHistory: boolean = true) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          if (!effects || (effects.preset === 'none' && !effects.vignette_amount)) {
            const { video_effects, ...rest } = item;
            return rest;
          }
          return {
            ...item,
            video_effects: {
              ...item.video_effects,
              ...effects,
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
      selectedItemIds: [newItem.item_id],
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

  // --- Incrustation Fond Vert / Chroma Key (Étape 15) ---
  updateClipChromaKey: (
    itemId: string,
    chromaKey: Partial<ChromaKeyData> | undefined,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          if (!chromaKey) {
            const { chroma_key: _removed, ...rest } = item;
            return rest;
          }
          const current: ChromaKeyData = item.chroma_key || {
            enabled: false,
            target_color: '#00B140',
            similarity: 0.3,
            smoothness: 0.1,
            spill_reduction: 0.5,
          };
          return {
            ...item,
            chroma_key: {
              ...current,
              ...chromaKey,
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

  // --- Masques Géométriques & Incrustation PiP (Étape 16) ---
  updateClipMask: (
    itemId: string,
    mask: Partial<MaskData> | undefined,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          if (!mask || mask.mask_type === 'none') {
            const { mask: _removed, ...rest } = item;
            return rest;
          }
          const current: MaskData = item.mask || {
            mask_type: 'rectangle',
            width_percent: 75,
            height_percent: 75,
            center_x_percent: 0,
            center_y_percent: 0,
            roundness_px: 0,
            rotation_degrees: 0,
            feather_px: 0,
            inverted: false,
          };
          return {
            ...item,
            mask: {
              ...current,
              ...mask,
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

  resetClipMask: (itemId: string) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const { mask: _removed, ...rest } = item;
          return rest;
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

  // --- Animation par Images-Clés / Keyframing (Étape 14) ---
  addOrUpdateClipKeyframe: (
    itemId: string,
    property: KeyframeProperty,
    timeOffsetUs: number,
    value: number,
    interpolation: KeyframeInterpolation = 'linear',
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const currentKeyframes = item.keyframes || {};
          const currentList = currentKeyframes[property] || [];
          const updatedList = addOrUpdateKeyframe(currentList, timeOffsetUs, value, interpolation);
          return {
            ...item,
            keyframes: {
              ...currentKeyframes,
              [property]: updatedList,
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

  removeClipKeyframe: (
    itemId: string,
    property: KeyframeProperty,
    keyframeId: string,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const currentKeyframes = item.keyframes || {};
          const currentList = currentKeyframes[property] || [];
          const updatedList = removeKeyframe(currentList, keyframeId);
          return {
            ...item,
            keyframes: {
              ...currentKeyframes,
              [property]: updatedList,
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

  moveClipKeyframes: (
    itemId: string,
    keyframeIds: string[],
    newOffsetUs: number,
    commitHistory: boolean = false,
  ) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId || !item.keyframes) return item;
          const currentKeyframes = item.keyframes;
          const nextKeyframes: Record<string, any> = {};
          let modified = false;

          const props: KeyframeProperty[] = ['scale', 'position_x', 'position_y', 'rotation', 'opacity'];
          for (const p of props) {
            const list = currentKeyframes[p];
            if (list && list.some((k) => keyframeIds.includes(k.id))) {
              nextKeyframes[p] = moveKeyframesInList(list, keyframeIds, newOffsetUs);
              modified = true;
            } else {
              nextKeyframes[p] = list;
            }
          }

          if (!modified) return item;

          return {
            ...item,
            keyframes: nextKeyframes,
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

  clearClipPropertyKeyframes: (
    itemId: string,
    property: KeyframeProperty,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          if (!item.keyframes) return item;
          const currentKeyframes = { ...item.keyframes };
          delete currentKeyframes[property];
          return {
            ...item,
            keyframes: currentKeyframes,
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

  clearAllClipKeyframes: (itemId: string, commitHistory: boolean = true) =>
    set((state) => {
      const updatedLanes = state.project.sequence.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((item) => {
          if (item.item_id !== itemId) return item;
          const { keyframes: _removed, ...rest } = item;
          return rest;
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

  // --- Aimantation Temporelle & Marqueurs (Étape 17) ---
  toggleSnapping: () =>
    set((state) => ({ isSnappingEnabled: !state.isSnappingEnabled })),

  setSnappingEnabled: (enabled: boolean) =>
    set({ isSnappingEnabled: enabled }),

  setActiveSnapLineUs: (timeUs: number | null) =>
    set({ activeSnapLineUs: timeUs }),

  addTimelineMarker: (
    timeUs: number,
    label: string = 'Marqueur',
    color: string = '#eab308',
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const existing = state.project.sequence.markers || [];
      const newMarker: TimelineMarker = {
        marker_id: 'marker_' + Math.random().toString(36).substring(2, 9),
        time_us: Math.max(0, timeUs),
        label: label.trim() || 'Marqueur',
        color,
      };

      const updatedMarkers = [...existing, newMarker].sort((a, b) => a.time_us - b.time_us);

      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: {
            ...state.project.sequence,
            markers: updatedMarkers,
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  updateTimelineMarker: (
    markerId: string,
    updates: Partial<TimelineMarker>,
    commitHistory: boolean = true,
  ) =>
    set((state) => {
      const existing = state.project.sequence.markers || [];
      const updatedMarkers = existing
        .map((m) => (m.marker_id === markerId ? { ...m, ...updates } : m))
        .sort((a, b) => a.time_us - b.time_us);

      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: {
            ...state.project.sequence,
            markers: updatedMarkers,
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  removeTimelineMarker: (markerId: string, commitHistory: boolean = true) =>
    set((state) => {
      const existing = state.project.sequence.markers || [];
      const updatedMarkers = existing.filter((m) => m.marker_id !== markerId);

      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: {
            ...state.project.sequence,
            markers: updatedMarkers,
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  clearTimelineMarkers: (commitHistory: boolean = true) =>
    set((state) => {
      return {
        past: commitHistory ? pushPast(state.past, state.project) : state.past,
        future: commitHistory ? [] : state.future,
        canUndo: commitHistory ? true : state.canUndo,
        canRedo: commitHistory ? false : state.canRedo,
        project: {
          ...state.project,
          sequence: {
            ...state.project.sequence,
            markers: [],
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  jumpToNextMarker: () => {
    const state = get();
    const markers = state.project.sequence.markers || [];
    const next = markers.find((m) => m.time_us > state.currentTimeUs + 20_000);
    if (next) {
      set({ currentTimeUs: next.time_us });
    }
  },

  jumpToPrevMarker: () => {
    const state = get();
    const markers = state.project.sequence.markers || [];
    const prev = [...markers].reverse().find((m) => m.time_us < state.currentTimeUs - 20_000);
    if (prev) {
      set({ currentTimeUs: prev.time_us });
    }
  },

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

  setCanvasAspectRatio: (ratio: CanvasAspectRatio, customDimensions?: { width: number; height: number }) =>
    set((state) => {
      let width = 1920;
      let height = 1080;
      if (ratio === 'custom' && customDimensions) {
        width = customDimensions.width;
        height = customDimensions.height;
      } else if (CANVAS_RATIO_PRESETS[ratio as Exclude<CanvasAspectRatio, 'custom'>]) {
        width = CANVAS_RATIO_PRESETS[ratio as Exclude<CanvasAspectRatio, 'custom'>].width;
        height = CANVAS_RATIO_PRESETS[ratio as Exclude<CanvasAspectRatio, 'custom'>].height;
      }

      return {
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
        project: {
          ...state.project,
          timeline_canvas: {
            ...state.project.timeline_canvas,
            viewport_width: width,
            viewport_height: height,
            aspect_ratio: ratio,
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

  setCanvasDimensions: (width: number, height: number) =>
    set((state) => {
      const detected = detectAspectRatio(width, height);
      return {
        past: pushPast(state.past, state.project),
        future: [],
        canUndo: true,
        canRedo: false,
        project: {
          ...state.project,
          timeline_canvas: {
            ...state.project.timeline_canvas,
            viewport_width: width,
            viewport_height: height,
            aspect_ratio: detected,
          },
          modified_timestamp_utc: Date.now() * 1000,
        },
        isDirty: true,
      };
    }),

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

      // Garantir l'initialisation des marqueurs pour la rétrocompatibilité
      parsed.sequence.markers = Array.isArray(parsed.sequence.markers) ? parsed.sequence.markers : [];

      set({
        project: parsed,
        past: [],
        future: [],
        canUndo: false,
        canRedo: false,
        isDirty: false,
        currentTimeUs: 0,
        selectedItemId: null,
        selectedItemIds: [],
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
      selectedItemIds: [],
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
      selectedItemIds: [],
      currentTimeUs: 0,
    })),
}));

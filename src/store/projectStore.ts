/**
 * Store Zustand principal du projet Kroma.
 * Gère l'état global du projet : catalogue d'assets, sélection et état de modification.
 */
import { create } from 'zustand';
import type { MediaAsset } from '../core/types/asset';
import { type KromaProject, createDefaultProject } from '../core/types/project';

/** État complet du store projet */
interface ProjectState {
  /** Projet actuellement ouvert */
  project: KromaProject;
  /** Indique si le projet comporte des modifications non sauvegardées */
  isDirty: boolean;
  /** Identifiant de l'asset actuellement sélectionné, ou null */
  selectedAssetId: string | null;

  // --- Actions ---
  /** Ajoute un asset au catalogue du projet */
  addAsset: (asset: MediaAsset) => void;
  /** Supprime un asset du catalogue par son identifiant */
  removeAsset: (assetId: string) => void;
  /** Sélectionne ou désélectionne un asset */
  setSelectedAsset: (id: string | null) => void;
  /** Réinitialise le projet à son état par défaut */
  resetProject: () => void;
}

/** Store global Zustand pour le projet Kroma */
export const useProjectStore = create<ProjectState>((set) => ({
  // État initial
  project: createDefaultProject(),
  isDirty: false,
  selectedAssetId: null,

  // Ajoute un asset au catalogue
  addAsset: (asset: MediaAsset) =>
    set((state) => ({
      project: {
        ...state.project,
        asset_catalog: [...state.project.asset_catalog, asset],
        modified_timestamp_utc: Date.now() * 1000,
      },
      isDirty: true,
    })),

  // Supprime un asset par son identifiant
  removeAsset: (assetId: string) =>
    set((state) => ({
      project: {
        ...state.project,
        asset_catalog: state.project.asset_catalog.filter(
          (a) => a.asset_id !== assetId,
        ),
        modified_timestamp_utc: Date.now() * 1000,
      },
      isDirty: true,
      // Désélectionne si l'asset supprimé était sélectionné
      selectedAssetId:
        state.selectedAssetId === assetId ? null : state.selectedAssetId,
    })),

  // Sélectionne ou désélectionne un asset
  setSelectedAsset: (id: string | null) =>
    set(() => ({
      selectedAssetId: id,
    })),

  // Réinitialise complètement le projet
  resetProject: () =>
    set(() => ({
      project: createDefaultProject(),
      isDirty: false,
      selectedAssetId: null,
    })),
}));

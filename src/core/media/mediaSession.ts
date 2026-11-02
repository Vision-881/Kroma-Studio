/**
 * Registre de session multimédia pour Kroma Studio.
 * Conserve les URL d'objets et les instances d'éléments de lecture (HTMLVideoElement, HTMLAudioElement)
 * pour permettre un rendu fluide à haute performance sans rechargement inutile.
 */
import type { MediaKind } from '../types/asset';

interface MediaEntry {
  file?: File;
  objectUrl: string;
  videoElement?: HTMLVideoElement;
  audioElement?: HTMLAudioElement;
  imageElement?: HTMLImageElement;
}

class MediaSessionManager {
  private registry = new Map<string, MediaEntry>();

  /**
   * Enregistre un fichier et génère son ObjectURL de session.
   */
  public registerFile(assetId: string, file: File, kind: MediaKind): string {
    // Si déjà présent, retourner l'URL existante
    const existing = this.registry.get(assetId);
    if (existing) return existing.objectUrl;

    const objectUrl = URL.createObjectURL(file);
    const entry: MediaEntry = { file, objectUrl };

    if (kind === 'video') {
      const video = document.createElement('video');
      video.src = objectUrl;
      video.preload = 'auto';
      video.muted = false; // Audio géré dynamiquement par le player
      video.playsInline = true;
      entry.videoElement = video;
    } else if (kind === 'audio') {
      const audio = document.createElement('audio');
      audio.src = objectUrl;
      audio.preload = 'auto';
      entry.audioElement = audio;
    } else if (kind === 'image') {
      const img = new Image();
      img.src = objectUrl;
      entry.imageElement = img;
    }

    this.registry.set(assetId, entry);
    return objectUrl;
  }

  /**
   * Récupère l'URL d'objet associée à un asset.
   */
  public getObjectUrl(assetId: string): string | null {
    return this.registry.get(assetId)?.objectUrl || null;
  }

  /**
   * Récupère l'élément vidéo associé.
   */
  public getVideoElement(assetId: string): HTMLVideoElement | null {
    return this.registry.get(assetId)?.videoElement || null;
  }

  /**
   * Récupère l'élément audio associé.
   */
  public getAudioElement(assetId: string): HTMLAudioElement | null {
    return this.registry.get(assetId)?.audioElement || null;
  }

  /**
   * Récupère l'élément image associé.
   */
  public getImageElement(assetId: string): HTMLImageElement | null {
    return this.registry.get(assetId)?.imageElement || null;
  }

  /**
   * Libère les ressources mémoires de session.
   */
  public clear(): void {
    for (const entry of this.registry.values()) {
      if (entry.videoElement) {
        entry.videoElement.src = '';
      }
      if (entry.audioElement) {
        entry.audioElement.src = '';
      }
      URL.revokeObjectURL(entry.objectUrl);
    }
    this.registry.clear();
  }
}

export const mediaSession = new MediaSessionManager();


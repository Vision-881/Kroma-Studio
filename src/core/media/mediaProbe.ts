import type { MediaAsset, MediaKind } from '../types/asset';
import { secondsToUs } from '../time/timeUtils';

/** Détecte le type de média à partir de son type MIME ou de son extension */
export function detectMediaKind(filename: string, mimeType: string = ''): MediaKind {
  const lowerName = filename.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.startsWith('video/') || /\.(mp4|webm|mkv|mov|avi|m4v)$/i.test(lowerName)) {
    return 'video';
  }
  if (lowerMime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac|m4a)$/i.test(lowerName)) {
    return 'audio';
  }
  if (lowerMime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(lowerName)) {
    return 'image';
  }
  return 'video'; // Par défaut
}

/**
 * Extrait les métadonnées et une vignette miniature d'un fichier vidéo dans le navigateur
 */
export async function probeVideoFile(file: File): Promise<Omit<MediaAsset, 'asset_id'>> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Délai d'attente dépassé lors de l'analyse de ${file.name}`));
    }, 10000);

    video.onloadedmetadata = () => {
      const durationSeconds = isFinite(video.duration) ? video.duration : 0;
      // Positionner à 0.5s ou 10% pour capturer une vignette représentative (évite l'écran noir du début)
      const seekTime = Math.min(0.5, durationSeconds > 1 ? 1.0 : durationSeconds * 0.1);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      clearTimeout(timeoutId);
      // Génération de la miniature
      let thumbnailUrl: string | undefined = undefined;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = Math.round((canvas.width * (video.videoHeight || 9)) / (video.videoWidth || 16));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        }
      } catch (err) {
        console.warn('Impossible de générer la vignette :', err);
      }

      // Nettoyage de l'objet vidéo
      URL.revokeObjectURL(objectUrl);

      resolve({
        display_name: file.name,
        media_kind: 'video',
        source_path: (file as any).path || file.name,
        duration_us: secondsToUs(video.duration || 0),
        native_width: video.videoWidth || 1920,
        native_height: video.videoHeight || 1080,
        detected_fps: 30.0, // Standard Webview fallback
        audio_channels: 2,
        audio_sample_rate_hz: 48000,
        thumbnail_url: thumbnailUrl,
        file_size_bytes: file.size,
      });
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Échec de lecture vidéo pour ${file.name} : ${video.error?.message || 'Format non pris en charge'}`));
    };
  });
}

/**
 * Extrait les métadonnées d'un fichier audio
 */
export async function probeAudioFile(file: File): Promise<Omit<MediaAsset, 'asset_id'>> {
  return new Promise((resolve, reject) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    audio.src = objectUrl;

    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Délai d'attente dépassé lors de l'analyse audio de ${file.name}`));
    }, 10000);

    audio.onloadedmetadata = () => {
      clearTimeout(timeoutId);
      const durationSeconds = isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(objectUrl);

      resolve({
        display_name: file.name,
        media_kind: 'audio',
        source_path: (file as any).path || file.name,
        duration_us: secondsToUs(durationSeconds),
        native_width: 0,
        native_height: 0,
        detected_fps: 0,
        audio_channels: 2,
        audio_sample_rate_hz: 44100,
        file_size_bytes: file.size,
      });
    };

    audio.onerror = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Impossible d'analyser le fichier audio ${file.name}`));
    };
  });
}

/**
 * Extrait les dimensions et la miniature d'une image
 */
export async function probeImageFile(file: File): Promise<Omit<MediaAsset, 'asset_id'>> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      let thumbnailUrl: string | undefined = undefined;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = Math.round((canvas.width * img.naturalHeight) / img.naturalWidth) || 135;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (err) {
        console.warn('Miniature image non disponible :', err);
      }

      URL.revokeObjectURL(objectUrl);

      resolve({
        display_name: file.name,
        media_kind: 'image',
        source_path: (file as any).path || file.name,
        duration_us: 5_000_000, // Durée par défaut de 5 secondes pour une photo
        native_width: img.naturalWidth,
        native_height: img.naturalHeight,
        detected_fps: 0,
        audio_channels: 0,
        audio_sample_rate_hz: 0,
        thumbnail_url: thumbnailUrl,
        file_size_bytes: file.size,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Échec du chargement de l'image ${file.name}`));
    };
  });
}

/**
 * Analyse automatiquement n'importe quel fichier déposé
 */
export async function probeGenericFile(file: File): Promise<MediaAsset> {
  const kind = detectMediaKind(file.name, file.type);
  let metadata: Omit<MediaAsset, 'asset_id'>;

  switch (kind) {
    case 'video':
      metadata = await probeVideoFile(file);
      break;
    case 'audio':
      metadata = await probeAudioFile(file);
      break;
    case 'image':
      metadata = await probeImageFile(file);
      break;
  }

  const assetId = 'asset_' + Math.random().toString(36).substring(2, 10);
  return {
    asset_id: assetId,
    ...metadata,
  };
}


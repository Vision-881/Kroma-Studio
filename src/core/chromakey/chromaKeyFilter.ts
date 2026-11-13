/**
 * Moteur de découpe chromatique temps réel (Chroma Key / Fond Vert & Bleu) — Kroma Studio.
 * Supporte la sélection de couleur cible, la tolérance (similarité), le lissage des contours
 * (feather / blend) et la réduction du débordement vert/bleu (spill suppression).
 */
import type { ChromaKeyData } from '../types/timeline';

export interface ChromaPreset {
  id: string;
  label: string;
  color: string;
  description: string;
}

export const CHROMA_PRESETS: ChromaPreset[] = [
  {
    id: 'green_screen',
    label: '🟢 Vert Écran',
    color: '#00B140',
    description: 'Vert studio standard (recommandé pour vidéo)',
  },
  {
    id: 'pure_green',
    label: '💚 Vert Pur',
    color: '#00FF00',
    description: 'Vert synthétique pur (#00FF00)',
  },
  {
    id: 'blue_screen',
    label: '🔵 Bleu Écran',
    color: '#0047BB',
    description: 'Bleu studio classique (pour sujets aux vêtements verts)',
  },
  {
    id: 'pure_blue',
    label: '💙 Bleu Pur',
    color: '#0000FF',
    description: 'Bleu synthétique pur (#0000FF)',
  },
];

/**
 * Convertit un code couleur hexadécimal (#RGB ou #RRGGBB) en composantes RGB (0-255).
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.trim().replace(/^#/, '');

  // Format abrégé #RGB -> #RRGGBB
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (clean.length >= 6) {
    const num = parseInt(clean.slice(0, 6), 16);
    if (!isNaN(num)) {
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    }
  }

  // Vert studio par défaut
  return { r: 0, g: 177, b: 64 };
}

/**
 * Convertit des composantes RGB en code hexadécimal canonique #RRGGBB.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Distance maximale euclidienne possible dans l'espace RGB :
 * sqrt(255^2 + 255^2 + 255^2) = ~441.67295593
 */
const MAX_RGB_DIST = 441.67295593;

/**
 * Applique le filtre de découpe chromatique directement sur un objet ImageData.
 * Modifie l'alpha du buffer pour rendre transparents les pixels proches de la couleur cible.
 */
export function applyChromaKeyToImageData(
  imageData: ImageData,
  options: ChromaKeyData,
): void {
  if (!options.enabled) return;

  const { r: targetR, g: targetG, b: targetB } = hexToRgb(options.target_color || '#00B140');
  const data = imageData.data;
  const len = data.length;

  const simThreshold = Math.max(0.005, options.similarity ?? 0.3) * MAX_RGB_DIST;
  const smoothnessRange = Math.max(0.001, options.smoothness ?? 0.1) * MAX_RGB_DIST;
  const spill = Math.max(0, Math.min(1.0, options.spill_reduction ?? 0.5));

  const isGreenTarget = targetG > targetR && targetG > targetB;
  const isBlueTarget = targetB > targetR && targetB > targetG;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let a = data[i + 3];

    if (a === 0) continue;

    // Distance euclidienne dans l'espace RGB
    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist <= simThreshold) {
      // Pixel complètement dans la tolérance : transparent
      data[i + 3] = 0;
    } else if (dist < simThreshold + smoothnessRange) {
      // Zone de transition progressive (feathering / blend)
      const ramp = (dist - simThreshold) / smoothnessRange;
      data[i + 3] = Math.round(a * ramp);

      // Réduction du débordement coloré (spill suppression) sur les bords
      if (spill > 0) {
        if (isGreenTarget && g > Math.max(r, b)) {
          const maxRB = Math.max(r, b);
          data[i + 1] = Math.round(g * (1 - spill) + maxRB * spill);
        } else if (isBlueTarget && b > Math.max(r, g)) {
          const maxRG = Math.max(r, g);
          data[i + 2] = Math.round(b * (1 - spill) + maxRG * spill);
        }
      }
    } else if (spill > 0) {
      // Débordement résiduel éventuel sur les zones non découpées
      if (isGreenTarget && g > Math.max(r, b) && dist < (simThreshold + smoothnessRange * 1.5)) {
        const maxRB = Math.max(r, b);
        data[i + 1] = Math.round(g * (1 - spill * 0.5) + maxRB * (spill * 0.5));
      } else if (isBlueTarget && b > Math.max(r, g) && dist < (simThreshold + smoothnessRange * 1.5)) {
        const maxRG = Math.max(r, g);
        data[i + 2] = Math.round(b * (1 - spill * 0.5) + maxRG * (spill * 0.5));
      }
    }
  }
}

/**
 * Cache offscreen canvas singleton pour le rendu temps réel de Chroma Key (60 FPS).
 */
let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;

function getOffscreenContext(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;

  if (!cachedCanvas) {
    cachedCanvas = document.createElement('canvas');
  }

  // Ajuste la taille si nécessaire
  if (cachedCanvas.width !== width || cachedCanvas.height !== height) {
    cachedCanvas.width = width;
    cachedCanvas.height = height;
    cachedCtx = null;
  }

  if (!cachedCtx) {
    cachedCtx = cachedCanvas.getContext('2d', { willReadFrequently: true });
  }

  if (!cachedCtx) return null;
  return { canvas: cachedCanvas, ctx: cachedCtx };
}

/**
 * Dessine un élément source (Vidéo ou Image), applique la découpe chromatique en mémoire,
 * et retourne le canvas avec transparence prêt à être composite sur la scène.
 */
export function getChromaKeyedCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: ChromaKeyData,
): HTMLCanvasElement | null {
  if (!options.enabled) return null;

  const w = Math.round(sourceWidth);
  const h = Math.round(sourceHeight);
  if (w <= 0 || h <= 0) return null;

  const offscreen = getOffscreenContext(w, h);
  if (!offscreen) return null;

  const { canvas, ctx } = offscreen;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  applyChromaKeyToImageData(imgData, options);
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

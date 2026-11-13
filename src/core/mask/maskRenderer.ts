/**
 * Moteur de détourage par Masques Géométriques & Picture-in-Picture (Étape 16).
 * Fournit le tracé vectoriel des formes (Rectangle, Cercle, Étoile, Cœur, Scission linéaire),
 * l'application temps réel sur Canvas 2D composite avec adoucissement (Feather) et inversion,
 * ainsi que la génération des filtres alpha correspondants pour FFmpeg.
 */
import type { MaskData, MaskType } from '../types/timeline';

export const DEFAULT_MASK_DATA: MaskData = {
  mask_type: 'none',
  width_percent: 80,
  height_percent: 80,
  center_x_percent: 0,
  center_y_percent: 0,
  roundness_px: 0,
  rotation_degrees: 0,
  feather_px: 0,
  inverted: false,
};

export interface MaskPresetInfo {
  type: MaskType;
  label: string;
  icon: string;
  defaultData: Partial<MaskData>;
}

export const MASK_PRESETS: MaskPresetInfo[] = [
  {
    type: 'none',
    label: 'Aucun',
    icon: '✕',
    defaultData: { mask_type: 'none' },
  },
  {
    type: 'rectangle',
    label: 'Rectangle',
    icon: '🔲',
    defaultData: {
      mask_type: 'rectangle',
      width_percent: 75,
      height_percent: 75,
      roundness_px: 16,
      feather_px: 0,
      center_x_percent: 0,
      center_y_percent: 0,
    },
  },
  {
    type: 'circle',
    label: 'Cercle / Ovale',
    icon: '⚪',
    defaultData: {
      mask_type: 'circle',
      width_percent: 70,
      height_percent: 70,
      feather_px: 0,
      center_x_percent: 0,
      center_y_percent: 0,
    },
  },
  {
    type: 'star',
    label: 'Étoile',
    icon: '⭐',
    defaultData: {
      mask_type: 'star',
      width_percent: 75,
      height_percent: 75,
      feather_px: 0,
      center_x_percent: 0,
      center_y_percent: 0,
    },
  },
  {
    type: 'heart',
    label: 'Cœur',
    icon: '❤️',
    defaultData: {
      mask_type: 'heart',
      width_percent: 75,
      height_percent: 75,
      feather_px: 0,
      center_x_percent: 0,
      center_y_percent: 0,
    },
  },
  {
    type: 'linear',
    label: 'Scission',
    icon: '✂️',
    defaultData: {
      mask_type: 'linear',
      width_percent: 100,
      height_percent: 50,
      feather_px: 0,
      center_x_percent: 0,
      center_y_percent: 0,
    },
  },
];

/**
 * Trace le chemin géométrique du masque sur un contexte Canvas 2D.
 */
export function traceMaskPath(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  mask: MaskData,
): void {
  const cx = canvasW / 2 + (mask.center_x_percent / 100) * canvasW;
  const cy = canvasH / 2 + (mask.center_y_percent / 100) * canvasH;
  const w = Math.max(8, (mask.width_percent / 100) * canvasW);
  const h = Math.max(8, (mask.height_percent / 100) * canvasH);
  const rx = w / 2;
  const ry = h / 2;
  const rotRad = ((mask.rotation_degrees ?? 0) * Math.PI) / 180;

  ctx.save();
  ctx.translate(cx, cy);
  if (rotRad !== 0) {
    ctx.rotate(rotRad);
  }

  ctx.beginPath();

  switch (mask.mask_type) {
    case 'circle': {
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      break;
    }

    case 'rectangle': {
      const left = -rx;
      const top = -ry;
      const roundness = Math.min(mask.roundness_px ?? 0, rx, ry);

      if (roundness > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(left, top, w, h, roundness);
      } else if (roundness > 0) {
        // Fallback sans ctx.roundRect
        ctx.moveTo(left + roundness, top);
        ctx.lineTo(left + w - roundness, top);
        ctx.arcTo(left + w, top, left + w, top + roundness, roundness);
        ctx.lineTo(left + w, top + h - roundness);
        ctx.arcTo(left + w, top + h, left + w - roundness, top + h, roundness);
        ctx.lineTo(left + roundness, top + h);
        ctx.arcTo(left, top + h, left, top + h - roundness, roundness);
        ctx.lineTo(left, top + roundness);
        ctx.arcTo(left, top, left + roundness, top, roundness);
      } else {
        ctx.rect(left, top, w, h);
      }
      break;
    }

    case 'star': {
      // Étoile à 5 branches
      const points = 5;
      const outerR = Math.min(rx, ry);
      const innerR = outerR * 0.45;
      let angle = -Math.PI / 2;
      const step = Math.PI / points;

      ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      for (let i = 0; i < points; i++) {
        angle += step;
        ctx.lineTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
        angle += step;
        ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      }
      ctx.closePath();
      break;
    }

    case 'heart': {
      // Cœur paramétrique formé de deux lobes et une pointe basse
      const s = Math.min(rx, ry) * 1.1;
      ctx.moveTo(0, s * 0.7);
      ctx.bezierCurveTo(-s * 1.2, -s * 0.1, -s * 0.8, -s * 0.9, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.8, -s * 0.9, s * 1.2, -s * 0.1, 0, s * 0.7);
      ctx.closePath();
      break;
    }

    case 'linear': {
      // Scission semi-plane : rectangle couvrant la moitié supérieure
      ctx.rect(-canvasW, -canvasH, canvasW * 2, canvasH);
      break;
    }

    default:
      // Pas de masque spécifique
      ctx.rect(-canvasW / 2, -canvasH / 2, canvasW, canvasH);
      break;
  }

  ctx.restore();
}

/** Cache de canvas offscreen pour le rendu de masque */
let offscreenSourceCanvas: HTMLCanvasElement | null = null;
let offscreenStencilCanvas: HTMLCanvasElement | null = null;

/**
 * Applique le masque géométrique à une source visuelle et retourne un Canvas 2D détouré.
 */
export function getMaskedCanvas(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  mask: MaskData,
): HTMLCanvasElement {
  if (typeof document === 'undefined') {
    throw new Error('getMaskedCanvas requiert un environnement DOM/navigateur');
  }

  const w = Math.max(1, Math.round(sourceW));
  const h = Math.max(1, Math.round(sourceH));

  if (!offscreenSourceCanvas) {
    offscreenSourceCanvas = document.createElement('canvas');
  }
  if (!offscreenStencilCanvas) {
    offscreenStencilCanvas = document.createElement('canvas');
  }

  if (offscreenSourceCanvas.width !== w || offscreenSourceCanvas.height !== h) {
    offscreenSourceCanvas.width = w;
    offscreenSourceCanvas.height = h;
  }
  if (offscreenStencilCanvas.width !== w || offscreenStencilCanvas.height !== h) {
    offscreenStencilCanvas.width = w;
    offscreenStencilCanvas.height = h;
  }

  const sCtx = offscreenSourceCanvas.getContext('2d');
  const mCtx = offscreenStencilCanvas.getContext('2d');
  if (!sCtx || !mCtx) return offscreenSourceCanvas;

  // 1. Dessiner la source originale
  sCtx.clearRect(0, 0, w, h);
  sCtx.drawImage(source, 0, 0, w, h);

  // 2. Préparer le masque pochoir
  mCtx.clearRect(0, 0, w, h);

  const feather = Math.max(0, mask.feather_px ?? 0);
  if (feather > 0) {
    mCtx.filter = `blur(${feather}px)`;
  } else {
    mCtx.filter = 'none';
  }

  if (mask.inverted) {
    // Remplir tout l'écran en blanc
    mCtx.fillStyle = '#ffffff';
    mCtx.fillRect(0, 0, w, h);

    // Effacer la forme du masque (destination-out)
    mCtx.globalCompositeOperation = 'destination-out';
    traceMaskPath(mCtx, w, h, mask);
    mCtx.fillStyle = '#000000';
    mCtx.fill();
    mCtx.globalCompositeOperation = 'source-over';
  } else {
    // Dessiner la forme géométrique en blanc opaque
    traceMaskPath(mCtx, w, h, mask);
    mCtx.fillStyle = '#ffffff';
    mCtx.fill();
  }

  mCtx.filter = 'none';

  // 3. Découper la source selon le pochoir avec destination-in
  sCtx.globalCompositeOperation = 'destination-in';
  sCtx.drawImage(offscreenStencilCanvas, 0, 0);
  sCtx.globalCompositeOperation = 'source-over';

  return offscreenSourceCanvas;
}

/**
 * Génère le filtre FFmpeg pour le masque géométrique (Étape 16).
 */
export function buildFFmpegMaskFilter(
  mask: MaskData,
  _nativeW?: number,
  _nativeH?: number,
): string | null {
  if (!mask || mask.mask_type === 'none') return null;

  const cxNorm = (0.5 + (mask.center_x_percent / 100)).toFixed(4);
  const cyNorm = (0.5 + (mask.center_y_percent / 100)).toFixed(4);
  const rxNorm = ((mask.width_percent / 100) / 2).toFixed(4);
  const ryNorm = ((mask.height_percent / 100) / 2).toFixed(4);

  const inv = !!mask.inverted;

  switch (mask.mask_type) {
    case 'circle': {
      // Masque elliptique via filtre geq
      // Condition : ((X - CX) / RX)^2 + ((Y - CY) / RY)^2 <= 1
      const alphaCond = `lte(hypot((X-W*${cxNorm})/(W*${rxNorm}),(Y-H*${cyNorm})/(H*${ryNorm})),1)`;
      const alphaVal = inv ? `if(${alphaCond},0,255)` : `if(${alphaCond},255,0)`;
      return `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaVal}'`;
    }

    case 'rectangle': {
      // Masque rectangulaire
      const x1 = `W*${(Number(cxNorm) - Number(rxNorm)).toFixed(4)}`;
      const x2 = `W*${(Number(cxNorm) + Number(rxNorm)).toFixed(4)}`;
      const y1 = `H*${(Number(cyNorm) - Number(ryNorm)).toFixed(4)}`;
      const y2 = `H*${(Number(cyNorm) + Number(ryNorm)).toFixed(4)}`;

      const insideCond = `between(X,${x1},${x2})*between(Y,${y1},${y2})`;
      const alphaVal = inv ? `if(${insideCond},0,255)` : `if(${insideCond},255,0)`;
      return `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaVal}'`;
    }

    case 'linear': {
      // Masque de scission linéaire (demi-plan Y <= CY)
      const insideCond = `lte(Y,H*${cyNorm})`;
      const alphaVal = inv ? `if(${insideCond},0,255)` : `if(${insideCond},255,0)`;
      return `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaVal}'`;
    }

    case 'star':
    case 'heart': {
      // Formes artistiques approchées par masque géométrique centré
      const alphaCond = `lte(hypot((X-W*${cxNorm})/(W*${rxNorm}),(Y-H*${cyNorm})/(H*${ryNorm})),1)`;
      const alphaVal = inv ? `if(${alphaCond},0,255)` : `if(${alphaCond},255,0)`;
      return `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaVal}'`;
    }

    default:
      return null;
  }
}

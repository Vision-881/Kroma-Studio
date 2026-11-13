import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  applyChromaKeyToImageData,
  CHROMA_PRESETS,
} from './chromaKeyFilter';
import type { ChromaKeyData } from '../types/timeline';

/**
 * Helper créant un ImageData fictif pour les tests.
 */
function createMockImageData(width: number, height: number, fillRgba: [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fillRgba[0];
    data[i + 1] = fillRgba[1];
    data[i + 2] = fillRgba[2];
    data[i + 3] = fillRgba[3];
  }
  return {
    data,
    width,
    height,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('chromaKeyFilter (Étape 15 — Incrustation Fond Vert / Chroma Key)', () => {
  describe('hexToRgb() et rgbToHex()', () => {
    it('convertit les codes hexadécimaux 6 caractères en RGB', () => {
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('00B140')).toEqual({ r: 0, g: 177, b: 64 });
    });

    it('convertit les codes hexadécimaux abrégés 3 caractères', () => {
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('utilise la couleur par défaut pour une entrée invalide', () => {
      expect(hexToRgb('invalid')).toEqual({ r: 0, g: 177, b: 64 });
    });

    it('rgbToHex() convertit les composantes RGB en hexadécimal', () => {
      expect(rgbToHex(0, 255, 0)).toBe('#00FF00');
      expect(rgbToHex(0, 71, 187)).toBe('#0047BB');
      expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
    });

    it('contient les presets essentiels dans CHROMA_PRESETS', () => {
      expect(CHROMA_PRESETS.length).toBeGreaterThanOrEqual(4);
      expect(CHROMA_PRESETS.some((p) => p.id === 'green_screen')).toBe(true);
      expect(CHROMA_PRESETS.some((p) => p.id === 'blue_screen')).toBe(true);
    });
  });

  describe('applyChromaKeyToImageData()', () => {
    it('ne modifie pas l\'image si chroma_key est désactivé (enabled: false)', () => {
      const img = createMockImageData(2, 2, [0, 255, 0, 255]);
      const config: ChromaKeyData = {
        enabled: false,
        target_color: '#00FF00',
        similarity: 0.3,
        smoothness: 0.1,
      };

      applyChromaKeyToImageData(img, config);
      expect(img.data[3]).toBe(255);
    });

    it('rend transparent un pixel vert studio pur dans la zone de tolérance', () => {
      const img = createMockImageData(2, 2, [0, 255, 0, 255]);
      const config: ChromaKeyData = {
        enabled: true,
        target_color: '#00FF00',
        similarity: 0.3, // tolérance
        smoothness: 0.1,
      };

      applyChromaKeyToImageData(img, config);
      // L'alpha de tous les pixels doit être tombé à 0 (transparent)
      expect(img.data[3]).toBe(0);
      expect(img.data[7]).toBe(0);
    });

    it('préserve l\'opacité (alpha = 255) des pixels éloignés de la couleur cible (ex: rouge ou blanc)', () => {
      // Pixel rouge [255, 0, 0, 255]
      const img = createMockImageData(2, 2, [255, 0, 0, 255]);
      const config: ChromaKeyData = {
        enabled: true,
        target_color: '#00FF00',
        similarity: 0.3,
        smoothness: 0.1,
      };

      applyChromaKeyToImageData(img, config);
      expect(img.data[3]).toBe(255);
    });

    it('applique un dégradé doux (alpha intermédiaire) dans la zone de lissage (smoothness)', () => {
      // Cible: vert #00FF00.
      // Créer une couleur verte légèrement dérivée: [0, 200, 50, 255]
      const img = createMockImageData(1, 1, [0, 200, 50, 255]);
      // dist = sqrt(0 + 55^2 + 50^2) = sqrt(3025 + 2500) = sqrt(5525) = ~74.33
      // sim = 0.1 => 0.1 * 441.67 = ~44.16
      // smooth = 0.15 => 0.15 * 441.67 = ~66.25 => intervalle [44.16, 110.41]
      // 74.33 est dans l'intervalle de lissage !
      const config: ChromaKeyData = {
        enabled: true,
        target_color: '#00FF00',
        similarity: 0.1,
        smoothness: 0.15,
      };

      applyChromaKeyToImageData(img, config);
      expect(img.data[3]).toBeGreaterThan(0);
      expect(img.data[3]).toBeLessThan(255);
    });

    it('découpe un fond bleu (Blue screen) avec target_color="#0000FF"', () => {
      const img = createMockImageData(2, 2, [0, 0, 255, 255]);
      const config: ChromaKeyData = {
        enabled: true,
        target_color: '#0000FF',
        similarity: 0.3,
        smoothness: 0.1,
      };

      applyChromaKeyToImageData(img, config);
      expect(img.data[3]).toBe(0);
    });

    it('atténue le débordement vert (spill reduction) sur les contours', () => {
      // Pixel avec dominante verte sur le contour d'un vêtement : r=100, g=180, b=100
      const img = createMockImageData(1, 1, [100, 180, 100, 255]);
      const config: ChromaKeyData = {
        enabled: true,
        target_color: '#00FF00',
        similarity: 0.1,
        smoothness: 0.3,
        spill_reduction: 0.8,
      };

      applyChromaKeyToImageData(img, config);
      // Le canal vert doit avoir été désaturé/réduit vers max(r, b)
      expect(img.data[1]).toBeLessThan(180);
    });
  });
});

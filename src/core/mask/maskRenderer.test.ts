import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MASK_DATA,
  MASK_PRESETS,
  buildFFmpegMaskFilter,
} from './maskRenderer';
import type { MaskData } from '../types/timeline';

describe('maskRenderer — Masques Géométriques & PiP (Étape 16)', () => {
  it('fournit une configuration par défaut avec mask_type "none"', () => {
    expect(DEFAULT_MASK_DATA.mask_type).toBe('none');
    expect(DEFAULT_MASK_DATA.width_percent).toBe(80);
    expect(DEFAULT_MASK_DATA.height_percent).toBe(80);
    expect(DEFAULT_MASK_DATA.inverted).toBe(false);
  });

  it('propose l\'ensemble des 6 préréglages CapCut', () => {
    const types = MASK_PRESETS.map((p) => p.type);
    expect(types).toEqual(['none', 'rectangle', 'circle', 'star', 'heart', 'linear']);
  });

  describe('buildFFmpegMaskFilter()', () => {
    it('retourne null si mask_type est "none"', () => {
      const filter = buildFFmpegMaskFilter(
        { mask_type: 'none', width_percent: 80, height_percent: 80, center_x_percent: 0, center_y_percent: 0 },
        1920,
        1080,
      );
      expect(filter).toBeNull();
    });

    it('génère un filtre geq pour un masque circulaire', () => {
      const mask: MaskData = {
        mask_type: 'circle',
        width_percent: 60,
        height_percent: 60,
        center_x_percent: 0,
        center_y_percent: 0,
        inverted: false,
      };
      const filter = buildFFmpegMaskFilter(mask, 1920, 1080);
      expect(filter).toContain('format=rgba,geq=');
      expect(filter).toContain('hypot');
      expect(filter).toContain('if(');
      expect(filter).toContain('255,0');
    });

    it('génère un filtre geq inversé si inverted est vrai', () => {
      const mask: MaskData = {
        mask_type: 'circle',
        width_percent: 60,
        height_percent: 60,
        center_x_percent: 0,
        center_y_percent: 0,
        inverted: true,
      };
      const filter = buildFFmpegMaskFilter(mask, 1920, 1080);
      expect(filter).toContain('format=rgba,geq=');
      expect(filter).toContain('0,255');
    });

    it('génère un filtre geq pour un masque rectangulaire', () => {
      const mask: MaskData = {
        mask_type: 'rectangle',
        width_percent: 80,
        height_percent: 50,
        center_x_percent: 10,
        center_y_percent: -5,
        roundness_px: 20,
        inverted: false,
      };
      const filter = buildFFmpegMaskFilter(mask, 1920, 1080);
      expect(filter).toContain('format=rgba,geq=');
      expect(filter).toContain('between');
      expect(filter).toContain('255,0');
    });

    it('génère un filtre geq pour un masque de scission linéaire', () => {
      const mask: MaskData = {
        mask_type: 'linear',
        width_percent: 100,
        height_percent: 50,
        center_x_percent: 0,
        center_y_percent: 0,
        inverted: false,
      };
      const filter = buildFFmpegMaskFilter(mask, 1920, 1080);
      expect(filter).toContain('format=rgba,geq=');
      expect(filter).toContain('lte(Y,');
    });
  });
});

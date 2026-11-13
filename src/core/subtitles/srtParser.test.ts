import { describe, it, expect } from 'vitest';
import {
  timecodeToMicroseconds,
  microsecondsToSrtTimecode,
  microsecondsToVttTimecode,
  parseSrt,
  exportSrt,
  parseVtt,
  exportVtt,
} from './srtParser';
import type { SubtitleCue } from './subtitles';

describe('Moteur de sous-titres & Parser SRT / WebVTT (Étape 18)', () => {
  describe('timecodeToMicroseconds()', () => {
    it('convertit un timecode SRT standard (HH:MM:SS,mmm) en microsecondes', () => {
      // 1 min 23 sec 456 ms = (60 + 23) * 1_000_000 + 456_000 = 83_456_000 us
      expect(timecodeToMicroseconds('00:01:23,456')).toBe(83_456_000);
      expect(timecodeToMicroseconds('00:00:00,000')).toBe(0);
      expect(timecodeToMicroseconds('01:00:00,000')).toBe(3_600_000_000);
    });

    it('accepte les points comme séparateurs de millisecondes (WebVTT)', () => {
      expect(timecodeToMicroseconds('00:01:23.456')).toBe(83_456_000);
    });

    it('accepte le format court MM:SS.mmm', () => {
      expect(timecodeToMicroseconds('02:15.500')).toBe(135_500_000);
    });

    it('gère les chaînes vides ou invalides sans planter', () => {
      expect(timecodeToMicroseconds('')).toBe(0);
      expect(timecodeToMicroseconds('invalid')).toBe(0);
    });
  });

  describe('microsecondsToSrtTimecode() & microsecondsToVttTimecode()', () => {
    it('formate correctement les microsecondes en timecode SRT', () => {
      expect(microsecondsToSrtTimecode(0)).toBe('00:00:00,000');
      expect(microsecondsToSrtTimecode(83_456_000)).toBe('00:01:23,456');
      expect(microsecondsToSrtTimecode(3_661_200_000)).toBe('01:01:01,200');
    });

    it('formate correctement en timecode WebVTT avec un point', () => {
      expect(microsecondsToVttTimecode(83_456_000)).toBe('00:01:23.456');
    });
  });

  describe('parseSrt()', () => {
    it('parse un fichier SRT standard à plusieurs segments', () => {
      const srtContent = `
1
00:00:01,000 --> 00:00:03,500
Bienvenue sur Kroma Studio !

2
00:00:04,000 --> 00:00:07,200
L'éditeur vidéo créatif pour tous.
`;
      const cues = parseSrt(srtContent);
      expect(cues.length).toBe(2);

      expect(cues[0].index).toBe(1);
      expect(cues[0].start_time_us).toBe(1_000_000);
      expect(cues[0].end_time_us).toBe(3_500_000);
      expect(cues[0].text).toBe('Bienvenue sur Kroma Studio !');

      expect(cues[1].index).toBe(2);
      expect(cues[1].start_time_us).toBe(4_000_000);
      expect(cues[1].end_time_us).toBe(7_200_000);
      expect(cues[1].text).toBe("L'éditeur vidéo créatif pour tous.");
    });

    it('supporte les sous-titres sur plusieurs lignes', () => {
      const srtMultiline = `
1
00:00:01,000 --> 00:00:04,000
Première ligne de sous-titre
Deuxième ligne de sous-titre
`;
      const cues = parseSrt(srtMultiline);
      expect(cues.length).toBe(1);
      expect(cues[0].text).toBe('Première ligne de sous-titre\nDeuxième ligne de sous-titre');
    });

    it('gère les sauts de lignes Windows CRLF et nettoie les balises HTML simples', () => {
      const srtWithTags = "1\r\n00:00:02,000 --> 00:00:05,000\r\n<i>Texte en italique</i> et <b>gras</b>\r\n";
      const cues = parseSrt(srtWithTags);
      expect(cues.length).toBe(1);
      expect(cues[0].text).toBe('Texte en italique et gras');
    });

    it('rejette les segments dont le temps de fin est inférieur ou égal au temps de début', () => {
      const invalidSrt = `
1
00:00:05,000 --> 00:00:02,000
Ce sous-titre est invalide chronologiquement
`;
      const cues = parseSrt(invalidSrt);
      expect(cues.length).toBe(0);
    });

    it('retourne une liste vide pour un contenu vide', () => {
      expect(parseSrt('')).toEqual([]);
      expect(parseSrt('   \n  \n  ')).toEqual([]);
    });
  });

  describe('exportSrt()', () => {
    it('génère un contenu SRT valide et ordonné', () => {
      const cues: SubtitleCue[] = [
        {
          cue_id: 'c2',
          start_time_us: 5_000_000,
          end_time_us: 8_000_000,
          text: 'Deuxième segment',
        },
        {
          cue_id: 'c1',
          start_time_us: 1_000_000,
          end_time_us: 3_000_000,
          text: 'Premier segment',
        },
      ];

      const exported = exportSrt(cues);
      expect(exported).toContain('1\n00:00:01,000 --> 00:00:03,000\nPremier segment');
      expect(exported).toContain('2\n00:00:05,000 --> 00:00:08,000\nDeuxième segment');

      // Doit pouvoir être ré-analysé immédiatement par parseSrt
      const reParsed = parseSrt(exported);
      expect(reParsed.length).toBe(2);
      expect(reParsed[0].text).toBe('Premier segment');
      expect(reParsed[1].text).toBe('Deuxième segment');
    });
  });

  describe('parseVtt() & exportVtt()', () => {
    it('parse un fichier WebVTT avec en-tête', () => {
      const vttContent = `WEBVTT - Titre du fichier

1
00:00:01.200 --> 00:00:03.800
Légende WebVTT

2
00:00:05.000 --> 00:00:08.500
Deuxième légende
`;
      const cues = parseVtt(vttContent);
      expect(cues.length).toBe(2);
      expect(cues[0].start_time_us).toBe(1_200_000);
      expect(cues[0].end_time_us).toBe(3_800_000);
      expect(cues[0].text).toBe('Légende WebVTT');
    });

    it('exporte en format WebVTT valide', () => {
      const cues: SubtitleCue[] = [
        {
          cue_id: 'c1',
          start_time_us: 2_000_000,
          end_time_us: 4_500_000,
          text: 'Sous-titre VTT',
        },
      ];
      const exported = exportVtt(cues);
      expect(exported.startsWith('WEBVTT')).toBe(true);
      expect(exported).toContain('00:00:02.000 --> 00:00:04.500\nSous-titre VTT');
    });
  });
});

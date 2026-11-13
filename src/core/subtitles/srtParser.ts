/**
 * Moteur de parsing et d'exportation pour sous-titres SubRip (.srt) et WebVTT (.vtt).
 * Convertit rigoureusement les timecodes en microsecondes entières (us).
 */
import type { SubtitleCue } from './subtitles';

/**
 * Convertit un timecode SRT ou VTT (ex: "01:23:45,678" ou "00:04.200") en microsecondes entières.
 */
export function timecodeToMicroseconds(timecodeStr: string): number {
  if (!timecodeStr || typeof timecodeStr !== 'string') return 0;

  const clean = timecodeStr.trim().replace(',', '.');
  const parts = clean.split(':');

  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = parseInt(parts[0], 10) || 0;
    minutes = parseInt(parts[1], 10) || 0;
    seconds = parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10) || 0;
    seconds = parseFloat(parts[1]) || 0;
  } else if (parts.length === 1) {
    seconds = parseFloat(parts[0]) || 0;
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return Math.round(totalSeconds * 1_000_000);
}

/**
 * Formate un temps en microsecondes au format SRT : HH:MM:SS,mmm
 */
export function microsecondsToSrtTimecode(us: number): string {
  const safeUs = Math.max(0, Math.round(us));
  const totalMs = Math.floor(safeUs / 1000);

  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const pad3 = (n: number) => n.toString().padStart(3, '0');

  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

/**
 * Formate un temps en microsecondes au format WebVTT : HH:MM:SS.mmm
 */
export function microsecondsToVttTimecode(us: number): string {
  return microsecondsToSrtTimecode(us).replace(',', '.');
}

/**
 * Parse le contenu brut d'un fichier .srt en une liste ordonnée de SubtitleCue.
 */
export function parseSrt(content: string): SubtitleCue[] {
  if (!content || typeof content !== 'string') return [];

  // Normalisation des sauts de ligne Windows \r\n et Mac anciens \r en \n
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  // Découpage en blocs séparés par deux sauts de ligne ou plus
  const blocks = normalized.split(/\n\s*\n+/);
  const cues: SubtitleCue[] = [];
  let generatedIndex = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let timeLineIndex = -1;
    let timingLine = '';

    // Trouver la ligne contenant la flèche '-->'
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        timingLine = lines[i];
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    // Découpage du timing
    const arrowParts = timingLine.split('-->');
    if (arrowParts.length !== 2) continue;

    const startUs = timecodeToMicroseconds(arrowParts[0]);
    // Extraire uniquement le timecode de fin (ignorer les options VTT éventuelles)
    const endRaw = arrowParts[1].trim().split(/\s+/)[0];
    const endUs = timecodeToMicroseconds(endRaw);

    if (endUs <= startUs) continue;

    // Lignes de texte suivant la ligne de timing
    const textLines = lines.slice(timeLineIndex + 1);
    const rawText = textLines.join('\n').trim();
    if (!rawText) continue;

    // Suppression optionnelle des balises HTML simples <i>, <b>, <font...>
    const cleanText = rawText.replace(/<\/?[^>]+(>|$)/g, '').trim();

    // Numéro d'index (première ligne si présente avant le timing)
    let cueIndex = generatedIndex;
    if (timeLineIndex > 0) {
      const parsedNum = parseInt(lines[0], 10);
      if (!isNaN(parsedNum)) {
        cueIndex = parsedNum;
      }
    }

    cues.push({
      cue_id: `cue_${generatedIndex}_${Math.random().toString(36).substring(2, 7)}`,
      start_time_us: startUs,
      end_time_us: endUs,
      text: cleanText,
      index: cueIndex,
    });

    generatedIndex++;
  }

  // Tri temporel strict par point de départ
  return cues.sort((a, b) => a.start_time_us - b.start_time_us);
}

/**
 * Exporte une liste de SubtitleCue au format standard SubRip (.srt).
 */
export function exportSrt(cues: SubtitleCue[]): string {
  if (!cues || cues.length === 0) return '';

  const sorted = [...cues].sort((a, b) => a.start_time_us - b.start_time_us);
  const blocks: string[] = [];

  sorted.forEach((cue, idx) => {
    const cueNumber = idx + 1;
    const startTc = microsecondsToSrtTimecode(cue.start_time_us);
    const endTc = microsecondsToSrtTimecode(cue.end_time_us);
    const text = cue.text.trim();

    blocks.push(`${cueNumber}\n${startTc} --> ${endTc}\n${text}`);
  });

  return blocks.join('\n\n') + '\n';
}

/**
 * Parse le contenu brut d'un fichier WebVTT (.vtt) en liste de SubtitleCue.
 */
export function parseVtt(content: string): SubtitleCue[] {
  if (!content || typeof content !== 'string') return [];

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  // Retirer l'en-tête WEBVTT et les métadonnées initiales
  const withoutHeader = normalized.replace(/^WEBVTT[^\n]*\n+/i, '');

  return parseSrt(withoutHeader);
}

/**
 * Exporte une liste de SubtitleCue au format WebVTT (.vtt).
 */
export function exportVtt(cues: SubtitleCue[]): string {
  if (!cues || cues.length === 0) return 'WEBVTT\n\n';

  const sorted = [...cues].sort((a, b) => a.start_time_us - b.start_time_us);
  const blocks: string[] = ['WEBVTT\n'];

  sorted.forEach((cue, idx) => {
    const cueNumber = idx + 1;
    const startTc = microsecondsToVttTimecode(cue.start_time_us);
    const endTc = microsecondsToVttTimecode(cue.end_time_us);
    const text = cue.text.trim();

    blocks.push(`${cueNumber}\n${startTc} --> ${endTc}\n${text}`);
  });

  return blocks.join('\n') + '\n';
}

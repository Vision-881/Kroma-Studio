/**
 * ExportDialog.tsx — Boîte de dialogue professionnelle d'exportation MP4 via FFmpeg.
 * Conçue dans l'esprit CapCut Desktop :
 * - Sélecteurs de préréglages (1080p Full HD, 720p HD, 4K Ultra HD, personnalisé)
 * - Réglages fins vidéo (H.264/HEVC, profils de vitesse, CRF) et audio (AAC, débit)
 * - Fiche technique de composition temps réel
 * - Génération instantanée de commandes CLI FFmpeg optimisées avec filtre complexe
 * - Téléchargement immédiat de scripts exécutables autonomes (.bat Windows et .sh Unix)
 */

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode,
  Terminal,
  Clock,
  Tv,
  Film,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import {
  buildFFmpegCommand,
  generateWindowsBatch,
  generateBashScript,
  type ExportOptions,
} from '../../core/export/ffmpegCommandBuilder';
import { usToTimecode } from '../../core/time/timeUtils';
import '../../styles/export-dialog.css';

interface ResolutionPreset {
  id: string;
  label: string;
  sub: string;
  width: number;
  height: number;
  fps: number;
}

const PRESETS: ResolutionPreset[] = [
  {
    id: '1080p',
    label: '1080p Full HD',
    sub: '1920×1080 · 60 FPS',
    width: 1920,
    height: 1080,
    fps: 60,
  },
  {
    id: '720p',
    label: '720p HD',
    sub: '1280×720 · 30 FPS',
    width: 1280,
    height: 720,
    fps: 30,
  },
  {
    id: '4k',
    label: '4K Ultra HD',
    sub: '3840×2160 · 60 FPS',
    width: 3840,
    height: 2160,
    fps: 60,
  },
  {
    id: 'custom',
    label: 'Personnalisé',
    sub: 'Sur mesure',
    width: 0,
    height: 0,
    fps: 0,
  },
];

export function ExportDialog() {
  const { project, isExportDialogOpen, closeExportDialog } = useProjectStore();

  const [activePresetId, setActivePresetId] = useState<string>('1080p');
  const [customWidth, setCustomWidth] = useState<number>(project.timeline_canvas?.viewport_width || 1920);
  const [customHeight, setCustomHeight] = useState<number>(project.timeline_canvas?.viewport_height || 1080);
  const [customFps, setCustomFps] = useState<number>(project.timeline_canvas?.frame_rate_fps || 60);

  const [videoCodec, setVideoCodec] = useState<'libx264' | 'libx265'>('libx264');
  const [preset, setPreset] = useState<'ultrafast' | 'veryfast' | 'fast' | 'medium' | 'slow'>('medium');
  const [crf, setCrf] = useState<number>(23);
  const [audioBitrate, setAudioBitrate] = useState<string>('192k');

  const defaultFilename = useMemo(() => {
    const base = (project.project_name || 'kroma_export')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/gi, '_')
      .replace(/_+/g, '_');
    return `${base}.mp4`;
  }, [project.project_name]);

  const [outputFilename, setOutputFilename] = useState<string>(defaultFilename);
  const [activeTab, setActiveTab] = useState<'windows' | 'bash' | 'filter'>('windows');
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    setOutputFilename(defaultFilename);
  }, [defaultFilename]);

  // Fermer la modal avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExportDialogOpen) {
        closeExportDialog();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportDialogOpen, closeExportDialog]);

  if (!isExportDialogOpen) return null;

  // Calcul des dimensions selon le preset choisi
  const selectedPreset = PRESETS.find((p) => p.id === activePresetId && p.id !== 'custom');
  const targetWidth = selectedPreset ? selectedPreset.width : customWidth;
  const targetHeight = selectedPreset ? selectedPreset.height : customHeight;
  const targetFps = selectedPreset ? selectedPreset.fps : customFps;

  const exportOptions: ExportOptions = {
    width: targetWidth,
    height: targetHeight,
    fps: targetFps,
    videoCodec,
    preset,
    crf,
    audioBitrate,
    outputFilename: outputFilename.trim() || 'kroma_export.mp4',
    includeSilentAudioIfEmpty: true,
  };

  const exportResult = buildFFmpegCommand(project, exportOptions);

  // Copier dans le presse-papier
  const handleCopyCommand = async () => {
    const textToCopy =
      activeTab === 'windows'
        ? exportResult.windowsCommand
        : activeTab === 'bash'
        ? exportResult.bashCommand
        : exportResult.filterComplex;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      // Fallback
      alert('Impossible de copier automatiquement dans le presse-papier.');
    }
  };

  // Télécharger le script Windows Batch (.bat)
  const handleDownloadBatch = () => {
    const content = generateWindowsBatch(exportResult);
    const blob = new Blob([content], { type: 'application/x-bat;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exporter_${exportResult.outputFilename.replace(/\.mp4$/i, '')}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Télécharger le script Linux/macOS (.sh)
  const handleDownloadBash = () => {
    const content = generateBashScript(exportResult);
    const blob = new Blob([content], { type: 'application/x-sh;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exporter_${exportResult.outputFilename.replace(/\.mp4$/i, '')}.sh`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Statistiques de la timeline
  const totalClipsCount = project.sequence.lanes.reduce((acc, l) => acc + l.items.length, 0);

  return (
    <div className="kroma-modal-overlay" onClick={closeExportDialog}>
      <div className="kroma-export-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ── En-tête ── */}
        <div className="kroma-export-header">
          <div className="kroma-export-header__title-group">
            <span className="kroma-export-header__badge">Étape 7 MVP</span>
            <h2 className="kroma-export-header__title">Exporter la vidéo (FFmpeg MP4)</h2>
          </div>
          <button
            className="kroma-export-header__close"
            onClick={closeExportDialog}
            title="Fermer la fenêtre (Échap)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Corps (2 colonnes) ── */}
        <div className="kroma-export-body">
          {/* Colonne gauche : Paramètres d'encodage */}
          <div className="kroma-export-col kroma-export-col--left">
            {/* Préréglages de résolution */}
            <div className="kroma-export-group">
              <label className="kroma-export-label">
                <span>Résolution & Cadence</span>
                <span className="kroma-export-label__hint">16:9 Standard</span>
              </label>
              <div className="kroma-export-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    className={`kroma-preset-btn ${activePresetId === p.id ? 'kroma-preset-btn--active' : ''}`}
                    onClick={() => setActivePresetId(p.id)}
                  >
                    <span className="kroma-preset-btn__title">{p.label}</span>
                    <span className="kroma-preset-btn__sub">{p.sub}</span>
                  </button>
                ))}
              </div>

              {activePresetId === 'custom' && (
                <div className="kroma-export-grid-2" style={{ marginTop: '0.5rem' }}>
                  <div className="kroma-export-group">
                    <label className="kroma-export-label">Dimensions (L × H)</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="number"
                        className="kroma-export-input"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Math.max(16, Number(e.target.value)))}
                        placeholder="1920"
                      />
                      <input
                        type="number"
                        className="kroma-export-input"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Math.max(16, Number(e.target.value)))}
                        placeholder="1080"
                      />
                    </div>
                  </div>
                  <div className="kroma-export-group">
                    <label className="kroma-export-label">Cadence (FPS)</label>
                    <select
                      className="kroma-export-select"
                      value={customFps}
                      onChange={(e) => setCustomFps(Number(e.target.value))}
                    >
                      <option value="24">24 FPS (Cinéma)</option>
                      <option value="25">25 FPS (PAL)</option>
                      <option value="30">30 FPS (Web)</option>
                      <option value="50">50 FPS (TV)</option>
                      <option value="60">60 FPS (Fluide)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Nom de fichier de sortie */}
            <div className="kroma-export-group">
              <label className="kroma-export-label">Nom du fichier cible</label>
              <input
                type="text"
                className="kroma-export-input"
                value={outputFilename}
                onChange={(e) => setOutputFilename(e.target.value)}
                placeholder="nom_video.mp4"
              />
            </div>

            {/* Codec et Profil de vitesse */}
            <div className="kroma-export-grid-2">
              <div className="kroma-export-group">
                <label className="kroma-export-label">Codec Vidéo</label>
                <select
                  className="kroma-export-select"
                  value={videoCodec}
                  onChange={(e) => setVideoCodec(e.target.value as 'libx264' | 'libx265')}
                >
                  <option value="libx264">H.264 (Universel)</option>
                  <option value="libx265">H.265 / HEVC (Compact)</option>
                </select>
              </div>

              <div className="kroma-export-group">
                <label className="kroma-export-label">Profil d'encodage</label>
                <select
                  className="kroma-export-select"
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as any)}
                >
                  <option value="veryfast">Très rapide</option>
                  <option value="fast">Rapide</option>
                  <option value="medium">Équilibré (Recommandé)</option>
                  <option value="slow">Haute qualité</option>
                </select>
              </div>
            </div>

            {/* Qualité constante CRF */}
            <div className="kroma-export-group">
              <div className="kroma-export-label">
                <span>Facteur de qualité (CRF : {crf})</span>
                <span className="kroma-export-label__hint">
                  {crf <= 18 ? 'Quasi sans perte' : crf <= 23 ? 'Équilibré visuel' : 'Fichier compact'}
                </span>
              </div>
              <div className="kroma-export-slider-row">
                <input
                  type="range"
                  min="16"
                  max="30"
                  step="1"
                  value={crf}
                  onChange={(e) => setCrf(Number(e.target.value))}
                  className="kroma-export-range"
                />
                <span className="kroma-export-value-badge">{crf}</span>
              </div>
            </div>

            {/* Débit audio AAC */}
            <div className="kroma-export-group">
              <label className="kroma-export-label">Débit audio AAC</label>
              <select
                className="kroma-export-select"
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(e.target.value)}
              >
                <option value="128k">128 kbps (Standard)</option>
                <option value="192k">192 kbps (Recommandé)</option>
                <option value="256k">256 kbps (Haute fidélité)</option>
                <option value="320k">320 kbps (Studio)</option>
              </select>
            </div>
          </div>

          {/* Colonne droite : Résumé & Commande CLI */}
          <div className="kroma-export-col kroma-export-col--right">
            {/* Boîte résumé */}
            <div className="kroma-export-summary-box">
              <div className="kroma-export-summary-item">
                <span className="kroma-export-summary-item__label">
                  <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Durée
                </span>
                <span className="kroma-export-summary-item__value">
                  {usToTimecode(exportResult.totalDurationSeconds * 1_000_000, targetFps)}
                </span>
              </div>

              <div className="kroma-export-summary-item">
                <span className="kroma-export-summary-item__label">
                  <Tv size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Définition
                </span>
                <span className="kroma-export-summary-item__value">
                  {targetWidth}×{targetHeight} @ {targetFps}p
                </span>
              </div>

              <div className="kroma-export-summary-item">
                <span className="kroma-export-summary-item__label">
                  <Film size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Clips montés
                </span>
                <span className="kroma-export-summary-item__value">
                  {totalClipsCount} segments
                </span>
              </div>

              <div className="kroma-export-summary-item">
                <span className="kroma-export-summary-item__label">
                  <Terminal size={11} style={{ display: 'inline', marginRight: 4 }} />
                  Sources
                </span>
                <span className="kroma-export-summary-item__value">
                  {exportResult.inputFiles.length} fichier(s)
                </span>
              </div>
            </div>

            {/* Onglets de prévisualisation de commande */}
            <div className="kroma-export-group">
              <div className="kroma-export-tabs">
                <button
                  className={`kroma-export-tab ${activeTab === 'windows' ? 'kroma-export-tab--active' : ''}`}
                  onClick={() => setActiveTab('windows')}
                >
                  PowerShell / CMD
                </button>
                <button
                  className={`kroma-export-tab ${activeTab === 'bash' ? 'kroma-export-tab--active' : ''}`}
                  onClick={() => setActiveTab('bash')}
                >
                  Terminal Bash
                </button>
                <button
                  className={`kroma-export-tab ${activeTab === 'filter' ? 'kroma-export-tab--active' : ''}`}
                  onClick={() => setActiveTab('filter')}
                >
                  Filtre Complexe
                </button>
              </div>

              {/* Code viewer */}
              <div className="kroma-export-code-box">
                {activeTab === 'windows' && exportResult.windowsCommand}
                {activeTab === 'bash' && exportResult.bashCommand}
                {activeTab === 'filter' && exportResult.filterComplex}
              </div>
            </div>

            {/* Instructions */}
            <div className="kroma-export-steps">
              <strong>Marche à suivre pour le rendu :</strong>
              <ol>
                <li>Téléchargez le script autonome <code>.bat</code> ou copiez la commande ci-dessus.</li>
                <li>Exécutez le script ou collez la commande dans votre terminal système.</li>
                <li>FFmpeg encode votre composition en pleine accélération matérielle.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* ── Pied de page (Actions) ── */}
        <div className="kroma-export-footer">
          <div className="kroma-export-footer__actions">
            <button
              className="kroma-btn-secondary"
              onClick={handleDownloadBatch}
              title="Télécharger le script exécutable Windows .bat"
            >
              <FileCode size={14} />
              <span>Script .bat (Windows)</span>
            </button>
            <button
              className="kroma-btn-secondary"
              onClick={handleDownloadBash}
              title="Télécharger le script exécutable Linux/macOS .sh"
            >
              <FileCode size={14} />
              <span>Script .sh (Unix)</span>
            </button>
          </div>

          <div className="kroma-export-footer__actions">
            <button
              className={`kroma-btn-primary ${hasCopied ? 'kroma-btn-primary--copied' : ''}`}
              onClick={handleCopyCommand}
            >
              {hasCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{hasCopied ? 'Commande Copiée !' : 'Copier la Commande'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

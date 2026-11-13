/**
 * Panneau & Modal de Gestion Séquentielle des Sous-titres (Style CapCut).
 * Permet d'importer (.srt, .vtt), éditer, styliser et exporter les sous-titres
 * de manière synchronisée avec la timeline et le moniteur vidéo.
 * Compatible à 100 % en version Web et en version Application de Bureau (Electron).
 */
import { useRef, useState } from 'react';
import {
  Captions,
  Plus,
  Upload,
  Download,
  Trash2,
  X,
  Play,
  Sliders,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { parseSrt, parseVtt, microsecondsToSrtTimecode } from '../../core/subtitles/srtParser';
import type { SubtitleCue } from '../../core/subtitles/subtitles';

export function SubtitleManagerModal() {
  const {
    project,
    currentTimeUs,
    setCurrentTimeUs,
    isSubtitlePanelOpen,
    closeSubtitlePanel,
    addSubtitleCue,
    importSubtitles,
    exportSubtitles,
    updateSubtitleText,
    updateSubtitlesStyle,
    removeTimelineItem,
    clearSubtitlesLane,
  } = useProjectStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isSubtitlePanelOpen) return null;

  // Récupération de la piste de sous-titres et de ses segments
  const subLane = project.sequence.lanes.find((l) => l.lane_type === 'subtitles');
  const subItems = subLane
    ? [...subLane.items].sort((a, b) => a.placement_time_us - b.placement_time_us)
    : [];

  const subStyle = project.sequence.subtitle_style;

  // Import de fichier .srt ou .vtt
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      let parsedCues: SubtitleCue[] = [];
      if (file.name.toLowerCase().endsWith('.vtt')) {
        parsedCues = parseVtt(content);
      } else {
        parsedCues = parseSrt(content);
      }

      if (parsedCues.length > 0) {
        importSubtitles(parsedCues, true);
        setImportStatus(`${parsedCues.length} sous-titres importés avec succès !`);
        setTimeout(() => setImportStatus(null), 3500);
      } else {
        setImportStatus('Aucun sous-titre valide trouvé dans ce fichier.');
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file, 'utf-8');
    // Réinitialiser pour permettre de réimporter le même fichier si besoin
    e.target.value = '';
  };

  // Téléchargement / Exportation (.srt ou .vtt)
  const handleDownload = (format: 'srt' | 'vtt') => {
    const data = exportSubtitles(format);
    if (!data) return;

    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.project_name || 'kroma_sous_titres'}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="kroma-modal-overlay" onClick={closeSubtitlePanel}>
      <div
        className="kroma-modal-dialog"
        style={{
          width: '780px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#12131a',
          borderRadius: '12px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <Captions size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>
                Gestionnaire de Sous-titres & Légendes
              </h2>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                Édition séquentielle, importation .SRT / .VTT et incrustation vidéo
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                padding: '3px 9px',
                borderRadius: 20,
              }}
            >
              {subItems.length} {subItems.length > 1 ? 'segments' : 'segment'}
            </span>
            <button
              onClick={closeSubtitlePanel}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: 4,
              }}
              title="Fermer (Échap)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Barre d'actions & Outils */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '12px 20px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="kroma-btn kroma-btn-primary"
              style={{
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                color: '#000000',
                fontWeight: 600,
              }}
              onClick={() => addSubtitleCue()}
              title="Ajouter un segment de sous-titre à la tête de lecture courante"
            >
              <Plus size={15} />
              <span>Nouveau sous-titre</span>
            </button>

            <button
              className="kroma-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Importer un fichier .srt ou .vtt depuis votre ordinateur"
            >
              <Upload size={14} />
              <span>Importer (.srt / .vtt)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".srt,.vtt,text/plain"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <button
              className="kroma-btn"
              onClick={() => setShowStyleSettings(!showStyleSettings)}
              style={{
                backgroundColor: showStyleSettings ? 'rgba(245, 158, 11, 0.15)' : undefined,
                borderColor: showStyleSettings ? '#f59e0b' : undefined,
                color: showStyleSettings ? '#f59e0b' : undefined,
              }}
              title="Personnaliser la typographie, les couleurs et le fond"
            >
              <Sliders size={14} />
              <span>Style visuel</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="kroma-btn"
              disabled={subItems.length === 0}
              onClick={() => handleDownload('srt')}
              title="Télécharger les sous-titres au format SubRip (.srt)"
            >
              <Download size={14} />
              <span>Export .SRT</span>
            </button>

            <button
              className="kroma-btn"
              disabled={subItems.length === 0}
              onClick={() => handleDownload('vtt')}
              title="Télécharger les sous-titres au format WebVTT (.vtt)"
            >
              <Download size={14} />
              <span>Export .VTT</span>
            </button>

            {subItems.length > 0 && (
              <button
                className="kroma-btn kroma-btn-danger"
                onClick={() => {
                  if (confirm('Voulez-vous vraiment effacer tous les sous-titres de la piste ?')) {
                    clearSubtitlesLane();
                  }
                }}
                title="Effacer tous les sous-titres de la piste"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Message d'état d'importation */}
        {importStatus && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: importStatus.includes('succès')
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              color: importStatus.includes('succès') ? '#4ade80' : '#f87171',
              fontSize: 12,
              fontWeight: 500,
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            {importStatus}
          </div>
        )}

        {/* Volet déroulant de personnalisation du style */}
        {showStyleSettings && (
          <div
            style={{
              padding: '14px 20px',
              background: 'rgba(245, 158, 11, 0.05)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                Taille du texte ({subStyle?.font_size_pt || 24} pt)
              </label>
              <input
                type="range"
                min="14"
                max="48"
                value={subStyle?.font_size_pt || 24}
                onChange={(e) => updateSubtitlesStyle({ font_size_pt: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                Couleur du texte
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={subStyle?.fill_color_hex || '#FFFFFF'}
                  onChange={(e) => updateSubtitlesStyle({ fill_color_hex: e.target.value })}
                  style={{ width: 28, height: 24, border: 'none', cursor: 'pointer', background: 'none' }}
                />
                <span style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  {subStyle?.fill_color_hex || '#FFFFFF'}
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                Contour ({subStyle?.outline_thickness_px ?? 2} px)
              </label>
              <input
                type="range"
                min="0"
                max="6"
                value={subStyle?.outline_thickness_px ?? 2}
                onChange={(e) => updateSubtitlesStyle({ outline_thickness_px: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginBottom: 4 }}>
                Fond noir protecteur
              </label>
              <button
                className="kroma-btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  backgroundColor: subStyle?.has_background_box ? 'rgba(34, 197, 94, 0.15)' : undefined,
                  borderColor: subStyle?.has_background_box ? '#22c55e' : undefined,
                  color: subStyle?.has_background_box ? '#4ade80' : undefined,
                }}
                onClick={() =>
                  updateSubtitlesStyle({ has_background_box: !subStyle?.has_background_box })
                }
              >
                {subStyle?.has_background_box ? 'Actif (Boîte noire)' : 'Désactivé'}
              </button>
            </div>
          </div>
        )}

        {/* Corps de la modale : Liste séquentielle des sous-titres */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {subItems.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6b7280',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Captions size={40} style={{ color: '#4b5563' }} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#9ca3af' }}>
                  Aucun sous-titre sur la piste
                </p>
                <p style={{ margin: 0, fontSize: 12 }}>
                  Importez un fichier <code>.srt</code> ou <code>.vtt</code>, ou cliquez sur « Nouveau
                  sous-titre » pour commencer.
                </p>
              </div>
            </div>
          ) : (
            subItems.map((item, idx) => {
              const startTc = microsecondsToSrtTimecode(item.placement_time_us);
              const endTc = microsecondsToSrtTimecode(item.placement_time_us + item.play_duration_us);
              const isCurrent =
                currentTimeUs >= item.placement_time_us &&
                currentTimeUs < item.placement_time_us + item.play_duration_us;

              return (
                <div
                  key={item.item_id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: isCurrent ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCurrent
                      ? '1px solid rgba(245, 158, 11, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'all 150ms ease',
                  }}
                >
                  {/* Numéro séquentiel */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isCurrent ? '#f59e0b' : '#6b7280',
                      minWidth: 24,
                      paddingTop: 4,
                    }}
                  >
                    #{idx + 1}
                  </span>

                  {/* Bouton de saut temporel vers le sous-titre */}
                  <button
                    onClick={() => setCurrentTimeUs(item.placement_time_us)}
                    className="kroma-btn"
                    style={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      padding: '4px 8px',
                      height: 'auto',
                      color: isCurrent ? '#f59e0b' : '#d1d5db',
                      borderColor: isCurrent ? '#f59e0b' : undefined,
                      whiteSpace: 'nowrap',
                    }}
                    title="Placer la tête de lecture sur ce sous-titre"
                  >
                    <Play size={10} style={{ fill: 'currentColor' }} />
                    <span>
                      {startTc.substring(3)} ➔ {endTc.substring(3)}
                    </span>
                  </button>

                  {/* Champ de texte éditable en direct */}
                  <textarea
                    rows={2}
                    value={item.text_layer_data?.raw_string || ''}
                    onChange={(e) => updateSubtitleText(item.item_id, e.target.value)}
                    placeholder="Saisissez le texte du sous-titre..."
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: 6,
                      color: '#ffffff',
                      fontSize: 13,
                      padding: '6px 10px',
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />

                  {/* Bouton de suppression */}
                  <button
                    onClick={() => removeTimelineItem(item.item_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: 4,
                      opacity: 0.7,
                    }}
                    title="Supprimer ce sous-titre"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de la modale */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <span style={{ fontSize: 11, color: '#6b7280' }}>
            Raccourci : double-cliquez sur n'importe quel bloc de sous-titre sur la timeline pour l'éditer.
          </span>
          <button className="kroma-btn" onClick={closeSubtitlePanel}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

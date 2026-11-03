/**
 * App.tsx — Point d'entrée de l'interface Kroma Studio.
 * Disposition moderne inspirée de CapCut :
 * - Haut-gauche : Médiathèque / Import
 * - Haut-centre : Moniteur de prévisualisation (Player)
 * - Haut-droite : Panneau Inspecteur / Propriétés
 * - Bas : Timeline multipiste pleine largeur
 */
import './index.css';
import { Header } from './components/layout/Header';
import { MediaBin } from './components/media/MediaBin';
import { PreviewMonitor } from './components/player/PreviewMonitor';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { Timeline } from './components/timeline/Timeline';
import { ExportDialog } from './components/export/ExportDialog';

function App() {
  return (
    <div className="kroma-shell">
      {/* ── En-tête supérieur ── */}
      <Header />

      {/* ── Espace de travail supérieur (3 colonnes) ── */}
      <div className="kroma-workspace-top">
        {/* Colonne gauche : Médiathèque */}
        <div className="kroma-column kroma-column--media">
          <div className="kroma-column__header">
            <span>Médiathèque</span>
          </div>
          <MediaBin />
        </div>

        {/* Colonne centrale : Lecteur d'aperçu */}
        <div className="kroma-column kroma-column--player">
          <PreviewMonitor />
        </div>

        {/* Colonne droite : Inspecteur / Propriétés */}
        <div className="kroma-column kroma-column--inspector">
          <InspectorPanel />
        </div>
      </div>

      {/* ── Espace inférieur : Timeline multipiste ── */}
      <div className="kroma-workspace-bottom">
        <Timeline />
      </div>

      {/* ── Fenêtre modale d'exportation FFmpeg MP4 ── */}
      <ExportDialog />
    </div>
  );
}

export default App;

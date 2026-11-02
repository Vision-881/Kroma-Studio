/**
 * App.tsx — Point d'entrée de l'interface Kroma Studio.
 * Layout sombre à 3 zones : header, corps (médiathèque + timeline), footer.
 */
import './index.css';
import { MediaBin } from './components/media/MediaBin';

/** Composant racine de l'application Kroma Studio */
function App() {
  return (
    <div className="kroma-shell">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="kroma-header">
        <div className="kroma-header__brand">
          <div className="kroma-logo" aria-hidden="true">K</div>
          <div className="kroma-header__titles">
            <span className="kroma-header__name">KROMA</span>
            <span className="kroma-header__sub">Studio</span>
          </div>
        </div>
        <div className="kroma-header__version">v0.1.0-alpha</div>
      </header>

      {/* ── Corps principal ──────────────────────────────────────────────── */}
      <main className="kroma-body">
        {/* Panneau gauche : médiathèque */}
        <aside className="kroma-panel kroma-panel--left">
          <div className="kroma-panel__title">Médiathèque</div>
          <MediaBin />
        </aside>

        {/* Panneau central : timeline (à venir) */}
        <section className="kroma-panel kroma-panel--center">
          <div className="kroma-placeholder">
            <span className="kroma-placeholder__label">
              Timeline — à venir
            </span>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="kroma-footer">
        Kroma Studio · Étape 1 · Import média
      </footer>
    </div>
  );
}

export default App;

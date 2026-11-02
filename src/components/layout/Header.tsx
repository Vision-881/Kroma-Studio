/**
 * En-tête supérieur de l'application (style CapCut).
 * Comprend le branding, l'édition du nom de projet, le statut de sauvegarde
 * et le bouton d'exportation principal.
 */
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

export function Header() {
  const { project, isDirty } = useProjectStore();
  const [projectName, setProjectName] = useState(project.project_name);
  const [isEditingName, setIsEditingName] = useState(false);

  const handleNameBlur = () => {
    setIsEditingName(false);
    useProjectStore.setState((state) => ({
      project: { ...state.project, project_name: projectName },
      isDirty: true,
    }));
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    }
  };

  return (
    <header className="kroma-header">
      {/* Marque et logo */}
      <div className="kroma-header__brand">
        <div className="kroma-logo" aria-hidden="true">
          K
        </div>
        <div className="kroma-header__titles">
          <span className="kroma-header__name">KROMA</span>
          <span className="kroma-header__sub">Studio</span>
        </div>
      </div>

      {/* Nom du projet éditable */}
      <div className="kroma-header__project">
        {isEditingName ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            autoFocus
            className="project-name-input"
          />
        ) : (
          <span
            className="project-name-display"
            onClick={() => setIsEditingName(true)}
            title="Cliquer pour renommer le projet"
          >
            {project.project_name}
          </span>
        )}

        <span
          className={`project-status-dot ${isDirty ? 'project-status-dot--dirty' : 'project-status-dot--clean'}`}
          title={isDirty ? 'Modifications non enregistrées' : 'Projet synchronisé'}
        />
      </div>

      {/* Actions supérieures */}
      <div className="kroma-header__actions">
        <div className="kroma-header__version-pill">v0.2.0-alpha</div>

        <button
          className="kroma-btn kroma-btn-export"
          onClick={() => alert("L'export vidéo via FFmpeg sera actif à l'Étape 7 du MVP !")}
          title="Exporter la vidéo finale en MP4"
        >
          <Download size={14} />
          <span>Exporter</span>
        </button>
      </div>
    </header>
  );
}

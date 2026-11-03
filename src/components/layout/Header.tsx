/**
 * En-tête supérieur de l'application (style CapCut).
 * Comprend le branding, la gestion de projet (Nouveau, Ouvrir, Enregistrer),
 * l'historique Annuler / Rétablir, l'édition du nom et le bouton d'exportation.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  FilePlus2,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';

export function Header() {
  const {
    project,
    isDirty,
    canUndo,
    canRedo,
    undo,
    redo,
    setProjectName,
    saveProjectToFile,
    loadProjectFromJson,
    createNewProject,
    openExportDialog,
  } = useProjectStore();

  const [localName, setLocalName] = useState(project.project_name);
  const [isEditingName, setIsEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalName(project.project_name);
  }, [project.project_name]);

  const handleNameBlur = () => {
    setIsEditingName(false);
    if (localName.trim() && localName !== project.project_name) {
      setProjectName(localName.trim());
    } else {
      setLocalName(project.project_name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    }
  };

  const handleNewProject = () => {
    if (isDirty) {
      const ok = window.confirm(
        'Le projet comporte des modifications non enregistrées. Voulez-vous créer un nouveau projet ?',
      );
      if (!ok) return;
    }
    createNewProject('Nouveau Projet Kroma');
  };

  const handleOpenFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = loadProjectFromJson(content);
        if (!ok) {
          alert('Le fichier sélectionné n\'est pas un projet Kroma valide (.kproj).');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="kroma-header">
      {/* 1. Marque et logo */}
      <div className="kroma-header__brand">
        <div className="kroma-logo" aria-hidden="true">
          K
        </div>
        <div className="kroma-header__titles">
          <span className="kroma-header__name">KROMA</span>
          <span className="kroma-header__sub">Studio</span>
        </div>
      </div>

      {/* 2. Actions de fichier & Historique Undo/Redo */}
      <div className="kroma-header__file-tools">
        {/* Nouveau projet */}
        <button
          className="kroma-icon-btn"
          onClick={handleNewProject}
          title="Nouveau projet"
        >
          <FilePlus2 size={15} />
        </button>

        {/* Ouvrir un fichier .kproj */}
        <button
          className="kroma-icon-btn"
          onClick={handleOpenFileClick}
          title="Ouvrir un projet Kroma (.kproj)"
        >
          <FolderOpen size={15} />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".kproj,application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Enregistrer le projet .kproj */}
        <button
          className="kroma-icon-btn"
          onClick={saveProjectToFile}
          title="Enregistrer le projet sur le disque (Ctrl+S)"
        >
          <Save size={15} />
        </button>

        <div className="kroma-header__separator" />

        {/* Annuler (Undo) */}
        <button
          className="kroma-icon-btn"
          onClick={undo}
          disabled={!canUndo}
          title="Annuler la dernière action (Ctrl+Z)"
        >
          <Undo2 size={15} />
        </button>

        {/* Rétablir (Redo) */}
        <button
          className="kroma-icon-btn"
          onClick={redo}
          disabled={!canRedo}
          title="Rétablir l'action (Ctrl+Y)"
        >
          <Redo2 size={15} />
        </button>
      </div>

      {/* 3. Nom du projet éditable */}
      <div className="kroma-header__project">
        {isEditingName ? (
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
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
          title={isDirty ? 'Modifications non enregistrées' : 'Projet enregistré'}
        />
      </div>

      {/* 4. Actions supérieures (Version + Export) */}
      <div className="kroma-header__actions">
        <div className="kroma-header__version-pill">v0.7.0-alpha</div>

        <button
          className="kroma-btn kroma-btn-export"
          onClick={openExportDialog}
          title="Exporter la vidéo finale en MP4 via FFmpeg"
        >
          <Download size={14} />
          <span>Exporter</span>
        </button>
      </div>
    </header>
  );
}

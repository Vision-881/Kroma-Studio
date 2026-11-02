/**
 * MediaBin — Composant de médiathèque pour Kroma Studio.
 * Permet l'import par drag & drop ou via un sélecteur de fichiers,
 * et affiche les assets importés sous forme de grille de cartes.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Film, Music, Image, Upload, Loader2, X } from 'lucide-react';

import { probeGenericFile } from '../../core/media/mediaProbe';
import { formatDurationHuman } from '../../core/time/timeUtils';
import type { MediaAsset } from '../../core/types/asset';
import { useProjectStore } from '../../store/projectStore';

// ─── Sous-composant : carte d'un asset ───────────────────────────────────────

interface AssetCardProps {
  asset: MediaAsset;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

/** Affiche l'icône correspondant au type de média */
function MediaKindIcon({ kind }: { kind: MediaAsset['media_kind'] }) {
  const props = { size: 28, strokeWidth: 1.5 };
  if (kind === 'video') return <Film {...props} />;
  if (kind === 'audio') return <Music {...props} />;
  return <Image {...props} />;
}

/** Carte représentant un asset dans la médiathèque */
function AssetCard({ asset, isSelected, onSelect, onRemove }: AssetCardProps) {
  const durationLabel = formatDurationHuman(asset.duration_us);
  const hasResolution = asset.native_width > 0 && asset.native_height > 0;
  const resolutionLabel = hasResolution
    ? `${asset.native_width}×${asset.native_height}`
    : null;

  return (
    <div
      className={`media-card${isSelected ? ' media-card--selected' : ''}`}
      onClick={onSelect}
      title={asset.display_name}
    >
      {/* Vignette ou icône */}
      <div className="media-card__thumb">
        {asset.thumbnail_url ? (
          <img
            src={asset.thumbnail_url}
            alt={`Vignette de ${asset.display_name}`}
            className="media-card__thumb-img"
          />
        ) : (
          <div className="media-card__thumb-icon">
            <MediaKindIcon kind={asset.media_kind} />
          </div>
        )}
      </div>

      {/* Informations textuelles */}
      <div className="media-card__info">
        <p className="media-card__name" title={asset.display_name}>
          {asset.display_name}
        </p>
        <p className="media-card__meta">
          {durationLabel}
          {resolutionLabel && (
            <span className="media-card__meta-res"> · {resolutionLabel}</span>
          )}
        </p>
      </div>

      {/* Bouton de suppression */}
      <button
        className="kroma-icon-btn media-card__remove"
        onClick={(e) => {
          e.stopPropagation(); // Évite de sélectionner la carte en même temps
          onRemove();
        }}
        title="Supprimer du projet"
        aria-label="Supprimer cet asset"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Composant principal : MediaBin ──────────────────────────────────────────

/** Identifiant interne d'un fichier en cours de traitement */
interface PendingFile {
  id: string;
  name: string;
}

/** Composant médiathèque : gestion de l'import et de l'affichage des médias */
export function MediaBin() {
  const { project, selectedAssetId, addAsset, removeAsset, setSelectedAsset } =
    useProjectStore();

  const assets = project.asset_catalog;

  // Référence vers l'input file caché
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fichiers en cours d'analyse
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  // État drag-over pour le feedback visuel
  const [isDragOver, setIsDragOver] = useState(false);

  /** Traite une liste de fichiers : probe + ajout au store */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const pendingId = 'pending_' + Math.random().toString(36).substring(2, 9);

        // Marque ce fichier comme "en cours"
        setPendingFiles((prev) => [...prev, { id: pendingId, name: file.name }]);

        try {
          const asset = await probeGenericFile(file);
          addAsset(asset);
        } catch (err) {
          console.error(`Impossible d'importer ${file.name} :`, err);
        } finally {
          // Retire le fichier de la liste des fichiers en attente
          setPendingFiles((prev) => prev.filter((p) => p.id !== pendingId));
        }
      }
    },
    [addAsset],
  );

  // ── Gestion du drag & drop HTML5 ──────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Vérifie qu'on quitte vraiment le conteneur (pas un enfant)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  // ── Gestion du bouton "Importer" ──────────────────────────────────────────

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      // Réinitialise l'input pour permettre de re-sélectionner le même fichier
      e.target.value = '';
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  const isEmpty = assets.length === 0 && pendingFiles.length === 0;

  return (
    <div
      className={`media-bin${isDragOver ? ' media-bin--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Input fichier caché */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        aria-label="Sélectionner des fichiers médias"
      />

      {/* Barre d'outils */}
      <div className="media-bin__toolbar">
        <button
          className="kroma-btn kroma-btn-primary"
          onClick={handleImportClick}
          title="Importer des fichiers médias"
        >
          <Upload size={15} />
          <span>Importer</span>
        </button>
      </div>

      {/* Zone principale */}
      <div className="media-bin__content">
        {/* Message vide */}
        {isEmpty && (
          <div className="media-bin__empty">
            <Upload size={36} strokeWidth={1.2} />
            <p>Glissez vos vidéos, audios</p>
            <p>ou images ici</p>
          </div>
        )}

        {/* Grille d'assets */}
        {assets.map((asset) => (
          <AssetCard
            key={asset.asset_id}
            asset={asset}
            isSelected={selectedAssetId === asset.asset_id}
            onSelect={() => setSelectedAsset(asset.asset_id)}
            onRemove={() => removeAsset(asset.asset_id)}
          />
        ))}

        {/* Spinners des fichiers en cours d'analyse */}
        {pendingFiles.map((pf) => (
          <div key={pf.id} className="media-card media-card--loading">
            <div className="media-card__thumb media-card__thumb--loading">
              <Loader2 size={28} className="spin" />
            </div>
            <div className="media-card__info">
              <p className="media-card__name">{pf.name}</p>
              <p className="media-card__meta">Analyse en cours…</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overlay drag & drop */}
      {isDragOver && (
        <div className="media-bin__drop-overlay">
          <Upload size={48} />
          <span>Déposer les fichiers ici</span>
        </div>
      )}
    </div>
  );
}

/**
 * MediaBin — Composant de médiathèque professionnel inspiré de CapCut.
 * Permet l'import par drag & drop, le filtrage par catégorie (vidéo, audio, image),
 * l'insertion rapide sur la timeline au curseur, et le drag & drop vers les pistes.
 */
import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Film, Music, Image, Upload, Loader2, X, Plus, Search } from 'lucide-react';

import { probeGenericFile } from '../../core/media/mediaProbe';
import { formatDurationHuman } from '../../core/time/timeUtils';
import type { MediaAsset, MediaKind } from '../../core/types/asset';
import { useProjectStore } from '../../store/projectStore';

// ─── Sous-composant : carte d'un asset ───────────────────────────────────────

interface AssetCardProps {
  asset: MediaAsset;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onAddToTimeline: () => void;
}

/** Affiche l'icône correspondant au type de média */
function MediaKindIcon({ kind }: { kind: MediaAsset['media_kind'] }) {
  const props = { size: 28, strokeWidth: 1.5 };
  if (kind === 'video') return <Film {...props} />;
  if (kind === 'audio') return <Music {...props} />;
  return <Image {...props} />;
}

/** Carte représentant un asset dans la médiathèque */
function AssetCard({ asset, isSelected, onSelect, onRemove, onAddToTimeline }: AssetCardProps) {
  const durationLabel = formatDurationHuman(asset.duration_us);
  const hasResolution = asset.native_width > 0 && asset.native_height > 0;
  const resolutionLabel = hasResolution
    ? `${asset.native_width}×${asset.native_height}`
    : null;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/kroma-asset-id', asset.asset_id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={`media-card${isSelected ? ' media-card--selected' : ''}`}
      onClick={onSelect}
      title={`${asset.display_name} (Glisser vers la timeline ou cliquer sur +)`}
      draggable
      onDragStart={handleDragStart}
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

        {/* Badge type de média */}
        <span className={`media-card__badge media-card__badge--${asset.media_kind}`}>
          {asset.media_kind === 'video' ? 'VIDÉO' : asset.media_kind === 'audio' ? 'AUDIO' : 'IMAGE'}
        </span>

        {/* Bouton rapide d'ajout sur la timeline au survol */}
        <button
          className="media-card__add-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAddToTimeline();
          }}
          title="Ajouter à la timeline à la tête de lecture"
        >
          <Plus size={16} />
        </button>
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
          e.stopPropagation();
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

interface PendingFile {
  id: string;
  name: string;
}

type MediaFilter = 'all' | MediaKind;

export function MediaBin() {
  const {
    project,
    selectedAssetId,
    addAsset,
    removeAsset,
    setSelectedAsset,
    addItemFromAsset,
  } = useProjectStore();

  const assets = project.asset_catalog;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MediaFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  /** Traite une liste de fichiers : probe + ajout au store */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const pendingId = 'pending_' + Math.random().toString(36).substring(2, 9);
        setPendingFiles((prev) => [...prev, { id: pendingId, name: file.name }]);

        try {
          const asset = await probeGenericFile(file);
          addAsset(asset);
        } catch (err) {
          console.error(`Impossible d'importer ${file.name} :`, err);
        } finally {
          setPendingFiles((prev) => prev.filter((p) => p.id !== pendingId));
        }
      }
    },
    [addAsset],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Éviter de capturer si le drag provient de l'intérieur de l'app (déplacement d'asset)
    if (e.dataTransfer.types.includes('application/kroma-asset-id')) return;
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.types.includes('application/kroma-asset-id')) return;
      const { files } = e.dataTransfer;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles],
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Filtrage et recherche
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchFilter = activeFilter === 'all' || asset.media_kind === activeFilter;
      const matchSearch = asset.display_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [assets, activeFilter, searchQuery]);

  const isEmpty = assets.length === 0 && pendingFiles.length === 0;

  return (
    <div
      className={`media-bin${isDragOver ? ' media-bin--drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
        aria-label="Sélectionner des fichiers médias"
      />

      {/* Barre d'outils et bouton importer */}
      <div className="media-bin__header-row">
        <button
          className="kroma-btn kroma-btn-primary"
          onClick={handleImportClick}
          title="Importer des fichiers médias locaux"
        >
          <Upload size={14} />
          <span>Importer</span>
        </button>

        <span className="media-bin__count">
          {assets.length} média{assets.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Onglets de filtrage type CapCut */}
      <div className="media-bin__tabs">
        <button
          className={`media-bin__tab${activeFilter === 'all' ? ' media-bin__tab--active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          Tous
        </button>
        <button
          className={`media-bin__tab${activeFilter === 'video' ? ' media-bin__tab--active' : ''}`}
          onClick={() => setActiveFilter('video')}
        >
          Vidéos
        </button>
        <button
          className={`media-bin__tab${activeFilter === 'audio' ? ' media-bin__tab--active' : ''}`}
          onClick={() => setActiveFilter('audio')}
        >
          Audios
        </button>
        <button
          className={`media-bin__tab${activeFilter === 'image' ? ' media-bin__tab--active' : ''}`}
          onClick={() => setActiveFilter('image')}
        >
          Photos
        </button>
      </div>

      {/* Barre de recherche */}
      {assets.length > 0 && (
        <div className="media-bin__search">
          <Search size={14} className="media-bin__search-icon" />
          <input
            type="text"
            placeholder="Rechercher un média…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="media-bin__search-input"
          />
        </div>
      )}

      {/* Zone de contenu principale */}
      <div className="media-bin__content">
        {isEmpty && (
          <div className="media-bin__empty">
            <Upload size={32} strokeWidth={1.2} />
            <p>Glissez vos vidéos, musiques</p>
            <p>ou photos ici</p>
            <button className="kroma-btn kroma-btn-secondary" onClick={handleImportClick}>
              Parcourir les fichiers
            </button>
          </div>
        )}

        {filteredAssets.length === 0 && !isEmpty && (
          <div className="media-bin__no-match">
            <p>Aucun fichier ne correspond à votre filtre.</p>
          </div>
        )}

        {/* Grille d'assets */}
        <div className="media-bin__grid">
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.asset_id}
              asset={asset}
              isSelected={selectedAssetId === asset.asset_id}
              onSelect={() => setSelectedAsset(asset.asset_id)}
              onRemove={() => removeAsset(asset.asset_id)}
              onAddToTimeline={() => addItemFromAsset(asset)}
            />
          ))}
        </div>

        {/* Spinners des fichiers en cours d'analyse */}
        {pendingFiles.map((pf) => (
          <div key={pf.id} className="media-card media-card--loading">
            <div className="media-card__thumb media-card__thumb--loading">
              <Loader2 size={24} className="spin" />
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
          <Upload size={40} />
          <span>Déposer les fichiers dans la médiathèque</span>
        </div>
      )}
    </div>
  );
}

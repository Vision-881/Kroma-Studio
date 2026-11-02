/**
 * Panneau Inspecteur / Propriétés (style CapCut).
 * Situé à droite du lecteur d'aperçu, il permet de modifier le volume,
 * l'opacité, l'échelle et la position des clips sélectionnés.
 * Lorsqu'un calque texte est sélectionné, affiche le TextEditor dédié.
 */
import { Sliders, Volume2, Move, Trash2, Plus, Info, Layers } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman, usToTimecode } from '../../core/time/timeUtils';
import { TextEditor } from '../text/TextEditor';

export function InspectorPanel() {
  const {
    project,
    selectedItemId,
    selectedAssetId,
    removeTimelineItem,
    updateClipGain,
    updateClipPlacement,
    addItemFromAsset,
  } = useProjectStore();

  // 1. Cas : Un clip de la timeline est sélectionné
  if (selectedItemId) {
    let selectedItem = null;
    let parentLane = null;

    for (const lane of project.sequence.lanes) {
      const found = lane.items.find((i) => i.item_id === selectedItemId);
      if (found) {
        selectedItem = found;
        parentLane = lane;
        break;
      }
    }

    if (!selectedItem || !parentLane) return null;

    // ── Cas spécial : calque texte → afficher l'éditeur de texte dédié ───
    if (selectedItem.text_layer_data) {
      return (
        <aside className="inspector-panel">
          <div className="inspector-panel__header">
            <Sliders size={16} />
            <span>Propriétés du texte</span>
          </div>
          <div className="inspector-panel__body">
            <TextEditor itemId={selectedItem.item_id} textData={selectedItem.text_layer_data} />

            {/* Durée info + suppression */}
            <div className="inspector-section" style={{ marginTop: 4 }}>
              <div className="inspector-field">
                <span className="inspector-field__label">Durée :</span>
                <span className="inspector-field__value">
                  {formatDurationHuman(selectedItem.play_duration_us)}
                </span>
              </div>
              <button
                className="kroma-btn kroma-btn-danger"
                style={{ marginTop: 8 }}
                onClick={() => removeTimelineItem(selectedItem!.item_id)}
              >
                <Trash2 size={14} />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </aside>
      );
    }

    const sourceAsset = project.asset_catalog.find(
      (a) => a.asset_id === selectedItem?.referenced_asset_id,
    );

    const displayName =
      (selectedItem as import('../../core/types/timeline').TimelineItem).text_layer_data?.raw_string ||
      sourceAsset?.display_name ||
      'Segment de clip';

    const gainPercent = Math.round((selectedItem.item_gain ?? 1.0) * 100);
    const opacityPercent = Math.round(
      (selectedItem.spatial_placement?.opacity_ratio ?? 1.0) * 100,
    );
    const scalePercent = Math.round(
      (selectedItem.spatial_placement?.zoom_factor_x ?? 1.0) * 100,
    );
    const rotationDeg = Math.round(
      selectedItem.spatial_placement?.rotation_degrees ?? 0,
    );

    return (
      <aside className="inspector-panel">
        <div className="inspector-panel__header">
          <Sliders size={16} />
          <span>Propriétés du clip</span>
        </div>

        <div className="inspector-panel__body">
          {/* Fiche d'identité */}
          <div className="inspector-section">
            <h4 className="inspector-section__title">Général</h4>
            <div className="inspector-field">
              <span className="inspector-field__label">Nom :</span>
              <span className="inspector-field__value inspector-field__value--highlight">
                {displayName}
              </span>
            </div>
            <div className="inspector-field">
              <span className="inspector-field__label">Piste :</span>
              <span className="inspector-field__value">{parentLane.lane_title}</span>
            </div>
            <div className="inspector-field">
              <span className="inspector-field__label">Début :</span>
              <span className="inspector-field__value">
                {usToTimecode(selectedItem.placement_time_us, project.timeline_canvas.frame_rate_fps)}
              </span>
            </div>
            <div className="inspector-field">
              <span className="inspector-field__label">Durée :</span>
              <span className="inspector-field__value">
                {formatDurationHuman(selectedItem.play_duration_us)}
              </span>
            </div>
          </div>

          {/* Audio & Volume */}
          <div className="inspector-section">
            <h4 className="inspector-section__title">
              <Volume2 size={14} />
              <span>Audio</span>
            </h4>
            <div className="inspector-control">
              <div className="inspector-control__label-row">
                <span>Volume du clip</span>
                <span className="inspector-control__value-badge">{gainPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={gainPercent}
                onChange={(e) =>
                  updateClipGain(selectedItem!.item_id, Number(e.target.value) / 100)
                }
                className="kroma-slider"
              />
            </div>
          </div>

          {/* Transformation visuelle (si piste visuelle) */}
          {parentLane.lane_type === 'visual' && (
            <div className="inspector-section">
              <h4 className="inspector-section__title">
                <Move size={14} />
                <span>Transformation & Opacité</span>
              </h4>

              {/* Échelle / Zoom */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Échelle (Zoom)</span>
                  <span className="inspector-control__value-badge">{scalePercent}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  value={scalePercent}
                  onChange={(e) => {
                    const factor = Number(e.target.value) / 100;
                    updateClipPlacement(selectedItem!.item_id, {
                      zoom_factor_x: factor,
                      zoom_factor_y: factor,
                    });
                  }}
                  className="kroma-slider"
                />
              </div>

              {/* Opacité */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Opacité</span>
                  <span className="inspector-control__value-badge">{opacityPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={opacityPercent}
                  onChange={(e) =>
                    updateClipPlacement(selectedItem!.item_id, {
                      opacity_ratio: Number(e.target.value) / 100,
                    })
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Rotation */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Rotation</span>
                  <span className="inspector-control__value-badge">{rotationDeg}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotationDeg}
                  onChange={(e) =>
                    updateClipPlacement(selectedItem!.item_id, {
                      rotation_degrees: Number(e.target.value),
                    })
                  }
                  className="kroma-slider"
                />
              </div>
            </div>
          )}

          {/* Actions rapides */}
          <div className="inspector-section">
            <button
              className="kroma-btn kroma-btn-danger"
              onClick={() => removeTimelineItem(selectedItem!.item_id)}
            >
              <Trash2 size={14} />
              <span>Supprimer de la timeline</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 2. Cas : Un asset de la médiathèque est sélectionné
  if (selectedAssetId) {
    const asset = project.asset_catalog.find((a) => a.asset_id === selectedAssetId);
    if (!asset) return null;

    return (
      <aside className="inspector-panel">
        <div className="inspector-panel__header">
          <Info size={16} />
          <span>Détails du média</span>
        </div>

        <div className="inspector-panel__body">
          <div className="inspector-section">
            <h4 className="inspector-section__title">Fichier</h4>
            <div className="inspector-field">
              <span className="inspector-field__label">Nom :</span>
              <span className="inspector-field__value inspector-field__value--highlight">
                {asset.display_name}
              </span>
            </div>
            <div className="inspector-field">
              <span className="inspector-field__label">Type :</span>
              <span className="inspector-field__value" style={{ textTransform: 'uppercase' }}>
                {asset.media_kind}
              </span>
            </div>
            {asset.native_width > 0 && (
              <div className="inspector-field">
                <span className="inspector-field__label">Résolution :</span>
                <span className="inspector-field__value">
                  {asset.native_width} × {asset.native_height}
                </span>
              </div>
            )}
            <div className="inspector-field">
              <span className="inspector-field__label">Durée :</span>
              <span className="inspector-field__value">
                {formatDurationHuman(asset.duration_us)}
              </span>
            </div>
            {asset.file_size_bytes && (
              <div className="inspector-field">
                <span className="inspector-field__label">Poids :</span>
                <span className="inspector-field__value">
                  {(asset.file_size_bytes / (1024 * 1024)).toFixed(2)} Mo
                </span>
              </div>
            )}
          </div>

          <div className="inspector-section">
            <button
              className="kroma-btn kroma-btn-primary"
              onClick={() => addItemFromAsset(asset)}
            >
              <Plus size={14} />
              <span>Insérer sur la timeline</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // 3. Cas : Aucun élément sélectionné (Détails de la composition)
  return (
    <aside className="inspector-panel">
      <div className="inspector-panel__header">
        <Layers size={16} />
        <span>Projet & Séquence</span>
      </div>

      <div className="inspector-panel__body">
        <div className="inspector-section">
          <h4 className="inspector-section__title">Composition</h4>
          <div className="inspector-field">
            <span className="inspector-field__label">Projet :</span>
            <span className="inspector-field__value">{project.project_name}</span>
          </div>
          <div className="inspector-field">
            <span className="inspector-field__label">Canevas :</span>
            <span className="inspector-field__value">
              {project.timeline_canvas.viewport_width} × {project.timeline_canvas.viewport_height}
            </span>
          </div>
          <div className="inspector-field">
            <span className="inspector-field__label">Cadence :</span>
            <span className="inspector-field__value">
              {project.timeline_canvas.frame_rate_fps} FPS
            </span>
          </div>
          <div className="inspector-field">
            <span className="inspector-field__label">Pistes :</span>
            <span className="inspector-field__value">
              {project.sequence.lanes.length} pistes actives
            </span>
          </div>
          <div className="inspector-field">
            <span className="inspector-field__label">Durée totale :</span>
            <span className="inspector-field__value">
              {formatDurationHuman(project.sequence.total_length_us)}
            </span>
          </div>
        </div>

        <div className="inspector-section inspector-section--tip">
          <p className="inspector-tip-text">
            Sélectionnez un clip sur la timeline pour régler son volume, son échelle ou le découper.
          </p>
        </div>
      </div>
    </aside>
  );
}

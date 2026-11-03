/**
 * Panneau Inspecteur / Propriétés (style CapCut).
 * Situé à droite du lecteur d'aperçu, il permet de modifier le volume,
 * l'opacité, l'échelle et la position des clips sélectionnés.
 * Lorsqu'un calque texte est sélectionné, affiche le TextEditor dédié.
 */
import { Sliders, Volume2, Move, Trash2, Plus, Info, Layers, Palette, RotateCcw, Gauge, Sparkles, FlipHorizontal, FlipVertical, Wand2 } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman, usToTimecode } from '../../core/time/timeUtils';
import type { TransitionType, VideoEffectPreset } from '../../core/types/timeline';
import { TextEditor } from '../text/TextEditor';

export function InspectorPanel() {
  const {
    project,
    selectedItemId,
    selectedAssetId,
    removeTimelineItem,
    pushHistorySnapshot,
    updateClipGain,
    updateClipFade,
    updateClipPlacement,
    toggleClipFlipHorizontal,
    toggleClipFlipVertical,
    updateClipEffects,
    updateClipColorAdjustments,
    resetClipColorAdjustments,
    updateClipSpeed,
    updateClipTransition,
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
    const flipH = !!selectedItem.spatial_placement?.flip_horizontal;
    const flipV = !!selectedItem.spatial_placement?.flip_vertical;

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

          {/* Audio, Mixage & Fondus */}
          <div className="inspector-section">
            <h4 className="inspector-section__title">
              <Volume2 size={14} />
              <span>Audio & Mixage</span>
            </h4>

            {/* Volume du clip */}
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
                onPointerDown={() => pushHistorySnapshot()}
                onChange={(e) =>
                  updateClipGain(selectedItem!.item_id, Number(e.target.value) / 100, false)
                }
                className="kroma-slider"
              />
            </div>

            {/* Fondu d'entrée (Fade In) */}
            {(() => {
              const fadeInSec = (selectedItem!.fade_in_duration_us ?? 0) / 1_000_000;
              const fadeOutSec = (selectedItem!.fade_out_duration_us ?? 0) / 1_000_000;
              const clipDurSec = selectedItem!.play_duration_us / 1_000_000;
              const maxFade = Math.max(1, Math.min(10, clipDurSec / 2));

              // Coordonnées pour l'enveloppe sonore SVG
              const inRatio = Math.min(0.45, (fadeInSec / clipDurSec) || 0);
              const outRatio = Math.min(0.45, (fadeOutSec / clipDurSec) || 0);
              const x1 = Math.round(inRatio * 180);
              const x2 = Math.round(180 - outRatio * 180);

              return (
                <>
                  <div className="inspector-control" style={{ marginTop: 10 }}>
                    <div className="inspector-control__label-row">
                      <span>Fondu d'entrée (Fade In)</span>
                      <span className="inspector-control__value-badge">{fadeInSec.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxFade}
                      step="0.1"
                      value={fadeInSec}
                      onPointerDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipFade(
                          selectedItem!.item_id,
                          Math.round(Number(e.target.value) * 1_000_000),
                          selectedItem!.fade_out_duration_us ?? 0,
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Fondu de sortie (Fade Out) */}
                  <div className="inspector-control" style={{ marginTop: 10 }}>
                    <div className="inspector-control__label-row">
                      <span>Fondu de sortie (Fade Out)</span>
                      <span className="inspector-control__value-badge">{fadeOutSec.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxFade}
                      step="0.1"
                      value={fadeOutSec}
                      onPointerDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipFade(
                          selectedItem!.item_id,
                          selectedItem!.fade_in_duration_us ?? 0,
                          Math.round(Number(e.target.value) * 1_000_000),
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Mini-courbe d'enveloppe sonore */}
                  {(fadeInSec > 0 || fadeOutSec > 0) && (
                    <div className="inspector-audio-envelope" title="Profil de volume avec fondus">
                      <svg width="100%" height="28" viewBox="0 0 180 28" preserveAspectRatio="none">
                        <polygon
                          points={`0,26 ${x1},4 ${x2},4 180,26 180,28 0,28`}
                          fill="rgba(52, 211, 153, 0.2)"
                        />
                        <polyline
                          points={`0,26 ${x1},4 ${x2},4 180,26`}
                          fill="none"
                          stroke="#34d399"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  )}
                </>
              );
            })()}
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
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) => {
                    const factor = Number(e.target.value) / 100;
                    updateClipPlacement(
                      selectedItem!.item_id,
                      {
                        zoom_factor_x: factor,
                        zoom_factor_y: factor,
                      },
                      false,
                    );
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
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipPlacement(
                      selectedItem!.item_id,
                      {
                        opacity_ratio: Number(e.target.value) / 100,
                      },
                      false,
                    )
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
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipPlacement(
                      selectedItem!.item_id,
                      {
                        rotation_degrees: Number(e.target.value),
                      },
                      false,
                    )
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Miroir & Orientation (Étape 11) */}
              <div className="inspector-control" style={{ marginTop: 12 }}>
                <span style={{ fontSize: 11, color: '#aaa', display: 'block', marginBottom: 6 }}>
                  Miroir & Symétrie
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="kroma-btn"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 11,
                      padding: '6px 8px',
                      background: flipH ? '#6366f1' : '#222230',
                      border: '1px solid ' + (flipH ? '#818cf8' : '#333345'),
                      color: flipH ? '#fff' : '#ccc',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: flipH ? 600 : 400,
                    }}
                    onClick={() => toggleClipFlipHorizontal(selectedItem!.item_id)}
                    title="Inverser horizontalement (Miroir gauche/droite)"
                  >
                    <FlipHorizontal size={13} />
                    <span>Miroir H</span>
                  </button>
                  <button
                    type="button"
                    className="kroma-btn"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 11,
                      padding: '6px 8px',
                      background: flipV ? '#6366f1' : '#222230',
                      border: '1px solid ' + (flipV ? '#818cf8' : '#333345'),
                      color: flipV ? '#fff' : '#ccc',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: flipV ? 600 : 400,
                    }}
                    onClick={() => toggleClipFlipVertical(selectedItem!.item_id)}
                    title="Inverser verticalement (Miroir haut/bas)"
                  >
                    <FlipVertical size={13} />
                    <span>Miroir V</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Vitesse de lecture & Ralenti / Accéléré (Étape 9) */}
          {parentLane.lane_type !== 'text_overlay' && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="inspector-section__title" style={{ margin: 0 }}>
                  <Gauge size={14} />
                  <span>Vitesse de lecture</span>
                </h4>
                {selectedItem.playback_speed !== undefined &&
                  Math.abs((selectedItem.playback_speed || 1.0) - 1.0) > 0.01 && (
                    <button
                      className="kroma-icon-btn"
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => updateClipSpeed(selectedItem!.item_id, 1.0, true)}
                      title="Rétablir la vitesse normale (1.0×)"
                    >
                      <RotateCcw size={12} />
                      <span style={{ marginLeft: 4 }}>1×</span>
                    </button>
                  )}
              </div>

              {(() => {
                const speed = selectedItem!.playback_speed ?? 1.0;
                const isModified = Math.abs(speed - 1.0) > 0.01;
                return (
                  <>
                    <div className="inspector-control" style={{ marginTop: 10 }}>
                      <div className="inspector-control__label-row">
                        <span>Multiplicateur</span>
                        <span
                          className="inspector-control__value-badge"
                          style={isModified ? { color: '#f59e0b', fontWeight: 700 } : {}}
                        >
                          {speed.toFixed(2)}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="4.0"
                        step="0.05"
                        value={speed}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipSpeed(selectedItem!.item_id, Number(e.target.value), false)
                        }
                        className="kroma-slider"
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 10,
                          color: '#888',
                          marginTop: 4,
                        }}
                      >
                        <span>0.25× (ralenti)</span>
                        <span>1.0× (normal)</span>
                        <span>4.0× (accéléré)</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Transitions & Effets d'entrée (Étape 10) */}
          {parentLane.lane_type === 'visual' && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="inspector-section__title" style={{ margin: 0 }}>
                  <Sparkles size={14} />
                  <span>Transition d'entrée</span>
                </h4>
                {selectedItem.transition_in && selectedItem.transition_in.transition_type !== 'none' && (
                  <button
                    className="kroma-icon-btn"
                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                    onClick={() => updateClipTransition(selectedItem!.item_id, undefined, true)}
                    title="Supprimer la transition"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              {/* Sélecteur de type de transition */}
              <div className="inspector-control" style={{ marginTop: 10 }}>
                <div className="inspector-control__label-row">
                  <span>Effet</span>
                  <span className="inspector-control__value-badge">
                    {(() => {
                      const t = selectedItem.transition_in?.transition_type || 'none';
                      switch (t) {
                        case 'crossfade': return 'Fondu enchaîné';
                        case 'fade_to_black': return 'Fondu au noir';
                        case 'dip_to_white': return 'Flash blanc';
                        case 'wipe_left': return 'Balayage';
                        default: return 'Aucun (Cut)';
                      }
                    })()}
                  </span>
                </div>
                <select
                  style={{
                    width: '100%',
                    marginTop: 6,
                    background: '#191924',
                    border: '1px solid #333345',
                    borderRadius: 4,
                    color: '#e0e0e0',
                    fontSize: 12,
                    padding: '6px 8px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  value={selectedItem.transition_in?.transition_type || 'none'}
                  onChange={(e) => {
                    const type = e.target.value as TransitionType;
                    if (type === 'none') {
                      updateClipTransition(selectedItem!.item_id, undefined, true);
                    } else {
                      const curDur = selectedItem.transition_in?.duration_us || 1_000_000;
                      updateClipTransition(
                        selectedItem!.item_id,
                        { transition_type: type, duration_us: curDur },
                        true,
                      );
                    }
                  }}
                >
                  <option value="none">Aucun (Cut direct)</option>
                  <option value="crossfade">✨ Fondu enchaîné (Crossfade)</option>
                  <option value="fade_to_black">🌑 Fondu au noir (Dip to Black)</option>
                  <option value="dip_to_white">⚡ Flash blanc (Dip to White)</option>
                  <option value="wipe_left">👉 Balayage horizontal (Wipe Left)</option>
                </select>
              </div>

              {/* Durée de la transition si active */}
              {selectedItem.transition_in && selectedItem.transition_in.transition_type !== 'none' && (
                <div className="inspector-control" style={{ marginTop: 10 }}>
                  <div className="inspector-control__label-row">
                    <span>Durée de transition</span>
                    <span className="inspector-control__value-badge">
                      {((selectedItem.transition_in.duration_us || 1_000_000) / 1_000_000).toFixed(1)} s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.1"
                    value={(selectedItem.transition_in.duration_us || 1_000_000) / 1_000_000}
                    onPointerDown={() => pushHistorySnapshot()}
                    onChange={(e) =>
                      updateClipTransition(
                        selectedItem!.item_id,
                        {
                          transition_type: selectedItem.transition_in!.transition_type,
                          duration_us: Math.round(Number(e.target.value) * 1_000_000),
                        },
                        false,
                      )
                    }
                    className="kroma-slider"
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 10,
                      color: '#888',
                      marginTop: 2,
                    }}
                  >
                    <span>0.2 s (rapide)</span>
                    <span>1.0 s</span>
                    <span>3.0 s (lent)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Étalonnage des couleurs & Filtres (Étape 8) */}
          {parentLane.lane_type === 'visual' && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="inspector-section__title" style={{ margin: 0 }}>
                  <Palette size={14} />
                  <span>Réglages & Étalonnage</span>
                </h4>
                {selectedItem.color_adjustments && (
                  <button
                    className="kroma-icon-btn"
                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                    onClick={() => resetClipColorAdjustments(selectedItem!.item_id)}
                    title="Réinitialiser les réglages de couleur"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              {/* Sliders d'étalonnage */}
              {(() => {
                const adj = selectedItem.color_adjustments || {
                  brightness: 0,
                  contrast: 0,
                  saturation: 0,
                  temperature: 0,
                  hue_degrees: 0,
                  blur_px: 0,
                };
                const brightnessPct = Math.round((adj.brightness || 0) * 100);
                const contrastPct = Math.round((adj.contrast || 0) * 100);
                const saturationPct = Math.round((adj.saturation || 0) * 100);
                const hueDeg = Math.round(adj.hue_degrees || 0);
                const blurPx = Math.round(adj.blur_px || 0);

                return (
                  <>
                    <div className="inspector-control" style={{ marginTop: 10 }}>
                      <div className="inspector-control__label-row">
                        <span>Luminosité</span>
                        <span className="inspector-control__value-badge">
                          {brightnessPct > 0 ? `+${brightnessPct}` : brightnessPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={brightnessPct}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipColorAdjustments(
                            selectedItem!.item_id,
                            {
                              brightness: Number(e.target.value) / 100,
                            },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>

                    <div className="inspector-control" style={{ marginTop: 10 }}>
                      <div className="inspector-control__label-row">
                        <span>Contraste</span>
                        <span className="inspector-control__value-badge">
                          {contrastPct > 0 ? `+${contrastPct}` : contrastPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={contrastPct}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipColorAdjustments(
                            selectedItem!.item_id,
                            {
                              contrast: Number(e.target.value) / 100,
                            },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>

                    <div className="inspector-control" style={{ marginTop: 10 }}>
                      <div className="inspector-control__label-row">
                        <span>Saturation</span>
                        <span className="inspector-control__value-badge">
                          {saturationPct > 0 ? `+${saturationPct}` : saturationPct}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={saturationPct}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipColorAdjustments(
                            selectedItem!.item_id,
                            {
                              saturation: Number(e.target.value) / 100,
                            },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>

                    <div className="inspector-control" style={{ marginTop: 10 }}>
                      <div className="inspector-control__label-row">
                        <span>Teinte (Hue)</span>
                        <span className="inspector-control__value-badge">{hueDeg}°</span>
                      </div>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={hueDeg}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipColorAdjustments(
                            selectedItem!.item_id,
                            {
                              hue_degrees: Number(e.target.value),
                            },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>

                    <div className="inspector-control" style={{ marginTop: 10 }}>
                      <div className="inspector-control__label-row">
                        <span>Flou gaussien</span>
                        <span className="inspector-control__value-badge">{blurPx} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={blurPx}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipColorAdjustments(
                            selectedItem!.item_id,
                            {
                              blur_px: Number(e.target.value),
                            },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Filtres artistiques & Effets FX (Étape 11) */}
          {parentLane.lane_type === 'visual' && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="inspector-section__title" style={{ margin: 0 }}>
                  <Wand2 size={14} />
                  <span>Filtres & Effets FX</span>
                </h4>
                {selectedItem.video_effects && selectedItem.video_effects.preset !== 'none' && (
                  <button
                    className="kroma-icon-btn"
                    style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                    onClick={() => updateClipEffects(selectedItem!.item_id, undefined, true)}
                    title="Retirer les effets FX"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              <div className="inspector-control" style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, color: '#aaa' }}>Style de filtre :</label>
                <select
                  style={{
                    width: '100%',
                    marginTop: 6,
                    background: '#191924',
                    border: '1px solid #333345',
                    borderRadius: 4,
                    color: '#e0e0e0',
                    fontSize: 12,
                    padding: '6px 8px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  value={selectedItem.video_effects?.preset || 'none'}
                  onChange={(e) => {
                    const preset = e.target.value as VideoEffectPreset;
                    updateClipEffects(
                      selectedItem!.item_id,
                      { preset },
                      true,
                    );
                  }}
                >
                  <option value="none">Aucun effet (Normal)</option>
                  <option value="monochrome">🖤 Noir & Blanc (Monochrome)</option>
                  <option value="sepia">📜 Sépia (Rétro / Vintage)</option>
                  <option value="vintage">🎞️ Argentique (Cinéma 70s)</option>
                  <option value="invert">🔮 Négatif (Inversion des couleurs)</option>
                  <option value="vignette">🎬 Vignetage sombre (Focus cinéma)</option>
                </select>
              </div>

              {/* Slider intensité vignetage si actif */}
              {(selectedItem.video_effects?.preset === 'vignette' || (selectedItem.video_effects?.vignette_amount && selectedItem.video_effects.vignette_amount > 0)) && (
                <div className="inspector-control" style={{ marginTop: 10 }}>
                  <div className="inspector-control__label-row">
                    <span>Obscurcissement des bords</span>
                    <span className="inspector-control__value-badge">
                      {Math.round((selectedItem.video_effects?.vignette_amount ?? 0.65) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={selectedItem.video_effects?.vignette_amount ?? 0.65}
                    onPointerDown={() => pushHistorySnapshot()}
                    onChange={(e) =>
                      updateClipEffects(
                        selectedItem!.item_id,
                        {
                          preset: selectedItem.video_effects?.preset || 'vignette',
                          vignette_amount: Number(e.target.value),
                        },
                        false,
                      )
                    }
                    className="kroma-slider"
                  />
                </div>
              )}
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

/**
 * Panneau Inspecteur / Propriétés (style CapCut).
 * Situé à droite du lecteur d'aperçu, il permet de modifier le volume,
 * l'étalonnage, les filtres FX, la vitesse, les transitions, l'incrustation fond vert (Chroma Key),
 * et les transformations animées par images-clés des clips sélectionnés.
 * Lorsqu'un calque texte est sélectionné, affiche le TextEditor dédié.
 */
import {
  Sliders,
  Volume2,
  Move,
  Trash2,
  Plus,
  Info,
  Layers,
  Palette,
  RotateCcw,
  Gauge,
  Sparkles,
  FlipHorizontal,
  FlipVertical,
  Wand2,
  Diamond,
  ChevronLeft,
  ChevronRight,
  Crop,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { formatDurationHuman, usToTimecode } from '../../core/time/timeUtils';
import type {
  TransitionType,
  VideoEffectPreset,
  KeyframeProperty,
  KeyframeInterpolation,
  TimelineItem,
} from '../../core/types/timeline';
import {
  getInterpolatedPlacement,
  findKeyframeNear,
  hasKeyframes,
  getAllKeyframeOffsets,
} from '../../core/animation/keyframeInterpolation';
import { CHROMA_PRESETS } from '../../core/chromakey/chromaKeyFilter';
import { MASK_PRESETS } from '../../core/mask/maskRenderer';
import {
  CANVAS_RATIO_PRESETS,
  type CanvasAspectRatio,
} from '../../core/types/project';
import { TextEditor } from '../text/TextEditor';

export function InspectorPanel() {
  const {
    project,
    currentTimeUs,
    setCurrentTimeUs,
    selectedItemId,
    selectedAssetId,
    removeTimelineItem,
    pushHistorySnapshot,
    updateClipGain,
    updateClipFade,
    updateClipPlacement,
    resetClipPlacement,
    addOrUpdateClipKeyframe,
    removeClipKeyframe,
    clearAllClipKeyframes,
    toggleClipFlipHorizontal,
    toggleClipFlipVertical,
    updateClipEffects,
    updateClipChromaKey,
    updateClipMask,
    resetClipMask,
    updateClipColorAdjustments,
    resetClipColorAdjustments,
    updateClipSpeed,
    updateClipTransition,
    addItemFromAsset,
    setCanvasAspectRatio,
  } = useProjectStore();

  // 1. Cas : Un clip de la timeline est sélectionné
  if (selectedItemId) {
    let selectedItem: TimelineItem | null = null;
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
      sourceAsset?.display_name ||
      'Segment de clip';

    const gainPercent = Math.round((selectedItem.item_gain ?? 1.0) * 100);
    const flipH = !!selectedItem.spatial_placement?.flip_horizontal;
    const flipV = !!selectedItem.spatial_placement?.flip_vertical;

    const offsetUs = currentTimeUs - selectedItem.placement_time_us;
    const isPlayheadOverClip = offsetUs >= 0 && offsetUs <= selectedItem.play_duration_us;
    const resolvedPlacement = getInterpolatedPlacement(selectedItem, currentTimeUs);

    const scalePercent = Math.round((resolvedPlacement.zoom_factor_x ?? 1.0) * 100);
    const offsetX = Math.round(resolvedPlacement.offset_x_px ?? 0);
    const offsetY = Math.round(resolvedPlacement.offset_y_px ?? 0);
    const rotationDeg = Math.round(resolvedPlacement.rotation_degrees ?? 0);
    const opacityPercent = Math.round((resolvedPlacement.opacity_ratio ?? 1.0) * 100);

    const isVideoOrImage =
      parentLane.lane_type === 'visual' &&
      (sourceAsset?.media_kind === 'video' || sourceAsset?.media_kind === 'image');

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
          {(() => {
            const isAudioModified =
              (selectedItem.item_gain ?? 1.0) !== 1.0 ||
              (selectedItem.fade_in_duration_us ?? 0) > 0 ||
              (selectedItem.fade_out_duration_us ?? 0) > 0;

            return (
              <div className="inspector-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 className="inspector-section__title" style={{ margin: 0 }}>
                    <Volume2 size={14} />
                    <span>Audio & Mixage</span>
                  </h4>
                  {isAudioModified && (
                    <button
                      className="inspector-reset-btn"
                      onClick={() => {
                        updateClipGain(selectedItem!.item_id, 1.0, true);
                        updateClipFade(selectedItem!.item_id, 0, 0, true);
                      }}
                      title="Rétablir le volume à 100% et annuler les fondus"
                    >
                      <RotateCcw size={11} />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                </div>

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

              const inRatio = Math.min(0.45, (fadeInSec / clipDurSec) || 0);
              const outRatio = Math.min(0.45, (fadeOutSec / clipDurSec) || 0);
              const x1 = Math.round(inRatio * 180);
              const x2 = Math.round(180 - outRatio * 180);

              return (
                <>
                  <div className="inspector-control" style={{ marginTop: 10 }}>
                    <div className="inspector-control__label-row">
                      <span>Fondu d'entrée (Fade in)</span>
                      <span className="inspector-control__value-badge">{fadeInSec.toFixed(1)}s</span>
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
                      <span>Fondu de sortie (Fade out)</span>
                      <span className="inspector-control__value-badge">{fadeOutSec.toFixed(1)}s</span>
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
        );
      })()}

          {/* Transformation visuelle & Images-Clés (Étape 14) */}
          {parentLane.lane_type === 'visual' && (() => {
            const clipItem = selectedItem as TimelineItem;
            const clipHasKf = hasKeyframes(clipItem);

            const renderKeyframeControl = (
              propKey: KeyframeProperty,
              label: string,
              modelVal: number,
              displayBadge: string | number,
              min: number,
              max: number,
              step: number,
              toSlider: (model: number) => number,
              toModel: (slider: number) => number,
              onPlacementFallback: (val: number) => void,
            ) => {
              const propKfs = clipItem.keyframes?.[propKey] || [];
              const activeKf = findKeyframeNear(propKfs, offsetUs, 30_000);
              const hasActive = Boolean(activeKf);
              const prevKf = [...propKfs].reverse().find((kf) => kf.time_offset_us < offsetUs - 30_000);
              const nextKf = propKfs.find((kf) => kf.time_offset_us > offsetUs + 30_000);

              const currentSliderVal = toSlider(modelVal);

              const toggleKeyframe = () => {
                if (activeKf) {
                  removeClipKeyframe(clipItem.item_id, propKey, activeKf.id);
                } else {
                  const clampedOffset = Math.max(0, Math.min(clipItem.play_duration_us, offsetUs));
                  addOrUpdateClipKeyframe(
                    clipItem.item_id,
                    propKey,
                    clampedOffset,
                    modelVal,
                    'linear',
                  );
                }
              };

              const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const sVal = Number(e.target.value);
                const mVal = toModel(sVal);
                if (propKfs.length > 0 && isPlayheadOverClip) {
                  const clampedOffset = Math.max(0, Math.min(clipItem.play_duration_us, offsetUs));
                  addOrUpdateClipKeyframe(
                    clipItem.item_id,
                    propKey,
                    clampedOffset,
                    mVal,
                    activeKf?.interpolation || 'linear',
                    false,
                  );
                } else {
                  onPlacementFallback(mVal);
                }
              };

              return (
                <div className="inspector-control" key={propKey}>
                  <div className="inspector-control__label-row" style={{ alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{label}</span>
                      {propKfs.length > 0 && (
                        <span style={{ fontSize: 9, color: '#06b6d4', fontWeight: 600 }}>
                          ({propKfs.length} KF)
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {/* Navigation entre images-clés */}
                      {propKfs.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="inspector-keyframe-nav-btn"
                            disabled={!prevKf}
                            onClick={() =>
                              setCurrentTimeUs(clipItem.placement_time_us + prevKf!.time_offset_us)
                            }
                            title="Aller à l'image-clé précédente"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            type="button"
                            className="inspector-keyframe-nav-btn"
                            disabled={!nextKf}
                            onClick={() =>
                              setCurrentTimeUs(clipItem.placement_time_us + nextKf!.time_offset_us)
                            }
                            title="Aller à l'image-clé suivante"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </>
                      )}

                      {/* Bouton Losange Image-Clé */}
                      <button
                        type="button"
                        className={`inspector-keyframe-btn ${
                          hasActive ? 'inspector-keyframe-btn--active' : ''
                        }`}
                        onClick={toggleKeyframe}
                        title={
                          hasActive
                            ? "Supprimer l'image-clé sous la tête de lecture"
                            : "Poser une image-clé à l'instant courant"
                        }
                      >
                        <Diamond size={13} fill={hasActive ? '#06b6d4' : 'none'} />
                      </button>

                      <span className="inspector-control__value-badge">{displayBadge}</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={currentSliderVal}
                    onPointerDown={() => pushHistorySnapshot()}
                    onChange={handleSliderChange}
                    className="kroma-slider"
                  />

                  {/* Sélecteur de courbe d'interpolation (Easing) */}
                  {activeKf && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 4 }}>Courbe :</span>
                      {(['linear', 'ease_in', 'ease_out', 'ease_in_out', 'hold'] as KeyframeInterpolation[]).map(
                        (interp) => (
                          <button
                            key={interp}
                            type="button"
                            className={`inspector-keyframe-curve-pill ${
                              (activeKf.interpolation || 'linear') === interp
                                ? 'inspector-keyframe-curve-pill--selected'
                                : ''
                            }`}
                            onClick={() =>
                              addOrUpdateClipKeyframe(
                                clipItem.item_id,
                                propKey,
                                activeKf.time_offset_us,
                                activeKf.value,
                                interp,
                              )
                            }
                          >
                            {interp === 'linear'
                              ? 'Linéaire'
                              : interp === 'ease_in'
                              ? 'In'
                              : interp === 'ease_out'
                              ? 'Out'
                              : interp === 'ease_in_out'
                              ? 'Adouci'
                              : 'Hold'}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            };

            const isPlacementModified = Boolean(
              selectedItem.spatial_placement && (
                (selectedItem.spatial_placement.zoom_factor_x ?? 1.0) !== 1.0 ||
                (selectedItem.spatial_placement.zoom_factor_y ?? 1.0) !== 1.0 ||
                (selectedItem.spatial_placement.offset_x_px ?? 0) !== 0 ||
                (selectedItem.spatial_placement.offset_y_px ?? 0) !== 0 ||
                (selectedItem.spatial_placement.rotation_degrees ?? 0) !== 0 ||
                (selectedItem.spatial_placement.opacity_ratio ?? 1.0) !== 1.0
              )
            );

            return (
              <div className="inspector-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 className="inspector-section__title" style={{ margin: 0 }}>
                    <Move size={14} />
                    <span>Transformation & Images-Clés</span>
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isPlacementModified && (
                      <button
                        className="inspector-reset-btn"
                        onClick={() => resetClipPlacement(clipItem.item_id)}
                        title="Réinitialiser la transformation (Échelle 100%, Position 0, Rotation 0, Opacité 100%)"
                      >
                        <RotateCcw size={11} />
                        <span>Réinitialiser</span>
                      </button>
                    )}
                    {clipHasKf && (
                      <button
                        className="inspector-reset-btn inspector-reset-btn--active"
                        onClick={() => clearAllClipKeyframes(clipItem.item_id)}
                        title="Effacer toutes les images-clés de ce clip"
                      >
                        <span>Effacer tout</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bannière d'état animation */}
                {clipHasKf && (
                  <div
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: 4,
                      padding: '6px 8px',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: '#06b6d4',
                    }}
                  >
                    <span>💎 {getAllKeyframeOffsets(clipItem).length} pose(s) clé(s) sur le clip</span>
                    <span style={{ fontSize: 10, opacity: 0.8 }}>Glissez les losanges sur la piste</span>
                  </div>
                )}

                {/* 1. Échelle / Zoom */}
                {renderKeyframeControl(
                  'scale',
                  'Échelle (Zoom)',
                  resolvedPlacement.zoom_factor_x ?? 1.0,
                  `${scalePercent}%`,
                  20,
                  300,
                  1,
                  (m) => Math.round(m * 100),
                  (s) => s / 100,
                  (m) => updateClipPlacement(clipItem.item_id, { zoom_factor_x: m, zoom_factor_y: m }, false),
                )}

                {/* 2. Position X */}
                {renderKeyframeControl(
                  'position_x',
                  'Position X',
                  resolvedPlacement.offset_x_px ?? 0,
                  `${offsetX > 0 ? '+' : ''}${offsetX}px`,
                  -1000,
                  1000,
                  1,
                  (m) => Math.round(m),
                  (s) => s,
                  (m) => updateClipPlacement(clipItem.item_id, { offset_x_px: m }, false),
                )}

                {/* 3. Position Y */}
                {renderKeyframeControl(
                  'position_y',
                  'Position Y',
                  resolvedPlacement.offset_y_px ?? 0,
                  `${offsetY > 0 ? '+' : ''}${offsetY}px`,
                  -1000,
                  1000,
                  1,
                  (m) => Math.round(m),
                  (s) => s,
                  (m) => updateClipPlacement(clipItem.item_id, { offset_y_px: m }, false),
                )}

                {/* 4. Rotation */}
                {renderKeyframeControl(
                  'rotation',
                  'Rotation',
                  resolvedPlacement.rotation_degrees ?? 0,
                  `${rotationDeg}°`,
                  -180,
                  180,
                  1,
                  (m) => Math.round(m),
                  (s) => s,
                  (m) => updateClipPlacement(clipItem.item_id, { rotation_degrees: m }, false),
                )}

                {/* 5. Opacité */}
                {renderKeyframeControl(
                  'opacity',
                  'Opacité',
                  resolvedPlacement.opacity_ratio ?? 1.0,
                  `${opacityPercent}%`,
                  0,
                  100,
                  1,
                  (m) => Math.round(m * 100),
                  (s) => s / 100,
                  (m) => updateClipPlacement(clipItem.item_id, { opacity_ratio: m }, false),
                )}

                {/* Miroir & Orientation */}
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
            );
          })()}

          {/* Vitesse de lecture (Étape 9) */}
          {isVideoOrImage && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="inspector-section__title" style={{ margin: 0 }}>
                  <Gauge size={14} />
                  <span>Vitesse de lecture</span>
                </h4>
                {(selectedItem.playback_speed ?? 1.0) !== 1.0 && (
                  <button
                    className="inspector-reset-btn"
                    onClick={() => updateClipSpeed(selectedItem!.item_id, 1.0)}
                    title="Rétablir la vitesse à 1.0×"
                  >
                    <RotateCcw size={11} />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              {/* Raccourcis de vitesse rapide */}
              <div style={{ display: 'flex', gap: 6, margin: '8px 0 10px 0' }}>
                {[0.5, 1.0, 1.5, 2.0, 4.0].map((preset) => (
                  <button
                    key={preset}
                    className={`speed-preset-btn ${
                      (selectedItem!.playback_speed ?? 1.0) === preset ? 'speed-preset-btn--active' : ''
                    }`}
                    onClick={() => updateClipSpeed(selectedItem!.item_id, preset)}
                  >
                    {preset}×
                  </button>
                ))}
              </div>

              {/* Curseur continu */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Multiplicateur</span>
                  <span className="inspector-control__value-badge">
                    {(selectedItem.playback_speed ?? 1.0).toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="4.0"
                  step="0.05"
                  value={selectedItem.playback_speed ?? 1.0}
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) => updateClipSpeed(selectedItem!.item_id, Number(e.target.value), false)}
                  className="kroma-slider"
                />
              </div>
            </div>
          )}

          {/* Transition d'entrée (Étape 10 & 13) */}
          {isVideoOrImage && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 className="inspector-section__title" style={{ margin: 0 }}>
                  <Sparkles size={14} />
                  <span>Transition d'entrée</span>
                </h4>
                {selectedItem.transition_in && selectedItem.transition_in.transition_type !== 'none' && (
                  <button
                    className="inspector-reset-btn"
                    onClick={() => updateClipTransition(selectedItem!.item_id, undefined)}
                    title="Retirer la transition"
                  >
                    <RotateCcw size={11} />
                    <span>Retirer</span>
                  </button>
                )}
              </div>

              {/* Sélecteur de type de transition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '10px 0' }}>
                {[
                  { id: 'none', label: 'Aucune' },
                  { id: 'crossfade', label: '✨ Fondu' },
                  { id: 'fade_to_black', label: '🌑 Fondu noir' },
                  { id: 'dip_to_white', label: '⚡ Flash blanc' },
                  { id: 'strobe', label: '⚡ Stroboscope' },
                  { id: 'zoom_in', label: '🔍 Zoom In' },
                  { id: 'zoom_out', label: '🔎 Zoom Out' },
                  { id: 'spin', label: '🌀 Spin' },
                  { id: 'wipe_left', label: '👈 Balayage G' },
                  { id: 'wipe_right', label: '👉 Balayage D' },
                  { id: 'wipe_up', label: '👆 Balayage H' },
                  { id: 'wipe_down', label: '👇 Balayage B' },
                ].map((trans) => {
                  const currentType = selectedItem!.transition_in?.transition_type || 'none';
                  const isSelected = currentType === trans.id;
                  return (
                    <button
                      key={trans.id}
                      className={`speed-preset-btn ${isSelected ? 'speed-preset-btn--active' : ''}`}
                      onClick={() =>
                        updateClipTransition(
                          selectedItem!.item_id,
                          trans.id === 'none'
                            ? undefined
                            : {
                                transition_type: trans.id as TransitionType,
                                duration_us: selectedItem!.transition_in?.duration_us || 1_000_000,
                              },
                        )
                      }
                    >
                      {trans.label}
                    </button>
                  );
                })}
              </div>

              {/* Slider de durée si active */}
              {selectedItem.transition_in && selectedItem.transition_in.transition_type !== 'none' && (
                <div className="inspector-control">
                  <div className="inspector-control__label-row">
                    <span>Durée de transition</span>
                    <span className="inspector-control__value-badge">
                      {((selectedItem.transition_in.duration_us || 1_000_000) / 1_000_000).toFixed(1)}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={(selectedItem.transition_in.duration_us || 1_000_000) / 1_000_000}
                    onPointerDown={() => pushHistorySnapshot()}
                    onChange={(e) =>
                      updateClipTransition(
                        selectedItem!.item_id,
                        {
                          transition_type: selectedItem!.transition_in!.transition_type,
                          duration_us: Math.round(Number(e.target.value) * 1_000_000),
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

          {/* Réglages & Étalonnage Couleur (Étape 8) */}
          {isVideoOrImage && (() => {
            const adj = selectedItem.color_adjustments;
            const isColorAdjusted = Boolean(
              adj && (
                (adj.brightness ?? 0) !== 0 ||
                (adj.contrast ?? 0) !== 0 ||
                (adj.saturation ?? 0) !== 0 ||
                (adj.hue_degrees ?? 0) !== 0 ||
                (adj.blur_px ?? 0) !== 0
              )
            );

            return (
              <div className="inspector-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 className="inspector-section__title" style={{ margin: 0 }}>
                    <Palette size={14} />
                    <span>Réglages & Étalonnage</span>
                  </h4>
                  <button
                    className={`inspector-reset-btn ${isColorAdjusted ? 'inspector-reset-btn--active' : ''}`}
                    disabled={!isColorAdjusted}
                    onClick={() => resetClipColorAdjustments(selectedItem!.item_id)}
                    title={isColorAdjusted ? "Réinitialiser tous les réglages de couleur à 0" : "Aucun réglage modifié"}
                  >
                    <RotateCcw size={11} />
                    <span>Réinitialiser</span>
                  </button>
                </div>

              {/* Luminosité */}
              <div className="inspector-control" style={{ marginTop: 8 }}>
                <div className="inspector-control__label-row">
                  <span>Luminosité</span>
                  <span className="inspector-control__value-badge">
                    {Math.round((selectedItem.color_adjustments?.brightness ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.05"
                  value={selectedItem.color_adjustments?.brightness ?? 0}
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipColorAdjustments(
                      selectedItem!.item_id,
                      { brightness: Number(e.target.value) },
                      false,
                    )
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Contraste */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Contraste</span>
                  <span className="inspector-control__value-badge">
                    {Math.round((selectedItem.color_adjustments?.contrast ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.05"
                  value={selectedItem.color_adjustments?.contrast ?? 0}
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipColorAdjustments(
                      selectedItem!.item_id,
                      { contrast: Number(e.target.value) },
                      false,
                    )
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Saturation */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Saturation</span>
                  <span className="inspector-control__value-badge">
                    {Math.round((selectedItem.color_adjustments?.saturation ?? 0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.0"
                  max="1.0"
                  step="0.05"
                  value={selectedItem.color_adjustments?.saturation ?? 0}
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipColorAdjustments(
                      selectedItem!.item_id,
                      { saturation: Number(e.target.value) },
                      false,
                    )
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Teinte */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Teinte (Hue)</span>
                  <span className="inspector-control__value-badge">
                    {Math.round(selectedItem.color_adjustments?.hue_degrees ?? 0)}°
                  </span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={selectedItem.color_adjustments?.hue_degrees ?? 0}
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipColorAdjustments(
                      selectedItem!.item_id,
                      { hue_degrees: Number(e.target.value) },
                      false,
                    )
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Flou */}
              <div className="inspector-control">
                <div className="inspector-control__label-row">
                  <span>Flou (Blur)</span>
                  <span className="inspector-control__value-badge">
                    {Math.round(selectedItem.color_adjustments?.blur_px ?? 0)} px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={selectedItem.color_adjustments?.blur_px ?? 0}
                  onPointerDown={() => pushHistorySnapshot()}
                  onChange={(e) =>
                    updateClipColorAdjustments(
                      selectedItem!.item_id,
                      { blur_px: Number(e.target.value) },
                      false,
                    )
                  }
                  className="kroma-slider"
                />
              </div>

              {/* Bouton de réinitialisation complet */}
              {isColorAdjusted && (
                <button
                  type="button"
                  className="inspector-reset-btn inspector-reset-btn--active"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: 10,
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  onClick={() => resetClipColorAdjustments(selectedItem!.item_id)}
                  title="Remettre la luminosité, le contraste, la saturation, la teinte et le flou à 0"
                >
                  <RotateCcw size={12} />
                  <span>Réinitialiser tous les réglages</span>
                </button>
              )}
            </div>
          );
        })()}

        {/* Filtres FX & Effets Dynamiques (Étape 11 & 13) */}
        {isVideoOrImage && (
          <div className="inspector-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 className="inspector-section__title" style={{ margin: 0 }}>
                <Wand2 size={14} />
                <span>Filtres & Effets FX</span>
              </h4>
              {selectedItem.video_effects && selectedItem.video_effects.preset !== 'none' && (
                <button
                  className="inspector-reset-btn"
                  onClick={() => updateClipEffects(selectedItem!.item_id, undefined)}
                  title="Réinitialiser les effets"
                >
                  <RotateCcw size={11} />
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>

              {/* Grille de sélection des filtres artistiques et dynamiques */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: '10px 0' }}>
                {[
                  { id: 'none', label: 'Normal' },
                  { id: 'monochrome', label: '🪄 N&B' },
                  { id: 'sepia', label: '🪄 Sépia' },
                  { id: 'vintage', label: '🪄 Rétro' },
                  { id: 'invert', label: '🪄 Négatif' },
                  { id: 'vignette', label: '🎬 Vignette' },
                  { id: 'x_shake', label: '⚡ Shake X' },
                  { id: 'y_shake', label: '↕️ Shake Y' },
                  { id: 'camera_shake', label: '📳 Cam Shake' },
                  { id: 'tremor_strobe', label: '⚡ Tremor' },
                  { id: 'strobe_white', label: '⚡ Flash B.' },
                  { id: 'strobe_black', label: '🖤 Strobe N.' },
                ].map((eff) => {
                  const currentPreset = selectedItem!.video_effects?.preset || 'none';
                  const isSelected = currentPreset === eff.id;
                  return (
                    <button
                      key={eff.id}
                      className={`speed-preset-btn ${isSelected ? 'speed-preset-btn--active' : ''}`}
                      style={{ fontSize: 10, padding: '6px 2px' }}
                      onClick={() =>
                        updateClipEffects(
                          selectedItem!.item_id,
                          eff.id === 'none' ? undefined : { preset: eff.id as VideoEffectPreset },
                        )
                      }
                    >
                      {eff.label}
                    </button>
                  );
                })}
              </div>

              {/* Curseur Intensité & Vitesse pour effets dynamiques */}
              {(() => {
                const p = selectedItem.video_effects?.preset;
                const isDynamic =
                  p === 'x_shake' ||
                  p === 'y_shake' ||
                  p === 'camera_shake' ||
                  p === 'tremor_strobe' ||
                  p === 'strobe_white' ||
                  p === 'strobe_black';
                if (!isDynamic) return null;

                return (
                  <>
                    <div className="inspector-control" style={{ marginTop: 8 }}>
                      <div className="inspector-control__label-row">
                        <span>Intensité de secousse</span>
                        <span className="inspector-control__value-badge">
                          {(selectedItem.video_effects?.intensity ?? 1.0).toFixed(1)}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={selectedItem.video_effects?.intensity ?? 1.0}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipEffects(
                            selectedItem!.item_id,
                            {
                              preset: p,
                              intensity: Number(e.target.value),
                            },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>

                    <div className="inspector-control" style={{ marginTop: 8 }}>
                      <div className="inspector-control__label-row">
                        <span>Vitesse / Fréquence</span>
                        <span className="inspector-control__value-badge">
                          {(selectedItem.video_effects?.speed ?? 1.0).toFixed(1)}×
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.1"
                        value={selectedItem.video_effects?.speed ?? 1.0}
                        onPointerDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipEffects(
                            selectedItem!.item_id,
                            {
                              preset: p,
                              speed: Number(e.target.value),
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

          {/* Incrustation Fond Vert / Chroma Key (Étape 15) */}
          {isVideoOrImage && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 className="inspector-section__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>🟢</span>
                  <span>Incrustation Fond Vert (Chroma Key)</span>
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {selectedItem.chroma_key?.enabled && (
                    <button
                      className="inspector-reset-btn"
                      onClick={() =>
                        updateClipChromaKey(selectedItem!.item_id, {
                          enabled: false,
                          target_color: '#00B140',
                          similarity: 0.3,
                          smoothness: 0.1,
                          spill_reduction: 0.5,
                        })
                      }
                      title="Réinitialiser l'incrustation"
                    >
                      <RotateCcw size={11} />
                      <span>Réinitialiser</span>
                    </button>
                  )}
                  {/* Toggle Switch */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 4 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedItem.chroma_key?.enabled)}
                      onChange={(e) =>
                        updateClipChromaKey(selectedItem!.item_id, {
                          enabled: e.target.checked,
                          target_color: selectedItem!.chroma_key?.target_color || '#00B140',
                          similarity: selectedItem!.chroma_key?.similarity ?? 0.3,
                          smoothness: selectedItem!.chroma_key?.smoothness ?? 0.1,
                          spill_reduction: selectedItem!.chroma_key?.spill_reduction ?? 0.5,
                        })
                      }
                      style={{ accentColor: '#10b981', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: selectedItem.chroma_key?.enabled ? '#10b981' : '#94a3b8' }}>
                      {selectedItem.chroma_key?.enabled ? 'Actif' : 'Inactif'}
                    </span>
                  </label>
                </div>
              </div>

              {selectedItem.chroma_key?.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Sélection de la couleur cible */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Couleur à soustraire</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#10b981' }}>
                        {selectedItem.chroma_key.target_color || '#00B140'}
                      </span>
                    </div>

                    {/* Presets rapides de couleur */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 4 }}>
                      {CHROMA_PRESETS.map((preset) => {
                        const isSelected = (selectedItem!.chroma_key?.target_color || '').toUpperCase() === preset.color.toUpperCase();
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`inspector-keyframe-curve-pill ${isSelected ? 'inspector-keyframe-curve-pill--selected' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              fontSize: 10,
                              padding: '5px 2px',
                              border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                              backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                            }}
                            onClick={() =>
                              updateClipChromaKey(selectedItem!.item_id, {
                                target_color: preset.color,
                              })
                            }
                            title={preset.description}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: preset.color,
                                display: 'inline-block',
                                border: '1px solid #ffffff',
                              }}
                            />
                            <span>{preset.label.split(' ')[1]}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sélecteur de couleur libre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <input
                        type="color"
                        value={selectedItem.chroma_key.target_color || '#00B140'}
                        onChange={(e) =>
                          updateClipChromaKey(
                            selectedItem!.item_id,
                            { target_color: e.target.value.toUpperCase() },
                            false,
                          )
                        }
                        onBlur={() => pushHistorySnapshot()}
                        style={{
                          width: 28,
                          height: 24,
                          padding: 0,
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          backgroundColor: 'transparent',
                        }}
                        title="Sélectionner une couleur personnalisée"
                      />
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>Pipette / Couleur personnalisée</span>
                    </div>
                  </div>

                  {/* Curseur Similarité / Tolérance */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Tolérance (Similarité)</span>
                      <span>{Math.round((selectedItem.chroma_key.similarity ?? 0.3) * 100)} %</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={Math.round((selectedItem.chroma_key.similarity ?? 0.3) * 100)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipChromaKey(
                          selectedItem!.item_id,
                          { similarity: Number(e.target.value) / 100 },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Curseur Lissage des bords / Blend */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Lissage des contours (Blend)</span>
                      <span>{Math.round((selectedItem.chroma_key.smoothness ?? 0.1) * 100)} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={Math.round((selectedItem.chroma_key.smoothness ?? 0.1) * 100)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipChromaKey(
                          selectedItem!.item_id,
                          { smoothness: Number(e.target.value) / 100 },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Curseur Spill suppression / Anti-reflet */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Suppression des reflets (Spill)</span>
                      <span>{Math.round((selectedItem.chroma_key.spill_reduction ?? 0.5) * 100)} %</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round((selectedItem.chroma_key.spill_reduction ?? 0.5) * 100)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipChromaKey(
                          selectedItem!.item_id,
                          { spill_reduction: Number(e.target.value) / 100 },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Masque géométrique & Incrustation PiP (Étape 16) */}
          {isVideoOrImage && (
            <div className="inspector-section">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h4 className="inspector-section__title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Crop size={14} style={{ color: '#ea580c' }} />
                  <span>Masque & Incrustation PiP</span>
                </h4>
                {selectedItem.mask && selectedItem.mask.mask_type !== 'none' && (
                  <button
                    className="inspector-reset-btn"
                    onClick={() => resetClipMask(selectedItem!.item_id)}
                    title="Réinitialiser le masque"
                  >
                    <RotateCcw size={11} />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>

              {/* Grille de sélection des 6 formes de masque */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 12 }}>
                {MASK_PRESETS.map((preset) => {
                  const currentType = selectedItem!.mask?.mask_type || 'none';
                  const isSelected = currentType === preset.type;
                  return (
                    <button
                      key={preset.type}
                      type="button"
                      className={`inspector-keyframe-curve-pill ${isSelected ? 'inspector-keyframe-curve-pill--selected' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        fontSize: 11,
                        padding: '6px 4px',
                        border: isSelected ? '1.5px solid #ea580c' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: isSelected ? 'rgba(234, 88, 12, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#ffedd5' : '#cbd5e1',
                      }}
                      onClick={() => {
                        if (preset.type === 'none') {
                          resetClipMask(selectedItem!.item_id);
                        } else {
                          updateClipMask(selectedItem!.item_id, {
                            ...preset.defaultData,
                            mask_type: preset.type,
                          });
                        }
                      }}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Contrôles détaillés du masque actif */}
              {selectedItem.mask && selectedItem.mask.mask_type !== 'none' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Largeur (%) */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Largeur du masque</span>
                      <span>{Math.round(selectedItem.mask.width_percent ?? 75)} %</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={Math.round(selectedItem.mask.width_percent ?? 75)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipMask(
                          selectedItem!.item_id,
                          { width_percent: Number(e.target.value) },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Hauteur (%) */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Hauteur du masque</span>
                      <span>{Math.round(selectedItem.mask.height_percent ?? 75)} %</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={Math.round(selectedItem.mask.height_percent ?? 75)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipMask(
                          selectedItem!.item_id,
                          { height_percent: Number(e.target.value) },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Position X (%) */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Position X</span>
                      <span>{Math.round(selectedItem.mask.center_x_percent ?? 0)} %</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={Math.round(selectedItem.mask.center_x_percent ?? 0)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipMask(
                          selectedItem!.item_id,
                          { center_x_percent: Number(e.target.value) },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Position Y (%) */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Position Y</span>
                      <span>{Math.round(selectedItem.mask.center_y_percent ?? 0)} %</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={Math.round(selectedItem.mask.center_y_percent ?? 0)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipMask(
                          selectedItem!.item_id,
                          { center_y_percent: Number(e.target.value) },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Rotation (°) */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Rotation du masque</span>
                      <span>{Math.round(selectedItem.mask.rotation_degrees ?? 0)}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={Math.round(selectedItem.mask.rotation_degrees ?? 0)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipMask(
                          selectedItem!.item_id,
                          { rotation_degrees: Number(e.target.value) },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Adoucissement (Feather) */}
                  <div className="inspector-control">
                    <div className="inspector-control__label-row">
                      <span>Contour progressif (Feather)</span>
                      <span>{Math.round(selectedItem.mask.feather_px ?? 0)} px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={Math.round(selectedItem.mask.feather_px ?? 0)}
                      onMouseDown={() => pushHistorySnapshot()}
                      onChange={(e) =>
                        updateClipMask(
                          selectedItem!.item_id,
                          { feather_px: Number(e.target.value) },
                          false,
                        )
                      }
                      className="kroma-slider"
                    />
                  </div>

                  {/* Arrondi des angles (si rectangle) */}
                  {selectedItem.mask.mask_type === 'rectangle' && (
                    <div className="inspector-control">
                      <div className="inspector-control__label-row">
                        <span>Arrondi des angles</span>
                        <span>{Math.round(selectedItem.mask.roundness_px ?? 16)} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(selectedItem.mask.roundness_px ?? 16)}
                        onMouseDown={() => pushHistorySnapshot()}
                        onChange={(e) =>
                          updateClipMask(
                            selectedItem!.item_id,
                            { roundness_px: Number(e.target.value) },
                            false,
                          )
                        }
                        className="kroma-slider"
                      />
                    </div>
                  )}

                  {/* Bouton Inverser le masque */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Inverser le masque</span>
                    <button
                      type="button"
                      className={`inspector-keyframe-curve-pill ${selectedItem.mask.inverted ? 'inspector-keyframe-curve-pill--selected' : ''}`}
                      style={{
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        border: selectedItem.mask.inverted ? '1.5px solid #ea580c' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: selectedItem.mask.inverted ? 'rgba(234, 88, 12, 0.25)' : 'rgba(255,255,255,0.03)',
                        color: selectedItem.mask.inverted ? '#ffedd5' : '#94a3b8',
                      }}
                      onClick={() =>
                        updateClipMask(selectedItem!.item_id, {
                          inverted: !selectedItem!.mask?.inverted,
                        })
                      }
                    >
                      {selectedItem.mask.inverted ? 'Inversé (Trou)' : 'Standard'}
                    </button>
                  </div>
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

  // 3. Cas : Aucun élément sélectionné (Détails de la composition & Ratios Étape 12)
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

          {/* Sélecteur de format de canevas (Étape 12) */}
          <div className="inspector-control" style={{ marginTop: 8, marginBottom: 10 }}>
            <div className="inspector-control__label-row">
              <span>Format du Canevas</span>
              <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 600 }}>
                {project.timeline_canvas.aspect_ratio}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
              {(Object.keys(CANVAS_RATIO_PRESETS) as Exclude<CanvasAspectRatio, 'custom'>[]).map((key) => {
                const preset = CANVAS_RATIO_PRESETS[key];
                const isSelected = project.timeline_canvas.aspect_ratio === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`speed-preset-btn ${isSelected ? 'speed-preset-btn--active' : ''}`}
                    style={{ fontSize: 10, padding: '5px 2px' }}
                    onClick={() => setCanvasAspectRatio(key)}
                    title={`${preset.name} (${preset.width}×${preset.height})`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="inspector-field">
            <span className="inspector-field__label">Résolution :</span>
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
            Sélectionnez un clip sur la timeline pour régler son volume, son échelle, ses images-clés ou son incrustation fond vert.
          </p>
        </div>
      </div>
    </aside>
  );
}

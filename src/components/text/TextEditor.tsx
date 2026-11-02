/**
 * Panneau d'édition de calque texte (style CapCut).
 * Affiché dans l'InspectorPanel lorsqu'un clip texte est sélectionné.
 * Permet de modifier le contenu, la police, la taille, la couleur,
 * le contour, l'alignement et la position normalisée du texte.
 */
import { AlignLeft, AlignCenter, AlignRight, Bold, Type } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import type { TextLayerData } from '../../core/types/timeline';

/** Polices système disponibles */
const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Système (sans-serif)', value: 'system-ui' },
  { label: 'Impact', value: 'Impact, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, serif' },
  { label: 'Courier New', value: "'Courier New', monospace" },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

interface TextEditorProps {
  itemId: string;
  textData: TextLayerData;
}

export function TextEditor({ itemId, textData }: TextEditorProps) {
  const { updateTextLayerData } = useProjectStore();

  /** Applique une mise à jour partielle sur les données texte */
  const update = (patch: Partial<TextLayerData>) => {
    updateTextLayerData(itemId, patch);
  };

  const fontSizePt = textData.font_size_pt ?? 48;
  const outlineThicknessPx = textData.outline_thickness_px ?? 3;
  const xRatio = textData.normalized_center?.x_ratio ?? 0.5;
  const yRatio = textData.normalized_center?.y_ratio ?? 0.5;

  return (
    <div className="text-editor">
      {/* En-tête */}
      <div className="text-editor__header">
        <Type size={14} />
        <span>Calque Texte</span>
      </div>

      {/* ── Contenu textuel ───────────────────────────────── */}
      <div className="text-editor__section">
        <label className="text-editor__label">Contenu</label>
        <textarea
          className="text-editor__textarea"
          value={textData.raw_string}
          rows={3}
          onChange={(e) => update({ raw_string: e.target.value })}
          placeholder="Saisir votre texte…"
        />
      </div>

      {/* ── Police ────────────────────────────────────────── */}
      <div className="text-editor__section">
        <label className="text-editor__label">Police</label>
        <select
          className="text-editor__select"
          value={textData.font_name}
          onChange={(e) => update({ font_name: e.target.value })}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Taille & Graisse ──────────────────────────────── */}
      <div className="text-editor__section">
        <div className="text-editor__row">
          <div className="text-editor__control-group" style={{ flex: 1 }}>
            <div className="text-editor__label-row">
              <label className="text-editor__label">Taille</label>
              <span className="text-editor__badge">{fontSizePt} pt</span>
            </div>
            <input
              type="range"
              className="kroma-slider"
              min={12}
              max={200}
              value={fontSizePt}
              onChange={(e) => update({ font_size_pt: Number(e.target.value) })}
            />
          </div>

          {/* Graisse (Bold toggle) */}
          <button
            className={`text-editor__toggle-btn${textData.is_bold ? ' text-editor__toggle-btn--active' : ''}`}
            onClick={() => update({ is_bold: !textData.is_bold })}
            title="Gras"
          >
            <Bold size={15} />
          </button>
        </div>
      </div>

      {/* ── Alignement du texte ───────────────────────────── */}
      <div className="text-editor__section">
        <label className="text-editor__label">Alignement</label>
        <div className="text-editor__align-group">
          {(['left', 'center', 'right'] as const).map((align) => {
            const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
            return (
              <button
                key={align}
                className={`text-editor__align-btn${textData.text_align === align ? ' text-editor__align-btn--active' : ''}`}
                onClick={() => update({ text_align: align })}
                title={align === 'left' ? 'Gauche' : align === 'center' ? 'Centre' : 'Droite'}
              >
                <Icon size={15} />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Couleurs ──────────────────────────────────────── */}
      <div className="text-editor__section">
        <div className="text-editor__row text-editor__row--colors">
          <div className="text-editor__color-group">
            <label className="text-editor__label">Couleur du texte</label>
            <div className="text-editor__color-row">
              <input
                type="color"
                className="text-editor__color-input"
                value={textData.fill_color_hex}
                onChange={(e) => update({ fill_color_hex: e.target.value })}
              />
              <span className="text-editor__color-hex">{textData.fill_color_hex.toUpperCase()}</span>
            </div>
          </div>

          <div className="text-editor__color-group">
            <label className="text-editor__label">Couleur du contour</label>
            <div className="text-editor__color-row">
              <input
                type="color"
                className="text-editor__color-input"
                value={textData.outline_color_hex}
                onChange={(e) => update({ outline_color_hex: e.target.value })}
              />
              <span className="text-editor__color-hex">{textData.outline_color_hex.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Épaisseur du contour ──────────────────────────── */}
      <div className="text-editor__section">
        <div className="text-editor__label-row">
          <label className="text-editor__label">Épaisseur du contour</label>
          <span className="text-editor__badge">{outlineThicknessPx} px</span>
        </div>
        <input
          type="range"
          className="kroma-slider"
          min={0}
          max={20}
          value={outlineThicknessPx}
          onChange={(e) => update({ outline_thickness_px: Number(e.target.value) })}
        />
      </div>

      {/* ── Position sur le canvas ────────────────────────── */}
      <div className="text-editor__section">
        <label className="text-editor__label">Position sur le canevas</label>

        <div className="text-editor__label-row">
          <span className="text-editor__sublabel">Horizontal (X)</span>
          <span className="text-editor__badge">{Math.round(xRatio * 100)}%</span>
        </div>
        <input
          type="range"
          className="kroma-slider"
          min={0}
          max={100}
          value={Math.round(xRatio * 100)}
          onChange={(e) =>
            update({
              normalized_center: {
                x_ratio: Number(e.target.value) / 100,
                y_ratio: yRatio,
              },
            })
          }
        />

        <div className="text-editor__label-row" style={{ marginTop: 8 }}>
          <span className="text-editor__sublabel">Vertical (Y)</span>
          <span className="text-editor__badge">{Math.round(yRatio * 100)}%</span>
        </div>
        <input
          type="range"
          className="kroma-slider"
          min={0}
          max={100}
          value={Math.round(yRatio * 100)}
          onChange={(e) =>
            update({
              normalized_center: {
                x_ratio: xRatio,
                y_ratio: Number(e.target.value) / 100,
              },
            })
          }
        />
      </div>

      {/* ── Prévisualisation typographique ───────────────── */}
      <div className="text-editor__section">
        <label className="text-editor__label">Aperçu</label>
        <div
          className="text-editor__preview"
          style={{
            fontFamily: textData.font_name,
            fontSize: Math.max(12, Math.min(48, textData.font_size_pt / 2)),
            fontWeight: textData.is_bold ? 'bold' : 'normal',
            color: textData.fill_color_hex,
            textAlign: textData.text_align,
            WebkitTextStroke:
              textData.outline_thickness_px > 0
                ? `${Math.max(1, textData.outline_thickness_px / 2)}px ${textData.outline_color_hex}`
                : undefined,
          }}
        >
          {textData.raw_string || 'Nouveau Titre'}
        </div>
      </div>
    </div>
  );
}


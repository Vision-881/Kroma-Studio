# Architecture technique — Kroma Studio

Ce document détaille l'organisation structurelle, le découpage en modules et le format de fichier projet de l'éditeur vidéo **Kroma Studio**.

Dernière mise à jour : 02/11/2026 (Étape 4 du MVP)

---

## 1. Vue d'ensemble des modules

L'application est conçue selon une séparation stricte des responsabilités entre la représentation de données pures, la logique métier temporelle, le moteur de rendu d'aperçu multi-couches, la gestion d'état et l'interface utilisateur inspirée de CapCut Desktop.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HEADER (Branding, Nom du projet, Export)               │
├──────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│    MÉDIATHÈQUE (320px)   │     MONITEUR D'APERÇU (Player)   │    INSPECTEUR (290px)     │
│  - Import & Catégories   │   - Canvas 16:9 composite       │  - Clip : Volume, Zoom,   │
│  - Drag & Drop vers TL   │   - Rendu vidéo & audio réels   │    Rotation, Opacité      │
│  - mediaSession registre │   - Transport & Synchro 60 FPS  │  - Texte : TextEditor     │
├──────────────────────────┴─────────────────────────────────┴───────────────────────────┤
│                                  TIMELINE MULTIPISTE                                   │
│  - Barre d'outils : Outil Sélection (V), Outil Rasoir (B), Supprimer, Texte, Zoom      │
│  - Réglette temporelle graduée (Ruler) avec scrubbing                                  │
│  - Tête de lecture (Playhead) rouge traversante synchronisée                           │
│  - En-têtes de pistes (Mute, Lock) et corps de pistes récepteurs de drag & drop        │
│  - Segments de clips colorés par type avec poignées de rognage (Trim handles)          │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              STORE RÉACTIF ZUSTAND                                     │
│  - project: KromaProject                                                               │
│  - currentTimeUs: number (position tête de lecture)                                    │
│  - selectedItemId / selectedAssetId: string | null                                     │
│  - zoomPixelsPerSecond: number (10 à 300 px/s)                                         │
│  - activeTool: 'select' | 'split' | 'delete'                                           │
└──────────────────┬───────────────────────┬───────────────────────────┬─────────────────┘
                   │                       │                           │
                   ▼                       ▼                           ▼
┌───────────────────────┐   ┌─────────────────────────────┐   ┌──────────────────────────┐
│      CORE : TEMPS     │   │  CORE : OPÉRATIONS TIMELINE │   │ CORE : MOTEUR DE LECTURE │
│  - Microsecondes pure │   │  - addItemToLane            │   │  - getActiveItemsAtTime  │
│  - Timecode SMPTE     │   │  - splitItemInSequence      │   │  - calculateSourceTimeUs │
│  - formatDuration     │   │  - trimItemInSequence       │   │  - mediaSession registre │
│                       │   │  - createTextItem (Ét.4)    │   │  - Canvas 2D composition │
└───────────────────────┘   └─────────────────────────────┘   └──────────────────────────┘
```

### 1.1 `src/core/types`
Définit les interfaces TypeScript canoniques de l'application :
- `asset.ts` : `MediaAsset`, `MediaKind` ('video' | 'audio' | 'image'). Représente les fichiers multimédias importés.
- `timeline.ts` : `TimelineSequence`, `TimelineLane`, `TimelineItem`, `SpatialPlacement`, `TextLayerData`. Décrit l'agencement temporel et spatial des pistes et des segments de clips.
- `project.ts` : `KromaProject`, `TimelineCanvasSettings`, fonction utilitaire `createDefaultProject()`.

### 1.2 `src/core/playback`
Moteur de prévisualisation et de synchronisation :
- `playbackEngine.ts` : calcule l'ensemble des segments visuels et audios actifs sous la tête de lecture à l'instant $T$, triés selon leur ordre d'empilement vertical (`stack_index`), et détermine le temps source exact $t_{\text{source\_us}} = t_{\text{timeline\_us}} - t_{\text{placement\_us}} + t_{\text{source\_in\_us}}$.

### 1.3 `src/core/media`
Gestion et décodage multimédia :
- `mediaSession.ts` : registre singleton conservant les instances d'éléments HTMLVideoElement, HTMLAudioElement et les URLs de session afin d'éviter les ré-instanciations DOM et d'assurer une lecture fluide sans saccades.
- `mediaProbe.ts` : extraction asynchrone des métadonnées (dimensions, durée, framerate) et vignettes lors de l'importation.

### 1.4 `src/core/timeline`
Module pur de manipulation des pistes et segments :
- `timelineOps.ts` : fonctions d'adjonction, de déplacement temporel/inter-pistes, de scission (split) au temps de coupe exact, de rognage interactif (trim) et de création de calques texte (`createTextItem`).

### 1.5 `src/components`
Composants React modulaires organisés selon l'agencement CapCut :
- `components/player/PreviewMonitor.tsx` : écran `<canvas>` composite 16:9 haute performance dessinant en direct le flux vidéo, audio, titres (texte positionné via `normalized_center`), avec barre de transport et raccourci barre d'espace.
- `components/media/MediaBin.tsx` : médiathèque avec onglets, recherche et drag & drop vers les pistes.
- `components/inspector/InspectorPanel.tsx` : panneau de propriétés contextuel. Bascule automatiquement sur `TextEditor` si le clip sélectionné possède `text_layer_data`.
- `components/text/TextEditor.tsx` *(Étape 4)* : éditeur texte complet (contenu, police, taille, gras, alignement, couleurs, contour, position X/Y normalisée, aperçu live).
- `components/timeline/` : suite complète de timeline (barre d'outils avec bouton **Texte**, réglette graduée, tête de lecture, en-têtes et clips interactifs).

---

## 2. Principes directeurs de conception

1. **Représentation temporelle en microsecondes entières (`us`) :**
   Tous les champs temporels sont stockés sous forme d'entiers (`number` JS représentant un entier 64-bit sûr jusqu'à $2^{53}-1$). Cela élimine les erreurs d'arrondi décimal inhérentes aux secondes flottantes.

2. **Édition non destructive :**
   Les clips de la timeline référencent simplement l'identifiant `referenced_asset_id` de la ressource source et définissent une fenêtre de lecture via `source_in_point_us` et `source_duration_us`. Le fichier source original sur le disque dur n'est jamais écrasé ou altéré.

3. **Composition multi-couches sur Canvas 2D :**
   L'affichage en temps réel combine les calques vidéo, les rotations, les facteurs d'échelle et l'opacité sans ré-encodage, offrant une prévisualisation instantanée identique au rendu final.

4. **Positionnement normalisé des calques texte :**
   La position (`normalized_center`) est stockée en ratios 0.0–1.0 indépendants de la résolution, permettant à un texte positionné à `{x: 0.5, y: 0.85}` de rester toujours centré à 85 % de la hauteur quelle que soit la résolution (1080p, 4K, etc.).

---

## 3. Format de projet JSON (`.kproj`)

Les fichiers de sauvegarde de Kroma Studio utilisent l'extension `.kproj` et sont stockés en texte JSON structuré.

### Exemple complet d'un fichier `.kproj` valide

```json
{
  "kroma_version": "1.0.0",
  "project_uuid": "proj_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project_name": "Voyage en Islande 2026",
  "created_timestamp_utc": 1793653200000000,
  "modified_timestamp_utc": 1793653320000000,
  "timeline_canvas": {
    "viewport_width": 1920,
    "viewport_height": 1080,
    "frame_rate_fps": 60.0,
    "audio_sample_rate_hz": 48000,
    "background_color_hex": "#000000"
  },
  "asset_catalog": [
    {
      "asset_id": "asset_cascade_4k",
      "display_name": "gullfoss_cascade.mp4",
      "media_kind": "video",
      "source_path": "D:/Rushs/Islande/gullfoss_cascade.mp4",
      "duration_us": 24500000,
      "native_width": 3840,
      "native_height": 2160,
      "detected_fps": 59.94,
      "audio_channels": 2,
      "audio_sample_rate_hz": 48000,
      "thumbnail_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
      "file_size_bytes": 145892010
    }
  ],
  "sequence": {
    "total_length_us": 15000000,
    "lanes": [
      {
        "lane_id": "lane_video_main",
        "lane_title": "Piste Vidéo Principale",
        "lane_type": "visual",
        "stack_index": 0,
        "is_muted": false,
        "is_locked": false,
        "gain_level": 1.0,
        "items": [
          {
            "item_id": "clip_cascade_intro",
            "referenced_asset_id": "asset_cascade_4k",
            "placement_time_us": 0,
            "play_duration_us": 6000000,
            "source_in_point_us": 2000000,
            "source_duration_us": 6000000,
            "item_gain": 0.8,
            "spatial_placement": {
              "offset_x_px": 0,
              "offset_y_px": 0,
              "zoom_factor_x": 1.0,
              "zoom_factor_y": 1.0,
              "rotation_degrees": 0.0,
              "opacity_ratio": 1.0
            }
          }
        ]
      },
      {
        "lane_id": "lane_text_1",
        "lane_title": "Titres & Textes",
        "lane_type": "text_overlay",
        "stack_index": 2,
        "is_muted": false,
        "is_locked": false,
        "gain_level": 1.0,
        "items": [
          {
            "item_id": "item_text_abc123",
            "referenced_asset_id": null,
            "placement_time_us": 1000000,
            "play_duration_us": 4000000,
            "source_in_point_us": 0,
            "source_duration_us": 4000000,
            "item_gain": 0,
            "spatial_placement": {
              "offset_x_px": 0, "offset_y_px": 0,
              "zoom_factor_x": 1.0, "zoom_factor_y": 1.0,
              "rotation_degrees": 0.0, "opacity_ratio": 1.0
            },
            "text_layer_data": {
              "raw_string": "Islande 2026",
              "font_name": "system-ui",
              "font_size_pt": 72,
              "is_bold": true,
              "fill_color_hex": "#FFFFFF",
              "outline_color_hex": "#000000",
              "outline_thickness_px": 4,
              "text_align": "center",
              "normalized_center": { "x_ratio": 0.5, "y_ratio": 0.85 }
            }
          }
        ]
      }
    ]
  }
}
```

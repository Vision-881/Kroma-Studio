# Architecture technique — Kroma Studio

Ce document détaille l'organisation structurelle, le découpage en modules et le format de fichier projet de l'éditeur vidéo **Kroma Studio**.

Dernière mise à jour : 02/11/2026 (Étape 2 du MVP)

---

## 1. Vue d'ensemble des modules

L'application est conçue selon une séparation stricte des responsabilités entre la représentation de données pures, la logique métier temporelle, la gestion d'état et l'interface utilisateur inspirée de CapCut Desktop.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 HEADER (Branding, Nom du projet, Export)               │
├──────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│    MÉDIATHÈQUE (320px)   │     MONITEUR D'APERÇU (Player)   │    INSPECTEUR (290px)     │
│  - Import & Catégories   │   - Canevas 16:9                │  - Volume & Gain          │
│  - Drag & Drop vers TL   │   - Barre de transport          │  - Zoom, Rotation, Opacité│
│  - Insertion rapide (+)  │   - Timecode SMPTE double       │  - Propriétés de projet   │
├──────────────────────────┴─────────────────────────────────┴───────────────────────────┤
│                                  TIMELINE MULTIPISTE                                   │
│  - Barre d'outils : Outil Sélection (V), Outil Rasoir (B), Supprimer (Suppr), Zoom     │
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
└──────────────────┬───────────────────────────────────────────┬─────────────────────────┘
                   │                                           │
                   ▼                                           ▼
┌──────────────────────────────────────┐   ┌─────────────────────────────────────────────┐
│       CORE : OPÉRATIONS TIMELINE     │   │            CORE : TEMPS & TYPES             │
│  - addItemToLane                     │   │   - Représentation microsecondes entières   │
│  - moveItemInSequence                │   │   - usToTimecode (SMPTE HH:MM:SS:FF)        │
│  - splitItemInSequence (Rasoir)      │   │   - formatDurationHuman                     │
│  - trimItemInSequence (Rognage)      │   │   - types stricts (asset, timeline, proj)   │
│  - removeItemFromSequence            │   │                                             │
└──────────────────────────────────────┘   └─────────────────────────────────────────────┘
```

### 1.1 `src/core/types`
Définit les interfaces TypeScript canoniques de l'application :
- `asset.ts` : `MediaAsset`, `MediaKind` ('video' | 'audio' | 'image'). Représente les fichiers multimédias importés.
- `timeline.ts` : `TimelineSequence`, `TimelineLane`, `TimelineItem`, `SpatialPlacement`, `TextLayerData`. Décrit l'agencement temporel et spatial des pistes et des segments de clips.
- `project.ts` : `KromaProject`, `TimelineCanvasSettings`, fonction utilitaire `createDefaultProject()`.

### 1.2 `src/core/timeline`
Module pur de manipulation des pistes et segments :
- `timelineOps.ts` : fonctions d'adjonction, de déplacement temporel/inter-pistes, de scission (split) au temps de coupe exact et de rognage interactif (trim) avec respect des bornes de la source originale.

### 1.3 `src/core/time`
Gère la manipulation du temps sans virgule flottante :
- `timeUtils.ts` : conversions bidirectionnelles entre secondes, microsecondes ($1\,\text{s} = 1\,000\,000\,\mu\text{s}$), images/frames selon le framerate configuré, et formatage standardisé en timecode SMPTE (`HH:MM:SS:FF`) ou lisible par l'utilisateur (`MM:SS`).

### 1.4 `src/core/media`
Module d'inspection et d'extraction de métadonnées multimédias :
- `mediaProbe.ts` : utilise les composants natifs du navigateur (`HTMLVideoElement`, `HTMLAudioElement`, `HTMLImageElement`, `HTMLCanvasElement`) pour extraire sans blocage la durée exacte, les résolutions et générer une vignette JPEG nette capturée après le premier écran noir.

### 1.5 `src/store`
Store global réactif utilisant Zustand :
- `projectStore.ts` : point unique de vérité pour le projet en cours de montage. Expose les actions `addAsset`, `removeAsset`, `addItemFromAsset`, `moveTimelineItem`, `splitTimelineItemAtCurrentTime`, `trimTimelineItem`, `removeTimelineItem`, `setCurrentTimeUs`, `setZoomPixelsPerSecond`, etc.

### 1.6 `src/components`
Composants React modulaires organisés selon l'agencement CapCut :
- `components/layout/Header.tsx` : en-tête supérieur avec nom du projet et bouton Exporter.
- `components/media/MediaBin.tsx` : médiathèque avec onglets, recherche et drag & drop vers les pistes.
- `components/player/PreviewMonitor.tsx` : moniteur 16:9 avec transport (Play/Pause, saut 1s, timecode).
- `components/inspector/InspectorPanel.tsx` : panneau de propriétés contextuel (volume, échelle, rotation, opacité).
- `components/timeline/` : suite complète de timeline (barre d'outils, réglette graduée, tête de lecture, en-têtes et clips interactifs).

---

## 2. Principes directeurs de conception

1. **Représentation temporelle en microsecondes entières (`us`) :**
   Tous les champs temporels sont stockés sous forme d'entiers (`number` JS représentant un entier 64-bit sûr jusqu'à $2^{53}-1$, soit des centaines d'années de vidéo). Cela élimine les erreurs d'arrondi décimal inhérentes aux secondes flottantes.

2. **Édition non destructive :**
   Les clips de la timeline référencent simplement l'identifiant `referenced_asset_id` de la ressource source et définissent une fenêtre de lecture via `source_in_point_us` et `source_duration_us`. Le fichier source original sur le disque dur n'est jamais écrasé ou altéré.

3. **Ergonomie réactive :**
   Le déplacement et le rognage de clips s'exécutent de façon fluide en temps réel avec mise à jour immédiate du timecode et du lecteur d'aperçu.

---

## 3. Format de projet JSON (`.kproj`)

Les fichiers de sauvegarde de Kroma Studio utilisent l'extension `.kproj` et sont stockés en texte JSON structuré.

### Schéma synthétique des champs
- `kroma_version` *(string)* : version du schéma de données (ex: `"1.0.0"`).
- `project_uuid` *(string)* : identifiant unique universel du projet.
- `project_name` *(string)* : nom donné par l'utilisateur.
- `created_timestamp_utc` *(number)* : date de création en microsecondes depuis l'époque Unix.
- `modified_timestamp_utc` *(number)* : date de dernière modification en microsecondes.
- `timeline_canvas` *(object)* :
  - `viewport_width`, `viewport_height` : dimensions de la composition en pixels.
  - `frame_rate_fps` : cadence d'images de la timeline (ex: 60.0).
  - `audio_sample_rate_hz` : fréquence d'échantillonnage audio (ex: 48000).
  - `background_color_hex` : couleur de fond en code hexadécimal.
- `asset_catalog` *(array)* : liste exhaustive des médias disponibles dans la médiathèque.
- `sequence` *(object)* :
  - `total_length_us` : durée totale de la séquence en microsecondes.
  - `lanes` *(array)* : liste ordonnée des pistes de montage (`visual`, `audio`, `text_overlay`).
    - `items` *(array)* : segments découpés et placés sur la piste.

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
    },
    {
      "asset_id": "asset_musique_fond",
      "display_name": "ambient_nordic.mp3",
      "media_kind": "audio",
      "source_path": "D:/Musiques/ambient_nordic.mp3",
      "duration_us": 120000000,
      "native_width": 0,
      "native_height": 0,
      "detected_fps": 0,
      "audio_channels": 2,
      "audio_sample_rate_hz": 44100,
      "file_size_bytes": 4820150
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
        "lane_id": "lane_titles",
        "lane_title": "Piste Titres",
        "lane_type": "text_overlay",
        "stack_index": 1,
        "is_muted": false,
        "is_locked": false,
        "gain_level": 1.0,
        "items": [
          {
            "item_id": "title_intro",
            "placement_time_us": 500000,
            "play_duration_us": 4000000,
            "source_in_point_us": 0,
            "source_duration_us": 4000000,
            "item_gain": 1.0,
            "text_layer_data": {
              "raw_string": "GULLFOSS - ISLANDE",
              "font_name": "system-ui",
              "font_size_pt": 48,
              "is_bold": true,
              "fill_color_hex": "#FFFFFF",
              "outline_color_hex": "#000000",
              "outline_thickness_px": 2,
              "text_align": "center",
              "normalized_center": {
                "x_ratio": 0.5,
                "y_ratio": 0.5
              }
            },
            "spatial_placement": {
              "offset_x_px": 0,
              "offset_y_px": -120,
              "zoom_factor_x": 1.0,
              "zoom_factor_y": 1.0,
              "rotation_degrees": 0.0,
              "opacity_ratio": 0.95
            }
          }
        ]
      },
      {
        "lane_id": "lane_audio_bg",
        "lane_title": "Musique d'ambiance",
        "lane_type": "audio",
        "stack_index": 2,
        "is_muted": false,
        "is_locked": false,
        "gain_level": 0.65,
        "items": [
          {
            "item_id": "clip_musique_fond",
            "referenced_asset_id": "asset_musique_fond",
            "placement_time_us": 0,
            "play_duration_us": 15000000,
            "source_in_point_us": 0,
            "source_duration_us": 15000000,
            "item_gain": 0.65
          }
        ]
      }
    ]
  }
}
```

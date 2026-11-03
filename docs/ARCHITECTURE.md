# Architecture technique — Kroma Studio

Ce document détaille l'organisation structurelle, le découpage en modules et le format de fichier projet de l'éditeur vidéo **Kroma Studio**.

Dernière mise à jour : 03/11/2026 (Étape 10 — Transitions Visuelles entre clips)

---

## 1. Vue d'ensemble des modules

L'application est conçue selon une séparation stricte des responsabilités entre la représentation de données pures, la logique métier temporelle, le moteur de rendu d'aperçu multi-couches, la gestion d'état, l'exportation externe FFmpeg et l'interface utilisateur inspirée de CapCut Desktop.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               HEADER (Branding, Fichier: Nouveau/Ouvrir/Enregistrer, Undo/Redo, Export) │
├──────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│    MÉDIATHÈQUE (320px)   │     MONITEUR D'APERÇU (Player)   │    INSPECTEUR (290px)     │
│  - Import & Catégories   │   - Canvas 16:9 composite       │  - Clip : Volume, Zoom,   │
│  - Drag & Drop vers TL   │   - Rendu vidéo & audio réels   │    Rotation, Opacité      │
│  - mediaSession registre │   - Transport & Synchro 60 FPS  │  - Audio : Fondus In/Out  │
│                          │                                 │  - Texte : TextEditor     │
├──────────────────────────┴─────────────────────────────────┴───────────────────────────┤
│                                  TIMELINE MULTIPISTE                                   │
│  - Barre d'outils : Annuler, Rétablir, Sélection (V), Rasoir (B), Suppr, Texte, Zoom    │
│  - Réglette temporelle graduée (Ruler) avec scrubbing                                  │
│  - Tête de lecture (Playhead) rouge traversante synchronisée                           │
│  - En-têtes de pistes avec Mute, Solo [S], Lock et Curseur de volume de piste          │
│  - Segments de clips avec Formes d'ondes audio (Waveforms) et Pentes de fondu visuelles│
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              STORE RÉACTIF ZUSTAND                                     │
│  - project: KromaProject                                                               │
│  - past[] / future[] (Pile Undo/Redo bornée à 50 états, Ctrl+Z / Ctrl+Y)              │
│  - saveProjectToFile() / loadProjectFromJson() (Format .kproj JSON standard)           │
│  - isExportDialogOpen / openExportDialog() / closeExportDialog() (Étape 7)             │
│  - currentTimeUs: number (position tête de lecture)                                    │
│  - selectedItemId / selectedAssetId: string | null                                     │
│  - zoomPixelsPerSecond: number (10 à 300 px/s)                                         │
│  - activeTool: 'select' | 'split' | 'delete'                                           │
└──────┬───────────────────────┬───────────────────────────┬─────────────────────────────┘
       │                       │                           │                             │
       ▼                       ▼                           ▼                             ▼
┌──────────────┐   ┌─────────────────────────────┐   ┌──────────────────────────┐  ┌───────────────────────────┐
│ CORE : TEMPS │   │  CORE : OPÉRATIONS TIMELINE │   │ CORE : MOTEUR DE LECTURE │  │   CORE : EXPORT FFMPEG    │
│ - Microsec   │   │  - addItemToLane            │   │  - getActiveItemsAtTime  │  │  - buildFFmpegCommand     │
│ - Timecode   │   │  - splitItemInSequence      │   │  - calculateSourceTimeUs │  │  - filter_complex graph   │
│ - Durations  │   │  - trimItemInSequence       │   │  - calculateFadeGain     │  │  - generateWindowsBatch   │
│              │   │  - createTextItem           │   │  - Canvas 2D composition │  │  - generateBashScript     │
└──────────────┘   └─────────────────────────────┘   └──────────────────────────┘  └───────────────────────────┘
```

### 1.1 `src/core/types`
Définit les interfaces TypeScript canoniques de l'application :
- `asset.ts` : `MediaAsset`, `MediaKind` ('video' | 'audio' | 'image'). Représente les fichiers multimédias importés.
- `timeline.ts` : `TimelineSequence`, `TimelineLane`, `TimelineItem`, `SpatialPlacement`, `TextLayerData`, `ColorAdjustments`, `TransitionType`, `TransitionData`. Décrit l'agencement temporel et spatial des pistes et des segments de clips, y compris les durées de fondus sonores (`fade_in_duration_us`, `fade_out_duration_us`), l'état solo (`is_solo`), la vitesse de lecture (`playback_speed`) et les transitions visuelles d'entrée (`transition_in`).
- `project.ts` : `KromaProject`, `TimelineCanvasSettings`, fonction utilitaire `createDefaultProject()`.

### 1.2 `src/core/playback`
Moteur de prévisualisation et de synchronisation :
- `playbackEngine.ts` : calcule l'ensemble des segments visuels et audios actifs sous la tête de lecture à l'instant $T$, applique les règles d'isolation Solo/Mute et le mixage sommateur pondéré via la fonction `calculateFadeGain(offsetUs, durationUs, fadeInUs, fadeOutUs)`.

### 1.3 `src/core/media`
Gestion et décodage multimédia :
- `mediaSession.ts` : registre singleton conservant les instances d'éléments HTMLVideoElement, HTMLAudioElement et les URLs de session afin d'éviter les ré-instanciations DOM et d'assurer une lecture fluide sans saccades.
- `mediaProbe.ts` : extraction asynchrone des métadonnées (dimensions, durée, framerate) et vignettes lors de l'importation.

### 1.4 `src/core/timeline`
Module pur de manipulation des pistes et segments :
- `timelineOps.ts` : fonctions d'adjonction, de déplacement temporel/inter-pistes, de scission (split) au temps de coupe exact, de rognage interactif (trim) et de création de calques texte (`createTextItem`).

### 1.5 `src/components`
Composants React modulaires organisés selon l'agencement CapCut :
- `components/layout/Header.tsx` : barre supérieure avec boutons Nouveau, Ouvrir, Enregistrer (`.kproj`), Annuler / Rétablir, renommage du projet et bouton Export.
- `components/player/PreviewMonitor.tsx` : écran `<canvas>` composite 16:9 haute performance avec contrôle du volume dynamique en temps réel et raccourcis claviers universels (`Espace`, `V`, `B`, `Ctrl+B`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+S`, `Ctrl+E`).
- `components/media/MediaBin.tsx` : médiathèque avec onglets, recherche et drag & drop vers les pistes.
- `components/inspector/InspectorPanel.tsx` : panneau de propriétés contextuel avec section Audio complète (volume, fondus Fade In/Out avec enveloppe), section Vitesse de lecture (ralenti/accéléré 0.25× à 4.0× avec réinitialisation 1×), section Réglages & Étalonnage Couleur (luminosité, contraste, saturation, teinte, flou) et section Transition d'entrée (fondu enchaîné, fondu au noir, flash blanc, balayage gauche avec réglage de durée 0.1s à 5.0s).
- `components/audio/AudioWaveform.tsx` : générateur vectoriel haute performance de formes d'ondes audio harmoniques.
- `components/timeline/` : suite complète de timeline (barre d'outils avec Annuler/Rétablir et bouton **Texte**, réglette graduée, tête de lecture, en-têtes avec Solo [S] et volume de piste, et clips avec visualisations de fondus et badges de transitions violettes).
- `components/export/ExportDialog.tsx` *(Étape 7)* : modal d'exportation avec préréglages (1080p, 720p, 4K, personnalisé), réglages fins d'encodage H.264/HEVC, aperçu de commandes CLI et téléchargement de scripts `.bat` et `.sh`.

### 1.6 `src/core/export` *(Étape 7)*
Moteur d'exportation et compilation du graphe de filtrage FFmpeg :
- `ffmpegCommandBuilder.ts` : analyse la structure complète du projet (`KromaProject`), génère les filtres de trim, contain/pad, transformations géométriques 2D, filtres d'étalonnage (`eq`, `hue`, `gblur`), vitesses de lecture (`setpts`, `atempo`), transitions d'entrée (`fade`), overlays multi-pistes, calques `drawtext`, mixage audio `amix` avec `adelay` et `afade`, assemble la commande CLI complète et produit des scripts exécutables Windows (`.bat`) et Unix (`.sh`).

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

5. **Modèle de mixage audio DSP hiérarchique :**
   Le volume d'un élément audio à tout instant $t$ résulte de la composition de 3 étages indépendants :
   - Étage 1 : Le gain individuel du clip (`item_gain`), ajustable de 0% à 200%.
   - Étage 2 : Le gain général de la piste (`gain_level`), ajustable de 0% à 200% pour équilibrer les pistes entre elles.
   - Étage 3 : La rampe continue d'atténuation du fondu (`Fade In` / `Fade Out`), évitant les claquements et assurant des montées/descentes sonores progressives.
   - Étage 4 : La matrice d'acheminement Solo / Mute garantissant l'isolation instantanée des pistes d'écoute.

6. **Historique immuable et persistance standard (.kproj) :**
   La pile de modifications enregistre les états antérieurs complets (jusqu'à 50 étapes) pour permettre l'annulation (`Ctrl+Z`) et le rétablissement (`Ctrl+Y`) sans effet de bord. Les fichiers `.kproj` utilisent du JSON standard auto-documenté pouvant être partagé, sauvegardé et versionné sous Git.

7. **Pipeline d'exportation externe indépendant FFmpeg & Isolation Copyleft :**
   Pour respecter la licence GPL de FFmpeg et libx264, Kroma ne lie aucune bibliothèque binaire en mémoire. L'ensemble de la logique de composition est compilé sous forme d'un graphe déclaratif `-filter_complex` et exécuté via sous-processus indépendant CLI (`ffmpeg.exe`), garantissant la liberté du code source de Kroma Studio.

8. **Filtres d'étalonnage temps réel & Équivalence d'exportation :**
   Les réglages visuels (luminosité, contraste, saturation, teinte, flou) sont prévisualisés à 60 FPS sur le Canvas 2D via les filtres CSS (`ctx.filter`) et traduits sans perte dans le graphe d'exportation FFmpeg sous forme de filtres `eq`, `hue` et `gblur`.

9. **Vitesse variable continue & Décomposition multi-passes FFmpeg :**
   Le réglage de vitesse de lecture d'un clip (`playback_speed`, 0.25× à 4.0×) ajuste de manière continue le temps source sans modifier sa durée assignée sur la timeline. Pendant la lecture en temps réel, les éléments `<video>` et `<audio>` voient leur propriété `playbackRate` synchronisée instantanément avec compensation d'horloge matérielle. À l'exportation FFmpeg, la vitesse vidéo est redimensionnée par `trim` et `setpts=(PTS-STARTPTS)/speed+offset/TB`, et l'audio est étiré ou compressé via une décomposition multi-passes sécurisée du filtre `atempo` (en enchaînant des paliers bornés à $[0.5, 2.0]$).

10. **Transitions visuelles non-destructives & Composition multi-formats :**
    Les transitions entre clips (fondu enchaîné, fondu au noir, flash blanc, balayage gauche) sont déclarées sur le clip entrant (`transition_in`), permettant une interpolation continue sans nécessiter d'empilement complexe de pistes. Le moteur Canvas 2D applique les masques de découpe géométrique (`ctx.clip()`) ou les rampes de transparence en temps réel à 60 FPS, et le générateur FFmpeg compile ces effets en filtres `fade` RGBA avec activation d'opacité ou voiles colorés.

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

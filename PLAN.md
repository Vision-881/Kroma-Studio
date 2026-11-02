# Plan de développement — Kroma Studio

Ce document consigne l'avancement du projet, la feuille de route du MVP, les étapes réalisées, en cours et à venir, ainsi que les décisions d'architecture prises au fil du développement.

---

## 1. Feuille de route du MVP

| Étape | Intitulé | Statut | Description succincte |
|---|---|---|---|
| **Étape 0** | Socle technique & Types | ✅ Terminé | Initialisation Vite + React + TS, types stricts (`asset`, `timeline`, `project`), utilitaires temporels en microsecondes, 10 tests unitaires. |
| **Étape 1** | Import de médias & Médiathèque | ✅ Terminé | Panneau `MediaBin` avec drag & drop HTML5, sélecteur de fichiers, extraction de métadonnées et vignettes via le navigateur, store Zustand `projectStore`. |
| **Étape 2** | Timeline multipiste | ⬜ À faire | Pistes visuelles, audio et texte ; dépôt de clips depuis la médiathèque, déplacement, découpe (split), trim/redimensionnement, suppression. |
| **Étape 3** | Lecteur d'aperçu & Tête de lecture | ⬜ À faire | Tête de lecture synchronisée avec curseur temporel, rendu via `<video>` et `<canvas>`, boucle de lecture Play/Pause, affichage timecode SMPTE. |
| **Étape 4** | Superposition de texte | ⬜ À faire | Piste de titres/textes, personnalisation (police, taille, couleur, positionnement à l'écran, opacité). |
| **Étape 5** | Mixage & Contrôle du volume | ⬜ À faire | Gestion du gain/volume par piste et par clip, fonction mute / solo. |
| **Étape 6** | Historique Annuler / Rétablir & Persistance | ⬜ À faire | Pile Undo/Redo complète sur les actions de timeline, sauvegarde et ouverture de projets `.kproj` en JSON. |
| **Étape 7** | Export MP4 via FFmpeg | ⬜ À faire | Génération de la commande FFmpeg (filtres de concaténation et overlays) et lancement en sous-processus externe avec sélection de résolution et débit. |

---

## 2. Décisions d'architecture

### 2.1 Représentation temporelle en microsecondes entières (`us`)
- **Décision :** Toutes les durées, points d'entrée/sortie (`source_in_point_us`), durées de lecture (`play_duration_us`) et positions sur la timeline (`placement_time_us`) sont stockés sous forme d'entiers 64 bits en microsecondes ($1\,\text{s} = 1\,000\,000\,\mu\text{s}$).
- **Justification :** Évite définitivement les erreurs d'accumulation de virgule flottante (`0.1 + 0.2 !== 0.3`) qui désynchronisent l'audio et la vidéo sur les montages longs. Permet une conversion exacte vers n'importe quelle cadence d'images (24, 25, 30, 59.94, 60 fps).

### 2.2 Séparation stricte entre Catalogue de médias et Séquence de montage
- **Décision :** Les fichiers importés sont référencés dans `asset_catalog[]`. Les éléments de la timeline (`sequence.lanes[].items[]`) ne contiennent aucune donnée brute mais uniquement une référence `referenced_asset_id` vers l'asset source.
- **Justification :** Modèle non destructif. Un même fichier peut être découpé et inséré à 10 endroits différents de la timeline sans dupliquer la mémoire ni modifier le fichier source original.

### 2.3 Analyse préliminaire des médias côté client (Browser-native probe)
- **Décision :** À l'étape 1, l'extraction de métadonnées (durée, résolution) et la capture de vignettes sont réalisées directement via les API standards du navigateur (`<video>`, `<audio>`, `Image`, `CanvasRenderingContext2D`).
- **Justification :** Permet une exécution instantanée et réactive sans dépendance système immédiate lors du prototypage de l'interface. FFmpeg sera sollicité en sous-processus externe pour l'export et les formats vidéo non pris en charge nativement par le moteur web.

### 2.4 Isolation du processus FFmpeg
- **Décision :** FFmpeg ne sera jamais lié statiquement ou dynamiquement à la mémoire de l'application, mais invoqué strictement comme un exécutable indépendant en ligne de commande (CLI subprocess).
- **Justification :** Respect strict des licences (GPL v2+ / LGPL) pour garantir l'absence de contamination copyleft sur le code propriétaire de l'éditeur vidéo.

---

## 3. Historique des étapes

### Étape 0 & Étape 1 — Socle technique & Import de médias (02/11/2026)
- Initialisation du projet Vite avec React 19 et TypeScript.
- Création du modèle de données :
  - `src/core/types/asset.ts` : interface `MediaAsset` et type `MediaKind`.
  - `src/core/types/timeline.ts` : structures de pistes (`TimelineLane`), de clips (`TimelineItem`) et transformations géométriques.
  - `src/core/types/project.ts` : structure complète du projet Kroma (`KromaProject`) et fonction `createDefaultProject()`.
- Implémentation des utilitaires temporels `src/core/time/timeUtils.ts` (conversions secondes, microsecondes, images/frames et timecode SMPTE HH:MM:SS:FF).
- Implémentation de `src/core/media/mediaProbe.ts` pour analyser les fichiers vidéo, audio et images dans le navigateur.
- Création du store d'état global Zustand `src/store/projectStore.ts`.
- Création du composant d'interface `src/components/media/MediaBin.tsx` (glisser-déposer, sélecteur de fichiers, miniatures, suppression, badge de durée et résolution).
- Intégration dans le shell d'application sombre `src/App.tsx` et styles complets `src/index.css`.
- Validation par 10 tests unitaires réussis (`vitest`) et compilation TypeScript/Vite sans erreur (`tsc -b && vite build`).

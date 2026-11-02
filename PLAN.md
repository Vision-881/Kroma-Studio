# Plan de développement — Kroma Studio

Ce document consigne l'avancement du projet, la feuille de route du MVP, les étapes réalisées, en cours et à venir, ainsi que les décisions d'architecture prises au fil du développement.

Dernière mise à jour : 02/11/2026 (Étape 4 du MVP)

---

## 1. Feuille de route du MVP

| Étape | Intitulé | Statut | Description succincte |
|---|---|---|---|
| **Étape 0** | Socle technique & Types | ✅ Terminé | Initialisation Vite + React + TS, types stricts (`asset`, `timeline`, `project`), utilitaires temporels en microsecondes, 10 tests unitaires. |
| **Étape 1** | Import de médias & Médiathèque | ✅ Terminé | Panneau `MediaBin` avec drag & drop HTML5, sélecteur de fichiers, extraction de métadonnées et vignettes via le navigateur, store Zustand `projectStore`. |
| **Étape 2** | Timeline multipiste & Ergonomie CapCut | ✅ Terminé | Disposition 4 quadrants style CapCut Desktop, réglette graduée dynamique, zoom temporel, déplacement de clips, découpe (outil Rasoir/Split), rognage (Trim handles), suppression, drag & drop depuis la médiathèque, panneau Inspecteur/Propriétés. |
| **Étape 3** | Lecteur d'aperçu temps réel synchronisé | ✅ Terminé | Moteur de rendu `<canvas>` 16:9 haute performance alimenté par les flux réels (`<video>`, `<audio>`, `<img>`), synchronisation à la frame près sous la tête de lecture, registre de session multimédia `mediaSession`, lecture Play/Pause 60 FPS (raccourci Espace), 21 tests unitaires. |
| **Étape 4** | Superposition de texte | ✅ Terminé | Calques textes riches sur piste `text_overlay` dédiée, éditeur complet (police, taille, gras, couleur remplissage/contour, alignement, position X/Y), rendu Canvas natif avec `normalized_center`, 27 tests unitaires. |
| **Étape 5** | Mixage & Contrôle du volume | ⬜ À faire | Gestion fine du gain audio, automation/fondu, fonction mute / solo par piste. |
| **Étape 6** | Historique Annuler / Rétablir & Persistance | ⬜ À faire | Pile Undo/Redo complète sur les actions de timeline, sauvegarde et ouverture de projets `.kproj` en JSON via dialogue de fichiers. |
| **Étape 7** | Export MP4 via FFmpeg | ⬜ À faire | Génération de la commande de filtre complexe FFmpeg et exécution en sous-processus externe indépendant. |

---

## 2. Décisions d'architecture

### 2.1 Représentation temporelle en microsecondes entières (`us`)
- **Décision :** Toutes les durées, points d'entrée/sortie (`source_in_point_us`), durées de lecture (`play_duration_us`) et positions sur la timeline (`placement_time_us`) sont stockés sous forme d'entiers 64 bits en microsecondes ($1\,\text{s} = 1\,000\,000\,\mu\text{s}$).
- **Justification :** Évite définitivement les erreurs d'accumulation de virgule flottante qui désynchronisent l'audio et la vidéo sur les montages longs.

### 2.2 Séparation stricte entre Catalogue de médias et Séquence de montage
- **Décision :** Les fichiers importés sont référencés dans `asset_catalog[]`. Les éléments de la timeline (`sequence.lanes[].items[]`) ne contiennent aucune donnée brute mais uniquement une référence `referenced_asset_id` vers l'asset source.
- **Justification :** Modèle non destructif. Un même fichier peut être découpé et inséré à 10 endroits différents de la timeline sans dupliquer la mémoire ni modifier le fichier source original.

### 2.3 Rendu composite temps réel sur Canvas HTML5 (`playbackEngine`)
- **Décision :** Le lecteur central n'affiche pas une simple balise statique, mais recompose dynamiquement l'image sur un élément `<canvas>` 1920x1080.
- **Justification :** Permet la superposition instantanée multi-couches (titres au-dessus de la vidéo, logos, incrustations) et l'application immédiate des transformations géométriques 2D (échelle/zoom, rotation, opacité) configurées dans le panneau Inspecteur.

### 2.4 Registre de session multimédia (`mediaSession`)
- **Décision :** Un gestionnaire singleton `MediaSessionManager` maintient en mémoire les `ObjectURL` et les instances d'éléments `<video>` et `<audio>`.
- **Justification :** Évite de réinstancier des éléments DOM multimédias coûteux à chaque déplacement de la tête de lecture. Assure une lecture fluide et réactive sans latence d'initialisation.

### 2.5 Synchronisation adaptative à seuil de tolérance
- **Décision :** Lors de la lecture continue, `video.currentTime` n'est réajusté que si l'écart dépasse un seuil de 50 millisecondes (environ 1.5 frame à 30 fps).
- **Justification :** Évite les micro-saccades causées par des appels répétitifs à la méthode de seek du décodeur natif du navigateur, tout en garantissant un calage rigoureux lors des sauts ou du scrubbing manuel.

### 2.6 Positionnement normalisé des calques texte (`normalized_center`)
- **Décision :** La position d'un calque texte est stockée sous forme de ratios `x_ratio` / `y_ratio` entre 0.0 et 1.0 relatifs aux dimensions du canevas, plutôt qu'en pixels absolus.
- **Justification :** Le positionnement normalisé est indépendant de la résolution du canevas (1080p, 4K, 720p…). Un texte positionné à `{x: 0.5, y: 0.8}` sera toujours centré horizontalement à 80 % de la hauteur quelle que soit la résolution de sortie choisie.

---

## 3. Historique des étapes

### Étape 0 & Étape 1 — Socle technique & Import de médias (02/11/2026)
- Initialisation Vite, React 19, TypeScript strict.
- Modèle de données complet : `asset.ts`, `timeline.ts`, `project.ts`.
- Moteur temporel `timeUtils.ts` et analyseur navigateur `mediaProbe.ts`.
- Panneau `MediaBin` avec import drag & drop et extraction de vignettes.

### Étape 2 — Timeline multipiste & Ergonomie CapCut (02/11/2026)
- Implémentation du moteur de manipulation de timeline `src/core/timeline/timelineOps.ts`.
- Suite de tests unitaires `timelineOps.test.ts`.
- Conception des 4 quadrants style CapCut : `MediaBin`, `PreviewMonitor`, `InspectorPanel`, `Timeline`.
- Poignées de rognage interactives (Trim handles), outil Rasoir (Split), drag & drop d'assets vers les pistes.

### Étape 3 — Lecteur d'aperçu temps réel synchronisé (02/11/2026)
- Implémentation de `src/core/playback/playbackEngine.ts` (calcul des couches visuelles et audios actives à l'instant T).
- Tests unitaires `playbackEngine.test.ts` validés.
- Implémentation du registre de session `src/core/media/mediaSession.ts`.
- Intégration du composant de rendu vidéo complet `PreviewMonitor.tsx` avec `<canvas>` composite 16:9, gestion des transformations (échelle, rotation, opacité), synchro vidéo/audio native et raccourci universel Play/Pause (barre d'espace).

### Étape 4 — Superposition de texte (02/11/2026)
- **Logique métier :** `createTextItem()` dans `timelineOps.ts`, `addTextItem()` et `updateTextLayerData()` dans `projectStore.ts`.
- **Composant :** `src/components/text/TextEditor.tsx` — éditeur texte complet style CapCut avec contrôles : contenu (textarea), police (select), taille (slider), gras (toggle), alignement (3 boutons), couleur de remplissage et de contour (color pickers), épaisseur du contour (slider), position X/Y normalisée (2 sliders), aperçu typographique live.
- **Intégration :** `InspectorPanel.tsx` — détection automatique des calques texte et bascule vers `TextEditor` ; `TimelineToolbar.tsx` — bouton "Texte" (icône T) pour insérer un calque texte à la tête de lecture.
- **Rendu Canvas :** `PreviewMonitor.tsx` — rendu texte tenant compte de `normalized_center` (position absolue sur canvas), contour `lineJoin: round`, police scalée ×2 pour la haute résolution.
- **Styles :** `src/styles/text-editor.css` — 27 règles CSS dédiées au panneau TextEditor.
- **Tests :** 27 tests unitaires (9 dans `timelineOps.test.ts`, 9 dans `projectStore.test.ts`), tous ✅.


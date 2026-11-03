# Plan de développement — Kroma Studio

Ce document consigne l'avancement du projet, la feuille de route du MVP, les étapes réalisées, en cours et à venir, ainsi que les décisions d'architecture prises au fil du développement.

Dernière mise à jour : 03/11/2026 (Phase 2 — Étape 8 : Étalonnage & Filtres Visuels)

---

## 1. Feuille de route du MVP & Extensions

| Étape | Intitulé | Statut | Description succincte |
|---|---|---|---|
| **Étape 0** | Socle technique & Types | ✅ Terminé | Initialisation Vite + React + TS, types stricts (`asset`, `timeline`, `project`), utilitaires temporels en microsecondes, 10 tests unitaires. |
| **Étape 1** | Import de médias & Médiathèque | ✅ Terminé | Panneau `MediaBin` avec drag & drop HTML5, sélecteur de fichiers, extraction de métadonnées et vignettes via le navigateur, store Zustand `projectStore`. |
| **Étape 2** | Timeline multipiste & Ergonomie CapCut | ✅ Terminé | Disposition 4 quadrants style CapCut Desktop, réglette graduée dynamique, zoom temporel, déplacement de clips, découpe (outil Rasoir/Split), rognage (Trim handles), suppression, drag & drop depuis la médiathèque, panneau Inspecteur/Propriétés. |
| **Étape 3** | Lecteur d'aperçu temps réel synchronisé | ✅ Terminé | Moteur de rendu `<canvas>` 16:9 haute performance alimenté par les flux réels (`<video>`, `<audio>`, `<img>`), synchronisation à la frame près sous la tête de lecture, registre de session multimédia `mediaSession`, lecture Play/Pause 60 FPS (raccourci Espace), 21 tests unitaires. |
| **Étape 4** | Superposition de texte | ✅ Terminé | Calques textes riches sur piste `text_overlay` dédiée, éditeur complet (police, taille, gras, couleur remplissage/contour, alignement, position X/Y), rendu Canvas natif avec `normalized_center`, 27 tests unitaires. |
| **Étape 5** | Mixage & Contrôle du volume | ✅ Terminé | Contrôle de gain par clip et par piste (0% à 200%), mode Solo / Mute avancé avec isolation, fondus d'entrée (Fade In) et de sortie (Fade Out) continus, formes d'ondes audio (Waveforms) sur clips, 36 tests unitaires. |
| **Étape 6** | Historique Annuler / Rétablir & Persistance | ✅ Terminé | Pile Undo/Redo complète (50 états, `Ctrl+Z` / `Ctrl+Y`), sérialisation et chargement de fichiers `.kproj` avec validation de schéma, 41 tests unitaires. |
| **Étape 7** | Export MP4 via FFmpeg | ✅ Terminé | Génération de commande CLI FFmpeg, graphe filtre complexe (`trim`, `contain/pad`, `overlay`, `drawtext`, `adelay`, `afade`, `amix`), modal `ExportDialog`, scripts autonomes `.bat` et `.sh`, raccourci `Ctrl+E`, 52 tests unitaires. |
| **Étape 8** | Étalonnage Couleur & Réglages Visuels | ✅ Terminé | Section Inspecteur (Luminosité, Contraste, Saturation, Teinte, Flou), aperçu Canvas 2D temps réel 60 FPS (`ctx.filter`), export FFmpeg (`eq`, `hue`, `gblur`), actions Zustand avec Undo/Redo, 53 tests unitaires. |

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

### 2.7 Mixage sommateur pondéré et calcul continu des rampes de fondu
- **Décision :** Le gain effectif perçu à tout instant $t$ est le produit scalaire :
  $$\text{Gain}_{\text{effectif}}(t) = \text{Gain}_{\text{clip}} \times \text{Gain}_{\text{piste}} \times \text{FadeFactor}(t)$$
  où $\text{FadeFactor}(t)$ est évalué continûment selon les durées de fondu d'entrée (`fade_in_duration_us`) et de sortie (`fade_out_duration_us`).
- **Justification :** Permet un contrôle hiérarchique intuitif (équilibrage global d'une piste entière + micro-ajustement d'un clip particulier) et des transitions d'entrée/sortie ultra-douces sans craquement sonore (pop/click).

### 2.8 Historique immuable découplé de la navigation temporelle
- **Décision :** Seules les modifications structurelles du projet (ajouts/découpes/déplacements de clips, mixage, titrage, renommage) alimentent la pile `past[]` bornée à 50 états. Le scrubbing temporel, la sélection d'outils et le zoom n'enregistrent aucun état d'historique.
- **Justification :** Évite de saturer la mémoire et permet à `Ctrl+Z` de revenir fidèlement à l'action de montage précédente sans polluer la pile par des centaines d'états de simple consultation.

### 2.9 Pipeline d'exportation externe indépendant FFmpeg & Isolation Copyleft
- **Décision :** Kroma Studio compile l'ensemble de la timeline en un graphe déclaratif de filtres FFmpeg complexes (`-filter_complex`) et génère des commandes CLI / scripts exécutables autonomes (`.bat` pour Windows, `.sh` pour Linux/macOS) plutôt que de lier des bibliothèques C/C++ ou DLLs GPL en mémoire.
- **Justification :** Respect strict des obligations de la licence GPL v2+/v3 de FFmpeg (`libx264`/`libx265`). L'isolation via sous-processus (« fork and exec ») protège la liberté et la propriété intellectuelle du code source de Kroma tout en exploitant la pleine accélération matérielle native de la machine hôte.

### 2.10 Rendu temps réel des filtres de couleur via Canvas 2D filter et équivalence FFmpeg
- **Décision :** L'étalonnage et les filtres visuels (luminosité, contraste, saturation, teinte, flou) exploitent la propriété native `ctx.filter` du Canvas 2D pour l'aperçu temps réel à 60 FPS sans shader lourd, et se traduisent directement en filtres vidéo normalisés FFmpeg (`eq`, `hue`, `gblur`) lors de l'exportation.
- **Justification :** Performance maximale dans le navigateur, absence totale de latence lors de la manipulation des curseurs et cohérence colorimétrique exacte entre la prévisualisation et le rendu MP4 final.

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
- **Tests :** 27 tests unitaires, tous ✅.

### Étape 5 — Mixage & Contrôle du volume (03/11/2026)
- **Modèle :** `fade_in_duration_us` et `fade_out_duration_us` sur `TimelineItem` ; `is_solo` et `gain_level` sur `TimelineLane`.
- **Moteur audio DSP :** Fonction `calculateFadeGain()` dans `playbackEngine.ts` pour évaluer les rampes de volume à la microseconde près. Gestion de l'isolation Solo (isole la/les pistes Solo et coupe les autres).
- **Store Zustand :** Actions `toggleLaneSolo`, `updateLaneGain` (0% à 200%), `updateClipFade` (Fade in / Fade out).
- **Interface Timeline :** Bouton Solo [S] doré dans `TimelineTrackHeader`, curseur de volume de piste intégré avec badge dynamique, indicateur visuel d'atténuation sur les pistes masquées par le Solo.
- **Formes d'onde & Pentes de fondu :** Composant `AudioWaveform.tsx` avec modélisation harmonique pour les clips audio et vidéo, et superpositions SVG de pentes de volume sur la timeline lors des fondus.
- **Panneau Inspecteur :** Section Audio enrichie avec curseurs Fade In (0.0s à 5.0s), Fade Out (0.0s à 5.0s) et visualisation SVG de la courbe d'enveloppe sonore.
- **Tests :** 36 tests unitaires automatisés (8 dans `playbackEngine.test.ts`, 12 dans `projectStore.test.ts`), tous ✅.

### Étape 6 — Historique Annuler / Rétablir & Persistance (.kproj) (03/11/2026)
- **Historique Undo / Redo :** Piles `past[]` et `future[]` avec plafond à 50 états. Actions `undo()`, `redo()`, indicateurs booléens `canUndo`, `canRedo`.
- **Raccourcis clavier universels :** `Ctrl+Z` (Annuler), `Ctrl+Y` ou `Ctrl+Maj+Z` (Rétablir), `Ctrl+S` (Enregistrer).
- **Gestion de fichiers `.kproj` :** Fonctions `saveProjectToFile()` (téléchargement JSON Blob formaté), `loadProjectFromJson()` (parseur et validateur de schéma KromaProject) et `createNewProject()`.
- **Interface utilisateur :** Boutons Nouveau, Ouvrir, Enregistrer, Annuler et Rétablir intégrés dans `Header.tsx` et dans `TimelineToolbar.tsx`.
- **Support imprimable :** Conception du flyer A4 officiel imprimable `docs/FLYER_A4.html` (dimensions exactes 210×297mm, stylisme 4 quadrants et fiche technique).
- **Tests :** 41 tests unitaires validés (5 tests complets ajoutés pour l'historique et la persistance).

### Étape 7 — Export MP4 via FFmpeg (03/11/2026)
- **Générateur de commandes FFmpeg :** Implémentation complète de `src/core/export/ffmpegCommandBuilder.ts`.
  - Analyse du catalogue de médias et détection des réutilisations multiples avec allocation automatique de filtres `split` et `asplit`.
  - Construction du canevas de base à cadence nominale (`color=c=0x...:s=...:r=...:d=...`).
  - Découpe (`trim`), calage temporel de présentation (`setpts=PTS-STARTPTS+T/TB`), adaptation de ratio d'aspect (`contain/pad`) et composition d'overlays multi-couches ordonnés par `stack_index`.
  - Prise en charge des transformations spatiales 2D : zoom (`scale=iw*...`), rotation angulaire (`rotate=...`) et transparence (`colorchannelmixer=aa=...`).
  - Rendu typographique `drawtext` avec positionnement normalisé (`normalized_center`), contours d'accentuation (`borderw`/`bordercolor`) et échappement sécurisé des caractères sensibles.
  - Mixage audio DSP complet : découpe temporelle (`atrim`), mise à l'échelle du gain effectif (`volume`), rampes de fondu (`afade in/out`), retard temporel multipiste (`adelay`) et multiplexage `amix` (ou génération de silence `anullsrc`).
  - Assemblage de commande CLI optimisée avec `-c:v libx264`, `-preset`, `-crf`, `-pix_fmt yuv420p` et conteneur MP4 `-movflags +faststart`.
- **Générateurs de scripts autonomes :** Fonctions `generateWindowsBatch()` (`.bat` avec encodage UTF-8 et vérification de `where ffmpeg`) et `generateBashScript()` (`.sh` avec `command -v ffmpeg`).
- **Composant IHM :** `src/components/export/ExportDialog.tsx` avec sélecteurs de préréglages (1080p, 720p, 4K, personnalisé avec largeur/hauteur/FPS sur mesure), réglages fins d'encodage (H.264/HEVC, profils de vitesse, CRF, débit audio AAC), fiche technique SMPTE, prévisualisation interactive de la commande (PowerShell, Bash, filtre complexe), copie en un clic et téléchargement instantané des scripts `.bat` et `.sh`.
- **Intégration globale :** Bouton vert **« Exporter »** dans `Header.tsx`, raccourci universel `Ctrl+E` dans `PreviewMonitor.tsx`, gestion d'état dans `projectStore.ts`.
- **Tests unitaires :** 10 nouveaux tests unitaires automatisés validés dans `ffmpegCommandBuilder.test.ts` et 1 test dans `projectStore.test.ts`. Suite complète portée à **52 tests unitaires validés (100% succès)**.
- **Statut MVP :** Les 7 étapes du MVP sont désormais **100 % terminées**.

### Étape 8 — Étalonnage Couleur & Réglages Visuels (03/11/2026)
- **Modèle de données :** Interface `ColorAdjustments` dans `src/core/types/timeline.ts` (luminosité, contraste, saturation, température, rotation de teinte `hue_degrees`, flou gaussien `blur_px`).
- **Gestion d'état Zustand :** Actions `updateClipColorAdjustments(itemId, updates)` et `resetClipColorAdjustments(itemId)` dans `src/store/projectStore.ts`, avec intégration complète à l'historique Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).
- **Rendu Canvas 2D en temps réel :** Implémentation de `ctx.filter` dans `PreviewMonitor.tsx` appliquant dynamiquement `brightness()`, `contrast()`, `saturate()`, `hue-rotate()` et `blur()` à 60 FPS sans latence.
- **Pipeline d'exportation FFmpeg :** Intégration transparente dans `ffmpegCommandBuilder.ts` avec filtres `eq` (brightness, contrast, saturation), `hue` (h=degrees) et `gblur` (sigma=blur).
- **Interface Inspecteur CapCut :** Nouvelle section « Réglages & Étalonnage » dans `InspectorPanel.tsx` avec sliders interactifs et bouton de réinitialisation rapide.
- **Tests unitaires :** Nouveaux tests ajoutés dans `projectStore.test.ts` et `ffmpegCommandBuilder.test.ts`. Suite complète portée à **53 tests unitaires validés (100% succès)**.


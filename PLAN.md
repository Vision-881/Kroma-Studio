# Plan de développement — Kroma Studio

Ce document consigne l'avancement du projet, la feuille de route du MVP, les étapes réalisées, en cours et à venir, ainsi que les décisions d'architecture prises au fil du développement.

Dernière mise à jour : 03/11/2026 (Phase 2 — Étape 11 : Effets Vidéo, Filtres FX & Miroir H/V)

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
| **Étape 9** | Vitesse Variable & Ralenti / Accéléré | ✅ Terminé | Vitesse de lecture par clip (0.25× à 4.0×), calcul temporel source exact, prévisualisation fluide via `video.playbackRate`/`audio.playbackRate`, adaptation d'horloge matérielle, filtres FFmpeg `setpts` et `atempo` chaîné, section Inspecteur, 57 tests unitaires. |
| **Étape 10** | Transitions Visuelles entre clips | ✅ Terminé | Transitions d'entrée vidéo (Fondu enchaîné / crossfade, Fondu au noir / fade_to_black, Flash blanc / dip_to_white, Balayage gauche / wipe_left), durée réglable (0.1s à 5.0s), badge violet sur la timeline, rendu Canvas 2D temps réel 60 FPS, export FFmpeg avec filtre `fade` et alpha overlay, 60 tests unitaires. |
| **Étape 11** | Effets Vidéo, Filtres FX & Miroir H/V | ✅ Terminé | Inversion miroir horizontale/verticale (`hflip`, `vflip`), filtres artistiques (Monochrome, Sépia, Argentique vintage, Négatif, Vignetage cinéma réglable), Canvas 2D 60 FPS, export FFmpeg, section Inspecteur, badge rose sur la timeline, 63 tests unitaires. |

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

### 2.11 Étalement temporel continu et chaînage de vitesse FFmpeg (setpts & atempo)
- **Décision :** La vitesse variable d'un clip (`playback_speed`, de 0.25× à 4.0×) est appliquée de manière continue : la durée du segment sur la timeline (`play_duration_us`) reste la durée perçue par l'utilisateur, tandis que la quantité de média source consommée est proportionnelle à la vitesse ($\Delta t_{\text{source}} = \Delta t_{\text{timeline}} \times \text{speed}$). Côté export FFmpeg, la vitesse vidéo est ajustée via `trim` de durée source suivi de `setpts=(PTS-STARTPTS)/speed+offset/TB`, et l'audio est adapté via découpage source puis chaînage décomposé du filtre `atempo` (en bornant chaque palier entre 0.5 et 2.0).
- **Justification :** Évite toute désynchronisation audio/vidéo lors de l'accélération ou du ralenti, conserve une granularité temporelle précise en microsecondes et surmonte la limitation stricte du filtre `atempo` de FFmpeg qui n'accepte nativement que les facteurs entre 0.5 et 2.0.

### 2.12 Transitions visuelles non-destructives et composition alpha multi-formats
- **Décision :** La transition est modélisée par `transition_in` sur le clip entrant (`transition_type` et `duration_us`). Pendant la fenêtre de transition $[T_{\text{in}}, T_{\text{in}} + \Delta_{\text{trans}}[$, le lecteur Canvas 2D calcule le ratio de progression $p \in [0, 1]$ et compose la transformation d'opacité (`crossfade`), le masque géométrique dynamique (`wipe_left` via `ctx.rect` et `ctx.clip()`), ou les voiles colorés dégressifs (`fade_to_black`, `dip_to_white`). Côté export FFmpeg, le filtre `fade=t=in:st=...:d=...` est appliqué avec `alpha=1` ou `color=black`/`color=white` sur le flux RGBA/YUV découpé avant son insertion dans le canevas de base.
- **Justification :** Permet des transitions fluides sans nécessiter de chevauchement complexe de pistes ou de découpage destructif des clips voisins, tout en garantissant une fidélité visuelle parfaite entre l'aperçu dynamique à 60 FPS et le rendu final FFmpeg.

### 2.13 Effets artistiques, symétrie miroir et matrices de convolution FFmpeg
- **Décision :** La symétrie spatiale (`flip_horizontal`, `flip_vertical`) est encapsulée directement dans `spatial_placement` et exécutée via inversion de signe d'échelle (`scale(-1, 1)` / `scale(1, -1)`). Les filtres créatifs (`video_effects`) combinent les filtres CSS Canvas natifs (`grayscale`, `sepia`, `invert`), un dégradé radial d'assombrissement pour le vignettage focal, et sont traduits fidèlement dans FFmpeg via `hflip`, `vflip`, `hue=s=0`, `colorchannelmixer`, `curves=vintage`, `negate` et `vignette`.
- **Justification :** Offre aux créateurs de contenu les outils essentiels de stylisation visuelle et de correction d'orientation de rushs sans alourdir le moteur ni introduire de dépendance externe.

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

### Étape 9 — Vitesse Variable & Ralenti / Accéléré (03/11/2026)
- **Modèle de données :** Propriété `playback_speed?: number` sur `TimelineItem` dans `src/core/types/timeline.ts` (facteur flottant de 0.25× à 4.0×, 1.0 par défaut).
- **Moteur temporel source :** Mise à jour de `calculateSourceTimeUs()` dans `src/core/playback/playbackEngine.ts` pour calculer la position de source proportionnellement au facteur de vitesse : $\text{SourceTime} = \text{InPoint} + \text{Offset} \times \text{speed}$.
- **Store Zustand & Undo/Redo :** Action `updateClipSpeed(itemId, speed)` avec bornage automatique $[0.25, 4.0]$, push dans l'historique `past[]` et prise en charge intégrale de `Ctrl+Z` et `Ctrl+Y`.
- **Prévisualisation temps réel fluide :** Synchronisation de `video.playbackRate` et `audio.playbackRate` dans `PreviewMonitor.tsx`, et adaptation de l'horloge matérielle vidéo (`elapsedSinceInPoint / speed`) pour éliminer tout clignotement ou décalage lors de la lecture.
- **Pipeline d'exportation FFmpeg :** Calcul dynamique de la durée de source découpée (`durationSec * speed`), accélération/ralenti vidéo via `setpts=(PTS-STARTPTS)/speed+offset/TB`, et chaînage audio transparent via la nouvelle fonction utilitaire exportée `buildAtempoFilter()` (décomposition sécurisée en multi-passes `atempo=2.0` ou `atempo=0.5`).
- **Panneau Inspecteur :** Nouvelle section « Vitesse de lecture » avec slider continu 0.25× à 4.0×, affichage dynamique de la vitesse avec mise en surbrillance ambre et bouton de réinitialisation instantanée « 1× » (icône `Gauge` + `RotateCcw`).
- **Tests unitaires :** 4 nouveaux tests unitaires automatisés ajoutés dans `playbackEngine.test.ts`, `projectStore.test.ts` et `ffmpegCommandBuilder.test.ts`. Suite complète portée à **57 tests unitaires validés (100% succès)**.

### Étape 10 — Transitions Visuelles entre clips (03/11/2026)
- **Modèle de données :** Définition de `TransitionType` (`none`, `crossfade`, `fade_to_black`, `dip_to_white`, `wipe_left`), de l'interface `TransitionData` (`transition_type`, `duration_us`) et ajout du champ optionnel `transition_in?: TransitionData` sur `TimelineItem` dans `src/core/types/timeline.ts`.
- **Gestion d'état Zustand & Historique :** Action `updateClipTransition(itemId, transition, commitHistory)` dans `src/store/projectStore.ts` avec prise en charge du lissage de glisser via `pushHistorySnapshot()` et compatibilité totale Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).
- **Rendu temps réel 60 FPS (Canvas 2D) :** Implémentation du moteur de transition dans `PreviewMonitor.tsx` :
  - *Fondu enchaîné (Crossfade) :* Rampe linéaire de transparence `baseAlpha *= transitionProgress`.
  - *Balayage gauche (Wipe left) :* Découpe rectangulaire dynamique avec `ctx.beginPath()`, `ctx.rect()` et `ctx.clip()` progressant de droite à gauche.
  - *Fondu au noir (Fade to black) :* Voile d'obscurcissement noir dégressif superposé avec opacité $1 - p$.
  - *Flash blanc (Dip to white) :* Flash lumineux blanc dégressif superposé avec opacité $1 - p$.
- **Pipeline d'exportation FFmpeg :** Intégration déclarative dans `ffmpegCommandBuilder.ts` générant automatiquement les filtres de fondu calibrés à la milliseconde près : `format=rgba,fade=t=in:st=...:d=...:alpha=1` pour le fondu enchaîné et le balayage, `fade=...:color=black` pour le fondu au noir, et `fade=...:color=white` pour le fondu au blanc.
- **Interface Inspecteur CapCut :** Section « Transition d'entrée » dans `InspectorPanel.tsx` avec sélecteur d'effets visuels stylisé (icônes `Sparkles`, `RotateCcw`), slider de durée interactif (0.2s à 3.0s) et réinitialisation rapide.
- **Visualisation Timeline :** Indicateur visuel sur les clips de la timeline (`TimelineClip.tsx`) composé d'un dégradé violet d'entrée et d'un badge distinctif (`✨ Fondu`, `✨ Noir`, `✨ Flash`, `✨ Wipe`).
- **Tests unitaires :** Nouveaux tests automatisés dans `projectStore.test.ts` et `ffmpegCommandBuilder.test.ts`. Suite complète portée à **60 tests unitaires validés (100% succès)**.

### Étape 11 — Effets Vidéo, Filtres FX & Miroir H/V (03/11/2026)
- **Modèle de données :** Ajout de `flip_horizontal?: boolean` et `flip_vertical?: boolean` dans `SpatialPlacement`, définition de `VideoEffectPreset` (`none`, `monochrome`, `sepia`, `vintage`, `invert`, `vignette`), interface `VideoEffects` et ajout de `video_effects?: VideoEffects` sur `TimelineItem` dans `src/core/types/timeline.ts`.
- **Gestion d'état Zustand & Historique :** Actions `toggleClipFlipHorizontal(itemId)`, `toggleClipFlipVertical(itemId)` et `updateClipEffects(itemId, effects, commitHistory)` dans `src/store/projectStore.ts` avec prise en charge totale Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).
- **Rendu temps réel Canvas 2D (60 FPS) :**
  - Application géométrique instantanée de la symétrie miroir : `ctx.scale(zoomX * (flipH ? -1 : 1), zoomY * (flipV ? -1 : 1))`.
  - Application des filtres CSS natifs : `grayscale(100%)`, `sepia(90%)`, `invert(100%)`, `sepia(45%) contrast(115%)`.
  - Rendu du vignettage cinéma via un dégradé radial d'assombrissement dégressif centré sur le clip.
- **Pipeline d'exportation FFmpeg :** Génération automatique des filtres FFmpeg correspondants dans `ffmpegCommandBuilder.ts` : `hflip`, `vflip`, `hue=s=0` (N&B), `colorchannelmixer` (Sépia rétro), `curves=vintage` (Argentique), `negate` (Inversion) et `vignette` (Obscurcissement focal).
- **Interface Inspecteur CapCut :**
  - Boutons de bascule ergonomiques **Miroir H** (icône `FlipHorizontal`) et **Miroir V** (icône `FlipVertical`) avec mise en surbrillance indigo dans la section Transformation.
  - Nouvelle section **« Filtres & Effets FX »** (icône `Wand2`) avec sélecteur de style visuel, curseur d'intensité de vignettage et bouton de réinitialisation rapide.
- **Visualisation Timeline :** Badge informatif distinctif rose (`🪞 Miroir`, `↕️ Flip V`, `🪄 N&B`, `🪄 Sépia`, `🪄 Rétro`, `🪄 Négatif`, `🪄 Vignet.`) sur les clips concernés.
- **Tests unitaires :** Nouveaux tests automatisés dans `projectStore.test.ts` et `ffmpegCommandBuilder.test.ts`. Suite complète portée à **63 tests unitaires validés (100% succès)**.


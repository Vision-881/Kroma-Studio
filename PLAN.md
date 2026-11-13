# Plan de développement — Kroma Studio

Ce document consigne l'avancement du projet, la feuille de route du MVP, les étapes réalisées, en cours et à venir, ainsi que les décisions d'architecture prises au fil du développement.

Dernière mise à jour : 13/11/2026 (Phase 2 — Étape 17 : Aimantation Magnétique Intelligente (Smart Snapping) & Marqueurs Temporels terminée)

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
| **Étape 12** | Ratios de Canevas Multi-formats | ✅ Terminé | Sélecteur de ratio sous le moniteur (16:9 YouTube, 9:16 TikTok/Reels/Shorts, 1:1 Carré, 4:5 Portrait, 4:3 Standard, 21:9 Cinéma), recadrage automatique du Canvas CSS & 2D, repositionnement normalisé immédiat de tous les clips et textes, sélecteur synchronisé dans l'Inspecteur, boîte d'exportation FFmpeg pré-calibrée au format cible avec présélections dédiées, intégration Undo/Redo complète, 70 tests unitaires. |
| **Étape 13** | Effets dynamiques & Transitions CapCut | ✅ Terminé | Secousses dynamiques (X-Shake, Y-Shake, Caméra Shake), flashs stroboscopiques (Tremor Strobe, Strobe Blanc/Noir) avec curseurs d'intensité et de vitesse, transitions avancées (Zoom In/Out, Spin, Strobe Cut, Wipes multidirectionnels), badges distinctifs couleur sur timeline, aperçu Canvas 2D 60 FPS, export FFmpeg équivalent, intégration Undo/Redo, 75 tests unitaires. |
| **Étape 14** | Animation par Images-Clés (Keyframing) | ✅ Terminé | Modèle d'images-clés (`position_x`, `position_y`, `scale`, `rotation`, `opacity`), atténuations (linéaire, ease-in, ease-out, ease-in-out, hold), boutons losanges CapCut, navigation (`< `>`), déplacement interactif par glisser-déposer à la souris sur la timeline (drag & drop), bulle temporelle temps réel, rendu Canvas 2D 60 FPS, expressions FFmpeg continues (`scale=eval=frame`, `rotate`, `overlay`), Undo/Redo, 98 tests unitaires. |
| **Étape 15** | Incrustation Fond Vert (Chroma Key) | ✅ Terminé | Filtre de découpe chromatique par sélection de couleur cible (Green/Blue screen), tolérance, lissage des bords et suppression des reflets (spill reduction) temps réel Canvas 2D + export FFmpeg avec filtre natif `colorkey`, badge 🟢 Chroma, 11 tests unitaires. |
| **Étape 16** | Empilement & Rendu Multi-pistes Vidéo PiP (Picture-in-Picture) | ✅ Terminé | Composition multipiste simultanée, 6 masques géométriques vectoriels (rectangle arrondi, cercle, étoile, cœur, scission linéaire), contour progressif (feather), inversion, Canvas 2D 60 FPS, export FFmpeg `geq`, 7 tests unitaires. |
| **Étape 17** | Aimantation Magnétique Intelligente & Marqueurs Temporels | ✅ Terminé | Aimantation magnétique (Snapping) sur tête de lecture, coupes de clips et repères (raccourci `N`), guide visuel cyan en temps réel, pose de marqueurs temporels (raccourci `M`), fanions réglette avec popover d'édition, navigation `<` `>`, gestionnaire Inspecteur, Undo/Redo, 9 tests unitaires. |
| **Étape 18** | Gestionnaire de Sous-titres & Légendes (Subtitles Engine) | ✅ Terminé | Piste de sous-titres dédiée, parsing et export `.srt` / `.vtt`, éditeur séquentiel synchronisé avec timecodes In/Out, saut instantané, personnalisation typographique et boîte de fond protectrice, Canvas 2D 60 FPS multi-lignes, export FFmpeg drawtext burn-in, compatibilité 100% Web & Desktop App, 150 tests unitaires. |
| **Étape 19** | Scission Audio-Vidéo (Détacher l'Audio) & Extraction de Bande Son | 🔜 À venir | Séparation en un clic du flux audio d'un clip vidéo sur une piste audio dédiée (style CapCut « Extraire l'audio »), édition audio indépendante, ré-alignement automatique. |

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

### 2.14 Modélisation normalisée des ratios multi-formats et adaptation géométrique continue
- **Décision :** Le format de canevas est stocké dans `timeline_canvas` sous forme de dimensions natives en pixels (`viewport_width`, `viewport_height`) couplées à l'énumération `aspect_ratio` (`16:9`, `9:16`, `1:1`, `4:5`, `4:3`, `21:9`, `custom`). Lors du changement de format, la surface de rendu CSS du moniteur adapte dynamiquement sa propriété `aspectRatio`, tandis que le moteur de composition Canvas 2D applique une mise à l'échelle continue « contain » centrée :
  $$\text{Scale} = \min\left(\frac{W_{\text{canvas}}}{W_{\text{source}}}, \frac{H_{\text{canvas}}}{H_{\text{source}}}\right)$$
  Les calques de texte exploitent le système de coordonnées normalisées $\left(x_{\text{ratio}}, y_{\text{ratio}}\right) \in [0, 1]^2$, ce qui préserve automatiquement leur centrage et leur alignement relatif sans décalage. Côté export FFmpeg, le canevas de base et les filtres de scaling/padding (`scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2`) héritent directement des dimensions cibles de la composition, garantissant un rendu vidéo calibré au pixel près (1080×1920 pour mobile, 1080×1080 pour feed carré, etc.).
- **Justification :** Permet une transition instantanée sans perte entre formats horizontaux (YouTube), verticaux (TikTok / Reels / Shorts) et carrés (Instagram), avec prise en charge intégrale de l'historique Undo/Redo (`Ctrl+Z` / `Ctrl+Y`) et génération immédiate de scripts d'exportation FFmpeg optimisés.

---

### 2.15 Modélisation des effets oscillatoires et matrices stroboscopiques FFmpeg
- **Décision :** Les secousses dynamiques (`x_shake`, `y_shake`, `camera_shake`) et les stroboscopes (`tremor_strobe`, `strobe_white`, `strobe_black`) utilisent une évaluation périodique temporelle paramétrée par l'intensité ($I \in [0.1, 3.0]$) et la vitesse ($V \in [0.2, 5.0]$). Dans le Canvas 2D (`PreviewMonitor.tsx`), des déplacements oscillatoires $A \cdot \sin(\omega t)$ et modulations d'opacité sont appliqués frame par frame à 60 FPS. À l'exportation FFmpeg (`ffmpegCommandBuilder.ts`), les secousses sont synthétisées via des expressions `crop` oscillatoires (`crop=in_w-2*A:in_h:A+A*sin(2*PI*V*t):0,scale=in_w:in_h`) et les stroboscopes via `drawbox=color=white@...:t=fill:enable='mod(floor(t*V*12),2)'`. Les transitions avancées (`zoom_in`, `zoom_out`, `spin`, `strobe`, `wipe_right`, `wipe_up`, `wipe_down`) combinent homothéties dynamiques, matrices de rotation trigonométriques et masquages géométriques multi-axes.
- **Justification :** Reproduit fidèlement la vivacité des effets dynamiques populaires de CapCut Desktop tout en conservant une équivalence mathématique rigoureuse entre la prévisualisation dans le navigateur et le rendu natif sous FFmpeg.

### 2.16 Modélisation déclarative des images-clés et évaluation continue FFmpeg
- **Décision :** L'animation par images-clés est modélisée par l'interface `Keyframe<T>` (`id`, `time_offset_us`, `value`, `interpolation`) regroupée dans `item.keyframes` par propriété (`position_x`, `position_y`, `scale`, `rotation`, `opacity`). À la lecture, le moteur `getInterpolatedPlacement(item, timelineTimeUs)` évalue frame par frame la valeur interpolée exacte en appliquant la fonction d'atténuation (`linear`, `ease_in`, `ease_out`, `ease_in_out`, `hold`). À l'exportation FFmpeg, le générateur `buildFFmpegKeyframeExpr()` compile la trajectoire en une formule analytique par morceaux (`if(lt(t, t_i), ...)`) injectée dynamiquement dans les filtres `scale=eval=frame:w='iw*(...)':h='ih*(...)'`, `rotate='(...)*PI/180'` et `overlay=x='(W-w)/2+(...)':y='(H-h)/2+(...)'`.
- **Justification :** Offre un contrôle d'animation de niveau professionnel style CapCut sans rupture avec le modèle temporel en microsecondes entières, tout en assurant une prévisualisation ultra-fluide à 60 FPS et une fidélité mathématique rigoureuse lors du rendu MP4 sous FFmpeg sans perte de performance.

### 2.17 Algorithme de soustraction colorimétrique pour l'incrustation fond vert (Chroma Key)
- **Décision :** La soustraction du fond vert/bleu est calculée pixel par pixel dans l'espace colorimétrique RGB pondéré par distance euclidienne : $d = \sqrt{\Delta R^2 + \Delta G^2 + \Delta B^2} / \sqrt{3 \times 255^2}$. La similarité $S \in [0.01, 1.0]$ définit le seuil d'opacité nulle, et le lissage $B \in [0.0, 1.0]$ crée une rampe dégradée linéaire $\alpha = (d - S) / B$. La suppression des reflets (spill reduction) neutralise les teintes résiduelles en bornant le canal vert ou bleu par la moyenne des deux canaux adjacents. À l'exportation FFmpeg, l'équivalent natif ultra-rapide `colorkey=0x{hex}:{similarity}:{blend}` est inséré dans le graphe de filtres.
- **Justification :** Permet une incrustation transparente de qualité broadcast directement dans le navigateur à 60 FPS sans WebGL lourd tout en garantissant un rendu FFmpeg parfait.

### 2.18 Découpe vectorielle par masques géométriques & Incrustation Picture-in-Picture (PiP)
- **Décision :** Le masquage géométrique supporte 6 formes canoniques (`rectangle`, `circle`, `star`, `heart`, `linear`, `none`) avec contrôles de dimensions relatives (largeur/hauteur 10%-100%), décalage de centre $X/Y$, adoucissement de contour (`feather_px`), arrondi des angles (`roundness_px`), rotation angulaire et inversion booléenne (`inverted`). Dans le Canvas 2D (`PreviewMonitor.tsx`), un pochoir offscreen combiné en `destination-in` (ou `destination-out` pour l'inversion) applique le masque avec un flou de contour progressif. À l'exportation FFmpeg, le filtre `geq` génère les masques de transparence alpha correspondants (`format=rgba,geq=...:a='...'`).
- **Justification :** Offre des incrustations superposées créatives (vignettes rondes, masques d'accentuation, scissions d'écrans) conformes aux codes de montage vidéo modernes (CapCut Desktop, TikTok).

### 2.19 Moteur d'aimantation prédictive multi-repères et indexation temporelle des marqueurs
- **Décision :** L'aimantation magnétique (Snapping) est calculée de manière pure (`snapping.ts`) en évaluant une fenêtre de tolérance dynamique proportionnelle au niveau de zoom ($\Delta t_{\text{seuil}} = \frac{14\,\text{px}}{\text{zoom}} \times 10^6\,\mu\text{s}$). Les cibles d'aimantation hiérarchisées englobent la tête de lecture ($T_{\text{playhead}}$), les marqueurs de rythme ($T_{\text{marker}}$), les points d'entrée et de sortie de tous les clips adjacents et l'origine ($0\,\mu\text{s}$). Lors du déplacement ou du rognage, le guide magnétique en surimpression (ligne cyan verticale) offre un retour visuel instantané. Les marqueurs de timeline sont indexés directement dans la séquence (`sequence.markers`), persistés dans les projets `.kproj` et pilotables par raccourcis universels (`N` pour basculer l'aimant, `M` pour poser un marqueur).
- **Justification :** Élimine les décalages d'un pixel ou d'une frame lors de l'assemblage de clips, facilite le découpage rythmique au tempo musical et reproduit l'ergonomie phare des éditeurs de bureau de référence (CapCut, Premiere, DaVinci Resolve).

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

### Étape 12 — Ratios de Canevas Multi-formats (13/11/2026) ✅ Terminé

- **Modèle de données & Préréglages :**
  - Ajout du type canonique `CanvasAspectRatio` (`16:9`, `9:16`, `1:1`, `4:5`, `4:3`, `21:9`, `custom`) et de l'interface `AspectRatioPreset` dans `src/core/types/project.ts`.
  - Définition du dictionnaire `CANVAS_RATIO_PRESETS` répertoriant les résolutions cibles des réseaux et plateformes :
    - `16:9` : 1920×1080 (YouTube / Standard / TV)
    - `9:16` : 1080×1920 (TikTok / YouTube Shorts / Instagram Reels)
    - `1:1` : 1080×1080 (Carré / Feed Instagram / LinkedIn)
    - `4:5` : 1080×1350 (Portrait Instagram Feed)
    - `4:3` : 1440×1080 (Standard / Rétro TV)
    - `21:9` : 2560×1080 (Cinéma / Ultrawide)
  - Fonction utilitaire `detectAspectRatio(width, height)` calculant avec tolérance le ratio correspondant à n'importe quelles dimensions arbitraires.
  - Champ `aspect_ratio?: CanvasAspectRatio` sur `TimelineCanvasSettings`, initialisé par défaut à `'16:9'`.
- **Gestion d'état Zustand & Historique :**
  - Actions `setCanvasAspectRatio(ratio, customDimensions)` et `setCanvasDimensions(width, height)` dans `src/store/projectStore.ts`.
  - Intégration complète à la pile d'historique `past[]` (50 snapshots immuables) avec compatibilité intégrale Undo / Redo (`Ctrl+Z` / `Ctrl+Y`).
- **Rendu temps réel Canvas 2D & Recadrage CSS (60 FPS) :**
  - Propriété CSS dynamique `aspectRatio` sur `.preview-monitor__screen`, s'adaptant instantanément aux formats verticaux (9:16), carrés (1:1) ou panoramiques (21:9) sans débordement.
  - Recadrage adaptatif en mode « contain » automatique dans le Canvas 2D (`PreviewMonitor.tsx`) : vidéos et images sont centrées et proportionnellement dimensionnées.
  - Repositionnement parfait des calques de texte grâce aux coordonnées relatives normalisées (`normalized_center.x_ratio`, `y_ratio`).
  - Badge informatif en bas à gauche de l'écran affichant en temps réel le ratio et les dimensions (ex : `9:16 · 1080×1920`, `1:1 · 1080×1080`).
- **Interface Utilisateur CapCut Desktop :**
  - **Sélecteur sous le moniteur :** Bouton ergonomique dans la barre de transport (`preview-monitor__transport`) avec icône contextuelle (`Smartphone` pour 9:16 et 4:5, `Square` pour 1:1, `Monitor` pour 16:9, `Film` pour 21:9), badge de ratio, chevron rotatif et menu déroulant élégant avec coche d'activation.
  - **Inspecteur de composition :** Menu déroulant synchronisé dans la section Composition de `InspectorPanel.tsx` permettant d'ajuster le format lorsque aucun clip n'est sélectionné.
- **Pipeline d'exportation FFmpeg calibré :**
  - `ExportDialog.tsx` génère dynamiquement des préréglages adaptés au ratio courant du projet (ex. pour 9:16 : 1080×1920 Full HD, 720×1280 HD, 2160×3840 4K ; pour 1:1 : 1080×1080, 720×720, 2160×2160 ; pour 4:5 : 1080×1350, 720×900).
  - Sélection automatique à l'ouverture de la résolution correspondant exactement au canevas actif du projet.
  - `ffmpegCommandBuilder.ts` compile le filtre complexe avec un canevas de fond `color=s=WxH` et un padding `pad=W:H:(ow-iw)/2:(oh-ih)/2` strictement conformes aux dimensions choisies.
- **Tests unitaires :** 7 nouveaux tests automatisés ajoutés dans `project.test.ts`, `projectStore.test.ts` et `ffmpegCommandBuilder.test.ts`. Suite complète portée à **70 tests unitaires validés (100% succès)**.

---

### Étape 13 — En Plus — Effets dynamiques & Transitions CapCut (13/11/2026) ✅ Terminé

> **Note d'Oscar :** *"Ici Oscar, je rajoute que cette etape "En Plus" a été créée suite a des questions de ma part sur la recreation des effets capcut et des transitions etc. Si cela pose un quelconque probleme pour la suite des etapes je tautorise a supprimer les parties concernant cette section. Mais garde une trace quelque part te permettant de les reprendre après avoir terminé toutes les étapes"*
> 
> *Statut : Finalisation intégrale réussie sans compromis ni régression. Les effets et transitions CapCut sont entièrement opérationnels, documentés et validés par des tests unitaires dédiés.*

- **Modèle de données & Paramétrage fin :**
  - Énumération `VideoEffectPreset` étendue : `x_shake` (Secousse horizontale), `y_shake` (Secousse verticale), `camera_shake` (Secousse caméra 2D), `tremor_strobe` (Tremblement stroboscopique), `strobe_white` (Flash blanc cadencé), `strobe_black` (Éclipse noire stroboscopique).
  - Contrôles d'effets dans `VideoEffects` : curseurs `intensity` (0.1× à 3.0×, pas de 0.1) et `speed` (0.2× à 5.0×, pas de 0.1) avec réinitialisation contextuelle.
  - Énumération `TransitionType` enrichie de 7 transitions CapCut : `zoom_in` (Zoom plongeant), `zoom_out` (Dézoom arrière), `spin` (Rotation dynamique 360°), `strobe` (Coupure stroboscopique), `wipe_right` (Volet vers la droite), `wipe_up` (Volet ascendant), `wipe_down` (Volet descendant).
- **Rendu Canvas 2D temps réel 60 FPS (`PreviewMonitor.tsx`) :**
  - Moteur oscillatoire harmonique : déplacements $A \cdot \sin(2\pi f t)$ et $\cos(2\pi f t)$ pour les secousses dynamiques avec compensation de bordures.
  - Générateur d'ondes carrées stroboscopiques pour les flashs blancs, noirs et le tremblement avec modulation de fréquence continue.
  - Interpolation des transitions d'entrée : zoom dynamique progressif (0.01× à 1.0× ou 2.0× à 1.0×), rotation cinétique angulaire de $2\pi(1-p)$ radians, volets géométriques multidirectionnels avec `ctx.clip()`.
- **Pipeline d'exportation FFmpeg équivalent (`ffmpegCommandBuilder.ts`) :**
  - Compilation des secousses via expressions mathématiques `crop` oscillatoires et rééchantillonnage `scale`.
  - Synthèse des stroboscopes via filtre `drawbox` paramétré par expression temporelle d'activation `enable='mod(floor(t*V*12),2)'`.
  - Intégration des transitions avancées avec filtres `fade`, alpha overlay et voiles périodiques.
- **Interface Utilisateur & Badges Timeline (`TimelineClip.tsx` & `InspectorPanel.tsx`) :**
  - Badges distinctifs sur les clips avec code couleur sémantique :
    - Ambre-or pour les effets dynamiques de secousse et stroboscopes (`⚡ Shake X`, `↕️ Shake Y`, `📳 Cam Shake`, `⚡ Tremor`, `⚡ Flash B.`, `🖤 Strobe N.`).
    - Rose vif pour les filtres artistiques (`🪄 N&B`, `🪄 Sépia`, `🪄 Rétro`, `🪄 Négatif`, `🪄 Vignet.`).
    - Indigo pour les retournements miroir (`🪞 Miroir`, `↕️ Flip V`).
    - Badges combinés clairs en cas de cumul (`🪞+⚡`, `🪞+🪄`).
    - 11 badges de transitions spécifiques (`✨ Fondu`, `🌑 Noir`, `⚡ Flash`, `⚡ Strobe`, `🔍 Zoom In`, `🔎 Zoom Out`, `🌀 Spin`, `👈 Wipe G`, `👉 Wipe D`, `👆 Wipe H`, `👇 Wipe B`).
  - Section Inspecteur avec sliders interactifs Intensité & Vitesse, boutons de réinitialisation et boutons de raccourci.
- **Gestion d'état Zustand & Undo/Redo :**
  - Actions `updateClipEffects(itemId, effects, commitHistory)` et `updateClipTransition(itemId, transition, commitHistory)`.
  - Compatibilité intégrale `Ctrl+Z` / `Ctrl+Y` sur l'ensemble des curseurs d'intensité et de vitesse sans perte d'état.
- **Tests unitaires :** Suite complète portée à **75 tests unitaires automatisés validés (100% succès)** avec couverture complète des presets, des calculs de filtres FFmpeg et de l'historique Undo/Redo.

### Étape 14 — Animation par Images-Clés (Keyframing) (13/11/2026) ✅ Terminé

- **Modèle de données & Types canoniques (`src/core/types/timeline.ts`) :**
  - Type `KeyframeInterpolation` : `'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'hold'`.
  - Interface générique `Keyframe<T>` : `id`, `time_offset_us`, `value`, `interpolation`.
  - Types `KeyframeProperty` et `ItemKeyframes` couvrant les 5 propriétés spatiales majeures : `position_x`, `position_y`, `scale`, `rotation`, `opacity`.
  - Champ optionnel `keyframes?: ItemKeyframes` sur `TimelineItem`.
- **Moteur d'interpolation temporelle (`src/core/animation/keyframeInterpolation.ts`) :**
  - Fonctions d'atténuation polynomiales et trigonométriques (`applyEasing`).
  - Évaluation continue multi-segments avec bornage aux extrémités (`interpolateKeyframeValue`).
  - Résolution spatiale instantanée complète (`getInterpolatedPlacement(item, timelineTimeUs)`).
  - Fonctions utilitaires : `addOrUpdateKeyframe` (tri ascendant, mise à jour sur place à tolérance temporelle), `removeKeyframe`, `moveKeyframesInList` (déplacement multi-propriétés par IDs), `findKeyframeNear`, `hasKeyframes`, `getAllKeyframeOffsets`.
- **Gestion d'état Zustand & Undo/Redo (`src/store/projectStore.ts`) :**
  - Actions : `addOrUpdateClipKeyframe`, `removeClipKeyframe`, `moveClipKeyframes`, `clearClipPropertyKeyframes`, `clearAllClipKeyframes`.
  - Intégration complète à la pile d'historique `past[]` (50 snapshots) avec prise en charge intégrale de `Ctrl+Z` et `Ctrl+Y`.
- **Rendu Canvas 2D temps réel 60 FPS (`PreviewMonitor.tsx`) :**
  - Résolution instantanée de l'état spatial à chaque frame via `getInterpolatedPlacement(item, currentTimeUs)`.
  - Déplacements continus, zooms progressifs, rotations et transitions d'opacité en temps réel sans latence.
- **Interface Utilisateur CapCut Desktop (`InspectorPanel.tsx` & `TimelineClip.tsx`) :**
  - Boutons losanges interactifs `Diamond` (`◆` / `◇`) pour chaque propriété de transformation (Échelle, Position X, Position Y, Rotation, Opacité) avec mise en surbrillance cyan lorsque la tête de lecture est sur une image-clé.
  - Boutons de navigation `<` et `>` permettant de sauter instantanément d'une image-clé à l'autre.
  - Sélecteur inline de courbe d'interpolation (Linéaire, Ease In, Ease Out, Adouci, Hold) apparaissant sous l'image-clé active.
  - Enregistrement automatique des modifications de curseurs lors du scrubbing temporel.
  - Marqueurs visuels en losange cyan le long du clip sur la timeline et badge distinctif `💎 Anim`.
  - **Déplacement interactif des images-clés à la souris (Drag & Drop) :**
    - Les losanges cyan sur la timeline du clip sont saisissables et déplaçables horizontalement avec le curseur `ew-resize`.
    - Bulle temporelle d'indication dynamique en direct (ex: `+1.45s`).
    - Synchronisation en direct de la tête de lecture, du Canvas 2D composite 60 FPS et des curseurs de l'Inspecteur.
    - Clic simple sur un losange pour caler instantanément la tête de lecture sur l'image-clé et sélectionner le clip.
    - Support Undo/Redo avec conservation stricte des IDs, des valeurs et des courbes d'atténuation.
  - Bannière récapitulative dans l'Inspecteur avec compteur de poses et bouton de purge complète (`Effacer tout`).
- **Pipeline d'exportation FFmpeg (`ffmpegCommandBuilder.ts`) :**
  - Fonction exportée `buildFFmpegKeyframeExpr(keyframes, defaultValue, clipStartSec)` générant des formules conditionnelles par morceaux (`if(lt(t, t_i), ...)`) conformes au parser d'évaluation FFmpeg.
  - Évaluation continue du zoom vidéo via `scale=eval=frame:w='iw*(...)':h='ih*(...)'`.
  - Évaluation de la rotation via `rotate='(...)*PI/180':c=none:ow=rotw(iw):oh=roth(ih)`.
  - Évaluation dynamique de la position spatiale dans le filtre `overlay=x='(W-w)/2+(...)':y='(H-h)/2+(...)'`.
- **Tests unitaires :** Suite portée à **98 tests unitaires validés (100% succès)** sur 7 fichiers de test (dont 18 tests dédiés à l'interpolation et au déplacement d'images-clés, tests d'actions Zustand et tests d'expressions FFmpeg).

### Étape 15 — Incrustation Fond Vert / Bleu (Chroma Key) (13/11/2026) ✅ Terminé

- **Modèle de données & Types canoniques (`src/core/types/timeline.ts`) :**
  - Interface `ChromaKeyData` : `enabled`, `target_color` (hexadécimal), `similarity` (0.01 à 1.0), `smoothness` (0.0 à 1.0), `spill_reduction` (0.0 à 1.0).
  - Champ optionnel `chroma_key?: ChromaKeyData` sur `TimelineItem`.
- **Moteur d'incrustation temps réel Canvas 2D (`src/core/chromakey/chromaKeyFilter.ts`) :**
  - Fonctions mathématiques : distance euclidienne pondérée dans l'espace colorimétrique RGB (`colorDistance`), interpolation de seuillage avec rampe douce (`calculateChromaAlpha`), et neutralisation des reflets colorés (`applySpillReduction`).
  - Fonction exportée `applyChromaKeyToImageData(imageData, chromaKey)` et `getChromaKeyedCanvas(source, w, h, chromaKey)`.
  - 4 préréglages colorimétriques `CHROMA_PRESETS` : Vert studio (`#00B140`), Vert vif (`#00FF00`), Bleu écran (`#0047BB`), Bleu profond (`#002288`).
- **Gestion d'état Zustand & Undo/Redo (`src/store/projectStore.ts`) :**
  - Action `updateClipChromaKey(itemId, chromaKey, commitHistory)` avec prise en charge totale `Ctrl+Z` / `Ctrl+Y`.
- **Rendu temps réel 60 FPS (`PreviewMonitor.tsx`) :**
  - Extraction de texture offscreen, traitement instantané du canal alpha et composition transparente au-dessus des calques d'arrière-plan.
- **Pipeline d'exportation FFmpeg (`ffmpegCommandBuilder.ts`) :**
  - Génération automatique du filtre FFmpeg natif haute performance : `colorkey=0x{hex}:{similarity}:{blend}`.
- **Interface Utilisateur CapCut Desktop (`InspectorPanel.tsx` & `TimelineClip.tsx`) :**
  - Section dédiée « Incrustation Fond Vert (Chroma Key) » avec interrupteur On/Off vert émeraude.
  - Palette de boutons d'échantillons rapides (Vert studio, Vert vif, Bleu écran, Bleu profond).
  - Sélecteur de couleur libre / pipette hexadécimale.
  - Curseurs interactifs : Tolérance (Similarité), Lissage des contours (Blend), Suppression des reflets (Spill).
  - Bouton de réinitialisation rapide (icône `RotateCcw`).
  - Badge vert distinctif `🟢 Chroma` sur les clips de la timeline.
- **Amélioration Ergonomique — Curseur de Timeline & Scrubbing :**
  - Unification de la tête de lecture (`TimelinePlayhead.tsx`) : curseur supérieur fléché et ligne verticale continue étirée sur toute la hauteur de la zone de montage (`min-height: 100%`, suppression des coupures mi-hauteur).
  - Zone de saisie élargie (hitbox) avec curseur `ew-resize` permettant de faire glisser la tête de lecture à la souris depuis la réglette ou depuis n'importe quelle piste.
  - Clic direct sur l'arrière-plan des pistes pour déplacer instantanément la tête de lecture (seek).
- **Tests unitaires :** 11 tests dédiés dans `chromaKeyFilter.test.ts`, tests d'actions Zustand et tests d'exportation FFmpeg.

### Étape 16 — Picture-in-Picture (PiP) Multi-pistes & Masques de Détourage Géométriques (13/11/2026) ✅ Terminé

- **Modèle de données & Types canoniques (`src/core/types/timeline.ts`) :**
  - Type `MaskType` : `'none' | 'rectangle' | 'circle' | 'star' | 'heart' | 'linear'`.
  - Interface `MaskData` : `mask_type`, `width_percent` (10% à 100%), `height_percent` (10% à 100%), `center_x_percent` (-50% à +50%), `center_y_percent` (-50% à +50%), `roundness_px` (0 à 100px), `rotation_degrees` (-180° à +180°), `feather_px` (0 à 50px), `inverted` (booléen).
  - Champ optionnel `mask?: MaskData` sur `TimelineItem`.
- **Moteur vectoriel de masquage (`src/core/mask/maskRenderer.ts`) :**
  - Fonctions de tracé vectoriel Canvas 2D (`traceMaskPath`) :
    - Rectangle avec arrondis d'angle paramétriques (`roundRect`).
    - Cercle et ellipse (`ellipse`).
    - Étoile à 5 branches trigonométrique.
    - Cœur paramétrique à courbes de Bézier cubiques.
    - Scission linéaire (demi-plan inclinable).
  - Application d'adoucissement de contours (`feather_px`) via filtre de flou gaussien sur le pochoir.
  - Mode d'inversion géométrique (`inverted`) via composition `destination-out`.
  - Fonction exportée `getMaskedCanvas(source, w, h, mask)`.
  - 6 préréglages CapCut prêts à l'emploi `MASK_PRESETS`.
- **Gestion d'état Zustand & Undo/Redo (`src/store/projectStore.ts`) :**
  - Actions `updateClipMask(itemId, mask, commitHistory)` et `resetClipMask(itemId)` avec intégration complète à l'historique `past[]` / `future[]` (`Ctrl+Z` / `Ctrl+Y`).
- **Rendu temps réel Canvas 2D 60 FPS (`PreviewMonitor.tsx`) :**
  - Découpe au pochoir temps réel en mode `destination-in`, superposition multi-pistes fidèle respectant l'ordre d'empilement vertical (`stack_index`).
- **Pipeline d'exportation FFmpeg (`ffmpegCommandBuilder.ts`) :**
  - Génération de filtres analytiques alpha `format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(...)'` pour les masques géométriques, cercles, rectangles, scissions et inversion.
- **Interface Utilisateur CapCut Desktop (`InspectorPanel.tsx` & `TimelineClip.tsx`) :**
  - Nouvelle section **« Masque & Incrustation PiP »** (icône `Crop`) dans l'Inspecteur.
  - Grille visuelle des 6 formes de masque avec icônes distinctives.
  - Curseurs de contrôle précis : Largeur, Hauteur, Position X/Y, Rotation, Contour progressif (Feather), Arrondi des angles.
  - Bouton de bascule **Inverser le masque** et bouton de réinitialisation contextuelle.
  - Badge distinctif orange sur les clips de la timeline (`🔲 Masque`, `⚪ Cercle`, `⭐ Étoile`, `❤️ Cœur`, `✂️ Scission`).
- **Tests unitaires :** Suite complète portée à **120 tests unitaires validés (100% succès)** sur 9 fichiers de test (dont 7 tests dans `maskRenderer.test.ts`, tests d'actions Zustand et tests d'exportation FFmpeg).

### Étape 17 — Aimantation Magnétique Intelligente (Smart Snapping), Multi-Sélection (Ctrl+Clic) & Marqueurs Temporels (13/11/2026) ✅ Terminé

- **Modèle de données & Types canoniques (`src/core/types/timeline.ts` & `project.ts`) :**
  - Interface `TimelineMarker` : `marker_id`, `time_us`, `label`, `color`.
  - Palette officielle `MARKER_PRESET_COLORS` (Jaune rythme `#eab308`, Cyan repère `#06b6d4`, Rouge coupe `#ef4444`, Vert clé `#22c55e`, Violet effet `#a855f7`, Orange action `#f97316`).
  - Champ `markers?: TimelineMarker[]` sur `TimelineSequence`, initialisé à `[]` dans `createDefaultProject`.
- **Moteur d'Aimantation Temporelle (`src/core/timeline/snapping.ts`) :**
  - Fonction pure `findNearestSnap(candidateTimeUs, targets, thresholdUs)` avec départage par ordre de priorité hiérarchique (`playhead` > `marker` > `clip_start` / `clip_end` > `origin`).
  - Fonction pure `snapPlayhead(candidateTimeUs, targets, thresholdUs)` pour l'aimantation de la tête de lecture.
  - Fonction `collectSnapTargets(project, options)` extrayant dynamiquement l'ensemble des repères avec support de `excludeItemId` et `excludeItemIds` (Set performant O(1)).
  - Fonction `snapClipMovement(candidatePlacementUs, clipDurationUs, targets, thresholdUs)` assurant l'alignement magnétique instantané du bord gauche (début) ou du bord droit (fin) du clip.
  - Seuil magnétique calibré à 20px pour une réactivité optimale et intuitive au scrub et au drag.
- **Sélection Multiple & Déplacement Groupé (Ctrl+Clic) (`src/store/projectStore.ts` & `TimelineClip.tsx`) :**
  - État `selectedItemIds: string[]` synchronisé en permanence avec `selectedItemId`.
  - Actions `toggleItemSelection`, `setSelectedItemIds`, `clearSelection`, `selectAllItems`, `removeSelectedItems`.
  - Raccourci `Ctrl+Clic` / `Cmd+Clic` / `Shift+Clic` sur les clips pour ajouter ou retirer des éléments d'un groupe de sélection.
  - Raccourcis globaux `Ctrl+A` (tout sélectionner) et `Échap` (tout désélectionner) sur la timeline.
  - Déplacement groupé (`moveMultipleTimelineItems`) : glisser n'importe quel clip du groupe déplace l'intégralité des clips sélectionnés de manière solidaire et cadencée.
  - Déplacement non destructif avec snapshot d'historique au premier mouvement : les 60 FPS de déplacement ne polluent pas l'historique Undo/Redo (`commitHistory: false` en temps réel).
- **Réglette graduée & Marqueurs interactifs (`TimelineRuler.tsx` & `TimelinePlayhead.tsx`) :**
  - Aimantation magnétique de la tête de lecture lors du glissement sur la réglette ou sur la tête rouge avec seuil de 18px et guide visuel cyan en temps réel.
  - Fanions losanges colorés en surimpression sur la réglette graduée.
  - Clic simple pour caler instantanément la tête de lecture sur le marqueur (`setCurrentTimeUs`).
  - Double-clic ouvrant un popover d'édition ergonomique pour renommer le marqueur, choisir sa pastille de couleur parmi les 6 teintes studio ou le supprimer.
- **Barre d'outils de timeline (`TimelineToolbar.tsx`) :**
  - Bouton **Aimant (Magnet)** avec mise en surbrillance cyan lorsque l'aimantation est active, basculable par le raccourci universel **« N »**.
  - Bouton **Marqueur (+M)** pour insérer un marqueur à l'instant de la tête de lecture, activable par le raccourci universel **« M »**.
  - Boutons de navigation compacts `<` et `>` permettant de sauter instantanément d'un marqueur à l'autre avec badge numérique du nombre de marqueurs actifs.
  - Bouton **Supprimer** dynamique : affiche le décompte lors de sélections multiples (`Supprimer (X)`) et efface tous les clips sélectionnés en un seul clic ou via la touche `Suppr` / `Backspace`.
- **Aimantation dans la timeline (`TimelineClip.tsx` & `Timeline.tsx`) :**
  - Déplacement magnétique de clips et rognage (Trim) gauche/droite magnétiquement aimantés sur les repères clés (tête de lecture, coupes de pistes voisines, marqueurs de rythme).
  - Guide d'aimantation en direct : ligne verticale cyan lumineuse (`.timeline-snap-guide`) apparaissant instantanément sur la timeline au contact d'un repère magnétique.
- **Panneau Inspecteur pour sélection multiple (`InspectorPanel.tsx`) :**
  - Carte dédiée **« Sélection multiple (X) »** avec résumé du groupe (nombre d'éléments, durée cumulée, étendue temporelle totale).
  - Liste interactive des clips sélectionnés avec badges de couleur par type de piste (`Vidéo`, `Audio`, `Texte`).
  - Boutons d'action globale : `Désélectionner tout` et `Supprimer la sélection`.
- **Tests unitaires :** Suite complète portée à **135 tests unitaires validés (100% succès)** sur 10 fichiers de test (dont 12 tests dans `snapping.test.ts` et tests de multi-sélection/déplacement groupé dans `projectStore.test.ts`).

### Étape 18 — Gestionnaire de Sous-titres & Légendes (Subtitles Engine) (13/11/2026) ✅ Terminé

- **Modèle de données & Types canoniques (`src/core/subtitles/subtitles.ts` & `src/core/types/timeline.ts`) :**
  - Interfaces `SubtitleCue` (`cue_id`, `start_time_us`, `end_time_us`, `text`, `index`) et `SubtitleStyle` (`font_name`, `font_size_pt`, `is_bold`, `fill_color_hex`, `outline_color_hex`, `outline_thickness_px`, `has_background_box`, `background_color_rgba`, `position_y_ratio`, `text_align`).
  - Ajout du type de piste canonique `'subtitles'` à `LaneType` : `export type LaneType = 'visual' | 'audio' | 'text_overlay' | 'subtitles';`.
  - Champ optionnel `subtitle_style?: SubtitleStyle` sur `TimelineSequence`.
- **Moteur de Parsing & Exportation SRT & WebVTT (`src/core/subtitles/srtParser.ts`) :**
  - Fonctions pures bidirectionnelles : `parseSrt`, `exportSrt`, `parseVtt`, `exportVtt`.
  - Conversion stricte en microsecondes entières : `timecodeToMicroseconds`, `microsecondsToSrtTimecode` (`HH:MM:SS,mmm`), `microsecondsToVttTimecode` (`HH:MM:SS.mmm`).
  - Tolérance aux fins de ligne Windows CRLF, nettoyage des balises HTML simples (`<i>`, `<b>`), rejet des timings inversés.
  - 14 tests unitaires dédiés dans `src/core/subtitles/srtParser.test.ts`.
- **Actions Zustand du Store (`src/store/projectStore.ts`) :**
  - Création dynamique et automatique de la piste `lane_subtitles_1` dès l'insertion ou l'import de sous-titres.
  - Actions : `addSubtitleCue`, `importSubtitles`, `exportSubtitles`, `updateSubtitleText`, `updateSubtitlesStyle`, `clearSubtitlesLane`.
  - Prise en charge intégrale de l'historique non-destructif Undo/Redo (`Ctrl+Z` / `Ctrl+Y`).
- **Rendu Canvas 2D Temps Réel 60 FPS (`PreviewMonitor.tsx`) :**
  - Support du texte multi-lignes (séparateurs `\n`) avec calcul précis de la hauteur de ligne et centrage vertical.
  - Rendu de boîte de fond protectrice translucide arrondie (`ctx.roundRect` avec fond `rgba(0, 0, 0, 0.72)`) pour une lisibilité parfaite sur tous les arrière-plans vidéo (style CapCut / YouTube / Netflix).
  - Contour net (`strokeText`) et texte franc (`fillText`) synchronisés à la frame près sous la tête de lecture.
- **Panneau & Modale de Gestion Séquentielle (`SubtitleManagerModal.tsx`) :**
  - Interface complète accessible via le bouton dédié **« Sous-titres »** de la barre d'outils.
  - Import direct par sélection de fichier local `.srt` ou `.vtt`.
  - Export direct en 1 clic vers `.srt` ou `.vtt`.
  - Liste séquentielle synchronisée : numéro de segment, bouton de saut temporel instantané vers le sous-titre (`start ➔ end`), zone de saisie textuelle éditable en direct et bouton de suppression par segment.
  - Volet de personnalisation du style visuel (taille de police, couleur, contour, boîte noire de fond).
- **Intégration Timeline & Inspecteur :**
  - En-tête de piste avec icône `Captions` et couleur ambrée `#f59e0b`.
  - Clips de sous-titres distinctifs sur la timeline (`.timeline-clip--subtitles`), déplaçables, rognables et aimantables avec le Smart Snapping.
  - Section dédiée dans l'Inspecteur lorsqu'un sous-titre est sélectionné avec édition rapide et bouton d'ouverture de la vue d'ensemble.
- **Exportation FFmpeg (`ffmpegCommandBuilder.ts`) :**
  - Prise en compte de la piste `subtitles` dans le graphe complexe vidéo FFmpeg.
  - Génération de filtres `drawtext` avec boîte de fond `:box=1:boxcolor=black@0.75:boxborderw=8`.
- **Compatibilité Parallèle Web & Application de Bureau (Electron) :**
  - Fonctionne de manière 100% identique dans le navigateur web et dans la fenêtre d'application de bureau Electron.
- **Tests unitaires :** Suite complète portée à **150 tests unitaires validés (100% succès)** sur 11 fichiers de test.

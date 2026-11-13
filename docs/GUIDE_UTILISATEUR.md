# Guide d'utilisation — Kroma Studio

Bienvenue dans le guide d'utilisation de **Kroma Studio**, un éditeur vidéo moderne dont l'interface et l'ergonomie s'inspirent des standards professionnels de logiciels comme CapCut.

Ce guide est spécialement conçu pour les débutants. Chaque manipulation est décrite étape par étape, avec des instructions numérotées claires.

> **Note de version :** Ce document correspond à la version **v0.17.0-alpha (Étape 17 : Aimantation Magnétique Intelligente & Marqueurs Temporels, Étape 16 : Picture-in-Picture & Masques Géométriques, Étape 15 : Chroma Key, Curseur de Timeline interactif)**. Il décrit l'ensemble des fonctionnalités du studio : l'importation de fichiers médias, l'agencement 4 quadrants, le montage sur la timeline (déplacement, scission au rasoir, rognage par poignées, suppression), l'**aimantation magnétique intelligente (Smart Snapping)** avec guide visuel cyan en temps réel (raccourci `N`), les **marqueurs temporels de timeline** (raccourci `M`) avec fanions colorés sur la réglette, popover d'édition, navigation `<` `>` et gestionnaire Inspecteur, l'ajout et l'édition complète de calques texte superposés, le **panneau d'étalonnage des couleurs en temps réel (luminosité, contraste, saturation, teinte, flou)**, la **vitesse variable par clip (ralenti/accéléré de 0.25× à 4.0×)**, les **transitions visuelles d'entrée**, la **symétrie miroir H/V & effets créatifs FX**, les **ratios de canevas multi-formats (YouTube 16:9, TikTok/Shorts 9:16, Carré 1:1, Portrait 4:5, 4:3, Cinéma 21:9)** avec recadrage dynamique et pré-calibrage de l'exportation FFmpeg, l'**incrustation Fond Vert / Bleu (Chroma Key)** avec pipette et curseurs de similarité/lissage/spill, l'**incrustation Picture-in-Picture (PiP) avec masques géométriques (rectangle, cercle, étoile, cœur, scission)** avec adoucissement et inversion, le **curseur de timeline unifié et interactif (scrubbing par glisser sur la tête ou la ligne, saut par clic sur la piste)**, le mixage audio complet (volume par clip et par piste, mode Solo/Mute, fondus Fade In/Fade Out avec courbe d'enveloppe, visualisations d'ondes Waveform sur clips), l'**historique Annuler / Rétablir illimité (`Ctrl+Z` / `Ctrl+Y`)**, la **sauvegarde et l'ouverture de projets au format ouvert `.kproj`**, le **moteur d'exportation MP4 via FFmpeg CLI (`Ctrl+E`)**, le moteur de prévisualisation vidéo en temps réel sur Canvas composite synchronisé à la frame, la lecture Play/Pause avec la barre d'espace et l'ajustement dynamique des propriétés visuelles (zoom, rotation, opacité).

---

## 1. Prérequis système

Pour exécuter Kroma Studio sur votre machine :
1. **Système d'exploitation :** Windows 10/11, macOS ou Linux.
2. **Node.js :** Version 18 ou supérieure installée (avec npm).
3. **Navigateur web moderne :** Google Chrome, Microsoft Edge, Brave ou Mozilla Firefox.

---

## 2. Installation et lancement rapide

Suivez ces 3 étapes simples pour démarrer l'application :

### Étape 1 : Ouvrir le terminal dans le dossier du projet
```powershell
cd D:\REA\mon-editeur
```

### Étape 2 : Installer les dépendances
```powershell
npm install
```

### Étape 3 : Lancer l'application

#### Option A — Mode Application de Bureau Windows (Recommandé, hors-navigateur) :
```powershell
npm run app:dist
```
*Ou faites simplement un double-clic sur le fichier **`Lancer-Kroma-Studio.bat`** situé à la racine du projet.*  
L'application s'ouvre directement dans sa propre fenêtre Windows autonome sans barre d'adresse ni onglet.

#### Option B — Mode Web Navigateur :
```powershell
npm run dev
```
Ouvrez l'adresse indiquée dans votre navigateur (généralement [http://localhost:5173/](http://localhost:5173/)).  
*(Pour en savoir plus sur les différentes options de passage en application de bureau, consultez le [Guide Application de Bureau](file:///f:/REA/mon-editeur/docs/GUIDE_APPLICATION_BUREAU.md)).*

---

## 3. Découverte de l'interface (4 quadrants style CapCut)

L'espace de travail est structuré en 4 zones complémentaires :

1. **En haut à gauche — La Médiathèque (MediaBin) :**
   - Bouton **« Importer »** pour ajouter des vidéos, sons et photos.
   - Onglets de filtrage rapide : **Tous**, **Vidéos**, **Audios**, **Photos**.
   - Barre de recherche textuelle pour retrouver instantanément un rush.
   - Cartes de médias avec bouton **« + »** d'ajout direct sur la timeline au survol.

2. **En haut au centre — Le Moniteur de prévisualisation (Player Multi-formats) :**
   - Écran vidéo composite haute performance avec géométrie adaptative selon le format choisi (16:9, 9:16, 1:1, 4:5, 4:3, 21:9).
   - Badge dynamique en bas à gauche de la vidéo affichant le ratio et les dimensions en direct (ex: `9:16 · 1080×1920`).
   - Affiche en direct le flux vidéo, audio et images correspondant exactement à l'instant de la tête de lecture.
   - Bouton central rond **Lecture / Pause** (ou appui sur la touche **Espace** de votre clavier).
   - Boutons de saut rapide (-1 seconde, +1 seconde, retour au début).
   - Bouton de coupure sonore générale (**Mute Master**).
   - **Sélecteur de format & ratio sous l'écran :** Menu déroulant permettant de basculer instantanément la destination de votre vidéo (YouTube, TikTok, Instagram...) avec recadrage automatique sans perte.
   - Double affichage du timecode SMPTE : `Temps actuel` / `Durée totale`.

3. **En haut à droite — Le Panneau Inspecteur (Propriétés) :**
   - Lorsque vous cliquez sur un clip dans la timeline : permet d'ajuster son **Volume (0% à 200%)**, son **Échelle/Zoom (20% à 300%)**, son **Opacité (0% à 100%)** et sa **Rotation**. Le canevas vidéo se met à jour instantanément !
   - Lorsque vous cliquez sur un média dans la médiathèque : affiche sa résolution, son débit, sa durée et sa taille.

4. **En bas — La Timeline multipiste :**
   - **Barre d'outils :** Outil Sélection (flèche), Outil Rasoir/Scission (ciseaux), bouton Diviser, bouton Supprimer (corbeille) et barre de zoom temporel.
   - **Réglette temporelle graduée (Ruler) :** Affiche les secondes et minutes. Cliquez ou glissez avec la souris n'importe où sur la réglette pour déplacer immédiatement la tête de lecture et voir l'image changer sous vos yeux.
   - **Tête de lecture rouge :** Marque l'instant précis visualisé.
   - **Pistes superposées :** Pistes vidéo (bleues), titres (jaunes/oranges) et audio (vertes) avec boutons Mute (silence) et Lock (verrouillage).

---

## 4. Votre premier montage pas à pas

### Étape 1 : Importer vos fichiers
1. Cliquez sur le bouton violet **« Importer »** en haut à gauche ou glissez vos fichiers vidéos/audios/photos directement dans la médiathèque.
2. Vos fichiers apparaissent instantanément sous forme de cartes avec leur vignette miniature.

### Étape 2 : Déposer un clip sur la timeline
- **Par Glisser-Déposer :** Cliquez sur une carte de la médiathèque, maintenez le clic gauche enfoncé et glissez le fichier sur la piste de votre choix dans la timeline en bas.
- **Par le bouton + :** Survolez la vignette du média et cliquez sur le petit bouton circulaire violet **« + »**. Le clip est automatiquement inséré sur la piste correspondante à la position actuelle de la tête de lecture.

### Étape 3 : Lancer la lecture et observer l'aperçu temps réel
1. Appuyez sur la **barre d'espace** de votre clavier ou cliquez sur le gros bouton rond blanc **Play** situé sous l'écran.
2. La vidéo démarre avec son son réel, la tête de lecture rouge avance le long des pistes et le timecode s'incrémente au centième de seconde près.
3. Réappuyez sur la **barre d'espace** pour mettre en pause.
4. Cliquez n'importe où sur la réglette graduée pour sauter instantanément à un moment précis : l'image se calera exactement sur la frame voulue.

### Étape 4 : Déplacer un clip sur la timeline
1. Assurez-vous que l'outil **« Sélection »** est actif dans la barre d'outils de timeline (icône de flèche).
2. Cliquez au centre du rectangle bleu du clip et faites-le glisser vers la gauche ou vers la droite le long de la piste.

### Étape 5 : Découper un clip en deux (Scission / Split)
- **Méthode avec le bouton « Diviser » :**
  1. Positionnez la tête de lecture rouge à l'endroit exact de la coupe.
  2. Cliquez sur le clip pour le sélectionner (bordure blanche contrastée).
  3. Cliquez sur le bouton **« Diviser »** dans la barre d'outils. Le clip est découpé en deux morceaux distincts.
- **Méthode avec l'outil « Rasoir » :**
  1. Activez l'outil **« Rasoir »** (icône de ciseaux).
  2. Cliquez directement sur le clip à l'endroit désiré.

### Étape 6 : Raccourcir ou allonger un clip (Poignées de rognage / Trim)
1. Survolez l'extrémité gauche ou droite d'un clip jusqu'à voir apparaître le curseur `↔`.
2. Cliquez et faites glisser vers l'intérieur pour couper le début ou la fin indésirable. L'édition est non destructive : vous pouvez rétirer la poignée vers l'extérieur pour réafficher les images à tout moment.

### Étape 7 : Ajuster le zoom, le cadrage et le volume
1. Sélectionnez un clip sur la timeline.
2. Dans le panneau **Inspecteur** à droite :
   - Déplacez le curseur **Échelle (Zoom)** : observez votre vidéo grossir ou rétrécir en direct sur l'écran !
   - Déplacez le curseur **Opacité** : réglez la transparence de la vidéo.
   - Déplacez le curseur **Rotation** : faites pivoter l'image selon l'angle souhaité.
   - Ajustez le **Volume du clip** pour doser l'intensité sonore.

### Étape 8 : Ajouter et personnaliser un calque de texte
1. Positionnez la tête de lecture à l'instant où vous souhaitez faire apparaître le texte.
2. Cliquez sur le bouton orange **« Texte »** (icône T) dans la barre d'outils de la timeline.
3. Un nouveau segment de texte de 4 secondes est automatiquement ajouté sur la piste dédiée **Titres & Textes** et sélectionné.
4. Dans le panneau **Inspecteur** à droite, le panneau d'édition typographique s'ouvre :
   - **Contenu :** Saisissez directement votre texte dans la zone de texte.
   - **Police :** Choisissez parmi les polices disponibles (Système, Impact, Georgia, Arial, Trebuchet MS, etc.).
   - **Taille & Graisse :** Réglez la taille de 12 à 200 pt et activez le bouton **B** (Gras).
   - **Alignement :** Choisissez entre alignement à gauche, centré ou à droite.
   - **Couleurs & Contours :** Sélectionnez la couleur du texte et la couleur du contour via les sélecteurs de couleur natifs, et ajustez l'épaisseur du contour (0 à 20 px).
   - **Position sur le canevas :** Ajustez les curseurs horizontaux (X) et verticaux (Y) pour positionner le texte avec précision sur la vidéo.
   - Observez le résultat en direct sur le lecteur vidéo et dans l'aperçu du panneau !

### Étape 9 : Régler le mixage audio, le mode Solo et les fondus
1. **Équilibrer le volume d'une piste entière :**
   - Dans l'en-tête de piste à gauche, utilisez le curseur de volume compact pour ajuster le niveau général de la piste (de 0% à 200%).
2. **Isoler une piste en écoute (Mode Solo) :**
   - Cliquez sur le bouton doré **« S »** dans l'en-tête de piste. Toutes les autres pistes sont immédiatement atténuées, vous permettant d'écouter la voix ou la musique isolément.
   - Cliquez à nouveau sur **« S »** pour désactiver le mode Solo.
3. **Couper le son d'une piste (Mode Mute) :**
   - Cliquez sur l'icône de haut-parleur dans l'en-tête de piste pour la rendre silencieuse.
4. **Appliquer des fondus d'entrée (Fade In) et de sortie (Fade Out) sur un clip :**
   - Sélectionnez le clip sur la timeline (remarquez les formes d'ondes audio dessinées à l'intérieur).
   - Dans le panneau **Inspecteur** à droite, sous la section **Audio & Mixage** :
     - Déplacez le curseur **Fondu d'entrée (Fade In)** (ex: 1.5 seconde) : le son augmentera progressivement depuis le silence.
     - Déplacez le curseur **Fondu de sortie (Fade Out)** (ex: 2.0 secondes) : le son diminuera en douceur à la fin.
     - Observez la courbe d'enveloppe sonore verte et les pentes diagonales qui apparaissent directement sur votre clip sur la timeline !

### Étape 10 : Étalonner et appliquer des filtres de couleur
1. Sélectionnez un clip vidéo ou une image sur la timeline.
2. Dans le panneau **Inspecteur** à droite, faites défiler jusqu'à la section **« Réglages & Étalonnage »** :
   - **Luminosité (-100% à +100%) :** Éclaircissez ou assombrissez votre rush en temps réel.
   - **Contraste (-100% à +100%) :** Renforcez le dynamisme entre les ombres et les hautes lumières.
   - **Saturation (-100% à +100%) :** Ravivez les couleurs vives ou créez un effet noir et blanc nostalgique (-100%).
   - **Teinte (Hue, -180° à +180°) :** Décalez le spectre colorimétrique pour une ambiance créative (sci-fi, vintage, teintes dorées).
   - **Flou gaussien (0 à 20 px) :** Floutez ou adoucissez le clip sans impacter le reste du projet.
3. Le résultat s'affiche en direct sur le moniteur Canvas 2D 60 FPS sans le moindre ralentissement.
4. Cliquez sur l'icône de réinitialisation circulaire à côté du titre pour réinitialiser les curseurs à tout moment, ou faites `Ctrl + Z`.

### Étape 11 : Ajuster la vitesse de lecture (Ralenti / Accéléré)
1. Sélectionnez un clip vidéo ou audio sur la timeline.
2. Dans le panneau **Inspecteur** à droite, repérez la section **« Vitesse de lecture »** (icône compteur de vitesse) :
   - **Multiplicateur (0.25× à 4.0×) :**
     - Glissez vers la gauche pour créer un **ralenti artistique** (jusqu'à 0.25× soit 4 fois plus lent).
     - Laissez au centre (1.00×) pour la vitesse normale d'enregistrement.
     - Glissez vers la droite pour créer un **accéléré dynamique** (jusqu'à 4.00× soit 4 fois plus rapide).
   - Le badge de vitesse s'affiche en surbrillance ambre dès que la vitesse est modifiée.
   - Un bouton **« 1× »** apparaît pour restaurer instantanément la vitesse originale en un seul clic.
3. Pendant la lecture d'aperçu (`Espace`), le moteur adapte la fréquence de lecture native (`playbackRate`) en temps réel sans saccade.
4. Lors de l'exportation MP4 (`Ctrl + E`), FFmpeg applique automatiquement les filtres temporels `setpts` pour la vidéo et le chaînage intelligent `atempo` pour conserver la cohérence sonore.

### Étape 12 : Ajouter des transitions visuelles entre les clips (11 transitions CapCut)
1. Sélectionnez un clip vidéo ou image sur la timeline.
2. Dans le panneau **Inspecteur** à droite, repérez la section **« Transition d'entrée »** (icône étincelles `✨`) :
   - **Catalogue complet des 11 transitions :**
     - **Aucune :** Le clip démarre sans transition.
     - **Fondu enchaîné (Crossfade) :** Apparition progressive et douce en transparence (`✨ Fondu`).
     - **Fondu au noir (Fade to black) :** Le clip commence entièrement masqué par un voile noir et s'illumine progressivement (`🌑 Noir`).
     - **Flash blanc (Dip to white) :** Éclat lumineux blanc intense qui s'estompe pour révéler la scène (`⚡ Flash`).
     - **Coupure stroboscopique (Strobe Cut) :** Battement stroboscopique à haute fréquence créant un cut percutant (`⚡ Strobe`).
     - **Zoom In (Plongeon avant) :** Zoom spectaculaire rapide de l'infini vers la taille normale (`🔍 Zoom In`).
     - **Zoom Out (Recul dynamique) :** Dézoom arrière dynamique depuis un gros plan (`🔎 Zoom Out`).
     - **Spin (Rotation cinétique) :** Rotation 360° fluide et stylisée lors de l'apparition du clip (`🌀 Spin`).
     - **Balayage Gauche (Wipe left) :** Volet glissant de droite à gauche (`👈 Wipe G`).
     - **Balayage Droite (Wipe right) :** Volet glissant de gauche à droite (`👉 Wipe D`).
     - **Balayage Haut (Wipe up) :** Volet vertical ascendant du bas vers le haut (`👆 Wipe H`).
     - **Balayage Bas (Wipe down) :** Volet vertical descendant du haut vers le bas (`👇 Wipe B`).
   - **Durée de la transition :** Ajustez le curseur entre **0.2 s et 3.0 s** selon le dynamisme souhaité pour votre scène.
   - **Badge visuel sur la timeline :** Le clip arbore immédiatement une zone violette dégradée ainsi qu'un badge informatif spécifique.
3. Appuyez sur `Espace` pour visualiser la transition en direct sur le Canvas composite à 60 images par seconde.
4. Lors de l'exportation MP4 (`Ctrl + E`), FFmpeg intègre nativement les filtres d'alpha, de transformation et de couleur correspondants pour un rendu identique à la prévisualisation.
5. Cliquez sur l'icône de réinitialisation circulaire pour retirer la transition à tout moment.

### Étape 13 : Appliquer la symétrie miroir, les effets dynamiques et les filtres artistiques FX
1. Sélectionnez un clip vidéo ou image sur la timeline.
2. Dans le panneau **Inspecteur** à droite :
   - **Miroir & Symétrie (Section Transformation) :**
     - Cliquez sur **« Miroir H »** pour inverser horizontalement l'image (effet miroir classique, idéal pour rushs en caméra selfie).
     - Cliquez sur **« Miroir V »** pour inverser verticalement l'image (retournement tête en bas).
     - Les boutons s'illuminent en violet indigo lorsqu'ils sont actifs. Vous pouvez combiner les deux pour une rotation symétrique à 180°.
   - **Effets dynamiques & Secousses CapCut (Section Filtres & Effets FX) :**
     - **⚡ Secousse X (X-Shake) :** Oscillations horizontales énergiques pour dynamiser les transitions et les beats musicaux.
     - **↕️ Secousse Y (Y-Shake) :** Oscillations verticales rythmées.
     - **📳 Caméra Shake :** Secousse organique combinée simulant une caméra à l'épaule ou un impact.
     - **⚡ Tremor Strobe :** Tremblement frénétique couplé à un battement de lumière.
     - **⚡ Flash Blanc (Strobe White) :** Pulsations stroboscopiques lumineuses blanches.
     - **🖤 Strobe Noir (Strobe Black) :** Éclipses stroboscopiques sombres pour un style clip musical électro.
     - **Curseurs d'ajustement dynamique :**
       - **Intensité (0.1× à 3.0×) :** Règle l'amplitude de déplacement des secousses et la puissance des flashs.
       - **Vitesse (0.2× à 5.0×) :** Règle la cadence d'oscillation et la fréquence des flashs.
   - **Filtres artistiques créatifs :**
     - **🖤 Noir & Blanc (Monochrome) :** Élimine toute saturation pour un rendu noir et blanc pur et contrasté.
     - **📜 Sépia (Rétro) :** Applique une matrice de teinte ambrée chaleureuse style photographies anciennes.
     - **🎞️ Argentique (Vintage 70s) :** Courbes cinématiques douces avec contrastes d'époque.
     - **🔮 Négatif (Inversion) :** Inverse l'intégralité du spectre colorimétrique RVB pour des effets oniriques.
     - **🎬 Vignetage sombre :** Assombrit les contours extérieurs de l'image avec curseur d'intensité d'obscurcissement réglable (10% à 100%).
3. Le lecteur Canvas 2D met à jour la scène immédiatement à 60 FPS avec prise en compte continue des curseurs d'intensité et de vitesse.
4. Sur la timeline, le clip affiche instantanément un badge couleur informatif :
   - Dégradé ambre-doré pour les secousses et stroboscopes (`⚡ Shake X`, `↕️ Shake Y`, `📳 Cam Shake`, `⚡ Tremor`, `⚡ Flash B.`, `🖤 Strobe N.`).
   - Rose vif pour les filtres artistiques (`🪄 N&B`, `🪄 Sépia`, `🪄 Rétro`, `🪄 Négatif`, `🪄 Vignet.`).
   - Indigo pour la symétrie (`🪞 Miroir`, `↕️ Flip V`).
   - Badges combinés en cas d'effets multiples (`🪞+⚡`, `🪞+🪄`).
5. À l'exportation MP4 (`Ctrl + E`), FFmpeg compile ces effets via des filtres `crop` oscillatoires continus et des expressions `drawbox` stroboscopiques synchronisées.

### Étape 14 : Animer vos clips avec des images-clés (Keyframing style CapCut)
1. **Sélectionner un clip visuel :** Cliquez sur une vidéo ou une image sur la timeline.
2. **Repérer les contrôles d'images-clés :**
   - Dans le panneau **Inspecteur** à droite, la section **« Transformation & Images-Clés »** présente 5 propriétés animables :
     - **Échelle (Zoom) :** De 20% à 300%.
     - **Position X :** Déplacement horizontal de -1000px à +1000px.
     - **Position Y :** Déplacement vertical de -1000px à +1000px.
     - **Rotation :** Orientation de -180° à +180°.
     - **Opacité :** De 0% (transparent) à 100% (opaque).
   - Chaque propriété est accompagnée d'un **bouton losange** (`◆` / `◇`) identique à celui de CapCut Desktop.
3. **Créer une image-clé :**
   - Déplacez la tête de lecture à l'instant où vous souhaitez démarrer l'animation (ex : au début du clip).
   - Ajustez la valeur souhaitée avec le curseur (ex : Zoom à 100%).
   - Cliquez sur le losange (`◇`) à droite du curseur : il s'illumine en **cyan éclatant** (`◆`), indiquant qu'une image-clé est enregistrée.
   - Avancez la tête de lecture plus loin dans le clip (ex : à +2 secondes).
   - Modifiez le curseur (ex : Zoom à 180% et Position X à +200px) : l'image-clé est automatiquement créée ou mise à jour !
4. **Choisir la courbe d'interpolation (Lissage / Easing) :**
   - Lorsqu'une image-clé est active sous la tête de lecture, une barre de boutons de courbe apparaît sous le curseur :
     - **Linéaire :** Mouvement à vitesse constante uniforme.
     - **Ease In :** Démarrage doux et accélération progressive.
     - **Ease Out :** Démarrage rapide et décélération douce vers la fin.
     - **Adouci (Ease In/Out) :** Transition cinématographique ultra-fluide avec amorti au départ et à l'arrivée.
     - **Hold :** Maintien de la valeur fixe jusqu'au prochain point clé (changement instantané sans transition).
5. **Naviguer entre les images-clés :**
   - Utilisez les flèches `<` et `>` situées à côté du losange pour sauter immédiatement d'une image-clé à la suivante sans chercher à tâtons sur la timeline.
6. **Visualisation et déplacement interactif sur la timeline :**
   - Le clip affiche des repères en forme de losanges cyan (`◆`) le long de sa piste ainsi qu'un badge **`💎 Anim`** confirmant que le média est animé.
   - **Déplacement à la souris (Drag & Drop) :** Cliquez et maintenez le curseur sur n'importe quel losange cyan sur le clip, puis faites-le glisser horizontalement vers la gauche ou la droite. Un badge flottant affiche le décalage temporel précis en temps réel (ex: `+1.45s`).
   - Le déplacement modifie le `time_offset_us` de toutes les propriétés animées à cet instant tout en conservant scrupuleusement leurs valeurs et leurs courbes d'atténuation.
   - La tête de lecture, le moniteur Canvas 2D 60 FPS et les curseurs de l'Inspecteur s'actualisent en direct au fur et à mesure du mouvement.
   - **Clic rapide :** Cliquer sur un losange sans le glisser sélectionne le clip et cale immédiatement la tête de lecture sur l'image-clé correspondante.
   - **Support Annuler / Rétablir :** Déplacer une image-clé s'intègre automatiquement dans l'historique (`Ctrl + Z` / `Ctrl + Y`).
7. **Supprimer des images-clés :**
   - Placez la tête de lecture sur le losange illuminé (`◆`) et cliquez dessus pour retirer l'image-clé.
   - Ou cliquez sur le bouton rouge **« Effacer tout »** en haut de la section pour réinitialiser l'animation.
8. **Exportation MP4 (`Ctrl + E`) :**
   - FFmpeg compile automatiquement les trajectoires en formules continues (`scale=eval=frame`, `rotate`, `overlay`) pour restituer fidèlement l'animation dans la vidéo finale !

### Étape 15 : Incrustation Fond Vert / Bleu (Chroma Key style CapCut)
1. **Activer l'incrustation sur un clip :**
   - Sélectionnez un clip vidéo ou une image sur la timeline.
   - Dans le panneau **Inspecteur** à droite, descendez jusqu'à la section **« 🟢 Incrustation Fond Vert (Chroma Key) »**.
   - Cochez la case pour activer l'incrustation. Le badge vert `🟢 Chroma` s'affiche immédiatement sur votre clip sur la timeline.
2. **Choisir la couleur à soustraire :**
   - Cliquez sur l'un des 4 échantillons prédéfinis : **Vert studio** (`#00B140`), **Vert vif** (`#00FF00`), **Bleu écran** (`#0047BB`), ou **Bleu profond** (`#002288`).
   - Ou cliquez sur le sélecteur de couleur / pipette libre pour capturer la couleur exacte de votre fond.
3. **Affiner la découpe avec les curseurs :**
   - **Tolérance (Similarité) :** Ajuste la plage de nuances éliminées (1% à 100%).
   - **Lissage des contours (Blend) :** Adoucit la transition des bordures pour éviter les artefacts d'escalier ou les contours durs.
   - **Suppression des reflets (Spill) :** Atténue et neutralise les reflets verts ou bleus résiduels sur les cheveux, les vêtements et la peau du sujet.
4. **Superposition multi-pistes :**
   - Placez votre vidéo ou image de décor d'arrière-plan sur la piste inférieure (Track 1).
   - Placez votre clip avec fond vert sur la piste supérieure (Track 2) : le sujet se détache instantanément au-dessus de votre décor !

### Étape 16 : Picture-in-Picture (PiP) Multi-pistes & Masques de Détourage Géométriques
1. **Sélectionner un masque dans l'Inspecteur :**
   - Sélectionnez votre clip et rendez-vous dans la section **« Masque & Incrustation PiP »** (icône `Crop`).
   - Choisissez l'une des 6 formes géométriques CapCut :
     - **✕ Aucun :** Désactive le détourage et réaffiche le rectangle d'origine.
     - **🔲 Rectangle :** Masque rectangulaire avec réglage d'arrondi des angles (`Roundness`).
     - **⚪ Cercle :** Masque circulaire ou ovale (parfait pour les pastilles de réaction ou les webcams style YouTube).
     - **⭐ Étoile :** Masque cinétique en étoile à 5 branches.
     - **❤️ Cœur :** Masque romantique ou créatif en forme de cœur.
     - **✂️ Scission :** Masque linéaire semi-plan pour les effets d'écran divisé (Split Screen avant/après).
2. **Personnaliser la géométrie et la position :**
   - **Largeur & Hauteur :** Ajustez les dimensions relatives du masque (10% à 100%).
   - **Position X & Y :** Déplacez le centre du masque sur l'image (-50% à +50%).
   - **Rotation :** Inclinez le masque de -180° à +180°.
   - **Contour progressif (Feather) :** Appliquez un fondu dégradé doux sur les bords (0 à 50 px) pour fondre naturellement l'incrustation dans le décor.
   - **Inverser le masque :** Cliquez sur le bouton **Inverser** pour transformer la forme en pochoir transparent (« trou » dans l'image).
3. **Badge visuel sur la timeline :**
   - Les clips masqués affichent un badge orange distinctif (`🔲 Masque`, `⚪ Cercle`, `⭐ Étoile`, `❤️ Cœur`, `✂️ Scission`).

### Étape 17 : Aimantation Magnétique Intelligente (Smart Snapping) & Marqueurs Temporels
1. **Activer ou désactiver l'aimantation magnétique (Snapping) :**
   - Cliquez sur le bouton **« Aimant »** dans la barre d'outils de timeline ou appuyez sur la touche **« N »** de votre clavier.
   - Lorsque l'aimant est actif (éclairé en bleu-cyan), le déplacement de clips ou le rognage des poignées s'aimante automatiquement sur :
     - La position de la tête de lecture.
     - Les coupes (début et fin) des autres clips sur toutes les pistes adjacentes.
     - Les marqueurs temporels posés sur la timeline.
     - L'origine (00:00).
   - **Guide visuel cyan en temps réel :** Dès qu'un clip ou une poignée s'aligne magnétiquement, une fine ligne verticale cyan lumineuse apparaît en surimpression sur toute la hauteur de la timeline pour confirmer l'alignement parfait.
2. **Poser et gérer des marqueurs temporels (Timeline Markers) :**
   - **Poser un marqueur :** Placez la tête de lecture à l'instant souhaité et appuyez sur la touche **« M »** (ou cliquez sur le bouton **« Marqueur »** dans la barre d'outils).
   - **Fanions colorés sur la réglette :** Un fanion losange apparaît sur la réglette graduée. Cliquez dessus pour caler immédiatement la tête de lecture à cet endroit.
   - **Édition rapide (Double-clic) :** Double-cliquez sur un fanion de la réglette pour ouvrir le popover d'édition. Vous pouvez renommer le marqueur (ex: *Refrain*, *Drop*, *B-Roll*), lui attribuer une couleur parmi 6 teintes studio (Jaune, Cyan, Rouge, Vert, Violet, Orange), ou le supprimer.
   - **Navigation entre marqueurs :** Utilisez les petits boutons de chevrons `<` et `>` situés à côté du bouton Marqueur dans la barre d'outils pour sauter instantanément d'un marqueur à l'autre le long de votre montage.
   - **Gestionnaire complet dans l'Inspecteur :** Lorsqu'aucun clip n'est sélectionné, l'Inspecteur affiche la section **« Marqueurs de Timeline »** avec la liste intégrale, les pastilles de couleur cliquables, les timecodes cliquables et la possibilité de tout effacer en un clic.

### Étape 18 : Curseur de Timeline unifié, Scrubbing & Navigation fluide
1. **Curseur unifié traversant toute la hauteur :**
   - La tête de lecture rouge comporte un curseur supérieur fléché dans la réglette et une ligne verticale continue s'étirant jusqu'au bas complet de la timeline sans interruption.
2. **Saut direct par clic sur piste :**
   - Cliquez n'importe où sur l'arrière-plan vide d'une piste de la timeline pour caler instantanément la tête de lecture à cet instant.
3. **Saisie et glisser fluide (Scrubbing) :**
   - Survolez la tête rouge ou la ligne verticale : le curseur de souris se transforme en double flèche horizontale (`ew-resize`).
   - Cliquez et glissez pour parcourir la vidéo en direct avec un rendu Canvas 2D composite 60 FPS immédiat.

### Étape 19 : Adapter le format et le ratio de canevas (Multi-formats 16:9, 9:16, 1:1, 4:5, 4:3, 21:9)
1. **Changer de format directement sous le moniteur :**
   - Repérez le bouton de format d'image situé au centre de la barre de transport sous la vidéo (ex: `[ 📱 16:9 ▾ ]`).
   - Cliquez dessus pour ouvrir le menu déroulant des formats optimisés pour les plateformes :
     - **16:9 YouTube / Paysage (1920×1080) :** Format standard pour télévision, PC et YouTube classique.
     - **9:16 TikTok / Shorts / Reels (1080×1920) :** Format vertical plein écran pour smartphone (TikTok, Instagram Reels, YouTube Shorts).
     - **1:1 Carré (1080×1080) :** Format carré idéal pour le feed Instagram, Facebook et LinkedIn.
     - **4:5 Portrait Instagram (1080×1350) :** Format optimisé pour occuper le maximum de hauteur dans le fil d'actualité Instagram mobile.
     - **4:3 Standard (1440×1080) :** Format rétro classique 4/3.
     - **21:9 Cinéma Ultrawide (2560×1080) :** Format panoramique large anamorphique.
2. **Recadrage adaptatif automatique :**
   - L'écran ajuste immédiatement ses proportions géométriques.
   - Les clips vidéo et photos sont automatiquement cadrés en mode « contain » (aucun rognage destructif, centrage automatique).
   - Les calques de texte restent parfaitement centrés et lisibles grâce aux coordonnées normalisées.
   - Le badge informatif en bas à gauche de la vidéo confirme instantanément le nouveau ratio et les dimensions en pixels.
3. **Changer de format depuis l'Inspecteur :**
   - Lorsqu'aucun clip n'est sélectionné, la section **« Composition »** de l'Inspecteur à droite vous permet également de changer le format via un menu déroulant synchronisé.
4. **Annuler / Rétablir :**
   - Tout changement de format est conservé dans l'historique : appuyez sur `Ctrl + Z` pour revenir au format précédent.
5. **Exportation calibrée automatique :**
   - Lorsque vous ouvrez la boîte d'exportation (`Ctrl + E`), les résolutions d'encodage proposées s'adaptent automatiquement au format actif (ex: présélections 1080×1920 Full HD Vertical, 720×1280 HD pour 9:16) et FFmpeg produit une vidéo aux dimensions cibles exactes.

### Étape 20 : Annuler, Rétablir et Sauvegarder/Ouvrir votre projet
1. **Annuler une erreur (Undo) :**
   - Appuyez sur `Ctrl + Z` sur votre clavier (ou cliquez sur le bouton de flèche retour dans l'en-tête ou la timeline).
   - Vos clips découpés, déplacés ou modifiés reviennent instantanément à leur état antérieur.
2. **Rétablir une action (Redo) :**
   - Appuyez sur `Ctrl + Y` ou `Ctrl + Maj + Z` (ou cliquez sur la flèche avant) pour réappliquer l'action annulée.
3. **Renommer votre projet :**
   - Cliquez sur le titre du projet au centre de la barre supérieure, saisissez le nom de votre choix (ex: *Mon_Super_Montage*), puis appuyez sur `Entrée`.
4. **Enregistrer votre projet sur votre disque dur (`.kproj`) :**
   - Appuyez sur `Ctrl + S` ou cliquez sur l'icône de disquette **Enregistrer** dans la barre supérieure.
   - Un fichier au format ouvert `.kproj` (JSON structuré) est automatiquement téléchargé dans votre dossier de téléchargements.
5. **Ouvrir un projet existant :**
   - Cliquez sur l'icône de dossier **Ouvrir** dans la barre supérieure et sélectionnez votre fichier `.kproj`. Votre montage complet, vos pistes, vos textes et vos réglages sont restaurés instantanément !

### Étape 21 : Exporter la vidéo finale en MP4 via FFmpeg
1. Cliquez sur le bouton vert **« Exporter »** dans l'en-tête supérieur droit, ou appuyez sur `Ctrl + E`.
2. La boîte de dialogue d'exportation professionnelle s'ouvre :
   - **Préréglage de résolution :** Les résolutions sont calibrées sur le format de votre vidéo (ex: 1080×1920 pour 9:16, 1080×1080 pour 1:1, 1080p pour 16:9, ou Personnalisé).
   - **Nom du fichier cible :** Modifiez si besoin le nom du fichier `.mp4`.
   - **Codec vidéo & Profil :** H.264 (`libx264`) universel ou H.265 (`libx265`) haute efficacité, avec profil de vitesse (Très rapide, Rapide, Équilibré ou Haute qualité).
   - **Qualité constante (CRF) :** Ajustez le curseur entre 16 (quasi sans perte) et 30 (fichier léger), 23 étant la valeur équilibrée recommandée.
   - **Débit audio AAC :** 128 kbps, 192 kbps (recommandé), 256 kbps ou 320 kbps (studio).
3. Consultez la **fiche technique** à droite : durée SMPTE exacte, résolution, nombre de clips et sources requises.
4. Téléchargez le script de rendu prêt à l'emploi :
   - Cliquez sur **« Script .bat (Windows) »** pour obtenir un script double-cliquable sous Windows.
   - Ou cliquez sur **« Script .sh (Unix) »** pour Linux/macOS.
   - Ou cliquez sur **« Copier la Commande »** pour exécuter directement la ligne de commande dans votre terminal (PowerShell ou Bash).
5. Lancez le script : FFmpeg traite l'intégralité des calques vidéo, des titres `drawtext` et du mixage sonore multipiste en pleine accélération matérielle. Votre fichier MP4 final est généré en quelques instants !

---

## 5. Raccourcis et astuces de navigation

| Action | Raccourci / Manipulation |
|---|---|
| **Lecture / Pause** | `Espace` ou clic sur le bouton Play |
| **Annuler la dernière action** | `Ctrl + Z` ou bouton Annuler |
| **Rétablir l'action** | `Ctrl + Y` ou `Ctrl + Maj + Z` ou bouton Rétablir |
| **Enregistrer le projet (.kproj)** | `Ctrl + S` ou bouton Enregistrer |
| **Exporter la vidéo (FFmpeg MP4)** | `Ctrl + E` ou bouton Exporter |
| **Reculer / Avancer d'une seconde** | `Flèche Gauche` / `Flèche Droite` |
| **Saut rapide de 5 secondes** | `Maj + Flèche Gauche` / `Maj + Flèche Droite` |
| **Revenir au début (00:00:00:00)** | Touche `Début` (Home) ou bouton `RotateCcw` |
| **Supprimer le clip sélectionné** | Touche `Suppr` (Delete) ou `Retour arrière` (Backspace) |
| **Outil Sélection** | Touche `V` |
| **Outil Rasoir / Découpe** | Touche `B` |
| **Diviser le clip à la tête de lecture** | `Ctrl + B` ou `Ctrl + K` |
| **Aimantation magnétique (Snapping)** | Touche `N` ou bouton Aimant dans la barre d'outils |
| **Poser un marqueur temporel** | Touche `M` ou bouton Marqueur dans la barre d'outils |
| **Couper / Réactiver le son master** | Icône de haut-parleur sous la vidéo |
| **Naviguer dans le temps (Scrubbing)** | Cliquez ou glissez sur la réglette graduée au-dessus des pistes |
| **Zoomer sur la timeline** | Glissez le curseur de zoom à droite de la barre d'outils, ou utilisez les boutons `+` et `-` |
| **Ajuster la vue globale** | Cliquez sur l'icône carrée **Ajuster** pour embrasser l'ensemble du montage |

---

## 6. Problèmes fréquents et résolutions

### 1. La vidéo ne démarre pas immédiatement lors du premier appui sur Play
* **Cause :** Les navigateurs modernes exigent une interaction utilisateur (un clic) avant de lancer un flux sonore. Dès le premier clic dans l'application, la lecture devient instantanée.

### 2. Une vidéo importée n'a pas de son
* **Vérifications :**
  1. Vérifiez que la piste n'est pas en mode **Mute** (icône de volume barré dans l'en-tête de piste à gauche).
  2. Vérifiez qu'une autre piste n'est pas en mode **Solo [S]**.
  3. Vérifiez que le haut-parleur Master sous l'écran n'est pas coupé.
  4. Vérifiez le curseur **Volume du clip** dans le panneau Inspecteur à droite.

### 3. Le script d'exportation .bat indique que FFmpeg n'a pas été trouvé
* **Cause :** FFmpeg n'est pas présent dans votre variable d'environnement PATH système.
* **Résolution :** Téléchargez FFmpeg (depuis ffmpeg.org) et ajoutez le dossier `bin` contenant `ffmpeg.exe` à votre variable d'environnement PATH, ou placez simplement `ffmpeg.exe` dans le même dossier que votre script exporté.

---

## 7. Flyer officiel A4 imprimable

Un flyer de présentation complet au format standard A4 (210×297 mm) prêt à imprimer ou à exporter en PDF est disponible dans le dossier de documentation :
- **Fichier :** [`docs/FLYER_A4.html`](file:///D:/REA/mon-editeur/docs/FLYER_A4.html)
- **Utilisation :** Ouvrez simplement ce fichier dans Google Chrome ou Edge, puis cliquez sur le bouton violet en haut à droite **« Imprimer en A4 / Enregistrer en PDF »** (ou faites `Ctrl+P`).

---

## 8. Bilan du Projet & Fonctionnalités Disponibles

L'ensemble des **17 étapes de Kroma Studio** sont désormais **100 % opérationnelles, intégrées dans l'architecture déclarative et validées par la suite de 131 tests automatisés** :
- ✅ **Étape 0 :** Socle technique Vite + React 19 + TypeScript strict.
- ✅ **Étape 1 :** Import de médias & Médiathèque avec drag & drop et vignettes.
- ✅ **Étape 2 :** Timeline multipiste avec ergonomie 4 quadrants style CapCut.
- ✅ **Étape 3 :** Moniteur de lecture temps réel synchronisé sur Canvas composite.
- ✅ **Étape 4 :** Superposition de texte avec éditeur typographique complet.
- ✅ **Étape 5 :** Mixage audio hiérarchique, mode Solo/Mute, fondus d'entrée/sortie et formes d'ondes.
- ✅ **Étape 6 :** Historique Annuler / Rétablir illimité (`Ctrl+Z` / `Ctrl+Y`) et persistance de fichiers `.kproj`.
- ✅ **Étape 7 :** Pipeline de transcodage et exportation MP4 via FFmpeg CLI (`Ctrl+E`).
- ✅ **Étape 8 :** Étalonnage couleur & filtres d'image (Canvas 2D + FFmpeg eq/hue/gblur).
- ✅ **Étape 9 :** Vitesse variable (ralenti/accéléré 0.25× à 4.0×, synchro playbackRate et FFmpeg setpts/atempo).
- ✅ **Étape 10 :** Transitions visuelles entre clips (fondu enchaîné, fondu au noir, flash blanc, balayage gauche, Canvas 2D + FFmpeg fade).
- ✅ **Étape 11 :** Effets vidéo, Filtres créatifs FX & Miroir H/V (Miroir horizontal/vertical, N&B, Sépia, Vintage, Négatif, Vignetage cinéma réglable).
- ✅ **Étape 12 :** Ratios de Canevas Multi-formats (16:9 YouTube, 9:16 TikTok/Shorts/Reels, 1:1 Carré, 4:5 Portrait Instagram, 4:3, 21:9 Cinéma, recadrage dynamique et export FFmpeg calibré).
- ✅ **Étape 13 :** Effets dynamiques & Transitions CapCut (Secousses X/Y/Caméra, flashs stroboscopiques, curseurs d'intensité et vitesse, 11 transitions dont Zoom/Spin/Wipes multidirectionnels, badges visuels timeline, Canvas 2D 60 FPS, export FFmpeg équivalent).
- ✅ **Étape 14 :** Animation par Images-Clés / Keyframing (Position X/Y, Zoom, Rotation, Opacité, interpolation, losanges timeline déplaçables à la souris, Canvas 2D 60 FPS et export FFmpeg continu).
- ✅ **Étape 15 :** Incrustation Fond Vert / Bleu (Chroma Key, pipette, tolérance, lissage blend, suppression des reflets spill, Canvas 2D 60 FPS, export FFmpeg colorkey, badge 🟢 Chroma).
- ✅ **Étape 16 :** Picture-in-Picture (PiP) Multi-pistes & Masques de Détourage Géométriques (Rectangle arrondi, Cercle/Ovale, Étoile, Cœur, Scission linéaire, contour progressif Feather, mode Inversé, Canvas 2D composite 60 FPS, export FFmpeg geq, badge orange timeline).
- ✅ **Étape 17 :** Aimantation Magnétique Intelligente & Marqueurs Temporels (Smart Snapping sur tête de lecture, coupes et marqueurs avec guide visuel cyan en direct, raccourci `N`, pose de marqueurs de rythme avec raccourci `M`, fanions réglette, popover d'édition, navigation `<` `>` et section Inspecteur dédiée).
- ✅ **Étape 18 :** Gestionnaire de Sous-titres & Légendes (Subtitles Engine) (piste de sous-titres dédiée ambrée, import/export bidirectionnel `.srt` et `.vtt`, modale d'édition séquentielle synchronisée avec timecodes In/Out et saut direct, rendu Canvas 2D 60 FPS multi-lignes avec boîte de fond protectrice, export FFmpeg drawtext burn-in, intégration Undo/Redo complète).
- ✅ **Amélioration Ergonomique :** Curseur de timeline unifié et interactif (étiré sur 100% de la hauteur sans coupure, saisissable et déplaçable avec curseur `ew-resize`, clic direct sur piste pour seek).
- 🚀 **150 tests unitaires validés (100% succès)** sur 11 suites de test automatisées.
- 💻 **Disponible simultanément en version Web (`localhost`) et en version Application de Bureau Windows (`Lancer-Kroma-Studio.bat`).**


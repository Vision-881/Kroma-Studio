# Guide d'utilisation — Kroma Studio

Bienvenue dans le guide d'utilisation de **Kroma Studio**, un éditeur vidéo moderne dont l'interface et l'ergonomie s'inspirent des standards professionnels de logiciels comme CapCut.

Ce guide est spécialement conçu pour les débutants. Chaque manipulation est décrite étape par étape, avec des instructions numérotées claires.

> **Note de version :** Ce document correspond à la version **v0.3.0-alpha (Étape 3 du MVP)**. Il décrit les fonctionnalités actuellement actives : l'importation de fichiers médias, l'agencement 4 quadrants, le montage sur la timeline (déplacement, scission au rasoir, rognage par poignées, suppression), le **moteur de prévisualisation vidéo en temps réel sur Canvas 16:9** avec synchronisation à la frame, la lecture Play/Pause avec la barre d'espace et l'ajustement dynamique des propriétés (volume, zoom, rotation, opacité).

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

### Étape 3 : Lancer le serveur de développement
```powershell
npm run dev
```
Ouvrez l'adresse indiquée dans votre navigateur (généralement [http://localhost:5173/](http://localhost:5173/)).

---

## 3. Découverte de l'interface (4 quadrants style CapCut)

L'espace de travail est structuré en 4 zones complémentaires :

1. **En haut à gauche — La Médiathèque (MediaBin) :**
   - Bouton **« Importer »** pour ajouter des vidéos, sons et photos.
   - Onglets de filtrage rapide : **Tous**, **Vidéos**, **Audios**, **Photos**.
   - Barre de recherche textuelle pour retrouver instantanément un rush.
   - Cartes de médias avec bouton **« + »** d'ajout direct sur la timeline au survol.

2. **En haut au centre — Le Moniteur de prévisualisation (Player 16:9) :**
   - Écran vidéo composite haute performance au format standard **16:9** (1080p).
   - Affiche en direct le flux vidéo, audio et images correspondant exactement à l'instant de la tête de lecture.
   - Bouton central rond **Lecture / Pause** (ou appui sur la touche **Espace** de votre clavier).
   - Boutons de saut rapide (-1 seconde, +1 seconde, retour au début).
   - Bouton de coupure sonore générale (**Mute Master**).
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

---

## 5. Raccourcis et astuces de navigation

| Action | Raccourci / Manipulation |
|---|---|
| **Lecture / Pause** | `Espace` ou clic sur le bouton Play |
| **Reculer / Avancer d'une seconde** | `Flèche Gauche` / `Flèche Droite` |
| **Saut rapide de 5 secondes** | `Maj + Flèche Gauche` / `Maj + Flèche Droite` |
| **Revenir au début (00:00:00:00)** | Touche `Début` (Home) ou bouton `RotateCcw` |
| **Supprimer le clip sélectionné** | Touche `Suppr` (Delete) ou `Retour arrière` (Backspace) |
| **Outil Sélection** | Touche `V` |
| **Outil Rasoir / Découpe** | Touche `B` |
| **Diviser le clip à la tête de lecture** | `Ctrl + B` ou `Ctrl + K` |
| **Couper / Réactiver le son master** | Touche `M` ou icône de haut-parleur sous la vidéo |
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
  2. Vérifiez que le haut-parleur Master sous l'écran n'est pas coupé.
  3. Vérifiez le curseur **Volume du clip** dans le panneau Inspecteur à droite.

---

## 7. Prochaines étapes

Ce qui arrive dans les prochaines versions de Kroma Studio :
- **Étape 4 :** Outil de texte avancé : ajout de titres et sous-titres superposés directement sur la vidéo avec choix des polices, couleurs et contours.
- **Étape 5 & 6 :** Historique Annuler / Rétablir (`Ctrl+Z` / `Ctrl+Y`) et sauvegarde de projets au format `.kproj`.
- **Étape 7 :** Export vidéo final MP4 haute définition accéléré par FFmpeg.

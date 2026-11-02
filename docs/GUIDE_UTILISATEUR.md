# Guide d'utilisation — Kroma Studio

Bienvenue dans le guide d'utilisation de **Kroma Studio**, un éditeur vidéo moderne dont l'interface et l'ergonomie s'inspirent des standards professionnels de logiciels comme CapCut.

Ce guide est spécialement conçu pour les débutants. Chaque manipulation est décrite étape par étape, avec des instructions numérotées claires.

> **Note de version :** Ce document correspond à la version **v0.2.0-alpha (Étape 2 du MVP)**. Il décrit les fonctionnalités actuellement actives : l'import de médias, l'agencement 4 quadrants, le montage multipiste complet (glisser-déposer de clips, déplacement, découpe au rasoir, rognage par poignées, suppression), le lecteur d'aperçu avec Play/Pause et le panneau d'inspection des propriétés (volume, zoom, opacité).

---

## 1. Prérequis système

Pour exécuter Kroma Studio sur votre machine :
1. **Système d'exploitation :** Windows 10/11, macOS ou Linux.
2. **Node.js :** Version 18 ou supérieure installée (avec npm).
3. **Navigateur web :** Google Chrome, Microsoft Edge, Brave ou Mozilla Firefox.

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

2. **En haut au centre — Le Moniteur de prévisualisation (Player) :**
   - Écran vidéo au format standard **16:9**.
   - Affiche en direct le contenu situé sous la tête de lecture rouge.
   - Boutons de saut rapide (-1 seconde, +1 seconde, retour au début).
   - Bouton central **Lecture / Pause** (activable aussi avec la barre d'espace).
   - Double affichage du timecode SMPTE : `Temps actuel` / `Durée totale`.

3. **En haut à droite — Le Panneau Inspecteur (Propriétés) :**
   - Lorsque vous cliquez sur un clip dans la timeline : permet d'ajuster son **Volume (0% à 200%)**, son **Échelle/Zoom (20% à 300%)**, son **Opacité (0% à 100%)** et sa **Rotation**.
   - Lorsque vous cliquez sur un média dans la médiathèque : affiche sa résolution, son débit, sa durée et sa taille.

4. **En bas — La Timeline multipiste :**
   - **Barre d'outils :** Outil Sélection (flèche), Outil Rasoir/Scission (ciseaux), bouton Diviser, bouton Supprimer (corbeille) et barre de zoom temporel.
   - **Réglette temporelle graduée (Ruler) :** Affiche les secondes et minutes. Cliquez ou glissez avec la souris n'importe où sur la réglette pour déplacer immédiatement la tête de lecture.
   - **Tête de lecture rouge :** Marque l'instant précis visualisé.
   - **Pistes superposées :** Pistes vidéo (bleues), titres (jaunes/oranges) et audio (vertes) avec boutons Mute (silence) et Lock (verrouillage).

---

## 4. Votre premier montage pas à pas

### Étape 1 : Importer vos fichiers
1. Cliquez sur le bouton violet **« Importer »** en haut à gauche ou glissez vos fichiers vidéos/audios/photos directement dans la médiathèque.
2. Vos fichiers apparaissent instantanément sous forme de cartes avec leur vignette miniature.

### Étape 2 : Déposer un clip sur la timeline
Vous avez deux manières simples d'insérer un clip :
- **Méthode A (Glisser-Déposer) :** Cliquez sur une carte de la médiathèque, maintenez le clic gauche enfoncé et glissez le fichier sur la piste de votre choix dans la timeline en bas. Relâchez à l'endroit exact souhaité.
- **Méthode B (Bouton rapide +) :** Survolez la vignette du média et cliquez sur le petit bouton circulaire violet **« + »**. Le clip est automatiquement inséré sur la bonne piste à la position de la tête de lecture.

### Étape 3 : Déplacer un clip sur la timeline
1. Assurez-vous que l'outil **« Sélection »** est actif dans la barre d'outils de timeline (c'est l'outil par défaut).
2. Cliquez au centre du rectangle bleu du clip et faites-le glisser vers la gauche ou vers la droite le long de la piste pour caler son début au moment voulu.

### Étape 4 : Découper un clip en deux (Scission / Split)
- **Méthode avec le bouton « Diviser » :**
  1. Déplacez la tête de lecture rouge à l'endroit exact où vous souhaitez couper le clip.
  2. Cliquez sur le clip pour le sélectionner (il s'entoure d'une bordure blanche contrastée).
  3. Cliquez sur le bouton **« Diviser »** dans la barre d'outils (icône de scission). Votre clip est instantanément divisé en deux morceaux indépendants sans aucune perte de qualité !
- **Méthode avec l'outil « Rasoir » :**
  1. Cliquez sur l'outil **« Rasoir »** (icône de ciseaux) dans la barre d'outils.
  2. Cliquez directement sur le clip à l'endroit précis que vous souhaitez trancher.

### Étape 5 : Raccourcir ou allonger un clip (Poignées de rognage / Trim)
1. Survolez l'extrémité gauche ou l'extrémité droite d'un clip. Le curseur de votre souris se transforme en double flèche horizontale `↔`.
2. Cliquez et faites glisser vers l'intérieur pour couper une partie indésirable (début ou fin).
3. L'édition est non destructive : vous pouvez à tout moment faire glisser la poignée vers l'extérieur pour réafficher les images coupées !

### Étape 6 : Régler le volume ou le zoom d'un plan
1. Cliquez sur le clip concerné pour le sélectionner.
2. Regardez dans le panneau **Inspecteur** tout à droite :
   - Bougez le curseur **Volume du clip** pour augmenter ou atténuer le niveau sonore.
   - Bougez le curseur **Échelle (Zoom)** pour recadrer votre vidéo. L'écran de prévisualisation au centre s'adapte en temps réel !
   - Bougez le curseur **Opacité** pour créer des effets de transparence.

### Étape 7 : Supprimer un segment
1. Cliquez sur le clip que vous souhaitez enlever.
2. Cliquez sur l'icône **« Supprimer »** (corbeille rouge) dans la barre d'outils de la timeline ou dans le panneau Inspecteur.

---

## 5. Raccourcis et astuces de navigation

| Action | Raccourci / Manipulation |
|---|---|
| **Lecture / Pause** | Cliquez sur le gros bouton rond blanc ou appuyez sur le bouton Play |
| **Naviguer dans le temps** | Cliquez n'importe où sur la réglette graduée au-dessus des pistes |
| **Reculer / Avancer de 1s** | Boutons `SkipBack` et `SkipForward` sous l'écran d'aperçu |
| **Zoomer sur la timeline** | Glissez le curseur de zoom à droite de la barre d'outils, ou utilisez les boutons `+` et `-` |
| **Ajuster la vue** | Cliquez sur l'icône carrée **Ajuster** pour voir l'ensemble de votre montage d'un seul coup d'œil |
| **Couper le son d'une piste** | Cliquez sur l'icône de haut-parleur dans l'en-tête de la piste |
| **Verrouiller une piste** | Cliquez sur l'icône de cadenas pour empêcher toute modification accidentelle |

---

## 6. Problèmes fréquents et résolutions

### 1. Pourquoi le bouton « Diviser » est-il grisé ou ne coupe rien ?
* **Explication :** La scission ne peut s'effectuer que si la tête de lecture rouge traverse réellement le clip sélectionné. Déplacez votre curseur rouge à l'intérieur de la durée du clip avant de couper.

### 2. Le clip ne s'allonge plus quand je tire sur la poignée droite
* **Explication :** Kroma Studio respecte la durée réelle de votre fichier vidéo source d'origine. Vous ne pouvez pas étirer un clip au-delà de la fin du fichier vidéo enregistré par votre caméra.

---

## 7. Prochaines étapes

Ce qui arrive dans les prochaines étapes de développement :
- **Étape 3 :** Décodage multi-sources et canevas vidéo haute performance synchronisé en temps réel avec le curseur de temps.
- **Étape 4 :** Ajout de titres, sous-titres et calques de texte personnalisables directement sur la piste dédiée.
- **Étape 5 & 6 :** Historique Annuler / Rétablir (`Ctrl+Z` / `Ctrl+Y`) et sauvegarde de projet au format `.kproj`.
- **Étape 7 :** Export final en fichier vidéo MP4 haute définition via FFmpeg.

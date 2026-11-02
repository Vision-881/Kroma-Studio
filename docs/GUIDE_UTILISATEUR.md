# Guide d'utilisation — Kroma Studio

Bienvenue dans le guide d'utilisation de **Kroma Studio**, un éditeur vidéo moderne, réactif et non destructif.

Ce guide est spécialement conçu pour les débutants. Chaque manipulation est décrite étape par étape, de l'installation au premier test de vos fichiers multimédias.

> **Note de version :** Ce document correspond à la version **v0.1.0-alpha (Étape 1 du MVP)**. Il décrit exclusivement les fonctionnalités actuellement opérationnelles : découverte de l'interface, import de fichiers par glisser-déposer ou sélection locale, visualisation des vignettes et métadonnées, et gestion du catalogue de médias.

---

## 1. Prérequis système

Pour faire fonctionner Kroma Studio sur votre ordinateur, vous devez disposer des outils suivants :
1. **Système d'exploitation :** Windows 10/11, macOS ou Linux.
2. **Node.js :** Version 18 ou supérieure installée (avec npm). Pour vérifier, ouvrez un terminal et saisissez :
   ```bash
   node -v
   npm -v
   ```
3. **Navigateur web moderne :** Google Chrome, Microsoft Edge, Brave ou Mozilla Firefox (supportant l'accélération matérielle HTML5).

---

## 2. Installation et premier lancement

Suivez ces 3 étapes simples pour lancer Kroma Studio :

### Étape 1 : Ouvrir le terminal dans le dossier du projet
Ouvrez votre terminal (par exemple PowerShell sur Windows) et naviguez dans le dossier de Kroma Studio :
```powershell
cd D:\REA\mon-editeur
```

### Étape 2 : Installer les dépendances
Si ce n'est pas déjà fait, téléchargez les bibliothèques requises en exécutant :
```powershell
npm install
```

### Étape 3 : Lancer l'application en mode développement
Lancez le serveur de développement local :
```powershell
npm run dev
```
Le terminal affichera un lien d'accès local, généralement :
```
➜  Local:   http://localhost:5173/
```
Maintenez la touche `Ctrl` enfoncée et cliquez sur le lien, ou copiez l'adresse `http://localhost:5173/` dans votre navigateur. Kroma Studio s'affiche immédiatement.

---

## 3. Découverte de l'interface

L'interface de Kroma Studio est épurée et pensée pour le confort visuel lors des longues sessions de montage :

1. **La barre supérieure (Header) :**
   - Le logo violet **K** et le titre **KROMA Studio**.
   - Le badge de version actuelle (`v0.1.0-alpha`).
2. **Le panneau latéral gauche (Médiathèque / MediaBin) :**
   - Le bouton violet **« Importer »** permettant de parcourir vos dossiers.
   - La zone d'accueil centrale invitant au glisser-déposer.
   - La liste sous forme de grille de tous vos fichiers multimédias importés.
3. **Le panneau central (Zone de travail) :**
   - Réservé à la future Timeline multipiste et à l'écran de prévisualisation (prévus pour les étapes suivantes).
4. **La barre inférieure (Footer) :**
   - Rappel discret de l'état actuel de l'application.

---

## 4. Votre premier projet pas à pas : importer des médias

Kroma Studio prend en charge trois catégories de fichiers :
- **Vidéos :** `.mp4`, `.webm`, `.mov`, `.mkv`, etc.
- **Pistes audio :** `.mp3`, `.wav`, `.ogg`, `.aac`, `.flac`, etc.
- **Images fixes :** `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, etc.

### Méthode A : Utiliser le bouton « Importer »
1. Cliquez sur le bouton violet **« Importer »** en haut à gauche de la médiathèque.
2. Une fenêtre de sélection de fichiers de votre système d'exploitation s'ouvre.
3. Sélectionnez un ou plusieurs fichiers (maintenez `Ctrl` pour en sélectionner plusieurs).
4. Cliquez sur **Ouvrir**.

### Méthode B : Le glisser-déposer (Drag & Drop)
1. Ouvrez votre explorateur de fichiers habituel à côté de votre navigateur.
2. Attrapez un ou plusieurs fichiers vidéo, audio ou photos avec votre souris.
3. Glissez-les au-dessus de la médiathèque de Kroma Studio. La zone s'illumine en violet avec le message *« Déposer les fichiers ici »*.
4. Relâchez le bouton de la souris.

---

## 5. Visualiser et inspecter vos clips

Dès qu'un fichier est déposé :
1. Une animation de chargement indique que Kroma analyse le conteneur du fichier.
2. L'application extrait automatiquement :
   - **Une vignette miniature :** capturée directement sur l'une des premières images nettes de la vidéo (évite les écrans noirs de début de plan).
   - **Le nom complet du fichier.**
   - **La durée exacte :** affichée sous forme `MM:SS` (ou `HH:MM:SS` pour les médias longs).
   - **La résolution native :** par exemple `1920×1080` ou `3840×2160` pour les vidéos et images.
3. **Sélectionner un clip :** Cliquez sur la carte d'un clip pour le mettre en surbrillance avec une bordure violette lumineuse.
4. **Supprimer un clip :** Cliquez sur la petite croix `×` située dans le coin supérieur droit de la carte pour retirer le clip du projet.

---

## 6. Problèmes courants et solutions

### 1. Le port 5173 est déjà occupé
* **Symptôme :** Vite démarre sur `http://localhost:5174/` au lieu de `5173`.
* **Solution :** C'est normal si une autre application utilise ce port. Ouvrez simplement l'adresse indiquée par le terminal dans votre navigateur.

### 2. Une vidéo affiche une icône par défaut au lieu d'une vignette
* **Symptôme :** La carte de votre vidéo s'affiche bien, mais la vignette reste l'icône de pellicule.
* **Cause :** Certains codecs propriétaires anciens ou spécifiques (comme certaines variantes d'AVI ou de codec propriétaire non supporté nativement par le moteur Chromium du navigateur) ne peuvent pas être décodés directement par le lecteur HTML5 standard.
* **Solution :** Pour cette étape 1, privilégiez les fichiers au format MP4 (H.264), WebM ou MOV. Lors de l'intégration du moteur FFmpeg en sous-processus (Étape 7), tous les formats sans exception seront transcodés et pris en charge de manière universelle.

---

## 7. Prochaines étapes

Ce qui arrive dans les prochaines versions de Kroma Studio :
- **Étape 2 :** Glisser-déposer des clips de la médiathèque directement sur les pistes de la Timeline, découper les clips (outil rasoir / split) et ajuster leur durée.
- **Étape 3 :** Tête de lecture interactive avec curseur temporel et lecteur vidéo temps réel synchronisé.
- **Étape 4 :** Ajout de calques de texte personnalisables (titres, sous-titres, polices et couleurs).
- **Étape 5 & 6 :** Historique Annuler / Rétablir (`Ctrl+Z` / `Ctrl+Y`) et sauvegarde de votre projet dans un fichier `.kproj`.
- **Étape 7 :** Export vidéo final en MP4 haute qualité propulsé par FFmpeg.

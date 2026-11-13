# Guide : Passer Kroma Studio en Application de Bureau (Desktop App)

> **Dernière mise à jour :** 13/11/2026  
> **Application :** Kroma Studio (Éditeur Vidéo CapCut-style)  
> **Système d'exploitation cible :** Windows 10 / 11

---

## 1. Mise au point préalable : Êtes-vous sur Internet ?

**Non, vous n'êtes pas sur Internet !** 
Même si vous ouvrez `http://localhost:5173` dans Chrome ou Edge :
- `localhost` (ou `127.0.0.1`) désigne **exclusivement votre propre ordinateur**.
- **Aucune vidéo, aucun média et aucun projet n'est envoyé sur Internet.** Tout est stocké et calculé 100 % hors-ligne sur votre disque dur et votre carte graphique.
- Cependant, exécuter l'éditeur à l'intérieur d'un onglet de navigateur présente des désagréments : présence de la barre d'adresses, risque de fermer l'onglet par erreur, conflits de raccourcis clavier (`Ctrl+W`, `Ctrl+T`), etc.

Pour vous affranchir totalement du navigateur et obtenir **une véritable application de bureau indépendante**, plusieurs solutions sont prêtes pour vous.

---

## 2. Méthode 1 : L'Application Native Electron (Prête et Configurée !)

Nous avons configuré **Electron** directement dans votre projet. Cela transforme Kroma Studio en un véritable logiciel de bureau Windows :
* Fenêtre sombre native indépendante (style CapCut Desktop).
* Pas de barre d'URL, pas d'onglets de navigateur.
* Icône dédiée dans la barre des tâches Windows.
* Raccourcis clavier studio (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+A`, `Suppr`, `Espace`, `N`, `M`) 100 % capturés par l'application.

### Comment la lancer ?

Dans votre terminal PowerShell, placez-vous dans le dossier de l'éditeur :

```powershell
cd f:\REA\mon-editeur
```

#### Option A — Mode direct (Recommandé) :
Compile les fichiers et ouvre l'application de bureau autonome en un seul geste :
```powershell
npm run app:dist
```

#### Option B — Mode développement (avec rechargement à chaud) :
Dans un premier terminal :
```powershell
npm run dev
```
Dans un second terminal :
```powershell
npm run app
```

---

## 3. Créer un raccourci direct sur le Bureau Windows (1 double-clic)

Pour lancer Kroma Studio sans jamais ouvrir de terminal, vous pouvez créer un petit lanceur automatique :

1. Créez un fichier nommé **`Lancer-Kroma-Studio.bat`** sur votre Bureau ou dans `f:\REA\`.
2. Insérez-y ces 3 lignes :
   ```bat
   @echo off
   cd /d "f:\REA\mon-editeur"
   npm run app:dist
   ```
3. En faisant un simple double-clic sur ce fichier `.bat`, votre éditeur s'ouvrira directement dans sa fenêtre d'application de bureau !

---

## 4. Méthode 2 : L'Installation PWA en 1 Clic (Sans rien installer de plus)

Nous avons également configuré le manifeste d'application Web (`manifest.webmanifest`) et le thème sombre système. Vous pouvez transformer l'onglet de votre navigateur en application de bureau installée en 5 secondes :

1. Lancez le serveur localement :
   ```powershell
   npm run dev
   ```
2. Ouvrez l'adresse dans **Google Chrome** ou **Microsoft Edge** : `http://localhost:5173`.
3. Repérez l'icône d'installation dans la barre d'adresse :
   * **Sous Google Chrome :** Cliquez sur l'icône **« Installer Kroma Studio »** (à droite dans la barre d'adresse) ou allez dans le menu `⋮` > **Enregistrer et partager** > **Installer la page en tant qu'application**.
   * **Sous Microsoft Edge :** Cliquez sur l'icône **« Application disponible »** dans la barre d'adresse ou allez dans `…` > **Applications** > **Installer Kroma Studio**.
4. Validez l'installation.

**Résultat :**
* L'application s'ouvre dans une fenêtre totalement indépendante sans interface de navigateur.
* Une icône Kroma Studio apparaît sur votre **Bureau Windows** et dans votre **Menu Démarrer**.
* Vous pouvez l'épingler à votre barre des tâches comme n'importe quel logiciel Windows natif.

---

## 5. Méthode 3 : Générer un fichier installable `.exe` (Pour distribuer ou emporter sur clé USB)

Si vous souhaitez générer un fichier exécutable autonome `Kroma-Studio-Setup.exe` que vous pouvez installer sur n'importe quel autre PC sans avoir besoin de Node.js :

1. Installez `electron-builder` en outil de compilation :
   ```powershell
   npm install --save-dev electron-builder
   ```
2. Ajoutez la section de packaging dans votre `package.json` :
   ```json
   "build": {
     "appId": "com.kromastudio.editor",
     "productName": "Kroma Studio",
     "win": {
       "target": ["nsis", "portable"]
     }
   }
   ```
3. Exécutez la compilation finale :
   ```powershell
   npx electron-builder --win
   ```
4. Vous obtiendrez votre fichier exécutable autonome dans le dossier `dist-electron/` prêt à être partagé ou déplacé sur n'importe quelle machine Windows.

---

## 6. Synthèse comparative

| Critère | Version Navigateur (`localhost`) | Mode PWA (Chrome/Edge) | Version Bureau Electron |
|---|---|---|---|
| **Connexion Internet requise ?** | ❌ Non (100% local) | ❌ Non (100% local) | ❌ Non (100% local) |
| **Barre d'URL / Onglets parasites ?** | ⚠️ Oui | ❌ Aucune | ❌ Aucune |
| **Fenêtre dédiée indépendante ?** | ❌ Non | ✅ Oui | ✅ Oui |
| **Raccourci Bureau & Barre des tâches ?** | ❌ Non | ✅ Oui (automatique) | ✅ Oui (via `.bat` ou `.exe`) |
| **Accès direct au système de fichiers ?** | ⚠️ Restreint au bac à sable | ⚠️ Restreint au bac à sable | ✅ Accès direct complet |
| **Temps de mise en œuvre** | Immédiat | 10 secondes | **Prêt dès maintenant (`npm run app:dist`)** |

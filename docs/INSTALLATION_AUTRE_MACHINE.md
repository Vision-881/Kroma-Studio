# Guide de migration & configuration sur un autre ordinateur — Kroma Studio

Ce guide répond aux questions relatives au transfert du projet sur une autre machine et fournit la procédure pas-à-pas pour reconfigurer votre environnement de travail (Kroma Studio et optionnellement REA / Ghidra).

Dernière mise à jour : 03/11/2026

---

## 1. Avez-vous encore besoin de REA sur votre autre ordinateur ?

### ❌ Pour développer, tester et utiliser Kroma Studio : **NON**
Le projet **Kroma Studio** est désormais **100 % autonome et auto-suffisant** :
- Le code source complet, l'architecture, la suite de tests unitaires (52 tests), le modèle de données et la documentation sont hébergés sur le dépôt GitHub officiel : [https://github.com/Vision-881/Kroma-Studio.git](https://github.com/Vision-881/Kroma-Studio.git).
- Vous n'avez besoin que d'un environnement standard **Node.js** pour continuer à développer, modifier ou faire évoluer Kroma Studio sur n'importe quel ordinateur (Windows, macOS ou Linux).

### 🔍 Pour continuer la rétro-ingénierie d'autres logiciels : **OUI**
Vous n'aurez besoin de REA (*Reverse Engineer Anything*) que si vous souhaitez analyser de nouvelles fonctions internes de logiciels propriétaires (comme CapCut Desktop, Premiere, etc.), désassembler des binaires compilés en C++/Rust, ou inspecter des structures de données natives non documentées.

---

## 2. Démarrage rapide de Kroma Studio sur votre nouvel ordinateur

Pour reprendre immédiatement le projet là où vous l'avez laissé :

### Étape 1 : Installer les outils indispensables
1. **Git :** [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. **Node.js (version 18, 20 ou 22 LTS) :** [https://nodejs.org/](https://nodejs.org/) (npm est inclus automatiquement).
3. **FFmpeg (recommandé pour tester les rendus MP4) :**
   - Téléchargez FFmpeg depuis [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html) ou via Winget sous Windows :
     ```powershell
     winget install "Gyan.FFmpeg"
     ```
   - Vérifiez dans votre terminal avec : `ffmpeg -version`

### Étape 2 : Cloner le dépôt GitHub
Ouvrez votre terminal (PowerShell ou Bash) dans le dossier de votre choix :
```powershell
git clone https://github.com/Vision-881/Kroma-Studio.git
cd Kroma-Studio
```

### Étape 3 : Installer les dépendances
```powershell
npm install
```

### Étape 4 : Lancer les tests et le serveur de développement
- Exécuter la suite de tests automatisés :
  ```powershell
  npx vitest run
  ```
- Démarrer l'application dans votre navigateur :
  ```powershell
  npm run dev
  ```
  L'interface s'ouvre à l'adresse [http://localhost:5173/](http://localhost:5173/).

---

## 3. Guide de réinstallation de l'environnement REA & Ghidra (si souhaité)

Si vous souhaitez réinstaller la suite complète de rétro-ingénierie sur votre nouvelle machine :

### 1. Java JDK 21+ (Requis par Ghidra)
Ghidra nécessite impérativement un Java Development Kit récent :
- Téléchargez **Eclipse Temurin JDK 21 (LTS)** depuis [https://adoptium.net/](https://adoptium.net/).
- Cochez bien l'option *« Set JAVA_HOME variable »* et *« Add to PATH »* lors de l'installation.
- Vérification dans le terminal :
  ```powershell
  java -version
  ```

### 2. Ghidra (NSA Software Reverse Engineering)
1. Téléchargez la dernière version officielle depuis [https://ghidra-sre.org/](https://ghidra-sre.org/).
2. Décompressez l'archive dans un dossier fixe, par exemple : `C:\Tools\ghidra`.
3. Ajoutez la variable d'environnement système `GHIDRA_INSTALL_DIR` pointant vers ce dossier :
   ```powershell
   [System.Environment]::SetEnvironmentVariable('GHIDRA_INSTALL_DIR', 'C:\Tools\ghidra', 'User')
   ```

### 3. Outils complémentaires d'analyse
- **Rizin / Cutter (optionnel) :** Pour le désassemblage et le débogage rapide : [https://rizin.re/](https://rizin.re/)
- **Python 3.10+ :** Pour les scripts de parsing et d'automatisation.

---

## 4. Synthèse

| Composant | Nécessaire pour Kroma Studio ? | Rôle |
|---|---|---|
| **Node.js & npm** | **OUI** (Indispensable) | Exécution du serveur Vite, React 19 et compilation TypeScript |
| **Git** | **OUI** (Indispensable) | Synchronisation et versionnement du code source |
| **FFmpeg** | **Recommandé** | Rendu et encodage direct des exports MP4 en pleine définition |
| **Ghidra / REA** | **NON** (Optionnel) | Uniquement requis pour rétro-concevoir d'autres binaires propriétaires |

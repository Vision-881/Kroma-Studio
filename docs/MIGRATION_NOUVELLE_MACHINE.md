# Guide de migration sur un nouvel ordinateur

Ce document vous guide pas à pas pour reprendre et continuer le travail sur un autre ordinateur.

---

## 1. Avez-vous encore besoin de REA pour développer Kroma Studio ?

**Réponse courte : NON.**

### Pourquoi ?
- **La phase d'ingénierie inverse est terminée :** L'analyse préliminaire de CapCut (DLLs, structures de projet, pipeline de décodage) a déjà été effectuée et formalisée dans `docs/specs.md`.
- **Kroma Studio est 100% autonome :** Le code est écrit de zéro en React 19, TypeScript, Zustand et Vite. Il ne dépend d'aucun binaire décompilé ni d'aucun outil d'analyse.
- **Règle du projet :** Vous n'avez plus besoin d'exécuter Ghidra, REA, ni de lire des dossiers externes pour continuer le montage vidéo.

Pour continuer à coder Kroma Studio sur une autre machine, vous n'avez besoin que de **Git**, **Node.js** et **FFmpeg**.

---

## 2. Configuration minimale pour continuer Kroma Studio (Recommandé)

Sur votre nouvel ordinateur :

### Étape 1 : Installer les outils indispensables
1. **Git :** [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. **Node.js (v20 ou v22 LTS) :** [https://nodejs.org/](https://nodejs.org/)
3. **FFmpeg :** Téléchargez une version pour Windows (ex: [gyan.dev](https://www.gyan.dev/ffmpeg/builds/)) et ajoutez `ffmpeg.exe` et `ffprobe.exe` dans votre `PATH` système (ou dans un dossier dédié).

### Étape 2 : Cloner le projet depuis GitHub
Ouvrez un terminal et tapez :
```powershell
git clone https://github.com/Vision-881/Kroma-Studio.git
cd Kroma-Studio
```

### Étape 3 : Installer les dépendances et lancer
```powershell
npm install
npm run dev
```
L'éditeur vidéo démarre immédiatement sur [http://localhost:5173/](http://localhost:5173/) !

---

## 3. Guide complet : Réinstaller REA & Ghidra (si vous en avez besoin pour d'autres projets)

Si vous souhaitez réinstaller l'environnement complet d'ingénierie inverse (**REA MCP + Ghidra**) sur votre nouvelle machine, voici la procédure exacte reproduisant votre configuration actuelle :

### Prérequis à installer

1. **Node.js :** Version 20+ LTS installée dans `C:\Program Files\nodejs\`.
2. **Java JDK 21 ou 25 (Eclipse Adoptium Temurin) :**
   - Téléchargement : [https://adoptium.net/temurin/releases/](https://adoptium.net/temurin/releases/)
   - Installez par exemple dans `C:\Program Files\Eclipse Adoptium\jdk-25.0.5.8-hotspot\`.
   - Cochez bien l'option d'ajout à `JAVA_HOME` ou notez le chemin.
3. **Ghidra :**
   - Téléchargement : [https://github.com/NationalSecurityAgency/ghidra/releases](https://github.com/NationalSecurityAgency/ghidra/releases)
   - Décompressez l'archive dans un dossier d'outils, par exemple : `C:\Tools\ghidra_12.1.4_PUBLIC`.

### Installation du package REA

Dans un terminal administrateur :
```powershell
npm install -g rea-agents
```

### Configuration du serveur MCP pour Gemini / Antigravity

Créez ou modifiez le fichier suivant :  
📁 `C:\Users\<VotreNomUtilisateur>\.gemini\config\mcp_config.json`

Insérez la configuration suivante en adaptant votre nom d'utilisateur Windows :

```json
{
  "mcpServers": {
    "rea": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": [
        "C:\\Users\\<VotreNomUtilisateur>\\AppData\\Roaming\\npm\\node_modules\\rea-agents\\scripts\\rea.mjs",
        "mcp"
      ],
      "env": {
        "GHIDRA_INSTALL_DIR": "C:\\Tools\\ghidra_12.1.4_PUBLIC",
        "JAVA_HOME": "C:\\Program Files\\Eclipse Adoptium\\jdk-25.0.5.8-hotspot\\"
      }
    }
  }
}
```

### Vérification de l'installation

Pour vérifier que tout fonctionne :
```powershell
npx -y rea-agents doctor --client antigravity --json
```

Si le diagnostic indique que Ghidra et Java sont détectés, le serveur REA est prêt à répondre aux requêtes de l'agent.


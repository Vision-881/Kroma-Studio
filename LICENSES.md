# Inventaire des dépendances et licences — Kroma Studio

Ce document répertorie l'ensemble des bibliothèques et logiciels tiers utilisés par le projet Kroma Studio, leurs licences respectives et les implications juridiques associées.

Dernière mise à jour : 02/11/2026 (Étape 2 du MVP)

---

## 1. Dépendances directes du projet (NPM)

| Dépendance | Version | Licence | Usage | Type de licence |
|---|---|---|---|---|
| **react** | `^19.3.1` | MIT | Bibliothèque d'interface utilisateur | Permissive |
| **react-dom** | `^19.3.1` | MIT | Moteur de rendu web pour React | Permissive |
| **zustand** | `^5.0.16` | MIT | Gestionnaire d'état global réactif | Permissive |
| **lucide-react** | `^1.66.0` | ISC | Collection d'icônes vectorielles SVG | Permissive |
| **@tauri-apps/api** | `^2.12.4` | MIT / Apache-2.0 | API de communication Tauri (étape future) | Permissive |
| **@tauri-apps/plugin-dialog**| `^2.8.4` | MIT / Apache-2.0 | Boîtes de dialogue système natives | Permissive |
| **@tauri-apps/plugin-fs** | `^2.7.1` | MIT / Apache-2.0 | Accès sécurisé au système de fichiers | Permissive |

---

## 2. Dépendances de développement (NPM Dev)

| Dépendance | Version | Licence | Usage | Type de licence |
|---|---|---|---|---|
| **typescript** | `~7.0.2` | Apache-2.0 | Compilateur et typage statique | Permissive |
| **vite** | `^8.3.5` | MIT | Serveur de développement et bundler | Permissive |
| **@vitejs/plugin-react** | `^6.1.2` | MIT | Intégration React Fast Refresh pour Vite | Permissive |
| **vitest** | `^5.1.0` | MIT | Framework d'exécution des tests unitaires | Permissive |
| **oxlint** | `^1.89.0` | MIT | Linter rapide Rust/JavaScript | Permissive |
| **@types/node** | `^24.19.2` | MIT | Déclarations de types pour l'écosystème Node | Permissive |
| **@types/react** | `^19.3.0` | MIT | Déclarations de types pour React | Permissive |
| **@types/react-dom** | `^19.3.0` | MIT | Déclarations de types pour React-DOM | Permissive |

---

## 3. Analyse des licences Copyleft et intégration de FFmpeg

### 3.1 Licence de FFmpeg
FFmpeg est distribué sous licence **LGPL v2.1+** dans sa configuration de base. Cependant, lorsqu'il est compilé avec des bibliothèques externes hautement optimisées et incontournables pour l'encodage vidéo moderne (telles que `libx264` pour le H.264 ou `libx265` pour le HEVC), l'ensemble de l'exécutable bascule sous licence **GPL v2+** ou **GPL v3**.

### 3.2 Implication juridique et architecture d'isolation (Subprocess)
Le principe du copyleft fort (GPL) stipule que tout logiciel qui constitue un « travail dérivé » ou qui est lié directement (statiquement ou dynamiquement via des pointeurs mémoire en C/C++) à une bibliothèque GPL doit être lui-même publié dans son intégralité sous licence GPL.

Pour protéger le code source et la propriété intellectuelle de **Kroma Studio** tout en tirant parti de la puissance de FFmpeg :
1. **Aucune liaison directe en mémoire :** Kroma Studio ne lie aucune DLL ou fichier d'en-tête de FFmpeg (`libavcodec`, `libavformat`, etc.).
2. **Processus externe complètement indépendant (CLI Subprocess) :** FFmpeg est distribué sous la forme d'un binaire exécutable séparé (`ffmpeg.exe`). Kroma communique avec lui exclusivement via les entrées/sorties standards (`stdin`, `stdout`, `stderr`) et des arguments de ligne de commande.
3. **Respect de la GPL :** En vertu de la doctrine de la Free Software Foundation relative aux invocations de programmes indépendants (« *fork and exec* »), la communication à travers une frontière de processus de système d'exploitation ne contamine pas le logiciel appelant. Kroma Studio reste donc libre de son modèle de licence, tout en accompagnant FFmpeg de sa licence et de l'accès à ses sources conformément aux exigences de la GPL.

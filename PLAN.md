# Plan de développement — Kroma Studio

Ce document consigne l'avancement du projet, la feuille de route du MVP, les étapes réalisées, en cours et à venir, ainsi que les décisions d'architecture prises au fil du développement.

---

## 1. Feuille de route du MVP

| Étape | Intitulé | Statut | Description succincte |
|---|---|---|---|
| **Étape 0** | Socle technique & Types | ✅ Terminé | Initialisation Vite + React + TS, types stricts (`asset`, `timeline`, `project`), utilitaires temporels en microsecondes, 10 tests unitaires. |
| **Étape 1** | Import de médias & Médiathèque | ✅ Terminé | Panneau `MediaBin` avec drag & drop HTML5, sélecteur de fichiers, extraction de métadonnées et vignettes via le navigateur, store Zustand `projectStore`. |
| **Étape 2** | Timeline multipiste & Ergonomie CapCut | ✅ Terminé | Disposition 4 quadrants style CapCut Desktop, réglette graduée dynamique, zoom temporel, déplacement de clips, découpe (outil Rasoir/Split), rognage (Trim handles), suppression, drag & drop depuis la médiathèque, panneau Inspecteur/Propriétés, 19 tests unitaires. |
| **Étape 3** | Lecteur d'aperçu synchronisé `<video>` & `<canvas>` | ⬜ Prochaine | Décodage et synchronisation fine d'éléments `<video>` HTML5 cachés mixés sur un `<canvas>` central pour l'aperçu multi-couches en temps réel. |
| **Étape 4** | Superposition de texte | ⬜ À faire | Piste de titres/textes, personnalisation (police, taille, couleur, positionnement à l'écran, opacité). |
| **Étape 5** | Mixage & Contrôle du volume | ⬜ À faire | Gestion fine du gain audio, automation/fondu, fonction mute / solo par piste. |
| **Étape 6** | Historique Annuler / Rétablir & Persistance | ⬜ À faire | Pile Undo/Redo complète sur les actions de timeline, sauvegarde et ouverture de projets `.kproj` en JSON via dialogue de fichiers. |
| **Étape 7** | Export MP4 via FFmpeg | ⬜ À faire | Génération de la commande de filtre complexe FFmpeg et exécution en sous-processus externe indépendant. |

---

## 2. Décisions d'architecture

### 2.1 Représentation temporelle en microsecondes entières (`us`)
- **Décision :** Toutes les durées, points d'entrée/sortie (`source_in_point_us`), durées de lecture (`play_duration_us`) et positions sur la timeline (`placement_time_us`) sont stockés sous forme d'entiers 64 bits en microsecondes ($1\,\text{s} = 1\,000\,000\,\mu\text{s}$).
- **Justification :** Évite définitivement les erreurs d'accumulation de virgule flottante qui désynchronisent l'audio et la vidéo sur les montages longs.

### 2.2 Séparation stricte entre Catalogue de médias et Séquence de montage
- **Décision :** Les fichiers importés sont référencés dans `asset_catalog[]`. Les éléments de la timeline (`sequence.lanes[].items[]`) ne contiennent aucune donnée brute mais uniquement une référence `referenced_asset_id` vers l'asset source.
- **Justification :** Modèle non destructif. Un même fichier peut être découpé et inséré à 10 endroits différents de la timeline sans dupliquer la mémoire ni modifier le fichier source original.

### 2.3 Ergonomie inspirée de CapCut Desktop (Layout 4 quadrants)
- **Décision :** L'interface adopte la disposition standard des logiciels de montage modernes :
  - **Haut gauche :** Médiathèque / Bibliothèque d'assets avec onglets (Tous, Vidéos, Audios, Photos) et recherche.
  - **Haut centre :** Moniteur de prévisualisation (Player 16:9) avec barre de transport et timecode double.
  - **Haut droite :** Panneau Inspecteur / Propriétés pour le clip ou l'asset sélectionné (échelle, rotation, volume, opacité).
  - **Bas pleine largeur :** Timeline multipiste avec réglette temporelle graduée, curseur rouge de tête de lecture et barres de zoom.

### 2.4 Découpe (Split) et Rognage (Trim) purs et déterministes
- **Décision :** Les opérations de découpe (`splitItemInSequence`) et de rognage (`trimItemInSequence`) sont codées comme des fonctions pures dans `src/core/timeline/timelineOps.ts`, sans effet de bord, et vérifiées par des tests unitaires stricts.

### 2.5 Isolation du processus FFmpeg
- **Décision :** FFmpeg ne sera jamais lié statiquement ou dynamiquement à la mémoire de l'application, mais invoqué strictement comme un exécutable indépendant en ligne de commande (CLI subprocess).

---

## 3. Historique des étapes

### Étape 0 & Étape 1 — Socle technique & Import de médias (02/11/2026)
- Initialisation Vite, React 19, TypeScript strict.
- Modèle de données complet : `asset.ts`, `timeline.ts`, `project.ts`.
- Moteur temporel `timeUtils.ts` et analyseur navigateur `mediaProbe.ts`.
- Panneau `MediaBin` avec import drag & drop et extraction de vignettes.

### Étape 2 — Timeline multipiste & Ergonomie CapCut (02/11/2026)
- Implémentation du moteur de manipulation de timeline `src/core/timeline/timelineOps.ts` (ajout, déplacement, scission, rognage gauche/droite, suppression, recalcul de durée).
- Création de la suite de tests unitaires `src/core/timeline/timelineOps.test.ts` (19 tests au total).
- Enrichissement du store Zustand `src/store/projectStore.ts` (gestion du zoom, tête de lecture, sélection active de clip, outils sélection/rasoir/suppression).
- Conception des composants de timeline :
  - `TimelineToolbar` : sélection, rasoir, suppression, timecode SMPTE, curseur de zoom, bouton d'ajustement.
  - `TimelineRuler` : réglette graduée adaptative avec support du glisser-déplacer (scrubbing).
  - `TimelinePlayhead` : curseur rouge vif avec ligne verticale traversante.
  - `TimelineTrackHeader` : contrôles de pistes (titre, mute, verrouillage).
  - `TimelineClip` : segments colorés par type de média avec poignées de rognage interactives et déplacement fluide.
  - `Timeline` : conteneur complet avec réception du drag & drop d'assets depuis la médiathèque.
- Conception des panneaux complémentaires inspirés de CapCut :
  - `PreviewMonitor` : lecteur 16:9 avec barre de transport (Play/Pause, saut ±1s, timecode).
  - `InspectorPanel` : panneau latéral droit pour éditer le volume, le zoom et l'opacité du clip sélectionné.
  - `Header` : nom de projet éditable et bouton d'export.
- Compilation de production Vite et tests unitaires validés avec succès.

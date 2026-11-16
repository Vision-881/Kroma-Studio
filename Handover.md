# Dossier d'Ingénierie Inverse CapCut & Architecture d'Éditeur Vidéo Minimal

> **Notice pour les agents IA & développeurs** : Ce document constitue la base de transmission de contexte (*handover*) pour reprendre, auditer ou poursuivre les travaux d'analyse et de développement d'un éditeur vidéo minimal inspiré de CapCut.

---

## 1. Contexte & Cibles Analysées

* **Application analysée** : CapCut Desktop Windows (version `9.5.0.4050`).
* **Répertoire d'installation des exécutables et DLLs** :
  `C:\Users\Oscar\AppData\Local\CapCut\Apps\9.5.0.4050`
* **Répertoire des données utilisateurs et projets** :
  `C:\Users\Oscar\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\`
* **Outils d'analyse utilisés** :
  * Serveur MCP **REA (Reverse Engineer Anything v6.8.0)** connecté localement via Antigravity.
  * Outils REA validés : `binary_session`, `inspect_desktop_application`, `inspect_pe_imports`, `inspect_native_exports`, `inspect_go_binary`, `inspect_rust_binary`.
  * Scripts Node.js / PowerShell pour le parsing structurel des fichiers JSON de projet.

---

## 2. Découvertes d'Ingénierie Inverse (Faits Établis & Preuves)

### 2.1 Stack Technologique & Runtimes
1. **Langage Principal** : C++ (MSVC x64), avec runtime UCRT (`ucrtbase.dll`, `MSVCP140.dll`, `VCRUNTIME140.dll`, `VCRUNTIME140_1.dll`).
2. **Interface Graphique Principale** : **Qt 6.2.2** (`Qt6Core.dll`, `Qt6Gui.dll`, `Qt6Widgets.dll`, `Qt6Quick.dll`, `Qt6Qml.dll`).
   * *Preuve* : `CapCut.exe` importe directement `QQmlPrivate::qmlregister`, `QString`, `QDir`, `QUrl`.
   * Dossier `plugins\` standard Qt (`platforms\qwindows.dll`, `styles\qwindowsvistastyle.dll`).
3. **Composants Web & Chatbot IA** : **Chromium Embedded Framework (CEF v121)**.
   * *Preuve* : Dossier `cef\` avec `libcef.dll` (v121.0.6167.86), `v8_context_snapshot.bin`, `resources.pak`.
   * DLL glue : `CefCreator.dll`, `PlatinumWebView.dll`.
4. **Vues Déclaratives Cross-Platform** : **ByteDance Lynx (v3.9)** avec moteur JavaScript **QuickJS**.
   * *Preuve* : `lynx.dll` (23 Mo) exportant `fml::lynx::TaskRunner`, `clay::CanvasManager`, wrappers `Napi::*`.
   * `quickjs_cache\meta.json` déclarant explicitement le runtime QuickJS pour `core_js` sous Lynx v3.9.
5. **Agent IA & LLM Orchestration** : **Go 1.25.11** (`deepagents_capi.dll`, 40 Mo).
   * *Preuve* : Inspection REA `inspect_go_binary` : `-buildmode=c-shared`, module `code.byted.org/cc-family-infra/carrier-agent-sdk/capi`, framework CloudWeGo Eino (`github.com/cloudwego/eino`), connecteurs Doubao Ark, Gemini, OpenAI, GORM, Kitex. Export PE : `_cgo_dummy_export`.

### 2.2 Moteurs Multimédia, Traitement & Effets
1. **Décodage & Démuxage Vidéo** : **FFmpeg 7.0** (`avcodec-61.dll`, `avformat-61.dll`, `avfilter-10.dll`, `swscale-8.dll`, `swresample-5.dll`).
2. **Codecs Spécialisés** :
   * `ByteVC1_dec.dll` : Décodeur propriétaire ByteDance H.265 / HEVC / VVC.
   * `SvtAv1Enc.dll` : Encodeur SVT-AV1 (Intel / Alliance for Open Media) pour l'encodage AV1.
   * `nvjpeg64_12.dll` : Décodage JPEG accéléré par CUDA GPU (NVIDIA).
   * `ttheif_dec.dll` : Décodeur d'images HEIF.
   * `jxl.dll` : Décodeur d'images JPEG XL (libjxl).
3. **Moteur 3D & Effets Visuels (VFX)** : **AmazingEngine** dans `cccreator.dll` (151 Mo).
   * *Preuve* : Exports vérifiés sous l'espace de noms `AmazingEngine::Segment`, `AmazingEngine::AllowList`.
4. **Computer Vision & Tracking** : **Bach** et **Lens** (`lens.dll`, 84 Mo).
   * *Preuve* : `lens.dll` importe `fastcv.dll` (Qualcomm FastCV) et `d3d11.dll`. `cccreator.dll` exporte `Bach::ApolloFace3DInfoClass`, `Bach::ActionDetectBuffer`.
5. **Moteur Audio DSP** : **Mammon Engine** (`audioeffect.dll`, 13 Mo).
   * *Preuve* : Exports `mammon::WaveformVisualizer`, `mammon::CycleFifoBufferX`. Présence de `Resources\rnnoise` (IA débruitage).
6. **Moteur d'Inférence IA** : **Intel OpenVINO v2025.1** (`openvino.dll`, `openvino_intel_npu_plugin.dll`) et **ByteNN** (`bytenn_openvinowrapper.dll`).
7. **Signature et Provenance de Contenu** : **C2PA SDK** (`tt_c2pa_sdk.dll`, 7.6 Mo) pour certifier l'authenticité des médias générés/édités par IA.

### 2.3 Rendu du Viewport & IPC
1. **Google ANGLE** : Dossier `VEAngle\` (`libEGL.dll`, `libGLESv2.dll`) traduisant l'OpenGL ES d'AmazingEngine/VE vers Direct3D 11.
2. **Fallback Logiciel** : `opengl32sw.dll` (Mesa llvmpipe).
3. **IPC Inter-processus** : `bd_mojo.dll` (Chromium Mojo IPC) reliant le processus principal aux sous-processus CEF, `VEHelper.exe`, `VEDetector.exe`.
4. **Bus Interne Typé** : Bus RPC C++ Lyra (`lyra_cli_client.dll`) véhiculant des `*ReqStruct` et `*RespStruct`.

---

## 3. Format de Données des Projets CapCut (`draft_content.json`)

### 3.1 Unité Temporelle
* Toutes les durées et tous les points de départ/fin sont stockés sous forme d'**entiers 64 bits en microsecondes** ($\mu\text{s}$, $10^{-6}\text{ seconde}$).
* Exemple : $1\text{ seconde} = 1\,000\,000\ \mu\text{s}$ ; $14{,}7\text{ s} = 14\,700\,000\ \mu\text{s}$.

### 3.2 Modèle Relationnel
Le projet est normalisé :
```
draft_content.json
├── canvas_config         (Résolution 1920x1080, ratio, fps 60.0)
├── tracks[]              (Pistes ordonnées par Z-order : video, audio, effect, text, adjust)
│   └── segments[]        (Occurrences temporelles sur la timeline)
│       ├── target_timerange (start, duration sur la timeline en µs)
│       ├── source_timerange (in-point, duration découpée dans le média source en µs)
│       ├── clip             (alpha, rotation, scale{x,y}, transform{x,y}, flip)
│       ├── common_keyframes (Courbes de Bézier animant position, échelle, etc.)
│       ├── material_id      (Clé étrangère vers materials.*)
│       └── extra_material_refs[] (Clés vers modificateurs : speed, canvas, vocal separation...)
└── materials
    ├── videos[]          (Chemin absolu disque, résolution native, crop, matting IA)
    ├── audios[]          (Chemin absolu disque, volume, fades)
    ├── texts[]           (Texte brut, JSON de styles, polices de caractères)
    ├── video_effects[]   (Identifiant catalogue effect_id, sliders adjust_params)
    ├── transitions[]     (Nom, durée de transition, template de fondu)
    └── speeds[]          (Vitesse constante ou curve_speed)
```

---

## 4. Spécifications du Projet Minimal (Cahier des Charges)

Le cahier des charges complet rédigé pour concevoir un éditeur vidéo minimal inspiré de cette architecture est conservé dans l'artéfact Antigravity :
📄 `cahier_des_charges_editeur_video.md`

### 4.1 Les 7 Modules Cibles à Développer
1. **Module 1 : IHM & Couche Présentation** (Qt 6 QML ou Rust Slint).
2. **Module 2 : Orchestrateur de Session & Modèle de Projet** (Parsing JSON, Pattern Commande pour Undo/Redo).
3. **Module 3 : Ordonnancement & Évaluation de la Timeline** (Calcul du *Frame Render Plan* à l'instant $t$, interpolation Bézier).
4. **Module 4 : Ingestion & Décodage Média** (FFmpeg C API, cache LRU de trames, lecture asynchrone).
5. **Module 5 : Mixeur Audio & DSP** (MiniAudio, Master Clock calée sur le callback audio, rééchantillonnage 48 kHz float).
6. **Module 6 : Compositeur GPU & Shaders** (DirectX 11 ou OpenGL ES / ANGLE, passes de rendu FBO, shaders de transformation et de LUT).
7. **Module 7 : Transcodage & Exportation** (Boucle séquentielle $t = 0 \to \text{duration}$, encodage H.264/AAC MP4 via FFmpeg).

### 4.2 Feuille de Route en 5 Phases
* **Phase 1** : Socle de données C++ / Rust & Extracteur de frames CLI via FFmpeg.
* **Phase 2** : Pipeline de rendu GPU & Viewport fluide avec lecture audio synchronisée.
* **Phase 3** : Timeline multipiste & Interface graphique interactive (découpe, déplacement, Z-order).
* **Phase 4** : Pipeline de shaders, filtres de couleur, transitions et interpolation d'images-clés.
* **Phase 5** : Moteur d'exportation hors-ligne MP4 et optimisations de cache mémoire.

---

## 5. Guide Pratique pour Reprendre le Travail (Instructions Agent)

Si un agent IA (ou un développeur) doit poursuivre cette tâche, voici les commandes et scripts de vérification rapides :

### 5.1 Vérifier la Présence et l'État du Serveur REA
```powershell
# Depuis Antigravity, appeler l'outil MCP rea:binary_session avec {}
# Il doit répondre avec package "rea-agents" v6.8.0 et provider Ghidra 12.1.4 disponible.
```

### 5.2 Inspecter un Projet CapCut Réel sur la Machine
```powershell
# Lister les projets existants
Get-ChildItem "C:\Users\Oscar\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft"

# Examiner les pistes d'un projet spécifique avec Node.js
node -e "const fs = require('fs'); const d = JSON.parse(fs.readFileSync('C:/Users/Oscar/AppData/Local/CapCut/User Data/Projects/com.lveditor.draft/0404/draft_content.json', 'utf8')); console.log(d.tracks.map(t => ({type: t.type, segments: t.segments.length})));"
```

### 5.3 Lancer une Nouvelle Analyse Binaire sur une DLL de CapCut
Pour inspecter les imports/exports sans bloquer les limites stdio REA :
```json
// Outil MCP : rea:inspect_pe_imports
{
  "path": "C:\\Users\\Oscar\\AppData\\Local\\CapCut\\Apps\\9.5.0.4050\\videoeditor.dll",
  "max_file_bytes": 100000000,
  "max_functions": 30000
}
```

### 5.4 Prochaines Actions Recommandées
1. **Initialiser le squelette de code de la Phase 1** :
   * Créer la structure du projet (ex. `CMakeLists.txt` avec dépendances `nlohmann_json` et `FFmpeg` sous C++20, ou `Cargo.toml` avec `ffmpeg-next` et `serde` sous Rust).
2. **Définir le schéma JSON formel** :
   * Écrire un `project_schema.json` validant le format de projet minimal défini dans la section 2.
3. **Créer le premier prototype de décodeur** :
   * Valider la lecture d'une vidéo locale et l'extraction d'images RGBA à un timecode donné en microsecondes.


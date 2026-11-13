/**
 * Script de préchargement sécurisé pour Electron (Kroma Studio Desktop).
 * Expose les informations d'environnement et de plateforme à l'interface React.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('kromaDesktop', {
  isDesktop: true,
  platform: process.platform,
  version: '1.0.0',
});

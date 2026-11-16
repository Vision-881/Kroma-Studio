@echo off
title Kroma Studio Desktop Launcher
echo Lancement de Kroma Studio en mode Application de Bureau...
cd /d "%~dp0"
call npm run app:dist
pause

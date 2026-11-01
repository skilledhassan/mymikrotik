@echo off
title OpenWA WhatsApp Gateway
echo ========================================================
echo   Starting OpenWA WhatsApp Gateway (Port 2785)...
echo ========================================================
cd /d "%~dp0OpenWA"
node dist/main.js
pause

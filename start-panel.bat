@echo off
title MikroTik Billing & Admin Panel
echo ========================================================
echo   Starting MikroTik Admin Panel (Port 3000)...
echo ========================================================
cd /d "%~dp0"
node app.js
pause

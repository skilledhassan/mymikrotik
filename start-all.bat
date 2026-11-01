@echo off
title MikroTik + OpenWA Launcher
echo ========================================================
echo   Launching OpenWA WhatsApp Gateway and MikroTik Panel
echo ========================================================
start "OpenWA WhatsApp Gateway (Port 2785)" cmd /k "cd /d \"%~dp0OpenWA\" && node dist/main.js"
timeout /t 5 /nobreak >nul
start "MikroTik Admin Panel (Port 3000)" cmd /k "cd /d \"%~dp0\" && node app.js"
echo.
echo OpenWA and MikroTik panel have been launched in separate windows!
echo OpenWA Gateway: http://localhost:2785
echo Panel & Login:  http://localhost:3000
echo.
pause

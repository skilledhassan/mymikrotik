@echo off
title Push Updates to aaPanel VPS (truthguard.site)
echo =======================================================
echo   Deploying MikroTik Panel to aaPanel (Port 3002)
echo   Host: 187.53.134.170 | http://truthguard.site/
echo =======================================================
echo.

node scripts/deploy-to-aapanel.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Deployment failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Deployment finished successfully!
pause

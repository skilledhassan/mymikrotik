@echo off
cd /d "%~dp0"
echo ===================================================
echo   Pushing mikrotik-panel to GitHub: skilledhassan
echo ===================================================
echo.

:: Set git identity for this repo if not already set
git config user.name "skilledhassan"
git config user.email "skilledhassan@users.noreply.github.com"

echo 1. Staging files...
git add .

echo 2. Committing changes...
git commit -m "Deploy mikrotik-panel to GitHub for Render"

echo 3. Setting main branch...
git branch -M main

echo 4. Pushing to https://github.com/skilledhassan/mymikrotik.git ...
git push -u origin main

echo.
echo ===================================================
echo Process finished!
echo ===================================================
pause

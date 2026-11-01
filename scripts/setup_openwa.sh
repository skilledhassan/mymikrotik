#!/bin/bash
set -e

echo "=== 1. Checking Google Chrome ==="
if ! command -v google-chrome &> /dev/null; then
    echo "Downloading Google Chrome deb package..."
    cd /tmp
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    echo "Installing Google Chrome..."
    apt-get update -qq
    apt-get install -y ./google-chrome-stable_current_amd64.deb
    rm -f google-chrome-stable_current_amd64.deb
fi
echo "Google Chrome version: $(google-chrome --version)"
which google-chrome

echo "=== 2. Extracting OpenWA dist and env ==="
mkdir -p /home/hassan/OpenWA/data/sessions /home/hassan/OpenWA/data/media
tar -xzf /home/hassan/openwa_dist.tar.gz -C /home/hassan/OpenWA/
cp /home/hassan/openwa.env /home/hassan/OpenWA/.env
chown -R hassan:hassan /home/hassan/OpenWA
ls -lh /home/hassan/OpenWA/dist/main.js

echo "=== 3. Installing OpenWA dependencies ==="
cd /home/hassan/OpenWA
npm install --omit=dev --silent
chown -R hassan:hassan /home/hassan/OpenWA/node_modules

echo "=== 4. Starting OpenWA with PM2 ==="
cd /home/hassan/OpenWA
pm2 delete openwa 2>/dev/null || true
pm2 start dist/main.js --name openwa --time
pm2 save

echo "=== 5. Waiting for OpenWA to listen on 2785 ==="
sleep 6
ss -tulpn | grep 2785 || echo "Port 2785 checking..."
curl -i http://127.0.0.1:2785/api/health || curl -i http://127.0.0.1:2785/ || echo "Initial ping done"

echo "=== 6. Updating mymikrotik .env ==="
cp /home/hassan/.env.production /www/wwwroot/mymikrotik/.env
chown www:www /www/wwwroot/mymikrotik/.env
chmod 640 /www/wwwroot/mymikrotik/.env
cd /www/wwwroot/mymikrotik && pm2 reload mymikrotik --update-env

echo "=== OpenWA Setup Script Finished Successfully ==="

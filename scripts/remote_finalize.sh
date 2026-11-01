#!/bin/bash
set -e

echo "=== 1. Setting up .env ==="
cp /home/hassan/.env.production /www/wwwroot/mymikrotik/.env
chown www:www /www/wwwroot/mymikrotik/.env
chmod 640 /www/wwwroot/mymikrotik/.env
echo ".env installed successfully."

echo "=== 2. Registering Database in aaPanel SQLite ==="
python3 /home/hassan/register_db.py

echo "=== 3. Testing MySQL Query via Local Credentials ==="
mysql -u mymikrotik -p'Player@1187#db' -h 127.0.0.1 -e "SELECT count(*) AS total_users FROM mymikrotik.mikrotik_users; SELECT count(*) AS money_records FROM mymikrotik.money_entries; SELECT count(*) AS daily_bandwidth_records FROM mymikrotik.user_bandwidth_daily;"

echo "=== 4. Testing Node.js DB Query ==="
cd /www/wwwroot/mymikrotik
node -e "require('dotenv').config({path:'/www/wwwroot/mymikrotik/.env'}); const db = require('./db'); db.query('SELECT count(*) as count FROM mikrotik_users', []).then(rows => { console.log('Node.js DB query OK! Users in DB:', rows[0].count); process.exit(0); }).catch(e => { console.error('Node DB Error:', e); process.exit(1); });"

echo "=== 5. Reloading PM2 process ==="
cd /www/wwwroot/mymikrotik
pm2 reload mymikrotik || pm2 restart mymikrotik
pm2 save

echo "=== 6. Checking Process Status & Local Port 3002 ==="
sleep 2
curl -I http://127.0.0.1:3002/login

echo "=== MIGRATION & DEPLOYMENT COMPLETED SUCCESSFULLY ==="

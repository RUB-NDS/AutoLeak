#!/bin/bash

echo "[+] Starting $(date)"
cd /opt/autoleak
docker compose down
certbot renew
docker compose -f docker-compose.yml -f docker-compose.letsencrypt.yml up --build -d
echo "[+] done"

# 0 4 20 * * /opt/autoleak/cron.sh >> /root/cron.log 2>&1
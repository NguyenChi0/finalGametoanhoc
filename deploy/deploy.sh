#!/usr/bin/env bash
# Chạy trên EC2 sau khi đã clone repo vào /opt/gametoanhoc
set -euo pipefail

ROOT="/opt/gametoanhoc"
cd "$ROOT"

echo "==> Backend: npm ci..."
cd backend
npm ci --omit=dev

echo "==> Frontend: build production..."
cd ../frontend
npm ci
VITE_API_BASE=/api npm run build

echo "==> Copy frontend dist..."
sudo rm -rf /var/www/gametoanhoc/*
sudo cp -r dist/* /var/www/gametoanhoc/

echo "==> Khởi động API với PM2..."
cd "$ROOT"
pm2 delete gametoanhoc-api 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

echo "==> Reload Nginx (cần copy deploy/nginx-gametoanhoc.conf trước)..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "Deploy xong. Truy cập: http://YOUR_DOMAIN/gametoanhoc/"

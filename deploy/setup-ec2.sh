#!/usr/bin/env bash
# Chạy trên EC2 Amazon Linux 2023 (sudo bash deploy/setup-ec2.sh)
set -euo pipefail

echo "==> Cài Node.js 22, Nginx, PM2, Git..."
sudo dnf update -y
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs nginx git
sudo npm install -g pm2

echo "==> Tạo thư mục triển khai..."
sudo mkdir -p /opt/gametoanhoc /var/www/gametoanhoc
sudo chown -R "$USER:$USER" /opt/gametoanhoc /var/www/gametoanhoc

echo "==> Bật Nginx..."
sudo systemctl enable nginx
sudo systemctl start nginx

echo ""
echo "Hoàn tất cài đặt cơ bản."
echo "Tiếp theo:"
echo "  1. Clone repo vào /opt/gametoanhoc"
echo "  2. Tạo backend/.env (xem backend/.env.example)"
echo "  3. Import DB vào RDS MySQL"
echo "  4. Chạy: bash deploy/deploy.sh"

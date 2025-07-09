#!/bin/bash
set -e

echo "[INFO] Starting Minecraft Manager deployment..."

# Create users if not already present
id minecraft &>/dev/null || useradd -m -r -s -d /bin/bash minecraft
id minecraft-manager &>/dev/null || useradd -d -m -r -s /bin/bash minecraft-manager

echo "[INFO] Creating directory structure..."
mkdir -p /home/minecraft/Minecraft/mods
mkdir -p /home/minecraft-manager/minecraft-manager
chown -R minecraft-manager:minecraft-manager /home/minecraft-manager

echo "[INFO] Setting up application code..."
cd /home/minecraft-manager/minecraft-manager

echo "[INFO] Cloning repository..."
if [ ! -d ".git" ] || ! git remote get-url origin | grep -q "github.com/landonis/Fabric-MC-Mgmt"; then
  rm -rf ./*
  git clone https://github.com/landonis/Fabric-MC-Mgmt.git .
fi

 # ← replace with your repo if not local

echo "[INFO] Generating secure configuration..."
cp .env.example .env || touch .env

echo "[INFO] Installing application dependencies..."
apt update
apt install -y openjdk-21-jdk curl wget unzip sqlite3 nodejs npm git nginx

cd backend
npm install
npm install --save-dev typescript \
  @types/node \
  @types/express \
  @types/jsonwebtoken \
  @types/bcrypt \
  @types/multer \
  @types/cors \
  @types/ws \
  @types/better-sqlite3
npm install ws


echo "[INFO] Building backend..."
npm run build

echo "[INFO] Creating backend systemd service..."
cat <<EOF > /etc/systemd/system/minecraft-manager.service
[Unit]
Description=Minecraft Manager Backend
After=network.target

[Service]
User=minecraft-manager
WorkingDirectory=/home/minecraft-manager/minecraft-manager/backend
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "[INFO] Setting up frontend..."
cd ../frontend
npm install

npm run build
mkdir -p /var/www/html
cp -r dist/* /var/www/html/

echo "[INFO] Building Fabric mod..."
cd ../mods/player-viewer
chmod +x ./gradlew
./gradlew build
cp build/libs/*.jar /home/minecraft/Minecraft/mods/player-viewer-mod.jar

echo "[INFO] Installing Minecraft Fabric server..."
cd /home/minecraft/Minecraft
curl -O https://meta.fabricmc.net/v2/versions/installer/0.11.2/fabric-installer-0.11.2.jar
java -jar fabric-installer-0.11.2.jar server -mcversion 1.21.7 -downloadMinecraft
echo "eula=true" > eula.txt

echo "[INFO] Creating Minecraft server systemd service..."
cat <<EOF > /etc/systemd/system/minecraft-server.service
[Unit]
Description=Minecraft Fabric Server
After=network.target

[Service]
User=minecraft
WorkingDirectory=/home/minecraft/Minecraft
ExecStart=/usr/bin/java -jar fabric-server-launch.jar nogui
Restart=always

[Install]
WantedBy=multi-user.target
EOF

echo "[INFO] Setting WebSocket .env default..."
mkdir -p /home/minecraft/Minecraft/mods/player-viewer
echo "WEBSOCKET_SERVER=ws://localhost:3020" > /home/minecraft/Minecraft/mods/player-viewer/.env
chown -R minecraft:minecraft /home/minecraft/Minecraft

echo "[INFO] Installing rclone for Google Drive backup..."
apt update
apt install -y rclone

echo "[INFO] Installing iptables-persistent and applying firewall rules..."
apt install -y iptables iptables-persistent
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 3020 -j ACCEPT
iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -P INPUT DROP
netfilter-persistent save

echo "[INFO] Enabling and starting services..."
systemctl daemon-reload
systemctl enable minecraft-server
systemctl enable minecraft-manager
systemctl restart minecraft-server
systemctl restart minecraft-manager

echo "[INFO] Running health check..."
bash deployment/post_deploy_check.sh

echo "✅ Setup complete and services running."

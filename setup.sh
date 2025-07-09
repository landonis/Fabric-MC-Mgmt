#!/bin/bash
npm install -g typescript
set -e

echo "🚀 Starting Minecraft Manager deployment..."

# Create necessary users and dirs
useradd -m -r -s /bin/bash minecraft || true
mkdir -p /home/minecraft/Minecraft
mkdir -p /home/minecraft-manager/minecraft-manager
mkdir -p /home/minecraft-manager/minecraft-data/scripts

# Install dependencies
apt update
apt install -y openjdk-21-jdk curl wget unzip sqlite3 nginx nodejs npm git

# Set up environment
cd /home/minecraft-manager/minecraft-manager

# === BACKEND ===
echo "[INFO] Installing global TypeScript compiler..."

echo "[INFO] Setting up backend..."
cd backend
npm install
npm install --save-dev @types/node

npx tsc

# Create backend systemd unit
cat <<EOF > /etc/systemd/system/minecraft-manager.service
[Unit]
Description=Minecraft Manager Backend
After=network.target

[Service]
User=minecraft
WorkingDirectory=/home/minecraft-manager/minecraft-manager/backend
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reexec
systemctl enable minecraft-manager
systemctl restart minecraft-manager

# === FRONTEND ===
cd ../frontend
npm install
npm run build
cp -r dist/* /var/www/html/

# === MOD + SERVER ===
cd ../mods/player-viewer
./gradlew build

cp build/libs/*.jar /home/minecraft/Minecraft/mods/player-viewer-mod.jar

# === Fabric installer and server ===
cd /home/minecraft/Minecraft
curl -O https://meta.fabricmc.net/v2/versions/installer/0.11.2/fabric-installer-0.11.2.jar
java -jar fabric-installer-0.11.2.jar server -mcversion 1.21.7 -downloadMinecraft
echo "eula=true" > eula.txt

# Create Minecraft systemd unit
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

systemctl daemon-reexec
systemctl enable minecraft-server
systemctl restart minecraft-server

# === WebSocket Mod Env File ===
echo "WEBSOCKET_SERVER=ws://localhost:3020" > /home/minecraft/Minecraft/mods/player-viewer/.env

# === Health Check ===
bash deployment/post_deploy_check.sh

echo "✅ Setup complete."


# === iptables firewall rules ===
iptables -A INPUT -p tcp --dport 22 -j ACCEPT   # SSH
iptables -A INPUT -p tcp --dport 80 -j ACCEPT   # Web server (frontend)
iptables -A INPUT -p tcp --dport 3020 -j ACCEPT # WebSocket server
iptables -A INPUT -p tcp --dport 25565 -j ACCEPT # Minecraft server
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -P INPUT DROP


# === persist iptables rules ===
echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
apt install -y iptables-persistent
netfilter-persistent save

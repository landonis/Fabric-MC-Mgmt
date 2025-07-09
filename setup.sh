#!/bin/bash
set -e

# ─── Config ────────────────────────────────────────────────────────────────────
MC_VERSION="1.20.4"            # change to whatever Minecraft version you need
FABRIC_LOADER="0.14.23"        # match to the Fabric loader version you want
FABRIC_INSTALLER_VER="0.11.4"  # Fabric installer version

PROJECT_USER="minecraft-manager"
PROJECT_DIR="/home/$PROJECT_USER/minecraft-manager"
MC_DIR="$PROJECT_DIR/minecraft"

# ─── Install system dependencies ───────────────────────────────────────────────
apt-get update
DEPS=(curl git unzip zip build-essential openjdk-17-jdk-headless nodejs npm sqlite3 rclone)
apt-get install -y "${DEPS[@]}"
npm install -g yarn

# ─── Create service user ───────────────────────────────────────────────────────
if ! id -u $PROJECT_USER &>/dev/null; then
  useradd -m -s /bin/bash $PROJECT_USER
fi

# ─── Copy project into place ───────────────────────────────────────────────────
rm -rf $PROJECT_DIR
mkdir -p $PROJECT_DIR
cp -R ./* $PROJECT_DIR
chown -R $PROJECT_USER:$PROJECT_USER $PROJECT_DIR

cd $PROJECT_DIR

# ─── Backend build & DB init ───────────────────────────────────────────────────
cd backend
npm ci
npm run build
node dist/database/init.js

# ─── Frontend build ───────────────────────────────────────────────────────────
cd ../frontend
npm ci
npm run build

# ─── Fabric Minecraft Server install ──────────────────────────────────────────
mkdir -p $MC_DIR
cd $MC_DIR

# Download the Fabric installer
INSTALLER_JAR="fabric-installer-${FABRIC_INSTALLER_VER}.jar"
curl -sSL "https://maven.fabricmc.net/net/fabricmc/fabric-installer/${FABRIC_INSTALLER_VER}/${INSTALLER_JAR}" -o $INSTALLER_JAR

# Run it in “server” mode, which will download the Minecraft server & loader
java -jar $INSTALLER_JAR server \
  -mcVersion $MC_VERSION \
  -loaderVersion $FABRIC_LOADER \
  -downloadMinecraft

# Clean up installer artifact
rm $INSTALLER_JAR

# Auto-accept the EULA
echo "eula=true" > eula.txt

# ─── Systemd service: Backend ──────────────────────────────────────────────────
cat <<EOF > /etc/systemd/system/minecraft-manager-backend.service
[Unit]
Description=Minecraft Server Manager Backend
After=network.target

[Service]
User=$PROJECT_USER
WorkingDirectory=$PROJECT_DIR/backend
ExecStart=/usr/bin/node $PROJECT_DIR/backend/dist/server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=SESSION_SECRET=${SESSION_SECRET}

[Install]
WantedBy=multi-user.target
EOF

# ─── Systemd service: Fabric Minecraft ────────────────────────────────────────
# Note: Fabric installer creates 'server.jar' and 'fabric-server-launch.jar'
cat <<EOF > /etc/systemd/system/minecraft-server.service
[Unit]
Description=Fabric Minecraft Server ($MC_VERSION)
After=network.target

[Service]
User=$PROJECT_USER
WorkingDirectory=$MC_DIR
ExecStart=/usr/bin/java -Xmx1024M -Xms1024M -jar fabric-server-launch.jar nogui
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# ─── Enable & start everything ─────────────────────────────────────────────────
systemctl daemon-reload
systemctl enable minecraft-manager-backend.service
systemctl enable minecraft-server.service
systemctl start minecraft-manager-backend.service
systemctl start minecraft-server.service

echo "✔ Deployment complete: Backend + Fabric server running under systemd."

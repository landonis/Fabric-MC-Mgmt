#!/bin/bash
set -e
cd /home/minecraft/Minecraft
echo "Backing up server..."
tar czf /home/minecraft-manager/minecraft-data/backups/server-$(date +%Y%m%d-%H%M%S).tar.gz world/ || true
echo "Reinstalling latest Fabric launcher..."
FABRIC_META_URL="https://maven.fabricmc.net/net/fabricmc/fabric-installer/maven-metadata.xml"
FABRIC_VERSION=$(curl -s "$FABRIC_META_URL" | grep "<latest>" | sed -E 's|.*<latest>(.*)</latest>.*|\1|')
wget -q -O fabric-installer.jar "https://maven.fabricmc.net/net/fabricmc/fabric-installer/$FABRIC_VERSION/fabric-installer-$FABRIC_VERSION.jar"
sudo -u minecraft java -jar fabric-installer.jar server -mcversion 1.21.7 -downloadMinecraft
rm -f fabric-installer.jar
systemctl restart minecraft-server
echo "✅ Update complete."

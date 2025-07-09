echo -e "${YELLOW}Creating systemd services...${NC}"

# Create Minecraft Fabric Server service
cat > /etc/systemd/system/minecraft-server.service << EOF
[Unit]
Description=Minecraft Fabric Server
After=network.target

[Service]
Type=simple
User=minecraft
WorkingDirectory=/home/ubuntu/Minecraft
ExecStart=/usr/bin/java -Xmx2G -Xms1G -jar fabric-server-launch.jar nogui
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create Minecraft Manager backend service
cat > /etc/systemd/system/minecraft-manager.service << EOF
[Unit]
Description=Minecraft Server Manager Backend
After=network.target

[Service]
Type=simple
User=minecraft-manager
WorkingDirectory=/home/ubuntu/minecraft-manager
Environment=NODE_ENV=production
EnvironmentFile=/home/ubuntu/minecraft-manager/.env
ExecStart=/usr/bin/node backend/dist/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to recognize new services
systemctl daemon-reload

# Enable both services on boot
systemctl enable minecraft-server
systemctl enable minecraft-manager

# Optionally, start both services now
systemctl start minecraft-server
systemctl start minecraft-manager

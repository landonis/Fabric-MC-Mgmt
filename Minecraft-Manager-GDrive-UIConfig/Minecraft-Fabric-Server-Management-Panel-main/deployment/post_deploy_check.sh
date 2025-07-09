#!/bin/bash

echo "🩺 Running post-deployment health checks..."

# Check frontend (NGINX serving index)
echo -n "🌐 Frontend reachable via NGINX: "
curl -s http://localhost | grep -q '<!DOCTYPE html>' && echo "✅" || echo "❌"

# Check backend API
echo -n "🧠 Backend API available: "
curl -s http://localhost/api/server/update | grep -q 'output' && echo "✅" || echo "❌"

# Check WebSocket server
echo -n "🔌 WebSocket server listening on :3020: "
ss -tuln | grep -q ':3020' && echo "✅" || echo "❌"

# Check Minecraft systemd service
echo -n "🎮 Minecraft server running: "
systemctl is-active --quiet minecraft-server && echo "✅" || echo "❌"

# Check if Fabric mod is talking (mock or real)
echo -n "🧩 Checking player API (mock or live): "
curl -s http://localhost/api/players | grep -q '"players"' && echo "✅" || echo "❌"

echo "✅ Health check complete."

#!/bin/bash

# Paths
NGINX_AVAILABLE="/etc/nginx/sites-available/minecraft-manager"
NGINX_ENABLED="/etc/nginx/sites-enabled/minecraft-manager"
FRONTEND_PATH="/home/ubuntu/minecraft-manager/dist"

echo "🔧 Setting up NGINX configuration for Minecraft Server Manager..."

# Create NGINX config file
cat > "$NGINX_AVAILABLE" << EOF
server {
    listen 80 default_server;
    server_name _;

    location / {
        root $FRONTEND_PATH;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable the site
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

# Test config and reload
echo "🔄 Testing and reloading NGINX..."
nginx -t && systemctl reload nginx

if [ $? -eq 0 ]; then
    echo "✅ NGINX configured and reloaded successfully."
else
    echo "❌ NGINX configuration failed. Check with: sudo nginx -t"
fi

#!/bin/bash

# Minecraft Server Manager - Complete Production Setup Script
# Ubuntu 24.04 LTS - Supports domain or IP-based deployment
# This script is idempotent and can be run multiple times safely

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration Variables - Modify these as needed
DOMAIN="${DOMAIN:-}"  # Leave empty for IP-only setup
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@localhost}"
USE_SSL="${USE_SSL:-false}"
GITHUB_REPO="${GITHUB_REPO:-https://github.com/landonis/Minecraft-Fabric-Server-Management-Panel.git}"

# System Configuration
MINECRAFT_VERSION="1.21.7"
FABRIC_VERSION="0.16.14"
NODE_VERSION="18"

# System paths
APP_DIR="/home/ubuntu/minecraft-manager"
MINECRAFT_DIR="/home/ubuntu/Minecraft"
DATA_DIR="/home/ubuntu/minecraft-data"
LOG_DIR="/var/log/minecraft-manager"
BACKUP_DIR="/home/ubuntu/minecraft-backups"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Minecraft Server Manager Setup${NC}"
echo -e "${BLUE}  Production-Ready Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status messages
print_status() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if service exists
service_exists() {
    systemctl list-unit-files | grep -q "^$1.service"
}

# Function to check if user exists
user_exists() {
    id "$1" >/dev/null 2>&1
}

# Function to get server IP
get_server_ip() {
    curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "YOUR_SERVER_IP"
}

# Detect system information
print_status "Detecting system information..."
OS_VERSION=$(lsb_release -rs 2>/dev/null || echo "Unknown")
ARCHITECTURE=$(uname -m)
SERVER_IP=$(get_server_ip)

echo "  OS Version: Ubuntu $OS_VERSION"
echo "  Architecture: $ARCHITECTURE"
echo "  Server IP: $SERVER_IP"
echo "  Domain: ${DOMAIN:-"Not configured (IP-only setup)"}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq

# Install essential packages
print_status "Installing essential packages..."
apt install -y -qq \
    curl \
    wget \
    gnupg \
    lsb-release \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    unzip \
    tar \
    git \
    htop \
    tree \
    nano \
    vim \
    ufw \
    fail2ban \
    logrotate \
    build-essential \
    python3 \
    python3-dev \
    make \
    g++ \
    supervisor \
    rsyslog \
    cron \
    ntp

# Configure NTP for accurate time
print_status "Configuring NTP..."
systemctl enable ntp
systemctl start ntp

# Install Node.js
print_status "Installing Node.js $NODE_VERSION..."
if ! command_exists node || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt $NODE_VERSION ]]; then
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi

NODE_ACTUAL_VERSION=$(node -v)
print_success "Node.js installed: $NODE_ACTUAL_VERSION"

# Install Java 21
print_status "Installing Java 21..."
if ! command_exists java || ! java -version 2>&1 | grep -q 'version "21'; then
    apt install -y openjdk-21-jdk
    update-alternatives --install /usr/bin/java java /usr/lib/jvm/java-21-openjdk-amd64/bin/java 1
    update-alternatives --set java /usr/lib/jvm/java-21-openjdk-amd64/bin/java
fi

JAVA_VERSION=$(java -version 2>&1 | head -n1 | cut -d'"' -f2)
print_success "Java installed: $JAVA_VERSION"

# Install NGINX
print_status "Installing NGINX..."
if ! command_exists nginx; then
    apt install -y nginx
fi

# Install SQLite
print_status "Installing SQLite..."
if ! command_exists sqlite3; then
    apt install -y sqlite3
fi

# Install SSL tools if needed
if [[ "$USE_SSL" == "true" && -n "$DOMAIN" ]]; then
    print_status "Installing SSL tools..."
    apt install -y certbot python3-certbot-nginx
fi

# Create system users
print_status "Creating system users..."
if ! user_exists "minecraft"; then
    useradd -r -s /bin/false -d $MINECRAFT_DIR minecraft
    print_success "Created minecraft user"
else
    print_success "minecraft user already exists"
fi

if ! user_exists "minecraft-manager"; then
    useradd -r -s /bin/false -d $APP_DIR minecraft-manager
    print_success "Created minecraft-manager user"
else
    print_success "minecraft-manager user already exists"
fi

# Add minecraft-manager to minecraft group
usermod -aG minecraft minecraft-manager 2>/dev/null || true

# Create directory structure
print_status "Creating directory structure..."
directories=(
    "$APP_DIR"
    "$MINECRAFT_DIR"
    "$MINECRAFT_DIR/mods"
    "$MINECRAFT_DIR/world"
    "$MINECRAFT_DIR/backups"
    "$MINECRAFT_DIR/logs"
    "$DATA_DIR"
    "$DATA_DIR/data"
    "$LOG_DIR"
    "$BACKUP_DIR"
    "/tmp/minecraft-imports"
)

for dir in "${directories[@]}"; do
    mkdir -p "$dir"
done

# Set ownership and permissions
print_status "Setting permissions..."
chown -R minecraft-manager:minecraft-manager "$APP_DIR"
chown -R minecraft:minecraft "$MINECRAFT_DIR"
chown -R minecraft-manager:minecraft-manager "$DATA_DIR"
chown -R minecraft-manager:minecraft-manager "$LOG_DIR"
chown -R minecraft-manager:minecraft-manager "$BACKUP_DIR"
chown -R minecraft:minecraft "/tmp/minecraft-imports"

# Set proper permissions
chmod 755 "$APP_DIR" "$MINECRAFT_DIR" "$DATA_DIR" "$LOG_DIR" "$BACKUP_DIR"
chmod 1777 "/tmp/minecraft-imports"  # Sticky bit for temp directory

# Clone or update application
print_status "Setting up application code..."
if [[ -d "$APP_DIR/.git" ]]; then
    print_status "Repository exists, pulling latest changes..."
    cd "$APP_DIR"
    sudo -u minecraft-manager git pull origin main || print_warning "Could not pull latest changes"
else
    print_status "Cloning repository..."
    if [[ -d "$APP_DIR" ]] && [[ "$(ls -A $APP_DIR)" ]]; then
        print_warning "Directory not empty, backing up..."
        mv "$APP_DIR" "$APP_DIR.backup.$(date +%s)"
        mkdir -p "$APP_DIR"
    fi
    sudo -u minecraft-manager git clone "$GITHUB_REPO" "$APP_DIR"
fi

cd "$APP_DIR"

# Generate secure configuration
print_status "Generating secure configuration..."
JWT_SECRET=$(openssl rand -hex 32)

# Determine frontend URL
if [[ -n "$DOMAIN" ]]; then
    if [[ "$USE_SSL" == "true" ]]; then
        FRONTEND_URL="https://$DOMAIN"
    else
        FRONTEND_URL="http://$DOMAIN"
    fi
else
    FRONTEND_URL="http://$SERVER_IP"
fi

# Create environment configuration
print_status "Creating environment configuration..."
cat > "$APP_DIR/.env" << EOF
# Environment Configuration - Generated $(date)
NODE_ENV=production
PORT=3001
FRONTEND_URL=$FRONTEND_URL

# Domain Configuration
DOMAIN=${DOMAIN:-$SERVER_IP}
USE_SSL=$USE_SSL
ADMIN_EMAIL=$ADMIN_EMAIL

# Database Configuration
DB_PATH=$DATA_DIR/data/database.db

# Security Configuration
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$(openssl rand -hex 32)

# System Paths
APP_DIR=$APP_DIR
MINECRAFT_PATH=$MINECRAFT_DIR
WORLD_PATH=$MINECRAFT_DIR/world
MODS_PATH=$MINECRAFT_DIR/mods
DATA_DIR=$DATA_DIR
LOG_DIR=$LOG_DIR
BACKUP_DIR=$BACKUP_DIR
TEMP_PATH=/tmp/minecraft-imports

# Fabric Mod Integration
FABRIC_MOD_PORT=8080
FABRIC_MOD_ENABLED=false

# Minecraft Configuration
MINECRAFT_VERSION=$MINECRAFT_VERSION
FABRIC_VERSION=$FABRIC_VERSION

# Upload Limits
MAX_MOD_SIZE=104857600
MAX_WORLD_SIZE=524288000

# Logging
LOG_LEVEL=info
EOF

# Set secure permissions on environment file
chmod 600 "$APP_DIR/.env"
chown minecraft-manager:minecraft-manager "$APP_DIR/.env"

# Install application dependencies
print_status "Installing application dependencies..."
sudo -u minecraft-manager npm install --production

# Install backend dependencies and build
print_status "Building backend..."
cd "$APP_DIR/backend"
sudo -u minecraft-manager npm install --production
sudo -u minecraft-manager npm run build

# Build frontend
print_status "Building frontend..."
cd "$APP_DIR"
sudo -u minecraft-manager npm run build

# Initialize database
print_status "Initializing database..."
cd "$APP_DIR"
sudo -u minecraft-manager NODE_ENV=production node -e "
const { initDatabase } = require('./backend/dist/database/init.js');
try {
  initDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}
"

# Setup Minecraft Fabric server
print_status "Setting up Minecraft Fabric server..."

FABRIC_JAR="$MINECRAFT_DIR/fabric-server-launch.jar"
FABRIC_VALID=false

# Check if fabric-server-launch.jar exists and is a valid JAR file
if [[ -f "$FABRIC_JAR" ]]; then
    if unzip -l "$FABRIC_JAR" > /dev/null 2>&1; then
        FABRIC_VALID=true
        print_success "Minecraft Fabric server already exists and is valid"
    else
        print_warning "Existing Fabric server jar appears to be corrupt — reinitializing..."
        rm -f "$FABRIC_JAR"
    fi
fi

if [[ "$FABRIC_VALID" == false ]]; then
    print_status "Downloading and installing Minecraft Fabric server..."
    cd "$MINECRAFT_DIR"

    # Download Fabric installer
    wget -q -O fabric-installer.jar "https://maven.fabricmc.net/net/fabricmc/fabric-installer/$FABRIC_VERSION/fabric-installer-$FABRIC_VERSION.jar"

    # Install Fabric server
    sudo -u minecraft java -jar fabric-installer.jar server -mcversion "$MINECRAFT_VERSION" -downloadMinecraft

    # Clean up installer
    rm -f fabric-installer.jar

    # Accept EULA
    echo "eula=true" > eula.txt

    # Create server.properties if missing
    if [[ ! -f server.properties ]]; then
        cat > server.properties << EOF
server-port=25565
gamemode=survival
difficulty=normal
spawn-protection=16
max-players=20
online-mode=true
white-list=false
motd=Minecraft Server managed by Fabric Server Manager
enable-rcon=false
enable-query=false
view-distance=10
simulation-distance=10
EOF
    fi

    # Set ownership
    chown -R minecraft:minecraft "$MINECRAFT_DIR"
    print_success "Minecraft Fabric server installed"
fi

# Create systemd services
print_status "Creating systemd services..."

# Minecraft server service
cat > /etc/systemd/system/minecraft-server.service << EOF
[Unit]
Description=Minecraft Fabric Server
After=network.target
Wants=network.target

[Service]
Type=simple
User=minecraft
Group=minecraft
WorkingDirectory=$MINECRAFT_DIR
ExecStart=/usr/bin/java -Xmx2G -Xms1G -jar fabric-server-launch.jar nogui
ExecStop=/bin/kill -TERM \$MAINPID
Restart=on-failure
RestartSec=10
TimeoutStartSec=300
TimeoutStopSec=30

# Output to journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=minecraft-server

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$MINECRAFT_DIR
ReadWritePaths=/tmp/minecraft-imports

# Resource limits
LimitNOFILE=4096
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Minecraft manager service
cat > /etc/systemd/system/minecraft-manager.service << EOF
[Unit]
Description=Minecraft Server Manager Backend
After=network.target
Wants=network.target

[Service]
Type=simple
User=minecraft-manager
Group=minecraft-manager
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node backend/dist/server.js
ExecReload=/bin/kill -HUP \$MAINPID
Restart=on-failure
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30

# Output to journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=minecraft-manager

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR
ReadWritePaths=$DATA_DIR
ReadWritePaths=$LOG_DIR
ReadWritePaths=$BACKUP_DIR
ReadWritePaths=/tmp/minecraft-imports

# Resource limits
LimitNOFILE=4096
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable services
systemctl daemon-reload
systemctl enable minecraft-server
systemctl enable minecraft-manager

# Configure NGINX
print_status "Configuring NGINX..."

# Determine server name
if [[ -n "$DOMAIN" ]]; then
    SERVER_NAME="$DOMAIN"
else
    SERVER_NAME="_"  # Default server for IP access
fi

cat > /etc/nginx/sites-available/minecraft-manager << EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $SERVER_NAME;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header X-Robots-Tag "noindex, nofollow" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # API proxy
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
        proxy_send_timeout 86400;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # Serve static files
    location / {
        root $APP_DIR/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # Cache HTML files for shorter time
        location ~* \.(html)$ {
            expires 1h;
            add_header Cache-Control "public, must-revalidate";
        }
    }
    
    # Security - deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Deny access to sensitive files
    location ~* \.(env|log|sql|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Enable NGINX site
ln -sf /etc/nginx/sites-available/minecraft-manager /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload NGINX
nginx -t && systemctl reload nginx

# Configure firewall
print_status "Configuring firewall..."

# Configure UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Minecraft server port
ufw allow 25565/tcp

# Enable UFW
ufw --force enable

# Configure fail2ban
print_status "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create utility scripts
print_status "Creating utility scripts..."

# Backup script
cat > /usr/local/bin/minecraft-backup.sh << EOF
#!/bin/bash
BACKUP_DIR="$BACKUP_DIR"
WORLD_DIR="$MINECRAFT_DIR/world"
DATA_DIR="$DATA_DIR"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p "\$BACKUP_DIR"

echo "Starting backup at \$(date)"

# Backup world
if [[ -d "\$WORLD_DIR" ]]; then
    echo "Backing up world..."
    tar -czf "\$BACKUP_DIR/world_backup_\$DATE.tar.gz" -C "\$(dirname "\$WORLD_DIR")" "\$(basename "\$WORLD_DIR")"
    echo "World backup created: world_backup_\$DATE.tar.gz"
else
    echo "World directory not found: \$WORLD_DIR"
fi

# Backup database
if [[ -f "\$DATA_DIR/data/database.db" ]]; then
    echo "Backing up database..."
    cp "\$DATA_DIR/data/database.db" "\$BACKUP_DIR/database_backup_\$DATE.db"
    echo "Database backup created: database_backup_\$DATE.db"
fi

# Clean up old backups (keep last 7)
echo "Cleaning up old backups..."
cd "\$BACKUP_DIR"
ls -t world_backup_*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm
ls -t database_backup_*.db 2>/dev/null | tail -n +8 | xargs -r rm

echo "Backup completed at \$(date)"
EOF

chmod +x /usr/local/bin/minecraft-backup.sh

# Status check script
cat > /usr/local/bin/minecraft-status.sh << 'EOF'
#!/bin/bash
echo "=== Minecraft Server Manager Status ==="
echo "Date: $(date)"
echo ""

echo "🔧 Services Status:"
systemctl is-active --quiet minecraft-server && echo "✅ Minecraft Server: Running" || echo "❌ Minecraft Server: Stopped"
systemctl is-active --quiet minecraft-manager && echo "✅ Manager Backend: Running" || echo "❌ Manager Backend: Stopped"
systemctl is-active --quiet nginx && echo "✅ NGINX: Running" || echo "❌ NGINX: Stopped"

echo ""
echo "📊 System Resources:"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🎮 Minecraft Server:"
if systemctl is-active --quiet minecraft-server; then
    echo "Status: Online"
    echo "Port: 25565"
    # Try to get player count from logs
    PLAYER_COUNT=$(journalctl -u minecraft-server --since "1 minute ago" -q | grep -c "joined the game" 2>/dev/null || echo "0")
    echo "Recent joins: $PLAYER_COUNT"
else
    echo "Status: Offline"
fi

echo ""
echo "🌐 Web Interface:"
if systemctl is-active --quiet minecraft-manager && systemctl is-active --quiet nginx; then
    echo "Status: Online"
    echo "Port: 80/443"
else
    echo "Status: Offline"
fi

echo ""
echo "📝 Recent Logs (last 5 minutes):"
echo "Manager:"
journalctl -u minecraft-manager --since "5 minutes ago" --no-pager -n 3 -q | tail -n 1 || echo "  No recent logs"
echo "Server:"
journalctl -u minecraft-server --since "5 minutes ago" --no-pager -n 3 -q | tail -n 1 || echo "  No recent logs"

echo ""
echo "💾 Disk Usage:"
echo "Application: $(du -sh $APP_DIR 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Minecraft: $(du -sh $MINECRAFT_DIR 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Backups: $(du -sh $BACKUP_DIR 2>/dev/null | cut -f1 || echo 'N/A')"
EOF

chmod +x /usr/local/bin/minecraft-status.sh

# Update script
cat > /usr/local/bin/minecraft-update.sh << EOF
#!/bin/bash
APP_DIR="$APP_DIR"

echo "Updating Minecraft Server Manager..."

# Stop services
systemctl stop minecraft-manager

# Backup current version
cp -r "\$APP_DIR" "\$APP_DIR.backup.\$(date +%s)"

# Pull latest changes
cd "\$APP_DIR"
sudo -u minecraft-manager git pull origin main

# Install dependencies and rebuild
sudo -u minecraft-manager npm install --production
cd backend
sudo -u minecraft-manager npm install --production
sudo -u minecraft-manager npm run build

# Build frontend
cd "\$APP_DIR"
sudo -u minecraft-manager npm run build

# Restart services
systemctl start minecraft-manager

echo "Update completed!"
EOF

chmod +x /usr/local/bin/minecraft-update.sh

# Setup log rotation
print_status "Configuring log rotation..."
cat > /etc/logrotate.d/minecraft-manager << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su minecraft-manager minecraft-manager
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# Setup cron jobs
print_status "Setting up automated tasks..."
cat > /etc/cron.d/minecraft-manager << EOF
# Minecraft Server Manager automated tasks

# Daily backup at 2 AM
0 2 * * * root /usr/local/bin/minecraft-backup.sh >> /var/log/minecraft-backup.log 2>&1

# Weekly log cleanup
0 3 * * 0 root find /var/log -name "*.log" -type f -mtime +30 -delete

# Daily status check (optional - uncomment to enable)
# 0 8 * * * root /usr/local/bin/minecraft-status.sh | mail -s "Minecraft Server Status" admin@localhost
EOF

# Start services
print_status "Starting services..."
systemctl start minecraft-manager
systemctl start minecraft-server

# Wait for services to start
sleep 10

# Check service status
print_status "Checking service status..."
MANAGER_STATUS="❌ Failed"
SERVER_STATUS="❌ Failed"
NGINX_STATUS="❌ Failed"

if systemctl is-active --quiet minecraft-manager; then
    MANAGER_STATUS="✅ Running"
fi

if systemctl is-active --quiet minecraft-server; then
    SERVER_STATUS="✅ Running"
fi

if systemctl is-active --quiet nginx; then
    NGINX_STATUS="✅ Running"
fi

echo "  Minecraft Manager: $MANAGER_STATUS"
echo "  Minecraft Server: $SERVER_STATUS"
echo "  NGINX: $NGINX_STATUS"

# SSL Certificate setup
if [[ "$USE_SSL" == "true" && -n "$DOMAIN" && "$DOMAIN" != "localhost" ]]; then
    print_status "Setting up SSL certificate..."
    if command_exists certbot; then
        certbot --nginx -d "$DOMAIN" --email "$ADMIN_EMAIL" --agree-tos --non-interactive --redirect
        if [[ $? -eq 0 ]]; then
            print_success "SSL certificate installed successfully"
        else
            print_warning "SSL certificate installation failed"
        fi
    else
        print_warning "Certbot not available, skipping SSL setup"
    fi
else
    print_warning "Skipping SSL setup (USE_SSL=$USE_SSL, DOMAIN=$DOMAIN)"
fi

# Final status and information
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Access information
echo -e "${BLUE}🌐 Access Information:${NC}"
if [[ -n "$DOMAIN" && "$DOMAIN" != "localhost" ]]; then
    if [[ "$USE_SSL" == "true" ]]; then
        echo "   Web Interface: https://$DOMAIN"
    else
        echo "   Web Interface: http://$DOMAIN"
    fi
    echo "   Minecraft Server: $DOMAIN:25565"
else
    echo "   Web Interface: http://$SERVER_IP"
    echo "   Minecraft Server: $SERVER_IP:25565"
fi

echo ""
echo -e "${BLUE}🔐 Default Admin Credentials:${NC}"
echo "   Username: admin"
echo "   Password: admin"
echo "   ⚠️  You MUST change this password on first login"

echo ""
echo -e "${BLUE}🛠️  Management Commands:${NC}"
echo "   Status Check: /usr/local/bin/minecraft-status.sh"
echo "   Manual Backup: /usr/local/bin/minecraft-backup.sh"
echo "   Update Application: /usr/local/bin/minecraft-update.sh"
echo "   View Manager Logs: journalctl -u minecraft-manager -f"
echo "   View Server Logs: journalctl -u minecraft-server -f"
echo "   Restart Manager: systemctl restart minecraft-manager"
echo "   Restart Server: systemctl restart minecraft-server"

echo ""
echo -e "${BLUE}📁 Important Paths:${NC}"
echo "   Application: $APP_DIR"
echo "   Minecraft Server: $MINECRAFT_DIR"
echo "   Database: $DATA_DIR/data/database.db"
echo "   Backups: $BACKUP_DIR"
echo "   Logs: $LOG_DIR"
echo "   Configuration: $APP_DIR/.env"

echo ""
echo -e "${BLUE}🔧 Configuration:${NC}"
echo "   Environment: $(cat $APP_DIR/.env | grep NODE_ENV | cut -d'=' -f2)"
echo "   Domain: ${DOMAIN:-"IP-based access"}"
echo "   SSL: $USE_SSL"
echo "   Minecraft Version: $MINECRAFT_VERSION"
echo "   Fabric Version: $FABRIC_VERSION"

echo ""
if [[ "$MANAGER_STATUS" == "✅ Running" && "$NGINX_STATUS" == "✅ Running" ]]; then
    echo -e "${GREEN}✅ Installation completed successfully!${NC}"
    echo -e "${GREEN}   Your Minecraft Server Manager is ready to use.${NC}"
else
    echo -e "${YELLOW}⚠️  Installation completed with warnings.${NC}"
    echo -e "${YELLOW}   Some services may not be running properly.${NC}"
    echo -e "${YELLOW}   Run '/usr/local/bin/minecraft-status.sh' for details.${NC}"
fi

echo ""
echo -e "${CYAN}📖 For detailed documentation, see README.md${NC}"
echo -e "${CYAN}🐛 For issues and support, check the GitHub repository${NC}"
echo ""

# Run additional security hardening
if [[ -f "deployment/security-hardening.sh" ]]; then
    print_status "Applying additional security hardening..."
    bash deployment/security-hardening.sh
fi

# Set up monitoring
if [[ -f "deployment/monitoring.sh" ]]; then
    print_status "Setting up monitoring and alerting..."
    bash deployment/monitoring.sh
fi

print_success "Production deployment completed with security hardening and monitoring!"
print_status "Run '/usr/local/bin/minecraft-security-audit.sh' to verify security configuration"
print_status "Run '/usr/local/bin/minecraft-monitor.sh' for real-time monitoring"
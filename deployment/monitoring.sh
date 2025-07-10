#!/bin/bash

# Minecraft Server Manager - Monitoring and Alerting Setup
# This script sets up comprehensive monitoring for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create monitoring directories
print_status "Setting up monitoring directories..."
mkdir -p /var/log/minecraft-monitoring
mkdir -p /opt/minecraft-monitoring/scripts
mkdir -p /opt/minecraft-monitoring/alerts

# System resource monitoring script
print_status "Creating system monitoring script..."
cat > /opt/minecraft-monitoring/scripts/system-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/minecraft-monitoring/system.log"
ALERT_FILE="/opt/minecraft-monitoring/alerts/system-alerts.log"

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90

# Get current metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f", ($3/$2) * 100.0)}')
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Log metrics
echo "$TIMESTAMP CPU:${CPU_USAGE}% MEM:${MEMORY_USAGE}% DISK:${DISK_USAGE}%" >> "$LOG_FILE"

# Check thresholds and alert
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
    echo "$TIMESTAMP ALERT: High CPU usage: ${CPU_USAGE}%" >> "$ALERT_FILE"
fi

if (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
    echo "$TIMESTAMP ALERT: High memory usage: ${MEMORY_USAGE}%" >> "$ALERT_FILE"
fi

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "$TIMESTAMP ALERT: High disk usage: ${DISK_USAGE}%" >> "$ALERT_FILE"
fi
EOF

# Service health monitoring script
print_status "Creating service monitoring script..."
cat > /opt/minecraft-monitoring/scripts/service-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/minecraft-monitoring/services.log"
ALERT_FILE="/opt/minecraft-monitoring/alerts/service-alerts.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

SERVICES=("minecraft-server" "minecraft-manager" "nginx")

for service in "${SERVICES[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "$TIMESTAMP $service: RUNNING" >> "$LOG_FILE"
    else
        echo "$TIMESTAMP $service: STOPPED" >> "$LOG_FILE"
        echo "$TIMESTAMP ALERT: Service $service is not running" >> "$ALERT_FILE"
        
        # Attempt to restart the service
        systemctl start "$service"
        sleep 5
        
        if systemctl is-active --quiet "$service"; then
            echo "$TIMESTAMP $service: RESTARTED SUCCESSFULLY" >> "$LOG_FILE"
        else
            echo "$TIMESTAMP CRITICAL: Failed to restart $service" >> "$ALERT_FILE"
        fi
    fi
done
EOF

# Application health monitoring script
print_status "Creating application monitoring script..."
cat > /opt/minecraft-monitoring/scripts/app-monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/var/log/minecraft-monitoring/application.log"
ALERT_FILE="/opt/minecraft-monitoring/alerts/app-alerts.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Check web interface
if curl -f -s http://localhost/api/health > /dev/null; then
    echo "$TIMESTAMP Web interface: HEALTHY" >> "$LOG_FILE"
else
    echo "$TIMESTAMP Web interface: UNHEALTHY" >> "$LOG_FILE"
    echo "$TIMESTAMP ALERT: Web interface health check failed" >> "$ALERT_FILE"
fi

# Check database
if [ -f "/home/ubuntu/minecraft-data/data/database.db" ]; then
    if sqlite3 /home/ubuntu/minecraft-data/data/database.db "SELECT 1;" > /dev/null 2>&1; then
        echo "$TIMESTAMP Database: HEALTHY" >> "$LOG_FILE"
    else
        echo "$TIMESTAMP Database: CORRUPTED" >> "$LOG_FILE"
        echo "$TIMESTAMP CRITICAL: Database corruption detected" >> "$ALERT_FILE"
    fi
else
    echo "$TIMESTAMP Database: MISSING" >> "$LOG_FILE"
    echo "$TIMESTAMP CRITICAL: Database file missing" >> "$ALERT_FILE"
fi

# Check Minecraft server port
if nc -z localhost 25565; then
    echo "$TIMESTAMP Minecraft port: OPEN" >> "$LOG_FILE"
else
    echo "$TIMESTAMP Minecraft port: CLOSED" >> "$LOG_FILE"
    echo "$TIMESTAMP ALERT: Minecraft server port not accessible" >> "$ALERT_FILE"
fi
EOF

# Log rotation for monitoring logs
print_status "Setting up log rotation for monitoring..."
cat > /etc/logrotate.d/minecraft-monitoring << 'EOF'
/var/log/minecraft-monitoring/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su root root
}

/opt/minecraft-monitoring/alerts/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
    su root root
}
EOF

# Make scripts executable
chmod +x /opt/minecraft-monitoring/scripts/*.sh

# Set up cron jobs for monitoring
print_status "Setting up monitoring cron jobs..."
cat > /etc/cron.d/minecraft-monitoring << 'EOF'
# Minecraft Server Manager monitoring tasks

# System monitoring every 5 minutes
*/5 * * * * root /opt/minecraft-monitoring/scripts/system-monitor.sh

# Service monitoring every 2 minutes
*/2 * * * * root /opt/minecraft-monitoring/scripts/service-monitor.sh

# Application monitoring every 3 minutes
*/3 * * * * root /opt/minecraft-monitoring/scripts/app-monitor.sh

# Daily alert summary (optional - uncomment to enable email alerts)
# 0 9 * * * root /opt/minecraft-monitoring/scripts/daily-summary.sh | mail -s "Minecraft Server Daily Report" admin@localhost
EOF

# Create alert summary script
print_status "Creating daily summary script..."
cat > /opt/minecraft-monitoring/scripts/daily-summary.sh << 'EOF'
#!/bin/bash

echo "=== Minecraft Server Manager Daily Report ==="
echo "Date: $(date)"
echo ""

echo "=== System Status ==="
/usr/local/bin/minecraft-status.sh

echo ""
echo "=== Recent Alerts (Last 24 Hours) ==="
find /opt/minecraft-monitoring/alerts -name "*.log" -mtime -1 -exec cat {} \; | tail -20

echo ""
echo "=== Disk Usage ==="
df -h | grep -E "(Filesystem|/dev/)"

echo ""
echo "=== Memory Usage ==="
free -h

echo ""
echo "=== Top Processes ==="
ps aux --sort=-%cpu | head -10

echo ""
echo "=== Recent Errors (Last 24 Hours) ==="
journalctl --since "24 hours ago" --priority=err --no-pager | tail -10
EOF

chmod +x /opt/minecraft-monitoring/scripts/daily-summary.sh

# Create monitoring dashboard script
print_status "Creating monitoring dashboard..."
cat > /usr/local/bin/minecraft-monitor.sh << 'EOF'
#!/bin/bash

echo "=== Minecraft Server Manager Monitoring Dashboard ==="
echo "Last updated: $(date)"
echo ""

echo "🔧 Service Status:"
systemctl is-active --quiet minecraft-server && echo "✅ Minecraft Server: Running" || echo "❌ Minecraft Server: Stopped"
systemctl is-active --quiet minecraft-manager && echo "✅ Manager Backend: Running" || echo "❌ Manager Backend: Stopped"
systemctl is-active --quiet nginx && echo "✅ NGINX: Running" || echo "❌ NGINX: Stopped"

echo ""
echo "📊 System Resources:"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')%"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"

echo ""
echo "🚨 Recent Alerts (Last Hour):"
find /opt/minecraft-monitoring/alerts -name "*.log" -mmin -60 -exec cat {} \; | tail -5 || echo "No recent alerts"

echo ""
echo "📈 Performance Metrics (Last 24 Hours):"
echo "Average CPU: $(tail -288 /var/log/minecraft-monitoring/system.log 2>/dev/null | awk -F'CPU:' '{print $2}' | awk -F'%' '{sum+=$1; count++} END {if(count>0) printf "%.1f%%\n", sum/count; else print "N/A"}')"
echo "Peak Memory: $(tail -288 /var/log/minecraft-monitoring/system.log 2>/dev/null | awk -F'MEM:' '{print $2}' | awk -F'%' '{if($1>max) max=$1} END {if(max>0) printf "%.1f%%\n", max; else print "N/A"}')"

echo ""
echo "🎮 Minecraft Server:"
if systemctl is-active --quiet minecraft-server; then
    echo "Status: Online"
    echo "Port: 25565"
    PLAYER_COUNT=$(journalctl -u minecraft-server --since "1 hour ago" -q | grep -c "joined the game" 2>/dev/null || echo "0")
    echo "Recent joins (last hour): $PLAYER_COUNT"
else
    echo "Status: Offline"
fi

echo ""
echo "💾 Storage Usage:"
echo "Application: $(du -sh /home/ubuntu/minecraft-manager 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Minecraft: $(du -sh /home/ubuntu/Minecraft 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Backups: $(du -sh /home/ubuntu/minecraft-backups 2>/dev/null | cut -f1 || echo 'N/A')"
echo "Logs: $(du -sh /var/log/minecraft-* 2>/dev/null | cut -f1 || echo 'N/A')"
EOF

chmod +x /usr/local/bin/minecraft-monitor.sh

print_success "Monitoring setup completed!"
print_status "Available monitoring commands:"
echo "  - /usr/local/bin/minecraft-monitor.sh    # Real-time monitoring dashboard"
echo "  - /usr/local/bin/minecraft-status.sh     # Basic status check"
echo "  - /opt/minecraft-monitoring/scripts/daily-summary.sh  # Daily report"
echo ""
print_status "Monitoring logs location:"
echo "  - System metrics: /var/log/minecraft-monitoring/system.log"
echo "  - Service status: /var/log/minecraft-monitoring/services.log"
echo "  - Application health: /var/log/minecraft-monitoring/application.log"
echo "  - Alerts: /opt/minecraft-monitoring/alerts/"
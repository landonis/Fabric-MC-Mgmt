#!/bin/bash

# Minecraft Server Manager - Security Hardening Script
# Additional security measures for production deployment

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

# Disable unnecessary services
print_status "Disabling unnecessary services..."
SERVICES_TO_DISABLE=("bluetooth" "cups" "avahi-daemon" "whoopsie")

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl is-enabled "$service" 2>/dev/null; then
        systemctl disable "$service"
        systemctl stop "$service"
        print_success "Disabled $service"
    fi
done

# Configure SSH hardening
print_status "Hardening SSH configuration..."
SSH_CONFIG="/etc/ssh/sshd_config"

# Backup original SSH config
cp "$SSH_CONFIG" "$SSH_CONFIG.backup.$(date +%s)"

# Apply SSH hardening
cat >> "$SSH_CONFIG" << 'EOF'

# Minecraft Server Manager SSH Hardening
Protocol 2
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
MaxSessions 2
LoginGraceTime 60
EOF

# Restart SSH service
systemctl restart ssh
print_success "SSH hardening applied"

# Configure kernel parameters for security
print_status "Applying kernel security parameters..."
cat > /etc/sysctl.d/99-minecraft-security.conf << 'EOF'
# Minecraft Server Manager Security Settings

# Network security
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# Memory protection
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 1

# File system security
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.suid_dumpable = 0
EOF

sysctl -p /etc/sysctl.d/99-minecraft-security.conf
print_success "Kernel security parameters applied"

# Set up file integrity monitoring
print_status "Setting up file integrity monitoring..."
apt install -y aide

# Configure AIDE
cat > /etc/aide/aide.conf << 'EOF'
# Minecraft Server Manager AIDE Configuration

# Database location
database=file:/var/lib/aide/aide.db
database_out=file:/var/lib/aide/aide.db.new

# Report settings
report_url=file:/var/log/aide/aide.log
report_url=stdout

# Rules
All=p+i+n+u+g+s+m+c+md5+sha1+rmd160+tiger+haval+gost+crc32
Binlib=p+i+n+u+g+s+m+c+md5+sha1+rmd160+tiger+haval+gost+crc32
ConfFiles=p+i+n+u+g+s+m+c+md5+sha1+rmd160+tiger+haval+gost+crc32

# Directories to monitor
/home/ubuntu/minecraft-manager ConfFiles
/etc ConfFiles
/usr/bin Binlib
/usr/sbin Binlib
/bin Binlib
/sbin Binlib

# Exclude temporary and log files
!/var/log
!/tmp
!/proc
!/sys
!/dev
!/home/ubuntu/minecraft-manager/node_modules
!/home/ubuntu/minecraft-data/data/database.db
EOF

# Initialize AIDE database
mkdir -p /var/log/aide
aide --init
mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Set up daily AIDE check
cat > /etc/cron.daily/aide-check << 'EOF'
#!/bin/bash
aide --check > /var/log/aide/aide-$(date +%Y%m%d).log 2>&1
if [ $? -ne 0 ]; then
    echo "AIDE integrity check failed on $(date)" | logger -t aide
fi
EOF

chmod +x /etc/cron.daily/aide-check
print_success "File integrity monitoring configured"

# Configure log monitoring with logwatch
print_status "Setting up log monitoring..."
apt install -y logwatch

# Configure logwatch
cat > /etc/logwatch/conf/logwatch.conf << 'EOF'
LogDir = /var/log
TmpDir = /var/cache/logwatch
MailTo = root
MailFrom = minecraft-manager@localhost
Print = Yes
Save = /var/cache/logwatch
Range = yesterday
Detail = Med
Service = All
mailer = "/usr/sbin/sendmail -t"
EOF

print_success "Log monitoring configured"

# Set up automatic security updates
print_status "Configuring automatic security updates..."
apt install -y unattended-upgrades

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Package-Blacklist {
    // Add packages to blacklist here if needed
};

Unattended-Upgrade::DevRelease "false";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";

Unattended-Upgrade::Mail "root";
Unattended-Upgrade::MailOnlyOnError "true";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable unattended-upgrades
print_success "Automatic security updates configured"

# Configure process accounting
print_status "Setting up process accounting..."
apt install -y acct
systemctl enable acct
systemctl start acct
print_success "Process accounting enabled"

# Set up intrusion detection with OSSEC (lightweight alternative)
print_status "Setting up intrusion detection..."
apt install -y rkhunter chkrootkit

# Configure rkhunter
cat > /etc/rkhunter.conf.local << 'EOF'
MAIL-ON-WARNING=root
MAIL_CMD=mail -s "[rkhunter] Warnings found for ${HOST_NAME}"
TMPDIR=/var/lib/rkhunter/tmp
DBDIR=/var/lib/rkhunter/db
SCRIPTDIR=/usr/share/rkhunter/scripts
LOGFILE=/var/log/rkhunter.log
APPEND_LOG=1
COPY_LOG_ON_ERROR=1
USE_SYSLOG=authpriv.notice
COLOR_SET2=1
AUTO_X_DETECT=1
WHITELISTED_IS_WHITE=1
ALLOW_SSH_ROOT_USER=no
ALLOW_SSH_PROT_V1=0
ENABLE_TESTS=ALL
DISABLE_TESTS=suspscan hidden_procs deleted_files packet_cap_apps apps
EOF

# Set up daily rkhunter scan
cat > /etc/cron.daily/rkhunter-scan << 'EOF'
#!/bin/bash
rkhunter --update --quiet
rkhunter --cronjob --report-warnings-only
EOF

chmod +x /etc/cron.daily/rkhunter-scan

# Set up weekly chkrootkit scan
cat > /etc/cron.weekly/chkrootkit-scan << 'EOF'
#!/bin/bash
chkrootkit | logger -t chkrootkit
EOF

chmod +x /etc/cron.weekly/chkrootkit-scan
print_success "Intrusion detection configured"

# Configure file permissions
print_status "Setting secure file permissions..."

# Secure important directories
chmod 700 /home/ubuntu/minecraft-manager/.env
chmod 700 /home/ubuntu/minecraft-data/data
chmod 755 /home/ubuntu/minecraft-manager
chmod 755 /home/ubuntu/Minecraft

# Secure log files
chmod 640 /var/log/minecraft-*/*.log 2>/dev/null || true
chmod 750 /var/log/minecraft-* 2>/dev/null || true

# Secure configuration files
find /etc -name "*.conf" -exec chmod 644 {} \;
find /etc -name "*.cfg" -exec chmod 644 {} \;

print_success "File permissions secured"

# Create security audit script
print_status "Creating security audit script..."
cat > /usr/local/bin/minecraft-security-audit.sh << 'EOF'
#!/bin/bash

echo "=== Minecraft Server Manager Security Audit ==="
echo "Date: $(date)"
echo ""

echo "🔒 SSH Configuration:"
echo "Root login: $(grep "^PermitRootLogin" /etc/ssh/sshd_config | awk '{print $2}')"
echo "Password auth: $(grep "^PasswordAuthentication" /etc/ssh/sshd_config | awk '{print $2}')"
echo "Max auth tries: $(grep "^MaxAuthTries" /etc/ssh/sshd_config | awk '{print $2}')"

echo ""
echo "🛡️ Firewall Status:"
ufw status numbered

echo ""
echo "🔍 Failed Login Attempts (Last 24 Hours):"
journalctl --since "24 hours ago" | grep "Failed password" | wc -l

echo ""
echo "📊 Security Services:"
systemctl is-active --quiet fail2ban && echo "✅ Fail2ban: Running" || echo "❌ Fail2ban: Stopped"
systemctl is-active --quiet unattended-upgrades && echo "✅ Auto-updates: Running" || echo "❌ Auto-updates: Stopped"
systemctl is-active --quiet acct && echo "✅ Process accounting: Running" || echo "❌ Process accounting: Stopped"

echo ""
echo "🔐 File Permissions:"
ls -la /home/ubuntu/minecraft-manager/.env 2>/dev/null || echo "Environment file not found"
ls -ld /home/ubuntu/minecraft-data/data 2>/dev/null || echo "Data directory not found"

echo ""
echo "⚠️ Recent Security Alerts:"
tail -10 /var/log/auth.log | grep -i "failed\|invalid\|break" || echo "No recent security alerts"

echo ""
echo "🔄 Last Security Updates:"
grep "upgrade" /var/log/dpkg.log | tail -5 || echo "No recent updates found"
EOF

chmod +x /usr/local/bin/minecraft-security-audit.sh
print_success "Security audit script created"

print_success "Security hardening completed!"
print_status "Additional security measures applied:"
echo "  - SSH hardening with key-based authentication preferred"
echo "  - Kernel security parameters optimized"
echo "  - File integrity monitoring with AIDE"
echo "  - Automatic security updates enabled"
echo "  - Process accounting enabled"
echo "  - Intrusion detection with rkhunter and chkrootkit"
echo "  - Secure file permissions applied"
echo ""
print_status "Security audit command: /usr/local/bin/minecraft-security-audit.sh"
print_warning "Remember to:"
echo "  - Set up SSH key authentication and disable password auth"
echo "  - Configure email alerts for security notifications"
echo "  - Regularly review security logs and audit reports"
echo "  - Keep the system updated with security patches"
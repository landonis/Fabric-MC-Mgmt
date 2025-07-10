# Minecraft Server Manager

A production-ready, full-stack web application for managing Minecraft Fabric servers with comprehensive deployment automation, security hardening, and monitoring capabilities.

## 🚀 Quick Start (One-Click Deployment)

### Prerequisites
- Fresh Ubuntu 24.04 LTS server
- Root access (sudo)
- 2GB+ RAM recommended
- 10GB+ available storage

### Installation

1. **Download and run the setup script**:
   ```bash
   wget https://raw.githubusercontent.com/landonis/Fabric-MC-Mgmt/main/deployment/setup.sh
   chmod +x setup.sh
   sudo ./setup.sh
   ```

2. **Optional: Configure for domain-based deployment with SSL**:
   ```bash
   export DOMAIN="your-domain.com"
   export ADMIN_EMAIL="admin@your-domain.com"
   export USE_SSL="true"
   sudo ./setup.sh
   ```

3. **Access your application**:
   - Web Interface: `http://your-server-ip` or `https://your-domain.com`
   - Minecraft Server: `your-server-ip:25565` or `your-domain.com:25565`
   - Default login: `admin` / `admin` (must be changed on first login)

That's it! The script handles everything automatically.

## 🎯 Features

### Core Management
- **Server Control**: Start, stop, restart Minecraft servers via systemd integration
- **Mod Management**: Upload, activate, and delete .jar mod files with validation
- **World Management**: Import/export world saves as .tar archives with safety checks
- **Player Monitoring**: Real-time player tracking with inventory and position data
- **User Authentication**: Secure JWT-based authentication with password management

### Production Features
- **Automated Deployment**: One-command setup script for Ubuntu 24.04 LTS
- **Security Hardening**: Firewall, fail2ban, rate limiting, and secure headers
- **SSL Support**: Automatic Let's Encrypt certificate management
- **Monitoring**: System status checks, automated backups, and log rotation
- **Scalability**: Systemd service management with auto-restart capabilities

### Technical Stack
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + SQLite
- **Security**: JWT tokens, bcrypt hashing, helmet middleware
- **Deployment**: Ubuntu 24.04, systemd, NGINX, Let's Encrypt
- **Monitoring**: Journald logging, automated backups, status scripts

## 📋 System Requirements

### Minimum Requirements
- **OS**: Ubuntu 24.04 LTS (recommended) or compatible Linux distribution
- **RAM**: 2GB (4GB+ recommended for Minecraft server)
- **Storage**: 10GB+ available space
- **Network**: Public IP address (domain name optional)

### Supported Platforms
- **Cloud Providers**: AWS, Google Cloud, DigitalOcean, Vultr, Oracle Cloud
- **ARM Support**: Full compatibility with ARM64 platforms (Oracle Cloud Ampere, AWS Graviton, Raspberry Pi 4/5)
- **On-Premises**: Any Linux machine with Ubuntu 24.04

## ⚙️ Configuration

### Environment Variables

The setup script automatically configures all required environment variables. You can customize these before running:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DOMAIN` | Your domain name | Server IP | No |
| `USE_SSL` | Enable SSL/HTTPS | `false` | No |
| `ADMIN_EMAIL` | Email for SSL certificates | `admin@localhost` | If SSL enabled |
| `GITHUB_REPO` | Repository URL | Auto-detected | No |

### Directory Structure (Auto-Created)

```
/home/ubuntu/minecraft-manager/     # Application files
/home/ubuntu/Minecraft/             # Minecraft server
├── world/                          # World data
├── mods/                          # Mod files
├── backups/                       # Local backups
└── logs/                          # Server logs

/home/ubuntu/minecraft-data/        # Database and app data
/home/ubuntu/minecraft-backups/     # Automated backups
/var/log/minecraft-manager/         # Application logs
```

## 🔐 Security (Auto-Configured)

### Default Credentials
- **Username**: `admin`
- **Password**: `admin`
- ⚠️ **You MUST change this password on first login**

### Security Features (Automatically Applied)
- **Authentication**: JWT-based with secure password hashing (bcrypt)
- **Rate Limiting**: Login attempts limited to prevent brute force
- **Firewall**: UFW configured with minimal required ports (22, 80, 443, 25565)
- **Fail2ban**: Automatic IP blocking for suspicious activity
- **SSL/TLS**: Automatic Let's Encrypt certificates (if domain configured)
- **File Validation**: Strict file type checking for uploads
- **Security Headers**: Comprehensive HTTP security headers via helmet

## 🎮 Usage

### Web Interface

1. **Login**: Access the web interface and login with admin credentials
2. **Change Password**: You'll be prompted to change the default password
3. **Server Control**: Use the dashboard to start/stop/restart the Minecraft server
4. **Mod Management**: Upload .jar files to add mods to your server
5. **World Management**: Import/export world saves for backups or transfers
6. **Player Monitoring**: View online players and their status

### Command Line Management (Auto-Installed)

```bash
# Check system status
/usr/local/bin/minecraft-status.sh

# Create manual backup
/usr/local/bin/minecraft-backup.sh

# Update application
/usr/local/bin/minecraft-update.sh

# View logs
journalctl -u minecraft-manager -f    # Web application logs
journalctl -u minecraft-server -f     # Minecraft server logs

# Service management
systemctl restart minecraft-manager   # Restart web app
systemctl restart minecraft-server    # Restart Minecraft server
systemctl status minecraft-manager    # Check web app status
systemctl status minecraft-server     # Check server status
```

## 🔧 Maintenance (Automated)

### Automated Tasks (Pre-Configured)
- **Daily Backups**: Automatic world and database backups at 2 AM
- **Log Rotation**: Automatic cleanup of old log files
- **Service Monitoring**: Systemd automatically restarts failed services
- **Security Updates**: Fail2ban monitors and blocks suspicious activity

### Manual Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update application
/usr/local/bin/minecraft-update.sh

# Check disk usage
df -h
du -sh /home/ubuntu/minecraft-*

# Monitor system resources
htop
```

### Backup and Recovery (Automated)

**Automated Backups** (Pre-configured):
- World data: `/home/ubuntu/minecraft-backups/world_backup_*.tar.gz`
- Database: `/home/ubuntu/minecraft-backups/database_backup_*.db`
- Retention: 7 days (configurable)

**Manual Recovery**:
```bash
# Stop services
systemctl stop minecraft-server minecraft-manager

# Restore world
tar -xzf world_backup_YYYYMMDD_HHMMSS.tar.gz -C /home/ubuntu/Minecraft/

# Restore database
cp database_backup_YYYYMMDD_HHMMSS.db /home/ubuntu/minecraft-data/data/database.db

# Fix permissions
chown -R minecraft:minecraft /home/ubuntu/Minecraft
chown -R minecraft-manager:minecraft-manager /home/ubuntu/minecraft-data

# Start services
systemctl start minecraft-manager minecraft-server
```

## 🐛 Troubleshooting

### Common Issues

**Services won't start**:
```bash
# Check service status
systemctl status minecraft-manager
systemctl status minecraft-server

# Check logs
journalctl -u minecraft-manager -n 50
journalctl -u minecraft-server -n 50
```

**Web interface not accessible**:
```bash
# Check NGINX status
systemctl status nginx
nginx -t

# Check firewall
ufw status
```

**Database issues**:
```bash
# Check database file
ls -la /home/ubuntu/minecraft-data/data/database.db

# Reinitialize database
cd /home/ubuntu/minecraft-manager
sudo -u minecraft-manager NODE_ENV=production node -e "
const { initDatabase } = require('./backend/dist/database/init.js');
initDatabase();
"
```

### Log Locations
- **Application**: `journalctl -u minecraft-manager`
- **Minecraft Server**: `journalctl -u minecraft-server`
- **NGINX**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- **System**: `/var/log/syslog`

## 🚀 Deployment Options

### Cloud Providers

**Oracle Cloud Free Tier** (Recommended):
- **Instance**: VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM)
- **Storage**: 47GB boot volume
- **Network**: 10TB outbound transfer per month
- **Cost**: Free forever

**Other Cloud Providers**:
- **AWS**: t2.micro or t3.micro instances
- **Google Cloud**: e2-micro instances
- **DigitalOcean**: Basic droplets ($5/month)
- **Vultr**: Regular performance instances

### ARM Architecture Support

This project is fully compatible with ARM64 platforms:
- Oracle Cloud ARM instances (Ampere A1)
- AWS Graviton EC2 (a1, t4g)
- Raspberry Pi 4/5 (Ubuntu 24.04 Server)
- Any ARM64 Ubuntu VPS or device

No changes needed — just run the same setup process.

## 📊 Monitoring (Auto-Configured)

### Built-in Monitoring
- **System Status**: `/usr/local/bin/minecraft-status.sh`
- **Resource Usage**: Memory, disk, CPU monitoring
- **Service Health**: Automatic service restart on failure
- **Log Aggregation**: Centralized logging via journald

### Health Check Output Example
```
=== Minecraft Server Manager Status ===
🔧 Services Status:
✅ Minecraft Server: Running
✅ Manager Backend: Running
✅ NGINX: Running

📊 System Resources:
Memory: 1.2G/2.0G
Disk: 3.2G/47G (7% used)
Load: 0.15, 0.18, 0.12

🎮 Minecraft Server:
Status: Online
Port: 25565
Recent joins: 2
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

### Development Setup
```bash
# Clone repository
git clone https://github.com/yourusername/minecraft-server-manager.git
cd minecraft-server-manager

# Install dependencies
npm install
cd backend && npm install && cd ..

# Start development servers
npm run dev              # Frontend (port 5173)
npm run backend:dev      # Backend (port 3001)
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Fabric**: For the excellent Minecraft modding framework
- **React**: For the powerful frontend framework
- **Express**: For the robust backend framework
- **Community**: For feedback, bug reports, and contributions

## 📞 Support

- **Documentation**: This README and inline code comments
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for questions and community support

---

**Made with ❤️ for the Minecraft community**

## 🎯 What Makes This Different

### True One-Click Deployment
- **Zero Configuration Required**: Works out of the box with sensible defaults
- **Automatic SSL**: Optional Let's Encrypt integration with domain setup
- **Production Ready**: Includes monitoring, backups, security hardening
- **ARM Compatible**: Runs on Oracle Cloud Free Tier ARM instances

### Enterprise-Grade Security
- **Hardened by Default**: Firewall, fail2ban, secure headers, rate limiting
- **JWT Authentication**: Modern token-based auth with password policies
- **File Validation**: Strict upload validation and sandboxing
- **Audit Logging**: Comprehensive logging for security monitoring

### Operational Excellence
- **Systemd Integration**: Proper service management with auto-restart
- **Automated Backups**: Daily world and database backups with retention
- **Health Monitoring**: Built-in status checks and alerting
- **Update Management**: Safe application updates with rollback capability

This isn't just a Minecraft server manager — it's a production-ready platform that you can deploy with confidence and operate at scale.

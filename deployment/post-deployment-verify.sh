#!/bin/bash

# Minecraft Server Manager - Post-deployment Verification Script
# Comprehensive testing after deployment

set -euo pipefail

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
APP_DIR="/home/ubuntu/minecraft-manager"
MINECRAFT_DIR="/home/ubuntu/Minecraft"
DATA_DIR="/home/ubuntu/minecraft-data"

# Test functions
test_services() {
    print_status "Testing system services..."
    local services=(minecraft-server minecraft-manager nginx)
    local failed=0
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            print_success "$service is running"
        else
            print_error "$service is not running"
            failed=$((failed + 1))
        fi
    done
    
    return $failed
}

test_web_interface() {
    print_status "Testing web interface..."
    
    # Test main page
    if curl -f -s http://localhost/ > /dev/null; then
        print_success "Main page accessible"
    else
        print_error "Main page not accessible"
        return 1
    fi
    
    # Test API health endpoint
    if curl -f -s http://localhost/api/health > /dev/null; then
        print_success "API health endpoint accessible"
    else
        print_error "API health endpoint not accessible"
        return 1
    fi
    
    # Test API response
    local response=$(curl -s http://localhost/api/health)
    if echo "$response" | grep -q '"status":"ok"'; then
        print_success "API health check passed"
    else
        print_error "API health check failed: $response"
        return 1
    fi
    
    return 0
}

test_database() {
    print_status "Testing database..."
    
    local db_file="$DATA_DIR/data/database.db"
    
    # Check if database file exists
    if [[ ! -f "$db_file" ]]; then
        print_error "Database file not found: $db_file"
        return 1
    fi
    
    # Test database connectivity
    if sqlite3 "$db_file" "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connectivity verified"
    else
        print_error "Database connectivity failed"
        return 1
    fi
    
    # Check if tables exist
    local tables=$(sqlite3 "$db_file" ".tables")
    local required_tables=(users mods server_logs)
    
    for table in "${required_tables[@]}"; do
        if echo "$tables" | grep -q "$table"; then
            print_success "Table '$table' exists"
        else
            print_error "Table '$table' missing"
            return 1
        fi
    done
    
    # Check if admin user exists
    local admin_count=$(sqlite3 "$db_file" "SELECT COUNT(*) FROM users WHERE username='admin';")
    if [[ "$admin_count" -eq 1 ]]; then
        print_success "Admin user exists"
    else
        print_error "Admin user not found or duplicated"
        return 1
    fi
    
    return 0
}

test_minecraft_server() {
    print_status "Testing Minecraft server..."
    
    # Check if server files exist
    if [[ ! -f "$MINECRAFT_DIR/fabric-server-launch.jar" ]]; then
        print_error "Minecraft server jar not found"
        return 1
    fi
    
    # Check if EULA is accepted
    if [[ -f "$MINECRAFT_DIR/eula.txt" ]] && grep -q "eula=true" "$MINECRAFT_DIR/eula.txt"; then
        print_success "EULA accepted"
    else
        print_error "EULA not accepted"
        return 1
    fi
    
    # Check if server is listening on port 25565
    if ss -tuln | grep -q ":25565 "; then
        print_success "Minecraft server port is open"
    else
        print_warning "Minecraft server port not open (server may be starting)"
    fi
    
    return 0
}

test_file_permissions() {
    print_status "Testing file permissions..."
    
    # Check application directory ownership
    local app_owner=$(stat -c '%U:%G' "$APP_DIR")
    if [[ "$app_owner" == "minecraft-manager:minecraft-manager" ]]; then
        print_success "Application directory ownership correct"
    else
        print_error "Application directory ownership incorrect: $app_owner"
        return 1
    fi
    
    # Check Minecraft directory ownership
    local mc_owner=$(stat -c '%U:%G' "$MINECRAFT_DIR")
    if [[ "$mc_owner" == "minecraft:minecraft" ]]; then
        print_success "Minecraft directory ownership correct"
    else
        print_error "Minecraft directory ownership incorrect: $mc_owner"
        return 1
    fi
    
    # Check environment file permissions
    if [[ -f "$APP_DIR/.env" ]]; then
        local env_perms=$(stat -c '%a' "$APP_DIR/.env")
        if [[ "$env_perms" == "600" ]]; then
            print_success "Environment file permissions correct"
        else
            print_error "Environment file permissions incorrect: $env_perms"
            return 1
        fi
    else
        print_error "Environment file not found"
        return 1
    fi
    
    return 0
}

test_firewall() {
    print_status "Testing firewall configuration..."
    
    # Check if UFW is enabled
    if ufw status | grep -q "Status: active"; then
        print_success "UFW firewall is active"
    else
        print_error "UFW firewall is not active"
        return 1
    fi
    
    # Check required ports
    local required_ports=(22 80 443 25565)
    for port in "${required_ports[@]}"; do
        if ufw status | grep -q "$port"; then
            print_success "Port $port is allowed in firewall"
        else
            print_error "Port $port is not allowed in firewall"
            return 1
        fi
    done
    
    return 0
}

test_ssl() {
    print_status "Testing SSL configuration..."
    
    # Check if SSL is configured
    if [[ -n "${DOMAIN:-}" ]] && [[ "${USE_SSL:-}" == "true" ]]; then
        if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
            print_success "SSL certificate found"
            
            # Test HTTPS
            if curl -f -s "https://$DOMAIN/api/health" > /dev/null; then
                print_success "HTTPS endpoint accessible"
            else
                print_warning "HTTPS endpoint not accessible"
            fi
        else
            print_warning "SSL certificate not found (may not be configured)"
        fi
    else
        print_success "SSL not configured (IP-only setup)"
    fi
    
    return 0
}

test_backup_system() {
    print_status "Testing backup system..."
    
    # Check if backup script exists
    if [[ -f "/usr/local/bin/minecraft-backup.sh" ]]; then
        print_success "Backup script exists"
        
        # Check if it's executable
        if [[ -x "/usr/local/bin/minecraft-backup.sh" ]]; then
            print_success "Backup script is executable"
        else
            print_error "Backup script is not executable"
            return 1
        fi
    else
        print_error "Backup script not found"
        return 1
    fi
    
    # Check if backup directory exists
    if [[ -d "/home/ubuntu/minecraft-backups" ]]; then
        print_success "Backup directory exists"
    else
        print_error "Backup directory not found"
        return 1
    fi
    
    # Check cron job
    if crontab -l 2>/dev/null | grep -q "minecraft-backup.sh"; then
        print_success "Backup cron job configured"
    elif [[ -f "/etc/cron.d/minecraft-manager" ]] && grep -q "minecraft-backup.sh" "/etc/cron.d/minecraft-manager"; then
        print_success "Backup cron job configured"
    else
        print_error "Backup cron job not found"
        return 1
    fi
    
    return 0
}

test_monitoring() {
    print_status "Testing monitoring system..."
    
    # Check if status script exists
    if [[ -f "/usr/local/bin/minecraft-status.sh" ]]; then
        print_success "Status script exists"
        
        # Test status script
        if /usr/local/bin/minecraft-status.sh > /dev/null 2>&1; then
            print_success "Status script runs successfully"
        else
            print_warning "Status script has issues"
        fi
    else
        print_error "Status script not found"
        return 1
    fi
    
    return 0
}

test_log_rotation() {
    print_status "Testing log rotation..."
    
    # Check if logrotate config exists
    if [[ -f "/etc/logrotate.d/minecraft-manager" ]]; then
        print_success "Log rotation configured"
        
        # Test logrotate config
        if logrotate -d /etc/logrotate.d/minecraft-manager > /dev/null 2>&1; then
            print_success "Log rotation config is valid"
        else
            print_error "Log rotation config is invalid"
            return 1
        fi
    else
        print_error "Log rotation not configured"
        return 1
    fi
    
    return 0
}

test_security() {
    print_status "Testing security configuration..."
    
    # Check fail2ban
    if systemctl is-active --quiet fail2ban; then
        print_success "Fail2ban is running"
    else
        print_error "Fail2ban is not running"
        return 1
    fi
    
    # Check if JWT secret is set
    if [[ -f "$APP_DIR/.env" ]] && grep -q "JWT_SECRET=" "$APP_DIR/.env"; then
        local jwt_secret=$(grep "JWT_SECRET=" "$APP_DIR/.env" | cut -d'=' -f2)
        if [[ ${#jwt_secret} -ge 32 ]]; then
            print_success "JWT secret is properly configured"
        else
            print_error "JWT secret is too short"
            return 1
        fi
    else
        print_error "JWT secret not found"
        return 1
    fi
    
    return 0
}

# Performance test
test_performance() {
    print_status "Testing system performance..."
    
    # Test API response time
    local start_time=$(date +%s%N)
    curl -f -s http://localhost/api/health > /dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [[ $response_time -lt 1000 ]]; then
        print_success "API response time: ${response_time}ms (excellent)"
    elif [[ $response_time -lt 3000 ]]; then
        print_success "API response time: ${response_time}ms (good)"
    else
        print_warning "API response time: ${response_time}ms (slow)"
    fi
    
    # Check system load
    local load=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local load_int=$(echo "$load * 100" | bc | cut -d'.' -f1)
    
    if [[ $load_int -lt 100 ]]; then
        print_success "System load: $load (low)"
    elif [[ $load_int -lt 200 ]]; then
        print_success "System load: $load (moderate)"
    else
        print_warning "System load: $load (high)"
    fi
    
    return 0
}

# Main verification function
run_verification() {
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Minecraft Server Manager${NC}"
    echo -e "${BLUE}  Post-deployment Verification${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    local tests=(
        "test_services:System services"
        "test_web_interface:Web interface"
        "test_database:Database"
        "test_minecraft_server:Minecraft server"
        "test_file_permissions:File permissions"
        "test_firewall:Firewall configuration"
        "test_ssl:SSL configuration"
        "test_backup_system:Backup system"
        "test_monitoring:Monitoring system"
        "test_log_rotation:Log rotation"
        "test_security:Security configuration"
        "test_performance:System performance"
    )
    
    for test in "${tests[@]}"; do
        local func="${test%%:*}"
        local desc="${test##*:}"
        
        total_tests=$((total_tests + 1))
        echo -e "${BLUE}Testing $desc...${NC}"
        
        if $func; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
        echo ""
    done
    
    # Summary
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Verification Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Total tests: $total_tests"
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $failed_tests${NC}"
    echo ""
    
    if [[ $failed_tests -eq 0 ]]; then
        echo -e "${GREEN}✅ All verification tests passed!${NC}"
        echo -e "${GREEN}   Your Minecraft Server Manager is fully operational.${NC}"
        return 0
    else
        echo -e "${RED}❌ Some verification tests failed.${NC}"
        echo -e "${RED}   Please review the failed tests above.${NC}"
        return 1
    fi
}

# Load environment variables if available
if [[ -f "$APP_DIR/.env" ]]; then
    source "$APP_DIR/.env"
fi

# Run the verification
run_verification
#!/bin/bash

# Minecraft Server Manager - Pre-flight Check Script
# Validates system requirements before deployment

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

# Check functions
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        return 1
    fi
    print_success "Running as root"
    return 0
}

check_os() {
    if ! grep -q "Ubuntu" /etc/os-release; then
        print_warning "Not running on Ubuntu - compatibility not guaranteed"
        return 1
    fi
    
    local version=$(lsb_release -rs 2>/dev/null || echo "Unknown")
    if [[ "$version" != "24.04" ]]; then
        print_warning "Not running Ubuntu 24.04 - some features may not work correctly"
        return 1
    fi
    
    print_success "Ubuntu 24.04 detected"
    return 0
}

check_architecture() {
    local arch=$(uname -m)
    if [[ "$arch" != "x86_64" && "$arch" != "aarch64" ]]; then
        print_error "Unsupported architecture: $arch"
        return 1
    fi
    print_success "Architecture: $arch"
    return 0
}

check_memory() {
    local memory_mb=$(free -m | awk 'NR==2{print $2}')
    if [[ $memory_mb -lt 1024 ]]; then
        print_error "Insufficient memory: ${memory_mb}MB (minimum 1GB required)"
        return 1
    elif [[ $memory_mb -lt 2048 ]]; then
        print_warning "Low memory: ${memory_mb}MB (2GB recommended)"
        return 1
    fi
    print_success "Memory: ${memory_mb}MB"
    return 0
}

check_disk_space() {
    local available_gb=$(df / | awk 'NR==2 {printf "%.1f", $4/1024/1024}')
    local available_kb=$(df / | awk 'NR==2 {print $4}')
    
    if [[ $available_kb -lt 10485760 ]]; then  # 10GB in KB
        print_error "Insufficient disk space: ${available_gb}GB (minimum 10GB required)"
        return 1
    fi
    print_success "Disk space: ${available_gb}GB available"
    return 0
}

check_network() {
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        print_error "No internet connectivity"
        return 1
    fi
    print_success "Internet connectivity verified"
    return 0
}

check_ports() {
    local ports=(22 80 443 25565)
    local issues=0
    
    for port in "${ports[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            local service=$(ss -tuln | grep ":$port " | head -1)
            print_warning "Port $port is already in use: $service"
            issues=$((issues + 1))
        fi
    done
    
    if [[ $issues -eq 0 ]]; then
        print_success "All required ports are available"
        return 0
    else
        print_warning "$issues port(s) already in use - may cause conflicts"
        return 1
    fi
}

check_existing_services() {
    local services=(nginx apache2 minecraft-server minecraft-manager)
    local conflicts=0
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            print_warning "Service $service is already running"
            conflicts=$((conflicts + 1))
        fi
    done
    
    if [[ $conflicts -eq 0 ]]; then
        print_success "No conflicting services detected"
        return 0
    else
        print_warning "$conflicts conflicting service(s) detected"
        return 1
    fi
}

check_java() {
    if command -v java >/dev/null 2>&1; then
        local java_version=$(java -version 2>&1 | head -n1 | cut -d'"' -f2)
        print_warning "Java already installed: $java_version (will be updated if needed)"
    else
        print_success "Java not installed (will be installed)"
    fi
    return 0
}

check_nodejs() {
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node -v)
        print_warning "Node.js already installed: $node_version (will be updated if needed)"
    else
        print_success "Node.js not installed (will be installed)"
    fi
    return 0
}

check_package_manager() {
    if ! command -v apt >/dev/null 2>&1; then
        print_error "APT package manager not found"
        return 1
    fi
    
    # Check if apt is locked
    if fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; then
        print_error "APT is locked by another process"
        return 1
    fi
    
    print_success "APT package manager available"
    return 0
}

check_systemd() {
    if ! command -v systemctl >/dev/null 2>&1; then
        print_error "Systemd not available"
        return 1
    fi
    print_success "Systemd available"
    return 0
}

# Main check function
run_checks() {
    local total_checks=0
    local passed_checks=0
    local failed_checks=0
    local warning_checks=0
    
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Minecraft Server Manager${NC}"
    echo -e "${BLUE}  Pre-flight System Check${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    local checks=(
        "check_root:Root privileges"
        "check_os:Operating system"
        "check_architecture:System architecture"
        "check_memory:Memory requirements"
        "check_disk_space:Disk space"
        "check_network:Network connectivity"
        "check_package_manager:Package manager"
        "check_systemd:Systemd"
        "check_ports:Port availability"
        "check_existing_services:Service conflicts"
        "check_java:Java installation"
        "check_nodejs:Node.js installation"
    )
    
    for check in "${checks[@]}"; do
        local func="${check%%:*}"
        local desc="${check##*:}"
        
        total_checks=$((total_checks + 1))
        print_status "Checking $desc..."
        
        if $func; then
            passed_checks=$((passed_checks + 1))
        else
            if [[ "$func" == "check_ports" || "$func" == "check_existing_services" || "$func" == "check_java" || "$func" == "check_nodejs" || "$func" == "check_memory" ]]; then
                warning_checks=$((warning_checks + 1))
            else
                failed_checks=$((failed_checks + 1))
            fi
        fi
        echo ""
    done
    
    # Summary
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  Pre-flight Check Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Total checks: $total_checks"
    echo -e "${GREEN}Passed: $passed_checks${NC}"
    echo -e "${YELLOW}Warnings: $warning_checks${NC}"
    echo -e "${RED}Failed: $failed_checks${NC}"
    echo ""
    
    if [[ $failed_checks -eq 0 ]]; then
        if [[ $warning_checks -eq 0 ]]; then
            echo -e "${GREEN}✅ All checks passed! System is ready for deployment.${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  System is ready for deployment with warnings.${NC}"
            echo -e "${YELLOW}   Review the warnings above before proceeding.${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ System is not ready for deployment.${NC}"
        echo -e "${RED}   Please fix the failed checks before proceeding.${NC}"
        return 1
    fi
}

# Run the checks
run_checks
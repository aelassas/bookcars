#!/bin/bash

# Deployment script for BookCars frontend and backend
# Run with: sudo bash deploy.sh
#
# This script requires sudo privileges to:
# - Remove and copy files in /var/www/bookcars/frontend
# - Restart systemd services (bookcars, nginx)
# - Clear nginx cache

set -e

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Error: This script must be run with sudo"
    echo "Usage: sudo bash deploy.sh"
    exit 1
fi

PROJECT_DIR="/home/ubuntu/bookcars"
FRONTEND_BUILD_DIR="$PROJECT_DIR/frontend/build"
DEPLOY_FRONTEND_DIR="/var/www/bookcars/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

echo "========================================="
echo "BookCars Deployment Script"
echo "========================================="

# Deploy Frontend
echo ""
echo "Step 1: Deploying Frontend..."
if [ -d "$FRONTEND_BUILD_DIR" ]; then
    echo "Removing old frontend files..."
    rm -rf "$DEPLOY_FRONTEND_DIR"/*
    
    echo "Copying new frontend build..."
    cp -rf "$FRONTEND_BUILD_DIR"/* "$DEPLOY_FRONTEND_DIR"/
    
    echo "Setting permissions..."
    chown -R www-data:www-data "$DEPLOY_FRONTEND_DIR"
    chmod -R 755 "$DEPLOY_FRONTEND_DIR"
    
    echo "✓ Frontend deployed successfully"
else
    echo "✗ Frontend build directory not found: $FRONTEND_BUILD_DIR"
    echo "Please run 'npm run build' in the frontend directory first"
    exit 1
fi

# Deploy Backend
echo ""
echo "Step 2: Deploying Backend..."
cd "$BACKEND_DIR"

echo "Installing backend dependencies..."
npm install

echo "Building backend..."
npm run build

echo "✓ Backend built successfully"

# Restart services
echo ""
echo "Step 3: Restarting Services..."

# Check if bookcars service exists
if systemctl list-unit-files | grep -q "bookcars.service"; then
    echo "Restarting bookcars service..."
    systemctl restart bookcars
    systemctl status bookcars --no-pager -l || true
else
    echo "⚠ bookcars service not found. Starting backend manually..."
    echo "To set up the service, run:"
    echo "  sudo cp $PROJECT_DIR/__services/bookcars.service /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable bookcars"
    echo "  sudo systemctl start bookcars"
fi

echo "Clearing nginx cache..."
rm -rf /var/cache/nginx/*

echo "Restarting nginx..."
systemctl restart nginx
systemctl status nginx --no-pager -l || true

echo ""
echo "========================================="
echo "✓ Deployment completed successfully!"
echo "========================================="
echo ""
echo "Frontend: https://your-domain:3002"
echo "Backend API: http://localhost:3000"
echo ""
echo "Check logs:"
echo "  - Backend: sudo journalctl -u bookcars -f"
echo "  - Nginx: sudo tail -f /var/log/nginx/bookcars.frontend.error.log"


#!/bin/bash

echo "=== Restarting Backend and Deploying Admin Panel ==="
echo ""

# Restart backend service
echo "1. Restarting backend service..."
sudo systemctl restart bookcars-backend.service
sudo systemctl status bookcars-backend.service --no-pager | head -5

echo ""
echo "2. Deploying admin panel..."
cd /home/ubuntu/bookcars
sudo bash __scripts/bc-deploy-admin.sh

echo ""
echo "=== Done ==="


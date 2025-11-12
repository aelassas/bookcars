#!/bin/bash

echo "=== Nginx Error Log Check ==="
echo ""

echo "Last 30 lines of error log:"
sudo tail -30 /var/log/nginx/error.log 2>&1

echo ""
echo "=== Access Log (last 5 requests) ==="
sudo tail -5 /var/log/nginx/access.log 2>&1

echo ""
echo "=== Testing Configuration ==="
sudo nginx -t 2>&1

echo ""
echo "=== Current Nginx Status ==="
sudo systemctl status nginx --no-pager -l 2>&1 | head -15


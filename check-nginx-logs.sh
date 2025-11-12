#!/bin/bash

echo "=== Nginx Error Log (Last 50 lines) ==="
echo ""
sudo tail -50 /var/log/nginx/error.log 2>&1
echo ""

echo "=== Nginx Access Log (Last 20 lines) ==="
echo ""
sudo tail -20 /var/log/nginx/access.log 2>&1
echo ""

echo "=== Checking for Redirect Loops ==="
echo ""
sudo grep -i "redirect\|301\|302" /var/log/nginx/error.log 2>&1 | tail -10
echo ""

echo "=== Checking for 502/520 Errors ==="
echo ""
sudo grep -i "502\|520\|upstream" /var/log/nginx/error.log 2>&1 | tail -10
echo ""

echo "=== Testing Current Configuration ==="
echo ""
sudo nginx -t 2>&1
echo ""

echo "=== Active Nginx Configs ==="
echo ""
ls -la /etc/nginx/sites-enabled/ 2>&1
echo ""

echo "=== Testing Server Response ==="
echo ""
echo "Frontend:"
curl -k -I https://127.0.0.1/ 2>&1 | head -3
echo ""
echo "Admin Panel:"
curl -k -I https://127.0.0.1/admin/ 2>&1 | head -3
echo ""

echo "=== Cloudflare Test ==="
echo ""
echo "External Frontend:"
curl -k -I https://tokyodrivingclub.com/ 2>&1 | head -5
echo ""







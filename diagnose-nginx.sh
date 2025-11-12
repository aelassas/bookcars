#!/bin/bash

echo "=== Nginx Configuration Diagnostic ==="
echo ""

echo "1. Testing Nginx configuration syntax..."
sudo nginx -t 2>&1
echo ""

echo "2. Checking if files exist and are readable..."
echo "   Admin index.html: $(test -f /var/www/bookcars/admin/index.html && echo 'EXISTS' || echo 'MISSING')"
echo "   Frontend index.html: $(test -f /var/www/bookcars/frontend/index.html && echo 'EXISTS' || echo 'MISSING')"
echo ""

echo "3. Checking file permissions..."
ls -la /var/www/bookcars/admin/index.html 2>&1 | head -1
ls -la /var/www/bookcars/frontend/index.html 2>&1 | head -1
echo ""

echo "4. Testing as www-data user (Nginx user)..."
sudo -u www-data test -r /var/www/bookcars/admin/index.html 2>&1 && echo "   ✅ www-data can read admin/index.html" || echo "   ❌ www-data CANNOT read admin/index.html"
sudo -u www-data test -r /var/www/bookcars/frontend/index.html 2>&1 && echo "   ✅ www-data can read frontend/index.html" || echo "   ❌ www-data CANNOT read frontend/index.html"
echo ""

echo "5. Checking Nginx error log (last 10 lines)..."
sudo tail -10 /var/log/nginx/error.log 2>&1
echo ""

echo "6. Testing local access..."
echo "   Admin: $(curl -k -s -o /dev/null -w '%{http_code}' https://127.0.0.1/admin/ 2>/dev/null)"
echo "   Frontend: $(curl -k -s -o /dev/null -w '%{http_code}' https://127.0.0.1/ 2>/dev/null)"
echo ""

echo "=== Diagnostic Complete ==="


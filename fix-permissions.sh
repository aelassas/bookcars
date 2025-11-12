#!/bin/bash

echo "=== Fixing Permissions ==="
echo ""

# Fix ownership
echo "Setting ownership to www-data..."
sudo chown -R www-data:www-data /var/www/bookcars

# Fix permissions
echo "Setting permissions..."
sudo chmod -R 755 /var/www/bookcars
sudo chmod 755 /var/www

# Verify
echo ""
echo "Verifying permissions..."
ls -la /var/www/ | grep bookcars
ls -la /var/www/bookcars/

echo ""
echo "✅ Permissions fixed!"
echo ""
echo "Now test as www-data:"
sudo -u www-data test -r /var/www/bookcars/admin/index.html && echo "✅ www-data can read admin files" || echo "❌ www-data still cannot read files"
sudo -u www-data test -r /var/www/bookcars/frontend/index.html && echo "✅ www-data can read frontend files" || echo "❌ www-data still cannot read files"

echo ""
echo "Reload Nginx:"
echo "  sudo systemctl reload nginx"


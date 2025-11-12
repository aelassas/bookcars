#!/bin/bash
set -e

echo "=== Updating Nginx configuration for host setup ==="
echo ""

# Backup existing config
sudo cp /etc/nginx/sites-available/tokyodrivingclub.com /etc/nginx/sites-available/tokyodrivingclub.com.backup.$(date +%Y%m%d_%H%M%S)

# Create new Nginx config
sudo tee /etc/nginx/sites-available/tokyodrivingclub.com > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name tokyodrivingclub.com www.tokyodrivingclub.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tokyodrivingclub.com www.tokyodrivingclub.com;

    ssl_certificate     /etc/ssl/certs/tokyodrivingclub.com.pem;
    ssl_certificate_key /etc/ssl/private/tokyodrivingclub.com.cert;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Forward API requests to backend (must come before /admin)
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Forward CDN requests to backend
    location /cdn {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redirect /admin (without trailing slash) to /admin/
    location = /admin {
        return 301 $scheme://$host/admin/;
    }

    # Serve admin panel from static files
    location /admin/ {
        root /var/www/bookcars;
        index index.html;
        try_files $uri $uri/ /admin/index.html;
    }

    # Serve frontend from static files (must be last)
    location / {
        root /var/www/bookcars/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
EOF

echo "✅ Nginx configuration updated"
echo ""
echo "Testing Nginx configuration..."
sudo nginx -t

echo ""
echo "✅ Configuration is valid!"
echo ""
echo "To apply changes, run: sudo systemctl reload nginx"


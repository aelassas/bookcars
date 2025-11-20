# Admin Panel Nginx Forwarding Setup

## Current Status

✅ Admin panel is running on port 3001 (Docker container)
✅ Direct access works: http://localhost:3001
⚠️  No nginx forwarding configured for admin panel domain

## Issue

The admin panel Docker container is serving on port 3001, but there's no nginx configuration to forward it from a domain/subdomain. The `__config/nginx.conf` file has a config for port 3001, but it's trying to serve static files from `/var/www/bookcars/admin` which doesn't exist.

## Solution Options

### Option 1: Admin Subdomain (Recommended)
Create `admin.tokyodrivingclub.com` subdomain that forwards to port 3001.

**Steps:**
1. Create nginx config file:
   ```bash
   sudo nano /etc/nginx/sites-available/admin.tokyodrivingclub.com
   ```

2. Add this configuration:
   ```nginx
   server {
       listen 80;
       listen [::]:80;
       server_name admin.tokyodrivingclub.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       listen [::]:443 ssl http2;
       server_name admin.tokyodrivingclub.com;

       ssl_certificate     /etc/ssl/certs/tokyodrivingclub.com.pem;
       ssl_certificate_key /etc/ssl/private/tokyodrivingclub.com.cert;

       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;

       # Forward API requests to backend
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

       # Serve admin panel from Docker container
       location / {
           proxy_pass http://127.0.0.1:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Enable the site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/admin.tokyodrivingclub.com /etc/nginx/sites-enabled/
   ```

4. Test and reload:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. Configure DNS:
   - Add A record in your DNS: `admin.tokyodrivingclub.com` → Your server IP
   - Or add CNAME: `admin` → `tokyodrivingclub.com`

### Option 2: Add Admin Path to Main Domain
Add `/admin` path to the main domain configuration.

**Update `/etc/nginx/sites-available/tokyodrivingclub.com`:**
```nginx
# Add this location block inside the main server block
location /admin {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

Then access via: `https://tokyodrivingclub.com/admin`

### Option 3: Keep Direct Port Access
Continue accessing via: `http://your-server-ip:3001` or `https://tokyodrivingclub.com:3001`

## Quick Setup (Option 1 - Subdomain)

I've created a ready-to-use config file at `/tmp/admin-nginx-config.conf`. To apply it:

```bash
# Copy the config
sudo cp /tmp/admin-nginx-config.conf /etc/nginx/sites-available/admin.tokyodrivingclub.com

# Enable it
sudo ln -s /etc/nginx/sites-available/admin.tokyodrivingclub.com /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

Then configure DNS for `admin.tokyodrivingclub.com` to point to your server.

## Testing

After setup, test with:
```bash
curl -I https://admin.tokyodrivingclub.com
# or
curl -I https://tokyodrivingclub.com/admin
```

## Current Access

- Direct: http://localhost:3001
- Direct (external): http://your-server-ip:3001
- After nginx setup: https://admin.tokyodrivingclub.com


# Fix tokyodrivingclub.com Configuration

## Issue
The domain tokyodrivingclub.com is configured in nginx but is currently proxying to port 3000 (backend) instead of the frontend.

## Solution

Update the nginx configuration to:
1. Serve the frontend from port 8080 (Docker container)
2. Forward `/api` requests to port 3000 (backend)
3. Forward `/cdn` requests to port 3000 (backend)

## Steps

1. **Backup current config:**
   ```bash
   sudo cp /etc/nginx/sites-available/tokyodrivingclub.com /etc/nginx/sites-available/tokyodrivingclub.com.backup
   ```

2. **Update nginx config:**
   ```bash
   sudo nano /etc/nginx/sites-available/tokyodrivingclub.com
   ```

3. **Replace the content with:**
   ```nginx
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

       # Serve frontend from Docker container
       location / {
           proxy_pass http://127.0.0.1:8080;
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

4. **Test nginx configuration:**
   ```bash
   sudo nginx -t
   ```

5. **Reload nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

6. **Verify it's working:**
   ```bash
   curl -I https://tokyodrivingclub.com
   ```

## Alternative: Copy files to host (if you prefer static file serving)

If you want to serve static files directly instead of proxying:

1. **Copy frontend files from Docker container:**
   ```bash
   sudo mkdir -p /var/www/bookcars/frontend
   docker cp bookcars-bc-frontend-1:/usr/share/nginx/html/. /var/www/bookcars/frontend/
   ```

2. **Update nginx config to serve static files:**
   ```nginx
   root /var/www/bookcars/frontend;
   
   location / {
       try_files $uri $uri/ /index.html =404;
   }
   ```

## Current Status

- ✅ Frontend Docker container is running on port 8080
- ✅ Backend is running on port 3000
- ⚠️  Nginx config needs to be updated to proxy correctly


# Nginx and Port Configuration Summary

## Current Configuration

### Docker Compose Ports
- **Backend**: `3000:3000` - Backend API service
- **Admin**: `3001:3001` - Admin panel (nginx inside container)
- **Frontend**: `8080:80, 8443:443` - Frontend (nginx inside container)
- **MongoDB**: `27018:27017` - Database
- **Mongo Express**: `8084:8081` - Database admin UI

### External Nginx Configuration (`__config/nginx.conf`)

This is for a separate nginx instance running on the host that serves the built static files and forwards API requests.

#### Admin Panel (Port 3001 - SSL)
- Serves static files from: `/var/www/bookcars/admin`
- Forwards `/api/*` → `http://localhost:3000` (Docker backend)
- Forwards `/cdn/*` → `http://localhost:3000` (Docker backend)

#### Frontend (Port 3002 - SSL)
- Serves static files from: `/var/www/bookcars/frontend`
- Forwards `/api/*` → `http://localhost:3000` (Docker backend)
- Forwards `/cdn/*` → `http://localhost:3000` (Docker backend)

### Environment Variables

#### Backend (`.env.docker`)
- `BC_PORT=3000` - Backend listens on port 3000

#### Frontend (`.env.docker`)
- `VITE_BC_API_HOST=` - Empty (uses relative paths, nginx forwards `/api`)

#### Admin (`.env.docker`)
- `VITE_BC_API_HOST=` - Empty (uses relative paths, nginx forwards `/api`)

## How It Works

1. **Docker Services**:
   - Backend runs on port 3000 inside Docker
   - Frontend/Admin are built and served by nginx inside Docker containers
   - Docker exposes these ports to the host

2. **External Nginx** (if used):
   - Serves pre-built static files from `/var/www/bookcars/`
   - When frontend/admin make API calls to `/api/*`, nginx forwards them to `http://localhost:3000`
   - This allows SSL termination and unified domain access

3. **API Flow**:
   ```
   Browser → Nginx (port 3001/3002) → /api/* → localhost:3000 (Docker backend)
   ```

## Notes

- The frontend Docker container exposes port 8080, but external nginx serves on 3002
- This is fine - they're separate nginx instances
- If using external nginx, you need to copy built files from Docker to `/var/www/bookcars/`
- If not using external nginx, access services directly:
  - Backend: http://localhost:3000
  - Admin: http://localhost:3001
  - Frontend: http://localhost:8080

## Verification

To verify the configuration:

```bash
# Check Docker ports
docker compose ps

# Test backend
curl http://localhost:3000/api/health

# Test admin (if nginx is configured)
curl http://localhost:3001

# Test frontend (if nginx is configured)
curl http://localhost:3002
```

## Issues Fixed

1. ✅ Added API forwarding (`/api`) in nginx config for both frontend and admin
2. ✅ Added CDN forwarding (`/cdn`) in nginx config
3. ✅ Updated frontend/admin to use relative API paths (empty API_HOST)
4. ✅ Backend port is correctly set to 3000
5. ✅ All proxy headers configured for proper request forwarding


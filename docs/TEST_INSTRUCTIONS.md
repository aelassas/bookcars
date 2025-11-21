# Testing BookCars Docker Setup

## Current Status
✅ Docker Compose configuration is valid
✅ `.env.docker` file is configured correctly
✅ Port 3000 is set for backend
✅ SMTP settings are configured for Brevo

## Permission Issue
You need Docker permissions to run the containers. Choose one of these options:

### Option 1: Add to Docker Group (Recommended)
Run these commands in your terminal:

```bash
# Add yourself to docker group
sudo usermod -aG docker $USER

# Apply the group change in current session
newgrp docker

# Verify you can access docker
docker ps

# Start the services
cd /home/ubuntu/bookcars
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f bc-backend
```

### Option 2: Use Sudo
If you prefer to use sudo:

```bash
cd /home/ubuntu/bookcars
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs -f bc-backend
```

### Option 3: Log Out and Back In
After running `sudo usermod -aG docker $USER`, log out and log back in, then:

```bash
cd /home/ubuntu/bookcars
docker compose up -d
```

## Testing After Services Start

1. **Check all services are running:**
   ```bash
   docker compose ps
   ```
   You should see: mongo, mongo-express, bc-backend, bc-admin, bc-frontend

2. **Check backend logs:**
   ```bash
   docker compose logs bc-backend
   ```
   Look for: "HTTP server is running on port 3000"

3. **Test backend API:**
   ```bash
   curl http://localhost:3000/api/health
   ```
   Or visit in browser: http://localhost:3000

4. **Check MongoDB:**
   ```bash
   docker compose logs mongo
   ```

5. **Access services:**
   - Backend API: http://localhost:3000
   - Admin Panel: http://localhost:3001
   - Frontend: http://localhost:8080
   - Mongo Express: http://localhost:8084

## Troubleshooting

If services fail to start:
```bash
# View all logs
docker compose logs

# Restart services
docker compose restart

# Rebuild and start
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

## Configuration Files

- Backend env: `/home/ubuntu/bookcars/backend/.env.docker`
- Docker compose: `/home/ubuntu/bookcars/docker-compose.yml`
- Backend port: 3000 (configured for nginx forwarding)


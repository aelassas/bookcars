# Stop Puma/Ruby Server Permanently

## Issue
The Puma/Ruby server (emt-rental) is running on port 3000 and conflicting with BookCars backend.

## Solution

Run these commands in your terminal to stop and disable the Puma service permanently:

```bash
# Stop the Puma service
sudo systemctl stop puma.service

# Disable it so it won't start on boot
sudo systemctl disable puma.service

# Verify it's stopped
sudo systemctl status puma.service

# Kill any remaining Puma processes
sudo pkill -f puma

# Verify port 3000 is free
ss -tlnp | grep :3000
```

## After stopping Puma

Once Puma is stopped, restart the BookCars backend:

```bash
cd /home/ubuntu/bookcars
docker compose restart bc-backend
```

## Verify BookCars is running

```bash
# Check backend is running
docker compose ps bc-backend

# Check backend logs
docker compose logs bc-backend --tail 20

# Test backend
curl http://localhost:3000
```

## If you need to re-enable Puma later

```bash
sudo systemctl enable puma.service
sudo systemctl start puma.service
```

## Alternative: Change BookCars Backend Port

If you need both services running, you can change BookCars backend port:

1. Edit `/home/ubuntu/bookcars/backend/.env.docker`:
   - Change `BC_PORT=3000` to `BC_PORT=3001` (or another port)

2. Edit `/home/ubuntu/bookcars/docker-compose.yml`:
   - Change backend ports from `3000:3000` to `3001:3001`

3. Rebuild and restart:
   ```bash
   docker compose down
   docker compose up -d --build
   ```


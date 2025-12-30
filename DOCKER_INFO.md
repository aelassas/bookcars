# FleetWise/BookCars - Docker Setup

## 🎉 Project is Running!

All Docker containers have been successfully started and are running in development mode.

## 📋 Services & Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:8080 | Customer-facing web application |
| **Admin Panel** | http://localhost:3001 | Admin dashboard for managing the platform |
| **Backend API** | http://localhost:4002 | REST API backend |
| **MongoDB** | localhost:27018 | Database (credentials: admin/admin) |
| **Mongo Express** | http://localhost:8084 | MongoDB web interface (credentials: admin/admin) |

## 🔑 Default Login Credentials

### Admin Panel (http://localhost:3001)
- Email: `admin@bookcars.ma`
- Password: (will be set up on first run)

### Frontend (http://localhost:8080)
- Create a new customer account or use existing credentials

## 🛠️ Docker Commands

### View Container Status
```bash
docker-compose -f docker-compose.dev.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f bc-dev-backend
docker-compose -f docker-compose.dev.yml logs -f bc-dev-frontend
docker-compose -f docker-compose.dev.yml logs -f bc-dev-admin
```

### Stop All Containers
```bash
docker-compose -f docker-compose.dev.yml down
```

### Stop and Remove Volumes (⚠️ This will delete all data)
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Restart Containers
```bash
docker-compose -f docker-compose.dev.yml restart
```

### Rebuild Containers (after code changes that require rebuild)
```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

## ⚙️ Configuration

Environment variables are stored in:
- `backend/.env.docker` - Backend API configuration
- `admin/.env.docker` - Admin panel configuration
- `frontend/.env.docker` - Frontend configuration

### Important Settings to Update

#### SMTP (Email) - Required for user registration
Edit `backend/.env.docker`:
```env
BC_SMTP_HOST=smtp.gmail.com
BC_SMTP_PORT=587
BC_SMTP_USER=your-email@gmail.com
BC_SMTP_PASS=your-app-password
BC_SMTP_FROM=your-email@gmail.com
```

#### Payment Gateways (Optional)
Edit `backend/.env.docker` for backend keys and `frontend/.env.docker` for frontend keys:
- Stripe keys (for credit card payments)
- PayPal keys (for PayPal payments)

## 📦 Docker Volumes

The following volumes persist data:
- `fleetwise_mongodb_data` - MongoDB database
- `fleetwise_cdn` - Uploaded files (user avatars, car images, etc.)
- `fleetwise_backend_logs` - Application logs

## 🔄 Development Mode Features

This setup uses `docker-compose.dev.yml` which includes:
- ✅ Hot-reloading for frontend and admin (changes reflect immediately)
- ✅ Hot-reloading for backend (nodemon watches for changes)
- ✅ Source code mounted as volumes
- ✅ Development build optimizations

## 🚀 Production Mode

For production deployment, use:
```bash
docker-compose up -d
```

This uses the production Dockerfiles without hot-reloading.

## 📝 Next Steps

1. Access the admin panel at http://localhost:3001
2. Set up your admin account
3. Configure SMTP settings in `backend/.env.docker` (required for email notifications)
4. Add cars, locations, and start managing bookings
5. Access the customer frontend at http://localhost:8080

## 🐛 Troubleshooting

### Container won't start?
Check logs:
```bash
docker-compose -f docker-compose.dev.yml logs [service-name]
```

### Port already in use?
Edit `docker-compose.dev.yml` to change port mappings.

### Database connection issues?
Ensure MongoDB container is running:
```bash
docker-compose -f docker-compose.dev.yml ps mongo
```

### Need to reset everything?
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

---

For more information, visit the [BookCars Wiki](https://github.com/aelassas/bookcars/wiki)

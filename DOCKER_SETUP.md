# 🎀 BookDress Docker Setup Guide

This guide will help you set up the BookDress application using Docker for local development and testing.

## 📋 Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)
- At least **4GB RAM** available for Docker
- **10GB** free disk space

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

**For Windows:**
```bash
setup-bookdress.bat
```

**For Linux/macOS:**
```bash
chmod +x setup-bookdress.sh
./setup-bookdress.sh
```

### Option 2: Manual Setup

1. **Clone and navigate to the project:**
   ```bash
   cd bookDress
   ```

2. **Build and start the application:**
   ```bash
   docker compose up --build -d
   ```

3. **Wait for services to start (about 2-3 minutes)**

## 📱 Access Your Applications

Once the setup is complete, you can access:

- **Frontend (Customer):** http://localhost:8080
- **Backend (Admin):** http://localhost:3001  
- **API:** http://localhost:4002
- **MongoDB Express:** http://localhost:8084

## 🔐 Default Admin Access

**Email:** `admin@bookdress.local`  
**Password:** `admin123`

⚠️ **IMPORTANT:** Change this password after first login!

## 🏗️ Application Architecture

The BookDress application consists of:

- **MongoDB** - Database (port 27018)
- **API** - Backend API service (port 4002)
- **Backend** - Admin panel (port 3001)
- **Frontend** - Customer interface (port 8080)
- **MongoDB Express** - Database admin (port 8084)

## 📝 Configuration

The application is pre-configured for local development with:

- **Default Language:** Arabic (ar)
- **Timezone:** Asia/Jerusalem
- **Currency:** Israeli Shekel (₪)
- **Email Verification:** Disabled
- **Payment Gateway:** Disabled
- **Auto-verified Users:** Enabled

## 🛠️ Useful Commands

### Basic Operations
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# Restart services
docker compose restart

# View logs
docker compose logs

# View logs for specific service
docker compose logs bc-api
```

### Development Commands
```bash
# Rebuild and restart
docker compose up --build --force-recreate

# Rebuild without cache
docker compose build --no-cache

# Remove all containers and volumes
docker compose down -v
```

### Database Operations
```bash
# Access MongoDB shell
docker exec -it bookdress-mongo-1 mongosh -u admin -p admin

# Backup database
docker exec bookdress-mongo-1 mongodump --uri="mongodb://admin:admin@localhost:27017/bookdress?authSource=admin" --out=/backup

# View database in browser
# Go to http://localhost:8084
```

## 🎯 Getting Started Workflow

1. **Access Admin Panel:** http://localhost:3001
2. **Login** with default credentials
3. **Create Suppliers:** Add dress rental companies
4. **Create Locations:** Add pickup/dropoff locations  
5. **Create Dresses:** Add dress inventory
6. **Test Frontend:** Visit http://localhost:8080

## 🔧 Troubleshooting

### Common Issues

**Services won't start:**
```bash
# Check Docker is running
docker --version

# Check available resources
docker system df

# Clean up Docker
docker system prune -a
```

**Port conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :8080
netstat -tulpn | grep :3001
netstat -tulpn | grep :4002
```

**Database connection issues:**
```bash
# Check MongoDB logs
docker compose logs mongo

# Restart MongoDB
docker compose restart mongo
```

### Reset Everything
```bash
# Stop and remove everything
docker compose down -v

# Remove images
docker rmi $(docker images -q)

# Start fresh
docker compose up --build -d
```

## 📊 Monitoring

### Check Service Health
```bash
# View running containers
docker compose ps

# Check resource usage
docker stats

# View service logs in real-time
docker compose logs -f
```

### Database Monitoring
- **MongoDB Express:** http://localhost:8084
- **Username:** admin
- **Password:** admin

## 🔒 Security Notes

- Default passwords are for development only
- Change all default credentials in production
- Email verification is disabled for easy testing
- Payment gateways are disabled by default

## 📞 Support

If you encounter issues:

1. Check the logs: `docker compose logs`
2. Verify all services are running: `docker compose ps`
3. Ensure ports are not in use by other applications
4. Try rebuilding: `docker compose up --build --force-recreate`

## 🎉 Success!

You should now have a fully functional BookDress application running locally. Happy dress renting! 👗✨

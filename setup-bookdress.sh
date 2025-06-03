#!/bin/bash

# BookDress Docker Setup Script
# This script sets up the BookDress application with Docker

echo "🎀 BookDress Docker Setup Script 🎀"
echo "===================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p api/cdn/bookdress/{users,dresses,locations,contracts,licenses}
mkdir -p api/cdn/bookdress/temp/{users,dresses,locations,contracts,licenses}

# Set permissions for CDN directories
chmod -R 755 api/cdn/

echo "✅ Directories created"

# Build and start the application
echo "🚀 Building and starting BookDress application..."
echo "This may take several minutes on first run..."

# Build the images
docker compose build --no-cache

# Start the services
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker compose ps

echo ""
echo "🎉 BookDress Setup Complete!"
echo "=========================="
echo ""
echo "📱 Access your applications:"
echo "   Frontend:        http://localhost:8080"
echo "   Backend (Admin): http://localhost:3001"
echo "   API:             http://localhost:4002"
echo "   MongoDB Express: http://localhost:8084"
echo ""
echo "🔐 Default Admin Credentials:"
echo "   Email:    admin@bookdress.local"
echo "   Password: admin123"
echo ""
echo "⚠️  IMPORTANT: Change the admin password after first login!"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to http://localhost:3001 and login with admin credentials"
echo "   2. Create suppliers, locations, and dresses"
echo "   3. Test the frontend at http://localhost:8080"
echo ""
echo "🛠️  Useful Commands:"
echo "   Stop:     docker compose down"
echo "   Restart:  docker compose restart"
echo "   Logs:     docker compose logs"
echo "   Rebuild:  docker compose up --build --force-recreate"
echo ""
echo "Happy dress renting! 👗✨"

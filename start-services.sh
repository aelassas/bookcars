#!/bin/bash
# Start BookCars services with Docker Compose

echo "Starting BookCars services..."

# Check if user is in docker group
if groups | grep -q docker; then
    echo "User is in docker group, starting services..."
    cd /home/ubuntu/bookcars
    docker compose up -d
    echo ""
    echo "Services started! Checking status..."
    docker compose ps
else
    echo "User is not in docker group."
    echo "Please run one of the following:"
    echo ""
    echo "Option 1: Add to docker group and use newgrp"
    echo "  sudo usermod -aG docker \$USER"
    echo "  newgrp docker"
    echo "  ./start-services.sh"
    echo ""
    echo "Option 2: Use sudo"
    echo "  sudo docker compose up -d"
    echo ""
    echo "Option 3: Log out and log back in after adding to docker group"
    exit 1
fi


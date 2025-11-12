#!/bin/bash
# Docker Installation Script for BookCars

set -e

echo "Installing Docker and Docker Compose..."

# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
sudo apt update

# Install Docker Engine, CLI, Containerd, and Docker Compose
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (requires logout/login to take effect)
sudo usermod -aG docker $USER

echo ""
echo "Docker installation completed!"
echo ""
echo "IMPORTANT: You need to log out and log back in (or run 'newgrp docker') for the docker group changes to take effect."
echo ""
echo "After that, you can run:"
echo "  cd /home/ubuntu/bookcars"
echo "  docker compose up -d"
echo ""


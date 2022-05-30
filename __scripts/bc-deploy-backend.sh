#!/bin/bash

echo "Deploying BookCars backend..."

cd /opt/bookcars
git pull
sudo chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/backend
sudo rm -rf build

npm ci
npm prune
npm run build

sudo rm -rf /var/www/bookcars.ma/backend
sudo mkdir -p /var/www/bookcars.ma/backend
sudo cp -rf build/* /var/www/bookcars.ma/backend

echo "BookCars backend deployed."

#$SHELL

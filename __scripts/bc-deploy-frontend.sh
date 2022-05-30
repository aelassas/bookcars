#!/bin/bash

echo "Deploying BookCars frontend..."

cd /opt/bookcars
git pull
sudo chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/frontend
sudo rm -rf build

npm ci
npm run build

sudo rm -rf /var/www/bookcars.ma/frontend
sudo mkdir -p /var/www/bookcars.ma/frontend
sudo cp -rf build/* /var/www/bookcars.ma/frontend

echo "BookCars frontend deployed."

#$SHELL

#!/bin/bash

echo "Deploying BookCars frontend..."

cd /opt/bookcars
git pull
sudo chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/frontend
sudo rm -rf build

npm ci
npm prune
npm run build

sudo rm -rf /var/www/bookcars.ma/frontend
sudo mkdir -p /var/www/bookcars.ma/frontend
sudo cp -rf build/* /var/www/bookcars.ma/frontend

sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

echo "BookCars frontend deployed."

#$SHELL

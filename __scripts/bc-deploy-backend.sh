#!/bin/bash

echo "Deploying BookCars backend..."

cd /opt/bookcars/backend
#git reset --hard
git pull
sudo chmod +x -R /opt/bookcars/__scripts

sudo rm -rf build
npm install
npm update
npm run build

#sudo systemctl restart bookcars-backend
#sudo systemctl status bookcars-backend --no-pager

sudo rm -rf /var/www/bookcars.ma/backend
sudo mkdir -p /var/www/bookcars.ma/backend
sudo cp -rf build/* /var/www/bookcars.ma/backend

sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

echo "BookCars backend deployed."

$SHELL

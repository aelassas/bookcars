#!/bin/bash

echo "Deploying BookCars frontend..."

cd /opt/bookcars/frontend
git reset --hard
git pull
sudo chmod +x -R /opt/bookcars/scripts

sudo rm -rf build
npm install
npm update
npm run build

#sudo systemctl restart bookcars-backend
#sudo systemctl status bookcars-backend --no-pager

sudo rm -rf /var/www/bookcars.ma/frontend
sudo mkdir -p /var/www/bookcars.ma/frontend
sudo cp -rf build/* /var/www/www.wexstream.com/frontend

sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

echo "BookCars backend frontend."

$SHELL

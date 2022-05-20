#!/bin/bash

echo "Deploying BookCars frontend..."

cd /opt/bookcars
#git reset --hard
git pull
sudo chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/frontend
sudo rm -rf build
#npm install
#npm update
npm ci
npm run build

#sudo systemctl restart bookcars-frontend
#sudo systemctl status bookcars-frontend --no-pager

sudo rm -rf /var/www/bookcars.ma/frontend
sudo mkdir -p /var/www/bookcars.ma/frontend
sudo cp -rf build/* /var/www/bookcars.ma/frontend

sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

echo "BookCars frontend deployed."

#$SHELL

#!/bin/bash

echo "Deploying BookCars API..."

cd /opt/bookcars
#git reset --hard
git pull
chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/api
npm install
npm update
sudo systemctl restart bookcars
sudo systemctl status bookcars --no-pager

echo "BookCars API deployed."

$SHEL

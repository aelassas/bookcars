#!/bin/bash

echo "Deploying BookCars API..."

cd /opt/bookcars
git pull
chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/api

npm ci
npm prune

sudo systemctl restart bookcars
sudo systemctl status bookcars --no-pager

echo "BookCars API deployed."

#$SHEL

#!/bin/bash

start=`date +%s`
echo "Deploying BookCars API..."

cd /opt/bookcars
git pull
chmod +x -R /opt/bookcars/__scripts

cd /opt/bookcars/api

npm ci

sudo systemctl restart bookcars
sudo systemctl status bookcars --no-pager

end=`date +%s`
runtime=$((end-start))
echo "BookCars API deployed in ${runtime}."

#$SHEL

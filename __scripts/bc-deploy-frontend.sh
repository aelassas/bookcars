#!/bin/bash

start_time=`date +%s`
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

finish_time=`date +%s`
elapsed_time=$((finish_time  - start_time))
((sec=elapsed_time%60, elapsed_time/=60, min=elapsed_time%60, hrs=elapsed_time/60))
timestamp=$(printf "BookCars frontend deployed in %d minutes and %d seconds." $min $sec)
echo $timestamp

#$SHELL

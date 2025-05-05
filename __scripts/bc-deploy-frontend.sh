#!/bin/bash

start_time=$(date +%s)
echo "Deploying BookCars frontend..."

cd /opt/demo
git pull
sudo chmod +x -R /opt/demo/__scripts

/bin/bash /opt/demo/__scripts/free-mem.sh

cd /opt/demo/frontend

npm install --force
npm run build

sudo rm -rf /var/www/demo/frontend
sudo mkdir -p /var/www/demo/frontend
sudo cp -rf build/* /var/www/demo/frontend

sudo rm -rf /var/cache/nginx
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

/bin/bash /opt/demo/__scripts/free-mem.sh

finish_time=$(date +%s)
elapsed_time=$((finish_time - start_time))
((sec=elapsed_time%60, elapsed_time/=60, min=elapsed_time%60))
timestamp=$(printf "BookCars frontend deployed in %d minutes and %d seconds." $min $sec)
echo "$timestamp"

#$SHELL

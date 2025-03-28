#!/bin/bash

start_time=$(date +%s)
echo "Deploying SiCarro backoffice..."

cd /opt/bookcars
git pull
sudo chmod +x -R /opt/bookcars/__scripts

/bin/bash /opt/bookcars/__scripts/free-mem.sh

cd /opt/bookcars/backoffice
sudo rm -rf build

npm install --force
npm run build

sudo rm -rf /var/www/bookcars/backoffice
sudo mkdir -p /var/www/bookcars/backoffice
sudo cp -rf build/* /var/www/bookcars/backoffice

sudo rm -rf /var/cache/nginx
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

/bin/bash /opt/bookcars/__scripts/free-mem.sh

finish_time=$(date +%s)
elapsed_time=$((finish_time - start_time))
((sec=elapsed_time%60, elapsed_time/=60, min=elapsed_time%60))
timestamp=$(printf "SiCarro backoffice deployed in %d minutes and %d seconds." $min $sec)
echo "$timestamp"

#$SHELL

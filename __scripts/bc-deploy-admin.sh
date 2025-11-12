#!/bin/bash

start_time=$(date +%s)
echo "Deploying BookCars admin panel..."

cd /home/ubuntu/bookcars
git pull
sudo chmod +x -R /home/ubuntu/bookcars/__scripts

/bin/bash /home/ubuntu/bookcars/__scripts/free-mem.sh

cd /home/ubuntu/bookcars/admin
sudo rm -rf build

npm install --force
npm run build

sudo rm -rf /var/www/bookcars/admin
sudo mkdir -p /var/www/bookcars/admin
sudo cp -rf build/* /var/www/bookcars/admin

sudo rm -rf /var/cache/nginx
sudo systemctl restart nginx
sudo systemctl status nginx --no-pager

/bin/bash /home/ubuntu/bookcars/__scripts/free-mem.sh

finish_time=$(date +%s)
elapsed_time=$((finish_time - start_time))
((sec=elapsed_time%60, elapsed_time/=60, min=elapsed_time%60))
timestamp=$(printf "BookCars admin panel deployed in %d minutes and %d seconds." $min $sec)
echo "$timestamp"

#$SHELL

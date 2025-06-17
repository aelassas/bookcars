#!/bin/bash

start_time=$(date +%s)
echo "Deploying BookCars backend..."

cd /opt/bookcars
git pull
chmod +x -R /opt/bookcars/__scripts

/bin/bash /opt/bookcars/__scripts/free-mem.sh

cd /opt/bookcars/backend

npm install

sudo systemctl restart bookcars
sudo systemctl status bookcars --no-pager

/bin/bash /opt/bookcars/__scripts/free-mem.sh

finish_time=$(date +%s)
elapsed_time=$((finish_time - start_time))
((sec=elapsed_time%60, elapsed_time/=60, min=elapsed_time%60))
timestamp=$(printf "BookCars backend deployed in %d minutes and %d seconds." $min $sec)
echo "$timestamp"

#$SHEL

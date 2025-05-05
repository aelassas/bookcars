#!/bin/bash

start_time=$(date +%s)
echo "Deploying SiCarro API..."

cd /opt/demo
git pull
chmod +x -R /opt/demo/__scripts

/bin/bash /opt/demo/__scripts/free-mem.sh

cd /opt/demo/api

npm install --omit=dev

sudo systemctl restart bookcars
sudo systemctl status bookcars --no-pager

/bin/bash /opt/demo/__scripts/free-mem.sh

finish_time=$(date +%s)
elapsed_time=$((finish_time - start_time))
((sec=elapsed_time%60, elapsed_time/=60, min=elapsed_time%60))
timestamp=$(printf "SiCarro API deployed in %d minutes and %d seconds." $min $sec)
echo "$timestamp"

#$SHEL

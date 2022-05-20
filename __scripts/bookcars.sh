#!/bin/bash

cd /opt/bookcars/api
/usr/bin/node -r dotenv/config app.js

DATE=`date '+%Y-%m-%d %H:%M:%S'`
echo "BookCars service started at ${DATE}"
#$SHELL

#!/bin/bash

cd /opt/bookcars/backend
/usr/bin/npm start

DATE=`date '+%Y-%m-%d %H:%M:%S'`
echo "BookCars backend started at ${DATE}"
$SHELL

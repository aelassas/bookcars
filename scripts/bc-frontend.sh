#!/bin/bash

cd /opt/bookcars/frontend
/usr/bin/npm start

DATE=`date '+%Y-%m-%d %H:%M:%S'`
echo "BookCars frontend started at ${DATE}"
$SHELL

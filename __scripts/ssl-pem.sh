#!/bin/bash

cat  bookcars.ma.key bookcars.ma.crt > bookcars.ma.pem
sudo chmod 644 bookcars.ma.pem
echo bookcars.ma.pem generated.

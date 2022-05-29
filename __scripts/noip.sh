#!/bin/bash

DNS="bookcars.ddns.net"

log () { echo "$(date '+%d-%m-%Y-%H-%M-%S') - $1"; }

# get the actual IP from the Internet
IP=$(curl -sS https://ipinfo.io/ip | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")
#IP=$(curl -sS https://checkip.amazonaws.com | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")
#IP=$(curl -sS https://ifconfig.me/ip | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")
#IP=$(curl -sS https://ipecho.net/plain | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")
#IP=$(curl -sS https://ident.me | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")
#IP=$(curl -sS https://icanhazip.com | grep -oE "[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+")

# get the configured IP of Jitsi
currentIP=$(host -tA $DNS 8.8.8.8 | grep address | cut -d " " -f4 )

if [ -n "$IP" ] && [ -n "$currentIP" ] && [ "$currentIP" != "$IP" ]
then
    log "Updating public IP..."
    log "Current IP: $currentIP"
    log "Public IP: $IP"
    /usr/local/bin/noip2 -i $IP
    log "Public IP updated."
fi

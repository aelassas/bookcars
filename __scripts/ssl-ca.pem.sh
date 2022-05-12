#!/bin/bash

echo Generating bookcars.ma.ca.pem...
sudo rm -f bookcars.ma.ca.pem
cat AAACertificateServices.crt SectigoRSADomainValidationSecureServerCA.crt USERTrustRSAAAACA.crt > bookcars.ma.ca.pem
sudo chmod 644 bookcars.ma.pem
echo bookcars.ma.ca.pem generated.

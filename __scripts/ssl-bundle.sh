#!/bin/bash

echo Generating bookcars.ma.bundle.crt...
sudo rm -f bookcars.ma.bundle.crt
cat bookcars.ma.crt AAACertificateServices.crt SectigoRSADomainValidationSecureServerCA.crt USERTrustRSAAAACA.crt > bookcars.ma.bundle.crt
sudo chmod 644 bookcars.ma.bundle.crt
echo bookcars.ma.bundle.crt generated.

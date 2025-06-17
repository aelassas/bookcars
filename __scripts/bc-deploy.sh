#!/usr/bin/env bash

if [ "$1" == "all" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-api.sh
  /bin/bash /opt/bookcars/__scripts/bc-deploy-admin.sh
  /bin/bash /opt/bookcars/__scripts/bc-deploy-frontend.sh
elif [ "$1" == "ui" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-admin.sh
  /bin/bash /opt/bookcars/__scripts/bc-deploy-frontend.sh
elif [ "$1" == "api" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-api.sh
elif [ "$1" == "admin" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-admin.sh
elif [ "$1" == "frontend" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-frontend.sh
else
  echo "Usage: bc-deploy all|ui|api|admin|frontend"
fi

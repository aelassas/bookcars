#!/usr/bin/env bash

if [ "$1" == "all" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-backend.sh
  /bin/bash /opt/bookcars/__scripts/bc-deploy-admin.sh
  /bin/bash /opt/bookcars/__scripts/bc-deploy-frontend.sh
elif [ "$1" == "ui" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-admin.sh
  /bin/bash /opt/bookcars/__scripts/bc-deploy-frontend.sh
elif [ "$1" == "backend" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-backend.sh
elif [ "$1" == "admin" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-admin.sh
elif [ "$1" == "frontend" ]; then
  /bin/bash /opt/bookcars/__scripts/bc-deploy-frontend.sh
else
  echo "Usage: bc-deploy all|ui|backend|admin|frontend"
fi

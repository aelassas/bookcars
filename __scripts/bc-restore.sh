#!/bin/bash

HOST="localhost"
PORT=27017
AUTH_DB="admin"
USERNAME="admin"
PASSWORD="PASSWORD"
echo "Host: ${HOST}"
DATABASE_NAME="bookcars"
echo "Database: ${DATABASE_NAME}"
BACKUP_LATEST="/home/aelassas/bookcars/db/${DATABASE_NAME}.gz"
echo "Latest Backup: ${BACKUP_LATEST}"

echo "Restoring ${DATABASE_NAME} database from latest backup ${BACKUP_LATEST}..."
mongorestore --verbose --drop --gzip --host=$HOST --port=$PORT  --username=$USERNAME --password=$PASSWORD --authenticationDatabase=$AUTH_DB --nsInclude="${DATABASE_NAME}.*" --archive=$BACKUP_LATEST
echo "${DATABASE_NAME} database restored."

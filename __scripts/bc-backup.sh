#!/bin/bash

HOST="localhost"
PORT=27017
AUTH_DB="admin"
USERNAME="admin"
PASSWORD="PASSWORD"
echo "Host: ${HOST}"
DATABASE_NAME="bookcars"
echo "Database: ${DATABASE_NAME}"
time=$(date '+%d-%m-%Y_%H-%M-%S');
BACKUP="/home/aelassas/bookcars/db/${DATABASE_NAME}-${time}.gz"
echo "Backup: ${BACKUP}"
BACKUP_LATEST="/home/aelassas/bookcars/db/${DATABASE_NAME}.gz"
_PWD=$PWD
echo "Latest Backup: ${BACKUP_LATEST}"
echo "Backuping ${DATABASE_NAME} database..."
mongodump --verbose  --host=$HOST --port=$PORT --username=$USERNAME --password=$PASSWORD --authenticationDatabase=$AUTH_DB --db=$DATABASE_NAME --gzip --archive=$BACKUP
echo "Backup written in ${BACKUP}"

rm -f $BACKUP_LATEST
cp $BACKUP $BACKUP_LATEST
echo "Latest backup written in ${BACKUP_LATEST}"

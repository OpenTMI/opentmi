#!/bin/bash

# Prerequisites:
# 1. Configured aws client
#   1.1. Use pip or similar tool to acquire it. "pip install awscli" for example.
#   1.2. Configure the awscli with "aws configure" command. AWS access key id
#        and AWS secret access key are needed.
# 2. S3 bucket, that the previously mentioned AWS access key id can access.
#
# Restore with command:
# mongorestore --gzip --archive < <backup.gzip>

set -e

while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -h|--host)
    # DB host (secondary preferred as to avoid impacting primary performance)
    HOST="$2"
    shift
    ;;
    -d|--database)
    # DB name
    DBNAME="$2"
    shift
    ;;
    -b|--bucket)
    # S3 bucket name
    BUCKET="$2"
    shift
    ;;
    --help)
    echo "Usage: ./aws_backup.sh -h <HOST> -d <DATABASE> -b <BUCKET>"
    exit
    ;;
    *)
    echo "ERROR: Unknown argument: $key"
    exit 1
    ;;
esac
shift
done

if [ -z "$HOST" ]; then
    echo "ERROR: -h/--host argument is missing"
    exit 1
fi
if [ -z "$DBNAME" ]; then
    echo "ERROR: -d/--database argument is missing"
    exit 1
fi
if [ -z "$BUCKET" ]; then
    echo "ERROR: -b/--bucket argument is missing"
    exit 1
fi

begin=$(date +%s)

# Current time
TIME=`date --iso-8601=seconds`

# Final backup name
BACKUP_NAME=$DBNAME"_"$TIME".gzip"

# Log
echo "Backing up $HOST/$DBNAME to s3://$BUCKET/ on $TIME";

# Dump from mongodb host into s3
mongodump -h $HOST -d $DBNAME --archive --gzip | aws s3 cp - s3://$BUCKET/$BACKUP_NAME

# All done
echo "Backup available at https://s3.amazonaws.com/$BUCKET/$BACKUP_NAME"

end=$(date +%s)

echo "Backup took:" $(expr $end - $begin) "seconds"

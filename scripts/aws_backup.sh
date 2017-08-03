#!/bin/sh

# Prerequisites:
# 1. Configured aws client, new enough version needed
# 2. S3 bucket
#
# Restore with command:
# mongorestore --gzip --archive < <backup.gzip>

set -e

begin=$(date +%s)

# DB host (secondary preferred as to avoid impacting primary performance)
HOST=localhost

# DB name
DBNAME=db_name

# S3 bucket name
BUCKET=s3_bucket

# Current time
TIME=`/bin/date --iso-8601=seconds`

# Final backup name
BACKUP_NAME=$DBNAME"_"$TIME".gzip"

# Log
echo "Backing up $HOST/$DBNAME to s3://$BUCKET/ on $TIME";

# Dump from mongodb host into s3
/usr/bin/mongodump -h $HOST -d $DBNAME --archive --gzip | /usr/local/bin/aws s3 cp - s3://$BUCKET/$BACKUP_NAME

# All done
echo "Backup available at https://s3.amazonaws.com/$BUCKET/$BACKUP_NAME"

end=$(date +%s)

echo "Backup took:" $(expr $end - $begin) "seconds"

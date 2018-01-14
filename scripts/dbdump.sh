#!/usr/bin/env bash

# Helper script that creates a timestamped database dump folder to the same directory as the script.
# USAGE
# localhost db: $ ./dbdump.sh local
# remote db:    $ ./dbdump.sh remote
#
#https://docs.mongodb.com/v3.2/reference/program/mongodump/

###########################################################
#
#   MODIFY THESE TO YOUR LIKING:
#

# Used if arg = 'local'
LOCAL_MONGO_HOST="127.0.0.1"
LOCAL_MONGO_PORT="27017" # default mongoDB port
LOCAL_DB_NAME="opentmi_dev"

# Used if arg = 'remote'
REMOTE_MONGO_HOST=""
REMOTE_MONGO_PORT=""
REMOTE_DB_NAME=""
REMOTE_DB_USERNAME=""
REMOTE_DB_PASSWORD=""
#
#   DONT TOUCH BELOW UNLESS YOU KNOW WHAT YOU ARE DOING
#
#############################################################

function printHelp {
    echo "USAGE: ./dbdump.sh ['local' | 'remote']"
    echo "'local' are 'remote' are aliases for host, port, dbname."
    echo "To change the values for local and remote, edit the variables in the script."
	echo "successful dumps are stored in /db_backups"
}

function printDumpInfo {
    echo "Running mongodump with following settings"
    echo "hostaddress: $MONGO_HOST"
    echo "port: $MONGO_PORT"
    echo "db name: $DB_NAME"
}

if [[ ( "$#" -ne 1 ) || ( "$1" -ne "local" ) || ( "$1" -ne "remote" ) ]]; then
    printHelp
    exit 1
fi

# change working dir to location of script
cd "$(dirname "$0")"

TIMESTAMP=`date +%Y%m%dT%H%M%S`
# destination dir for dump
DEST=../db_backup/db-dump_${TIMESTAMP}
mkdir $DEST

if [ "$1" = "local" ]; then
    MONGO_HOST="$LOCAL_MONGO_HOST"
    MONGO_PORT="$LOCAL_MONGO_PORT"
    DB_NAME="$LOCAL_DB_NAME"
    printDumpInfo
    if mongodump -h $MONGO_HOST:$MONGO_PORT -d $DB_NAME -o $DEST; then
        echo "Dump successfull, output in $DEST"
    else
        echo "Dump failed..."
        rm -r $DEST
    fi
elif [ "$1" = "remote" ]; then
    MONGO_HOST="$REMOTE_MONGO_HOST"
    MONGO_PORT="$REMOTE_MONGO_PORT"
    DB_NAME="$REMOTE_DB_NAME"
    printDumpInfo
    echo "db username: $REMOTE_DB_USERNAME"
    if mongodump -h $MONGO_HOST:$MONGO_PORT -d $DB_NAME -u $REMOTE_DB_USERNAME -p $REMOTE_DB_PASSWORD -o $DEST; then
        echo "Dump successfull, output in $DEST"
    else
        echo "Dump failed..."
        rm -r $DEST
    fi
else
    printHelp
fi

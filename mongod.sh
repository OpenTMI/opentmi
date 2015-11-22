mkdir -p db
mkdir -p db.log
mongod --dbpath ./db --logpath ./db.log/mongo.log -fork
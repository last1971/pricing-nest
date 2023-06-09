#!/bin/bash
set -e

mongosh <<EOF
db = db.getSiblingDB("$MONGO_INITDB_DATABASE")

db.createUser({
  user: "$MONGO_INITDB_USER",
  pwd: "$MONGO_INITDB_PWD",
  roles: [{
    role: "readWrite",
    db: "$MONGO_INITDB_DATABASE"
  }]
})

chown -R mongodb:mongodb /var/lib/mongodb
chown mongodb:mongodb /tmp/mongodb-27017.sock
EOF
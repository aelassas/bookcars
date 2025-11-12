#!/bin/bash
set -e

echo "=== Setting up MongoDB ==="
echo ""

# Start MongoDB if not running
sudo systemctl start mongod

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
sleep 3

# Create admin user
echo "Creating admin user..."
mongosh --quiet << 'EOF'
use admin

// Create admin user
try {
  db.createUser({
    user: "admin",
    pwd: "admin",
    roles: [
      { role: "userAdminAnyDatabase", db: "admin" },
      { role: "readWriteAnyDatabase", db: "admin" },
      { role: "dbAdminAnyDatabase", db: "admin" },
      { role: "clusterAdmin", db: "admin" }
    ]
  })
  print("Admin user created successfully")
} catch (e) {
  if (e.code === 51003) {
    print("Admin user already exists")
  } else {
    throw e
  }
}

// Create bookcars database and user
use bookcars

try {
  db.createUser({
    user: "bookcars",
    pwd: "bookcars",
    roles: [
      { role: "readWrite", db: "bookcars" }
    ]
  })
  print("BookCars user created successfully")
} catch (e) {
  if (e.code === 51003) {
    print("BookCars user already exists")
  } else {
    throw e
  }
}

print("MongoDB setup complete!")
EOF

echo ""
echo "✅ MongoDB setup complete!"
echo ""
echo "Connection string: mongodb://admin:admin@localhost:27017/bookcars?authSource=admin&appName=bookcars"


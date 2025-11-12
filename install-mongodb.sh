#!/bin/bash
set -e

echo "=== Installing MongoDB on Host ==="
echo ""

# Import MongoDB public GPG key
echo "Importing MongoDB GPG key..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "Adding MongoDB repository..."
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install MongoDB
echo "Installing MongoDB..."
sudo apt-get install -y mongodb-org

# Start and enable MongoDB
echo "Starting MongoDB service..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to start..."
sleep 5

# Check MongoDB status
if sudo systemctl is-active --quiet mongod; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB failed to start"
    exit 1
fi

echo ""
echo "=== Setting up MongoDB users and database ==="
echo ""

# Create admin user and bookcars database
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
  print("✅ Admin user created successfully")
} catch (e) {
  if (e.code === 51003) {
    print("ℹ️  Admin user already exists")
  } else {
    print("❌ Error creating admin user: " + e.message)
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
  print("✅ BookCars user created successfully")
} catch (e) {
  if (e.code === 51003) {
    print("ℹ️  BookCars user already exists")
  } else {
    print("❌ Error creating bookcars user: " + e.message)
    throw e
  }
}

print("")
print("✅ MongoDB setup complete!")
EOF

echo ""
echo "=== MongoDB Installation Complete ==="
echo ""
echo "Connection string: mongodb://admin:admin@localhost:27017/bookcars?authSource=admin&appName=bookcars"
echo ""
echo "MongoDB is now running on port 27017"
echo "You can verify with: sudo systemctl status mongod"


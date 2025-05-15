#!/bin/bash

# Make the script executable
chmod +x migrate-car-to-dress.js

# Run the migration script
echo "Running migration script..."
node migrate-car-to-dress.js

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Migration completed successfully!"
else
  echo "Migration failed. Please check the logs for details."
  exit 1
fi

echo "Database migration completed."

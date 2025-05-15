/**
 * Migration script to update the database from car-specific properties to dress-specific properties.
 * 
 * This script:
 * 1. Updates the Dress collection to remove car-specific properties
 * 2. Updates the Booking collection to replace car with dress
 * 3. Updates the Notification collection to replace car with dress
 * 4. Updates the User collection to replace supplierCarLimit with supplierDressLimit
 * 
 * Usage: node migrate-car-to-dress.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.BC_MONGODB_URI || 'mongodb://localhost:27017/bookdress';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    runMigration();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function runMigration() {
  try {
    console.log('Starting migration...');

    // 1. Update Dress collection
    const dressResult = await mongoose.connection.db.collection('Dress').updateMany(
      {},
      {
        $unset: {
          aircon: "",
          mileage: "",
          theftProtection: "",
          collisionDamageWaiver: "",
          fullInsurance: "",
          additionalDriver: ""
        }
      }
    );
    console.log(`Updated ${dressResult.modifiedCount} dresses`);

    // 2. Update Booking collection - rename car field to dress
    const bookingRenameResult = await mongoose.connection.db.collection('Booking').updateMany(
      { car: { $exists: true } },
      [
        { 
          $addFields: { 
            dress: "$car" 
          } 
        },
        { 
          $project: { 
            car: 0,
            theftProtection: 0,
            collisionDamageWaiver: 0,
            fullInsurance: 0
          } 
        }
      ]
    );
    console.log(`Updated ${bookingRenameResult.modifiedCount} bookings (renamed car to dress)`);

    // 3. Update Notification collection - rename car field to dress
    const notificationRenameResult = await mongoose.connection.db.collection('Notification').updateMany(
      { car: { $exists: true } },
      [
        { 
          $addFields: { 
            dress: "$car" 
          } 
        },
        { 
          $project: { 
            car: 0 
          } 
        }
      ]
    );
    console.log(`Updated ${notificationRenameResult.modifiedCount} notifications (renamed car to dress)`);

    // 4. Update User collection - rename supplierCarLimit to supplierDressLimit
    const userRenameResult = await mongoose.connection.db.collection('User').updateMany(
      { supplierCarLimit: { $exists: true } },
      [
        { 
          $addFields: { 
            supplierDressLimit: "$supplierCarLimit",
            notifyAdminOnNewDress: "$notifyAdminOnNewCar"
          } 
        },
        { 
          $project: { 
            supplierCarLimit: 0,
            notifyAdminOnNewCar: 0
          } 
        }
      ]
    );
    console.log(`Updated ${userRenameResult.modifiedCount} users (renamed supplierCarLimit to supplierDressLimit)`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

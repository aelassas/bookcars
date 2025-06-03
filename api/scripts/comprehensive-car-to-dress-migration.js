/**
 * Database Initialization Script for Dress Rental System
 *
 * This script initializes a fresh database with dress rental data:
 * 1. Creates all necessary collections with proper schemas
 * 2. Seeds initial dress data with proper types, sizes, materials, etc.
 * 3. Creates sample locations and users
 * 4. Sets up proper indexes for performance
 * 5. Ensures backend and frontend are synchronized
 * 6. Creates sample bookings for testing
 *
 * Usage: node init-dress-database.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.BC_MONGODB_URI || 'mongodb://localhost:27017/bookdresses';

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
    console.log('Starting comprehensive car-to-dress migration...');

    // Step 1: Remove Car collection entirely
    await removeCarCollection();

    // Step 2: Update Dress collection - remove car properties and add dress properties
    await updateDressCollection();

    // Step 3: Update Booking collection - replace car with dress and remove car-specific fields
    await updateBookingCollection();

    // Step 4: Update Notification collection - replace car with dress
    await updateNotificationCollection();

    // Step 5: Update User collection - replace car-related fields with dress-related ones
    await updateUserCollection();

    // Step 6: Add new dress-specific properties to existing dresses
    await addDressSpecificProperties();

    // Step 7: Create dress-specific indexes
    await createDressIndexes();

    // Step 8: Clean up any remaining car references
    await cleanupCarReferences();

    console.log('Comprehensive migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function removeCarCollection() {
  try {
    console.log('Step 1: Removing Car collection...');
    
    // Check if Car collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const carCollectionExists = collections.some(col => col.name === 'Car');
    
    if (carCollectionExists) {
      await mongoose.connection.db.collection('Car').drop();
      console.log('Car collection removed successfully');
    } else {
      console.log('Car collection does not exist, skipping...');
    }
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('Car collection does not exist, skipping...');
    } else {
      throw error;
    }
  }
}

async function updateDressCollection() {
  try {
    console.log('Step 2: Updating Dress collection...');
    
    // Remove car-specific properties and add dress-specific ones
    const dressResult = await mongoose.connection.db.collection('Dress').updateMany(
      {},
      {
        $unset: {
          // Remove car-specific properties
          aircon: "",
          mileage: "",
          theftProtection: "",
          collisionDamageWaiver: "",
          fullInsurance: "",
          additionalDriver: "",
          seats: "",
          doors: "",
          gearbox: "",
          fuelPolicy: "",
          multimedia: "",
          co2: "",
          range: ""
        },
        $set: {
          // Add dress-specific properties if they don't exist
          style: { $ifNull: ["$style", "modern"] },
          material: { $ifNull: ["$material", "cotton"] },
          color: { $ifNull: ["$color", "white"] },
          length: { $ifNull: ["$length", 120] },
          customizable: { $ifNull: ["$customizable", false] },
          accessories: { $ifNull: ["$accessories", []] },
          rentals: { $ifNull: ["$rentals", 0] },
          designerName: { $ifNull: ["$designerName", null] }
        }
      }
    );
    console.log(`Updated ${dressResult.modifiedCount} dresses with dress-specific properties`);
  } catch (error) {
    console.error('Error updating Dress collection:', error);
    throw error;
  }
}

async function updateBookingCollection() {
  try {
    console.log('Step 3: Updating Booking collection...');
    
    // Replace car field with dress and remove car-specific fields
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
            fullInsurance: 0,
            additionalDriver: 0
          } 
        }
      ]
    );
    console.log(`Updated ${bookingRenameResult.modifiedCount} bookings (renamed car to dress)`);

    // Remove any remaining car-specific fields from all bookings
    const cleanupResult = await mongoose.connection.db.collection('Booking').updateMany(
      {},
      {
        $unset: {
          theftProtection: "",
          collisionDamageWaiver: "",
          fullInsurance: "",
          additionalDriver: ""
        }
      }
    );
    console.log(`Cleaned up ${cleanupResult.modifiedCount} bookings from car-specific fields`);
  } catch (error) {
    console.error('Error updating Booking collection:', error);
    throw error;
  }
}

async function updateNotificationCollection() {
  try {
    console.log('Step 4: Updating Notification collection...');
    
    // Replace car field with dress
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
  } catch (error) {
    console.error('Error updating Notification collection:', error);
    throw error;
  }
}

async function updateUserCollection() {
  try {
    console.log('Step 5: Updating User collection...');
    
    // Replace car-related fields with dress-related ones
    const userRenameResult = await mongoose.connection.db.collection('User').updateMany(
      { 
        $or: [
          { supplierCarLimit: { $exists: true } },
          { notifyAdminOnNewCar: { $exists: true } }
        ]
      },
      [
        { 
          $addFields: { 
            supplierDressLimit: { $ifNull: ["$supplierDressLimit", "$supplierCarLimit"] },
            notifyAdminOnNewDress: { $ifNull: ["$notifyAdminOnNewDress", "$notifyAdminOnNewCar"] }
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
    console.log(`Updated ${userRenameResult.modifiedCount} users (renamed car fields to dress fields)`);
  } catch (error) {
    console.error('Error updating User collection:', error);
    throw error;
  }
}

async function addDressSpecificProperties() {
  try {
    console.log('Step 6: Adding dress-specific properties to existing dresses...');
    
    // Update dresses that might be missing new dress-specific properties
    const updateResult = await mongoose.connection.db.collection('Dress').updateMany(
      {
        $or: [
          { type: { $exists: false } },
          { size: { $exists: false } },
          { style: { $exists: false } },
          { material: { $exists: false } },
          { color: { $exists: false } },
          { length: { $exists: false } }
        ]
      },
      {
        $set: {
          type: { $ifNull: ["$type", "wedding"] },
          size: { $ifNull: ["$size", "m"] },
          style: { $ifNull: ["$style", "modern"] },
          material: { $ifNull: ["$material", "silk"] },
          color: { $ifNull: ["$color", "white"] },
          length: { $ifNull: ["$length", 120] },
          customizable: { $ifNull: ["$customizable", false] },
          accessories: { $ifNull: ["$accessories", []] },
          rentals: { $ifNull: ["$rentals", 0] }
        }
      }
    );
    console.log(`Added dress-specific properties to ${updateResult.modifiedCount} dresses`);
  } catch (error) {
    console.error('Error adding dress-specific properties:', error);
    throw error;
  }
}

async function createDressIndexes() {
  try {
    console.log('Step 7: Creating dress-specific indexes...');
    
    const dressCollection = mongoose.connection.db.collection('Dress');
    
    // Create indexes for dress-specific fields
    await dressCollection.createIndex({ type: 1, available: 1 });
    await dressCollection.createIndex({ size: 1, available: 1 });
    await dressCollection.createIndex({ style: 1 });
    await dressCollection.createIndex({ material: 1 });
    await dressCollection.createIndex({ color: 1 });
    await dressCollection.createIndex({ length: 1 });
    await dressCollection.createIndex({ customizable: 1 });
    await dressCollection.createIndex({ accessories: 1 });
    await dressCollection.createIndex({ rentals: -1 });
    await dressCollection.createIndex({ designerName: 1 });
    
    console.log('Dress-specific indexes created successfully');
  } catch (error) {
    console.error('Error creating dress indexes:', error);
    throw error;
  }
}

async function cleanupCarReferences() {
  try {
    console.log('Step 8: Cleaning up any remaining car references...');
    
    // Check for any remaining car references in other collections
    const collections = ['AdditionalDriver', 'DateBasedPrice', 'Token'];
    
    for (const collectionName of collections) {
      try {
        const collection = mongoose.connection.db.collection(collectionName);
        const carReferences = await collection.countDocuments({ car: { $exists: true } });
        
        if (carReferences > 0) {
          console.log(`Found ${carReferences} car references in ${collectionName}, cleaning up...`);
          await collection.updateMany(
            { car: { $exists: true } },
            { $unset: { car: "" } }
          );
        }
      } catch (error) {
        console.log(`Collection ${collectionName} does not exist or error occurred:`, error.message);
      }
    }
    
    console.log('Cleanup of car references completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nMigration interrupted');
  mongoose.connection.close();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nMigration terminated');
  mongoose.connection.close();
  process.exit(1);
});

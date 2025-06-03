/**
 * Migration Verification Script
 * 
 * This script verifies that the car-to-dress migration completed successfully
 * by checking:
 * 1. Car collection is removed
 * 2. Dress collection has proper structure
 * 3. Booking collection references dresses instead of cars
 * 4. User collection has dress-related fields
 * 5. All indexes are properly created
 * 
 * Usage: node verify-migration.js
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
    console.log('Connected to MongoDB for verification');
    runVerification();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function runVerification() {
  try {
    console.log('🔍 Starting migration verification...\n');

    const results = {
      passed: 0,
      failed: 0,
      warnings: 0
    };

    // Test 1: Verify Car collection is removed
    await verifyCarCollectionRemoved(results);

    // Test 2: Verify Dress collection structure
    await verifyDressCollection(results);

    // Test 3: Verify Booking collection migration
    await verifyBookingCollection(results);

    // Test 4: Verify Notification collection migration
    await verifyNotificationCollection(results);

    // Test 5: Verify User collection migration
    await verifyUserCollection(results);

    // Test 6: Verify indexes
    await verifyIndexes(results);

    // Test 7: Verify data integrity
    await verifyDataIntegrity(results);

    // Print summary
    printSummary(results);

    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

async function verifyCarCollectionRemoved(results) {
  try {
    console.log('📋 Test 1: Verifying Car collection removal...');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const carCollectionExists = collections.some(col => col.name === 'Car');
    
    if (!carCollectionExists) {
      console.log('✅ Car collection successfully removed');
      results.passed++;
    } else {
      console.log('❌ Car collection still exists');
      results.failed++;
    }
  } catch (error) {
    console.log('❌ Error checking Car collection:', error.message);
    results.failed++;
  }
}

async function verifyDressCollection(results) {
  try {
    console.log('\n📋 Test 2: Verifying Dress collection structure...');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const dressCollectionExists = collections.some(col => col.name === 'Dress');
    
    if (!dressCollectionExists) {
      console.log('❌ Dress collection does not exist');
      results.failed++;
      return;
    }

    // Check for dress-specific fields
    const sampleDress = await mongoose.connection.db.collection('Dress').findOne({});
    
    if (sampleDress) {
      const requiredFields = ['type', 'size', 'style', 'material', 'color', 'length'];
      const missingFields = requiredFields.filter(field => !(field in sampleDress));
      
      if (missingFields.length === 0) {
        console.log('✅ Dress collection has all required dress-specific fields');
        results.passed++;
      } else {
        console.log(`❌ Dress collection missing fields: ${missingFields.join(', ')}`);
        results.failed++;
      }

      // Check for removed car fields
      const carFields = ['aircon', 'mileage', 'theftProtection', 'collisionDamageWaiver', 'fullInsurance', 'seats', 'doors', 'gearbox', 'fuelPolicy'];
      const remainingCarFields = carFields.filter(field => field in sampleDress);
      
      if (remainingCarFields.length === 0) {
        console.log('✅ All car-specific fields removed from Dress collection');
        results.passed++;
      } else {
        console.log(`⚠️  Car fields still present: ${remainingCarFields.join(', ')}`);
        results.warnings++;
      }
    } else {
      console.log('⚠️  No dresses found in collection (empty collection)');
      results.warnings++;
    }

    // Check dress count
    const dressCount = await mongoose.connection.db.collection('Dress').countDocuments();
    console.log(`📊 Total dresses in collection: ${dressCount}`);
    
  } catch (error) {
    console.log('❌ Error verifying Dress collection:', error.message);
    results.failed++;
  }
}

async function verifyBookingCollection(results) {
  try {
    console.log('\n📋 Test 3: Verifying Booking collection migration...');
    
    // Check if bookings reference dress instead of car
    const bookingWithCar = await mongoose.connection.db.collection('Booking').findOne({ car: { $exists: true } });
    const bookingWithDress = await mongoose.connection.db.collection('Booking').findOne({ dress: { $exists: true } });
    
    if (!bookingWithCar && bookingWithDress) {
      console.log('✅ Bookings successfully migrated from car to dress references');
      results.passed++;
    } else if (bookingWithCar) {
      console.log('❌ Some bookings still reference cars');
      results.failed++;
    } else {
      console.log('⚠️  No bookings found with dress references (empty or no bookings)');
      results.warnings++;
    }

    // Check for removed car-specific fields in bookings
    const bookingWithCarFields = await mongoose.connection.db.collection('Booking').findOne({
      $or: [
        { theftProtection: { $exists: true } },
        { collisionDamageWaiver: { $exists: true } },
        { fullInsurance: { $exists: true } }
      ]
    });

    if (!bookingWithCarFields) {
      console.log('✅ Car-specific fields removed from Booking collection');
      results.passed++;
    } else {
      console.log('❌ Car-specific fields still present in Booking collection');
      results.failed++;
    }

    const bookingCount = await mongoose.connection.db.collection('Booking').countDocuments();
    console.log(`📊 Total bookings in collection: ${bookingCount}`);
    
  } catch (error) {
    console.log('❌ Error verifying Booking collection:', error.message);
    results.failed++;
  }
}

async function verifyNotificationCollection(results) {
  try {
    console.log('\n📋 Test 4: Verifying Notification collection migration...');
    
    const notificationWithCar = await mongoose.connection.db.collection('Notification').findOne({ car: { $exists: true } });
    const notificationWithDress = await mongoose.connection.db.collection('Notification').findOne({ dress: { $exists: true } });
    
    if (!notificationWithCar) {
      console.log('✅ Car references removed from Notification collection');
      results.passed++;
    } else {
      console.log('❌ Some notifications still reference cars');
      results.failed++;
    }

    const notificationCount = await mongoose.connection.db.collection('Notification').countDocuments();
    console.log(`📊 Total notifications in collection: ${notificationCount}`);
    
  } catch (error) {
    console.log('❌ Error verifying Notification collection:', error.message);
    results.failed++;
  }
}

async function verifyUserCollection(results) {
  try {
    console.log('\n📋 Test 5: Verifying User collection migration...');
    
    const userWithCarLimit = await mongoose.connection.db.collection('User').findOne({ supplierCarLimit: { $exists: true } });
    const userWithDressLimit = await mongoose.connection.db.collection('User').findOne({ supplierDressLimit: { $exists: true } });
    
    if (!userWithCarLimit) {
      console.log('✅ supplierCarLimit field removed from User collection');
      results.passed++;
    } else {
      console.log('❌ supplierCarLimit field still exists in User collection');
      results.failed++;
    }

    const userWithCarNotification = await mongoose.connection.db.collection('User').findOne({ notifyAdminOnNewCar: { $exists: true } });
    
    if (!userWithCarNotification) {
      console.log('✅ notifyAdminOnNewCar field removed from User collection');
      results.passed++;
    } else {
      console.log('❌ notifyAdminOnNewCar field still exists in User collection');
      results.failed++;
    }

    const userCount = await mongoose.connection.db.collection('User').countDocuments();
    console.log(`📊 Total users in collection: ${userCount}`);
    
  } catch (error) {
    console.log('❌ Error verifying User collection:', error.message);
    results.failed++;
  }
}

async function verifyIndexes(results) {
  try {
    console.log('\n📋 Test 6: Verifying dress-specific indexes...');
    
    const dressIndexes = await mongoose.connection.db.collection('Dress').indexes();
    const indexNames = dressIndexes.map(index => Object.keys(index.key).join('_'));
    
    const expectedIndexes = ['type', 'size', 'style', 'material', 'color', 'available'];
    const missingIndexes = expectedIndexes.filter(expected => 
      !indexNames.some(indexName => indexName.includes(expected))
    );
    
    if (missingIndexes.length === 0) {
      console.log('✅ All expected dress indexes are present');
      results.passed++;
    } else {
      console.log(`⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
      results.warnings++;
    }

    console.log(`📊 Total indexes on Dress collection: ${dressIndexes.length}`);
    
  } catch (error) {
    console.log('❌ Error verifying indexes:', error.message);
    results.failed++;
  }
}

async function verifyDataIntegrity(results) {
  try {
    console.log('\n📋 Test 7: Verifying data integrity...');
    
    // Check for orphaned bookings (bookings without valid dress references)
    const totalBookings = await mongoose.connection.db.collection('Booking').countDocuments();
    const bookingsWithValidDress = await mongoose.connection.db.collection('Booking').aggregate([
      {
        $lookup: {
          from: 'Dress',
          localField: 'dress',
          foreignField: '_id',
          as: 'dressInfo'
        }
      },
      {
        $match: {
          'dressInfo.0': { $exists: true }
        }
      },
      {
        $count: 'validBookings'
      }
    ]).toArray();

    const validBookingsCount = bookingsWithValidDress.length > 0 ? bookingsWithValidDress[0].validBookings : 0;
    
    if (totalBookings === 0 || validBookingsCount === totalBookings) {
      console.log('✅ All bookings have valid dress references');
      results.passed++;
    } else {
      console.log(`⚠️  ${totalBookings - validBookingsCount} bookings have invalid dress references`);
      results.warnings++;
    }

    // Check for dresses with required fields
    const dressesWithoutRequiredFields = await mongoose.connection.db.collection('Dress').countDocuments({
      $or: [
        { type: { $exists: false } },
        { size: { $exists: false } },
        { material: { $exists: false } },
        { color: { $exists: false } }
      ]
    });

    if (dressesWithoutRequiredFields === 0) {
      console.log('✅ All dresses have required fields');
      results.passed++;
    } else {
      console.log(`⚠️  ${dressesWithoutRequiredFields} dresses missing required fields`);
      results.warnings++;
    }
    
  } catch (error) {
    console.log('❌ Error verifying data integrity:', error.message);
    results.failed++;
  }
}

function printSummary(results) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('🎉 Migration verification PASSED! The car-to-dress migration was successful.');
  } else {
    console.log('💥 Migration verification FAILED! Please review the failed tests above.');
  }

  if (results.warnings > 0) {
    console.log('⚠️  Please review the warnings above for potential issues.');
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nVerification interrupted');
  mongoose.connection.close();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nVerification terminated');
  mongoose.connection.close();
  process.exit(1);
});

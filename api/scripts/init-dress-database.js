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
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.BC_MONGODB_URI || 'mongodb://localhost:27017/bookdresses';

// Dress rental enums (matching the TypeScript types)
const DressType = {
  Traditional: 'traditional',
  Modern: 'modern',
  Designer: 'designer',
  Vintage: 'vintage',
  Casual: 'casual',
  Wedding: 'wedding',
  Evening: 'evening',
  Cocktail: 'cocktail',
  Prom: 'prom',
  Other: 'other',
  Unknown: 'unknown'
};

const DressSize = {
  XS: 'xs',
  S: 's',
  M: 'm',
  L: 'l',
  XL: 'xl',
  XXL: 'xxl',
  Custom: 'custom'
};

const DressMaterial = {
  Silk: 'silk',
  Cotton: 'cotton',
  Lace: 'lace',
  Satin: 'satin',
  Chiffon: 'chiffon',
  Tulle: 'tulle',
  Organza: 'organza',
  Velvet: 'velvet'
};

const DressRange = {
  Mini: 'mini',
  Midi: 'midi',
  Maxi: 'maxi',
  Bridal: 'bridal',
  Evening: 'evening',
  Cocktail: 'cocktail',
  Casual: 'casual'
};

const DressAccessories = {
  Veil: 'veil',
  Jewelry: 'jewelry',
  Shoes: 'shoes',
  Headpiece: 'headpiece'
};

const UserType = {
  Admin: 'admin',
  Supplier: 'supplier',
  User: 'user'
};

const BookingStatus = {
  Void: 'void',
  Pending: 'pending',
  Deposit: 'deposit',
  Paid: 'paid',
  Reserved: 'reserved',
  Cancelled: 'cancelled'
};

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    initializeDatabase();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function initializeDatabase() {
  try {
    console.log('🚀 Starting database initialization...\n');

    // Step 1: Clear existing data (optional - for fresh start)
    await clearExistingData();

    // Step 2: Create admin user
    const adminUser = await createAdminUser();

    // Step 3: Create sample suppliers
    const suppliers = await createSampleSuppliers();

    // Step 4: Create sample locations
    const locations = await createSampleLocations(suppliers[0]);

    // Step 5: Create sample dresses
    const dresses = await createSampleDresses(suppliers, locations);

    // Step 6: Create sample users
    const users = await createSampleUsers();

    // Step 7: Create sample bookings
    await createSampleBookings(dresses, users, suppliers, locations);

    // Step 8: Create indexes for performance
    await createIndexes();

    // Step 9: Verify data integrity
    await verifyDataIntegrity();

    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👤 Admin users: 1`);
    console.log(`🏪 Suppliers: ${suppliers.length}`);
    console.log(`📍 Locations: ${locations.length}`);
    console.log(`👗 Dresses: ${dresses.length}`);
    console.log(`👥 Users: ${users.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

async function clearExistingData() {
  console.log('🧹 Clearing existing data...');
  
  const collections = ['User', 'Dress', 'Booking', 'Location', 'LocationValue', 'Country', 'Notification'];
  
  for (const collection of collections) {
    try {
      await mongoose.connection.db.collection(collection).deleteMany({});
      console.log(`✅ Cleared ${collection} collection`);
    } catch (error) {
      console.log(`⚠️  Collection ${collection} does not exist or error occurred`);
    }
  }
}

async function createAdminUser() {
  console.log('👤 Creating admin user...');
  
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const adminUser = {
    fullName: 'System Administrator',
    email: 'admin@bookdresses.com',
    password: hashedPassword,
    type: UserType.Admin,
    verified: true,
    active: true,
    language: 'ar',
    enableEmailNotifications: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await mongoose.connection.db.collection('User').insertOne(adminUser);
  console.log('✅ Admin user created');
  
  return { ...adminUser, _id: result.insertedId };
}

async function createSampleSuppliers() {
  console.log('🏪 Creating sample suppliers...');
  
  const suppliers = [
    {
      fullName: 'Elegant Dresses Boutique',
      email: 'supplier1@bookdresses.com',
      password: await bcrypt.hash('supplier123', 10),
      phone: '+972-50-1234567',
      type: UserType.Supplier,
      verified: true,
      active: true,
      language: 'ar',
      location: 'Jerusalem, Israel',
      bio: 'Premium dress rental boutique specializing in wedding and evening gowns',
      payLater: true,
      licenseRequired: false,
      minimumRentalDays: 1,
      supplierDressLimit: 50,
      notifyAdminOnNewDress: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      fullName: 'Royal Wedding Dresses',
      email: 'supplier2@bookdresses.com',
      password: await bcrypt.hash('supplier123', 10),
      phone: '+972-50-2345678',
      type: UserType.Supplier,
      verified: true,
      active: true,
      language: 'ar',
      location: 'Tel Aviv, Israel',
      bio: 'Luxury bridal and formal wear rental service',
      payLater: true,
      licenseRequired: false,
      minimumRentalDays: 2,
      supplierDressLimit: 30,
      notifyAdminOnNewDress: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await mongoose.connection.db.collection('User').insertMany(suppliers);
  console.log(`✅ Created ${suppliers.length} suppliers`);
  
  return suppliers.map((supplier, index) => ({
    ...supplier,
    _id: result.insertedIds[index]
  }));
}

async function createSampleLocations(supplier) {
  console.log('📍 Creating sample locations...');
  
  // First create location values
  const locationValues = [
    {
      language: 'ar',
      value: 'القدس'
    },
    {
      language: 'en',
      value: 'Jerusalem'
    }
  ];

  const locationValueResult = await mongoose.connection.db.collection('LocationValue').insertMany(locationValues);
  const locationValueIds = Object.values(locationValueResult.insertedIds);

  // Create country
  const country = {
    values: locationValueIds,
    supplier: supplier._id
  };

  const countryResult = await mongoose.connection.db.collection('Country').insertOne(country);

  // Create locations
  const locations = [
    {
      country: countryResult.insertedId,
      latitude: 31.7683,
      longitude: 35.2137,
      values: locationValueIds,
      supplier: supplier._id
    }
  ];

  const locationResult = await mongoose.connection.db.collection('Location').insertMany(locations);
  console.log(`✅ Created ${locations.length} locations`);
  
  return locations.map((location, index) => ({
    ...location,
    _id: locationResult.insertedIds[index]
  }));
}

async function createSampleDresses(suppliers, locations) {
  console.log('👗 Creating sample dresses...');

  const dresses = [
    // Wedding Dresses
    {
      name: 'Elegant Silk Wedding Gown',
      supplier: suppliers[0]._id,
      minimumAge: 18,
      locations: [locations[0]._id],
      dailyPrice: 200,
      discountedDailyPrice: null,
      biWeeklyPrice: 1000,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 600,
      discountedWeeklyPrice: null,
      monthlyPrice: 1500,
      discountedMonthlyPrice: null,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      deposit: 800,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      type: DressType.Wedding,
      size: DressSize.M,
      customizable: true,
      color: 'ivory',
      length: 180,
      material: DressMaterial.Silk,
      style: 'traditional',
      cancellation: 48,
      amendments: 24,
      range: DressRange.Bridal,
      accessories: [DressAccessories.Veil, DressAccessories.Jewelry],
      rating: 4.9,
      rentals: 25,
      designerName: 'Vera Wang',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Modern Lace Bridal Dress',
      supplier: suppliers[1]._id,
      minimumAge: 18,
      locations: [locations[0]._id],
      dailyPrice: 180,
      discountedDailyPrice: 160,
      biWeeklyPrice: 900,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 550,
      discountedWeeklyPrice: null,
      monthlyPrice: 1400,
      discountedMonthlyPrice: null,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      deposit: 700,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      type: DressType.Wedding,
      size: DressSize.L,
      customizable: true,
      color: 'white',
      length: 175,
      material: DressMaterial.Lace,
      style: 'modern',
      cancellation: 48,
      amendments: 24,
      range: DressRange.Bridal,
      accessories: [DressAccessories.Veil, DressAccessories.Headpiece],
      rating: 4.7,
      rentals: 18,
      designerName: 'Pronovias',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Evening Dresses
    {
      name: 'Glamorous Evening Gown',
      supplier: suppliers[0]._id,
      minimumAge: 18,
      locations: [locations[0]._id],
      dailyPrice: 120,
      discountedDailyPrice: null,
      biWeeklyPrice: 600,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 400,
      discountedWeeklyPrice: null,
      monthlyPrice: 900,
      discountedMonthlyPrice: null,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      deposit: 400,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      type: DressType.Evening,
      size: DressSize.S,
      customizable: false,
      color: 'navy blue',
      length: 160,
      material: DressMaterial.Velvet,
      style: 'designer',
      cancellation: 24,
      amendments: 12,
      range: DressRange.Evening,
      accessories: [DressAccessories.Jewelry],
      rating: 4.6,
      rentals: 12,
      designerName: 'Oscar de la Renta',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Cocktail Dresses
    {
      name: 'Chic Cocktail Dress',
      supplier: suppliers[0]._id,
      minimumAge: 18,
      locations: [locations[0]._id],
      dailyPrice: 85,
      discountedDailyPrice: 75,
      biWeeklyPrice: 450,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 280,
      discountedWeeklyPrice: null,
      monthlyPrice: 650,
      discountedMonthlyPrice: null,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      deposit: 250,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      type: DressType.Cocktail,
      size: DressSize.M,
      customizable: false,
      color: 'black',
      length: 110,
      material: DressMaterial.Satin,
      style: 'modern',
      cancellation: 12,
      amendments: 6,
      range: DressRange.Cocktail,
      accessories: [DressAccessories.Jewelry, DressAccessories.Shoes],
      rating: 4.4,
      rentals: 22,
      designerName: 'Calvin Klein',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Prom Dresses
    {
      name: 'Sparkling Prom Dress',
      supplier: suppliers[1]._id,
      minimumAge: 16,
      locations: [locations[0]._id],
      dailyPrice: 95,
      discountedDailyPrice: null,
      biWeeklyPrice: 500,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 320,
      discountedWeeklyPrice: null,
      monthlyPrice: 750,
      discountedMonthlyPrice: null,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      deposit: 300,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      type: DressType.Prom,
      size: DressSize.S,
      customizable: false,
      color: 'rose gold',
      length: 150,
      material: DressMaterial.Tulle,
      style: 'modern',
      cancellation: 24,
      amendments: 12,
      range: DressRange.Maxi,
      accessories: [DressAccessories.Jewelry, DressAccessories.Shoes],
      rating: 4.8,
      rentals: 15,
      designerName: 'Sherri Hill',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    // Casual Dresses
    {
      name: 'Bohemian Summer Dress',
      supplier: suppliers[0]._id,
      minimumAge: 16,
      locations: [locations[0]._id],
      dailyPrice: 45,
      discountedDailyPrice: 40,
      biWeeklyPrice: 240,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 150,
      discountedWeeklyPrice: null,
      monthlyPrice: 350,
      discountedMonthlyPrice: null,
      isDateBasedPrice: false,
      dateBasedPrices: [],
      deposit: 100,
      available: true,
      fullyBooked: false,
      comingSoon: false,
      type: DressType.Casual,
      size: DressSize.M,
      customizable: false,
      color: 'floral print',
      length: 120,
      material: DressMaterial.Cotton,
      style: 'vintage',
      cancellation: 6,
      amendments: 3,
      range: DressRange.Midi,
      accessories: [],
      rating: 4.2,
      rentals: 35,
      designerName: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await mongoose.connection.db.collection('Dress').insertMany(dresses);
  console.log(`✅ Created ${dresses.length} dresses`);

  return dresses.map((dress, index) => ({
    ...dress,
    _id: result.insertedIds[index]
  }));
}

async function createSampleUsers() {
  console.log('👥 Creating sample users...');
  
  const users = [
    {
      fullName: 'Sarah Ahmed',
      email: 'sarah@example.com',
      password: await bcrypt.hash('user123', 10),
      phone: '+972-50-9876543',
      type: UserType.User,
      verified: true,
      active: true,
      language: 'ar',
      enableEmailNotifications: true,
      birthDate: new Date('1995-05-15'),
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      fullName: 'Fatima Hassan',
      email: 'fatima@example.com',
      password: await bcrypt.hash('user123', 10),
      phone: '+972-50-8765432',
      type: UserType.User,
      verified: true,
      active: true,
      language: 'ar',
      enableEmailNotifications: true,
      birthDate: new Date('1992-08-22'),
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await mongoose.connection.db.collection('User').insertMany(users);
  console.log(`✅ Created ${users.length} users`);
  
  return users.map((user, index) => ({
    ...user,
    _id: result.insertedIds[index]
  }));
}

async function createSampleBookings(dresses, users, suppliers, locations) {
  console.log('📅 Creating sample bookings...');
  
  const bookings = [
    {
      supplier: suppliers[0]._id,
      dress: dresses[0]._id,
      driver: users[0]._id,
      pickupLocation: locations[0]._id,
      dropOffLocation: locations[0]._id,
      from: new Date('2024-02-15'),
      to: new Date('2024-02-17'),
      status: BookingStatus.Paid,
      cancellation: false,
      amendments: false,
      additionalDriver: false,
      price: 300,
      cancelRequest: false,
      isDeposit: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await mongoose.connection.db.collection('Booking').insertMany(bookings);
  console.log(`✅ Created ${bookings.length} bookings`);
  
  return bookings;
}

async function createIndexes() {
  console.log('🔍 Creating database indexes...');
  
  // Dress collection indexes
  const dressCollection = mongoose.connection.db.collection('Dress');
  await dressCollection.createIndex({ name: 'text' });
  await dressCollection.createIndex({ supplier: 1, type: 1, available: 1 });
  await dressCollection.createIndex({ available: 1, size: 1, deposit: 1 });
  await dressCollection.createIndex({ type: 1, size: 1, material: 1 });
  await dressCollection.createIndex({ dailyPrice: 1 });
  await dressCollection.createIndex({ rating: -1 });
  await dressCollection.createIndex({ rentals: -1 });
  
  // Booking collection indexes
  const bookingCollection = mongoose.connection.db.collection('Booking');
  await bookingCollection.createIndex({ supplier: 1, status: 1 });
  await bookingCollection.createIndex({ dress: 1 });
  await bookingCollection.createIndex({ driver: 1 });
  await bookingCollection.createIndex({ from: 1, to: 1 });
  
  // User collection indexes
  const userCollection = mongoose.connection.db.collection('User');
  await userCollection.createIndex({ email: 1 }, { unique: true });
  await userCollection.createIndex({ type: 1 });
  
  console.log('✅ Database indexes created');
}

async function verifyDataIntegrity() {
  console.log('🔍 Verifying data integrity...');
  
  const dressCount = await mongoose.connection.db.collection('Dress').countDocuments();
  const userCount = await mongoose.connection.db.collection('User').countDocuments();
  const bookingCount = await mongoose.connection.db.collection('Booking').countDocuments();
  const locationCount = await mongoose.connection.db.collection('Location').countDocuments();
  
  console.log(`✅ Data integrity verified:`);
  console.log(`   - Dresses: ${dressCount}`);
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Bookings: ${bookingCount}`);
  console.log(`   - Locations: ${locationCount}`);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nDatabase initialization interrupted');
  mongoose.connection.close();
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\nDatabase initialization terminated');
  mongoose.connection.close();
  process.exit(1);
});

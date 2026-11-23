const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcrypt');

if (process.env.BC_ENABLE_FYP_DEMO !== 'true' || process.env.NODE_ENV !== 'development') {
  throw new Error('This script inserts synthetic FYP demo data. Run only with NODE_ENV=development and BC_ENABLE_FYP_DEMO=true.');
}

const DB_URI = process.env.BC_DB_URI;
if (!DB_URI) {
  throw new Error('BC_DB_URI must be configured explicitly.');
}

// Schemas
const LocationValueSchema = new mongoose.Schema({
  language: { type: String, required: true },
  value: { type: String, required: true }
}, { collection: 'LocationValue', timestamps: true });

const CountrySchema = new mongoose.Schema({
  values: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LocationValue' }],
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { collection: 'Country', timestamps: true });

const LocationSchema = new mongoose.Schema({
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  latitude: Number,
  longitude: Number,
  values: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LocationValue' }],
  image: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { collection: 'Location', timestamps: true });

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: String,
  active: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  type: { type: String, default: 'user' },
  avatar: String,
  bio: String,
  location: String,
  blacklisted: { type: Boolean, default: false },
  payLater: { type: Boolean, default: true }
}, { collection: 'User', timestamps: true });

const CarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  licensePlate: String,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  minimumAge: { type: Number, default: 21 },
  locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Location' }],
  dailyPrice: { type: Number, required: true },
  discountedDailyPrice: Number,
  hourlyPrice: Number,
  biWeeklyPrice: Number,
  weeklyPrice: Number,
  monthlyPrice: Number,
  deposit: { type: Number, default: 15000 },
  available: { type: Boolean, default: false },
  registrationPlate: { type: String, uppercase: true, trim: true },
  engineCc: { type: Number, min: 0, max: 20000 },
  terrainCapability: { type: String, enum: ['CITY_ONLY', 'HIGHWAY_INTERCITY', 'NORTHERN_MOUNTAINS'], default: 'HIGHWAY_INTERCITY' },
  selfDriveAvailable: { type: Boolean, default: true },
  withDriverAvailable: { type: Boolean, default: true },
  driverDailyAllowancePkr: { type: Number, default: 2500, min: 0 },
  outOfCitySurchargePkr: { type: Number, default: 1500, min: 0 },
  securityDepositPkr: { type: Number, default: 15000, min: 0 },
  listingStatus: { type: String, enum: ['PENDING_REVIEW', 'APPROVED', 'SUSPENDED'], default: 'PENDING_REVIEW', index: true },
  complianceNotes: { type: String, trim: true, maxlength: 1000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  fuelPolicy: { type: String, enum: ['TANK_TO_TANK', 'SAME_TO_SAME', 'FUEL_INCLUDED', 'likeForLike'], default: 'TANK_TO_TANK' },
  type: { type: String, default: 'gasoline' },
  gearbox: { type: String, default: 'automatic' },
  aircon: { type: Boolean, default: true },
  image: String,
  seats: { type: Number, default: 5 },
  doors: { type: Number, default: 4 },
  fuelPolicy: { type: String, default: 'likeForLike' },
  mileage: { type: Number, default: -1 },
  cancellation: { type: Number, default: 0 },
  amendments: { type: Number, default: 0 },
  theftProtection: { type: Number, default: 0 },
  collisionDamageWaiver: { type: Number, default: 0 },
  fullInsurance: { type: Number, default: 0 },
  additionalDriver: { type: Number, default: 0 },
  rating: { type: Number, default: 4.8 },
  range: { type: String, default: 'Midi' }
}, { collection: 'Car', timestamps: true });

const BookingSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickupLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  dropOffLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
  from: { type: Date, required: true },
  to: { type: Date, required: true },
  status: { type: String, required: true },
  price: { type: Number, required: true },
  cancellation: { type: Boolean, default: false },
  amendments: { type: Boolean, default: false },
  theftProtection: { type: Boolean, default: false },
  collisionDamageWaiver: { type: Boolean, default: false },
  fullInsurance: { type: Boolean, default: false },
  additionalDriver: { type: Boolean, default: false },
  isDeposit: { type: Boolean, default: false },
  isPayedInFull: { type: Boolean, default: false }
}, { collection: 'Booking', timestamps: true });

const VehicleDocumentSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, default: 'verified' },
  notes: String
}, { collection: 'VehicleDocument', timestamps: true });

const MaintenanceSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Car' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  supplier: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  type: { type: String, required: true },
  description: String,
  status: { type: String, default: 'scheduled' },
  startDate: { type: Date, required: true },
  expectedCompletionDate: { type: Date, required: true },
  completedDate: Date,
  mileage: Number,
  cost: Number,
  notes: String
}, { collection: 'Maintenance', timestamps: true });

const LocationValue = mongoose.model('LocationValue', LocationValueSchema);
const Country = mongoose.model('Country', CountrySchema);
const Location = mongoose.model('Location', LocationSchema);
const User = mongoose.model('User', UserSchema);
const Car = mongoose.model('Car', CarSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const VehicleDocument = mongoose.model('VehicleDocument', VehicleDocumentSchema);
const Maintenance = mongoose.model('Maintenance', MaintenanceSchema);
const demoPassword = process.env.BC_FYP_DEMO_PASSWORD || 'SafarRent-Demo-2026!';
const hashDemoPassword = async () => bcrypt.hash(demoPassword, 12);
const engineCcFor = (name) => {
  if (/660cc|660/i.test(name)) return 660;
  const litres = name.match(/\b([1-9])\.(\d)\b/);
  return litres ? Number(`${litres[1]}${litres[2]}`) * 100 : undefined;
};

const LANGUAGES = ['en', 'fr', 'es', 'de', 'pt', 'it', 'zh', 'ja', 'ur'];

async function createLocationValues(names) {
  const ids = [];
  for (const lang of LANGUAGES) {
    const val = names[lang] || names['en'];
    const doc = await LocationValue.create({ language: lang, value: val });
    ids.push(doc._id);
  }
  return ids;
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB successfully.');

  // 1. Country: Pakistan
  let country = await Country.findOne({});
  if (!country) {
    const countryValIds = await createLocationValues({
      en: 'Pakistan',
      ur: 'پاکستان',
      fr: 'Pakistan',
      es: 'Pakistán',
      de: 'Pakistan'
    });
    country = await Country.create({ values: countryValIds });
    console.log('Created Country Pakistan:', country._id);
  }

  // These are synthetic FYP demo identities, not real suppliers. Their active status
  // is only for local workflow demonstration; never use this seed in production.
  const suppliersData = [
    {
      fullName: 'SafarRent Sahiwal FYP Demo Fleet',
      email: 'sahiwal@safarrent.pk',
      phone: '',
      avatar: '',
      location: 'Sahiwal GT Road Hub',
      bio: 'Synthetic FYP demo supplier. Not a real rental business; no real-world bookings are fulfilled. Sample routes cover Sahiwal and Central Punjab.'
    },
    {
      fullName: 'Indus Executive FYP Demo Fleet',
      email: 'indus@safarrent.pk',
      phone: '',
      avatar: '',
      location: 'Lahore (Gulberg & Airport)',
      bio: 'Synthetic FYP demo supplier for testing Lahore and Punjab search workflows. Not a real rental business.'
    },
    {
      fullName: 'Margalla 4x4 FYP Demo Fleet',
      email: 'margalla@safarrent.pk',
      phone: '',
      avatar: '',
      location: 'Islamabad (Blue Area)',
      bio: 'Synthetic FYP demo supplier for testing Islamabad and northern route workflows. Not a real rental business.'
    },
    {
      fullName: 'Mehran Coastal FYP Demo Fleet',
      email: 'mehran@safarrent.pk',
      phone: '',
      avatar: '',
      location: 'Karachi (Clifton & Airport)',
      bio: 'Synthetic FYP demo supplier for testing Karachi search workflows. Not a real rental business.'
    },
    {
      fullName: 'Karakoram Alpine FYP Demo Fleet',
      email: 'karakoram@safarrent.pk',
      phone: '',
      avatar: '',
      location: 'Skardu & Gilgit Hub',
      bio: 'Synthetic FYP demo supplier for testing northern Pakistan search workflows. Not a real rental business.'
    }
  ];

  const suppliersMap = {};
  for (const s of suppliersData) {
    let supplier = await User.findOne({ email: s.email });
    if (!supplier) {
      supplier = await User.create({
        fullName: s.fullName,
        email: s.email,
        phone: s.phone,
        password: await hashDemoPassword(),
        avatar: s.avatar,
        bio: s.bio,
        location: s.location,
        type: 'supplier',
        active: true,
        // Demo identities are active for workflow testing but are not real or verified suppliers.
        verified: false,
        payLater: true
      });
      console.log(`Created supplier: ${s.fullName}`);
    } else {
      supplier.password = await hashDemoPassword();
      supplier.active = true;
      supplier.verified = false;
      supplier.verifiedAt = undefined;
      supplier.payLater = true;
      supplier.fullName = s.fullName;
      supplier.phone = '';
      supplier.avatar = s.avatar;
      supplier.bio = s.bio;
      supplier.location = s.location;
      await supplier.save();
      console.log(`Updated supplier: ${s.fullName}`);
    }
    suppliersMap[s.email] = supplier;
  }

  // Dedicated synthetic administrator for local FYP workflow checks. Never
  // promote or overwrite an existing non-demo account with this role.
  const demoAdminEmail = (process.env.BC_FYP_DEMO_ADMIN_EMAIL || 'demo-admin@safarrent.local').trim().toLowerCase();
  let demoAdmin = await User.findOne({ email: demoAdminEmail });
  if (demoAdmin && demoAdmin.type !== 'admin') {
    throw new Error(`Refusing to change the role of existing account ${demoAdminEmail}`);
  }
  if (!demoAdmin) {
    demoAdmin = await User.create({
      fullName: 'SafarRent FYP Demo Admin',
      email: demoAdminEmail,
      phone: '',
      password: await hashDemoPassword(),
      avatar: '',
      bio: 'Synthetic administrator for local SafarRent FYP demonstration only.',
      location: 'Pakistan',
      type: 'admin',
      active: true,
      verified: true,
      verifiedAt: new Date(),
    });
    console.log(`Created local FYP demo administrator: ${demoAdminEmail}`);
  } else {
    demoAdmin.password = await hashDemoPassword();
    demoAdmin.active = true;
    demoAdmin.verified = true;
    await demoAdmin.save();
    console.log(`Updated local FYP demo administrator: ${demoAdminEmail}`);
  }

  const sahiwalSupplier = suppliersMap['sahiwal@safarrent.pk'];
  const indusSupplier = suppliersMap['indus@safarrent.pk'];
  const margallaSupplier = suppliersMap['margalla@safarrent.pk'];

  // 3. Pakistan Locations (prominently featuring Sahiwal)
  const locationsData = [
    {
      key: 'sahiwal_center',
      en: 'Sahiwal City Center (High Street & Farid Town)',
      ur: 'ساہیوال سٹی سینٹر (ہائی اسٹریٹ و فرید ٹاؤن)',
      lat: 30.6682,
      lng: 73.1114
    },
    {
      key: 'sahiwal_bypass',
      en: 'Sahiwal Bypass & GT Road Terminal (N-5)',
      ur: 'ساہیوال بائی پاس و جی ٹی روڈ ٹرمینل',
      lat: 30.6550,
      lng: 73.1350
    },
    {
      key: 'sahiwal_station',
      en: 'Sahiwal Railway Station Hub',
      ur: 'ساہیوال ریلوے اسٹیشن ہب',
      lat: 30.6720,
      lng: 73.1050
    },
    {
      key: 'lhe_airport',
      en: "Allama Iqbal Int'l Airport (LHE), Lahore",
      ur: 'علامہ اقبال انٹرنیشنل ایئرپورٹ، لاہور',
      lat: 31.5216,
      lng: 74.4036
    },
    {
      key: 'lhe_gulberg',
      en: 'Gulberg & DHA Phase 5, Lahore',
      ur: 'گلبرگ و ڈی ایچ اے، لاہور',
      lat: 31.5102,
      lng: 74.3441
    },
    {
      key: 'isb_airport',
      en: "Islamabad Int'l Airport (ISB)",
      ur: 'اسلام آباد انٹرنیشنل ایئرپورٹ',
      lat: 33.5651,
      lng: 72.8540
    },
    {
      key: 'isb_bluearea',
      en: 'Blue Area & F-7, Islamabad',
      ur: 'بلیو ایریا و ایف 7، اسلام آباد',
      lat: 33.7103,
      lng: 73.0645
    },
    {
      key: 'multan_cantt',
      en: 'Multan Cantt & Airport Terminal',
      ur: 'ملتان کینٹ و ایئرپورٹ ٹرمینل',
      lat: 30.1984,
      lng: 71.4304
    },
    {
      key: 'fsd_clocktower',
      en: 'Faisalabad Clock Tower & D-Ground',
      ur: 'فیصل آباد گھنٹہ گھر و ڈی گراؤنڈ',
      lat: 31.4187,
      lng: 73.0791
    },
    {
      key: 'khi_airport',
      en: "Jinnah Int'l Airport (KHI), Karachi",
      ur: 'جناح انٹرنیشنل ایئرپورٹ، کراچی',
      lat: 24.9065,
      lng: 67.1608
    },
    {
      key: 'skardu_hub',
      en: 'Skardu & Gilgit Hub (Northern Areas)',
      ur: 'سکردو و گلگت ہب (شمالی علاقہ جات)',
      lat: 35.2971,
      lng: 75.6333
    }
  ];

  const locationsMap = {};
  for (const locItem of locationsData) {
    let loc = await Location.findOne({ latitude: locItem.lat, longitude: locItem.lng });
    if (!loc) {
      const valIds = await createLocationValues({ en: locItem.en, ur: locItem.ur });
      loc = await Location.create({
        country: country._id,
        latitude: locItem.lat,
        longitude: locItem.lng,
        values: valIds,
        supplier: sahiwalSupplier._id
      });
      console.log(`Created location: ${locItem.en}`);
    }
    locationsMap[locItem.key] = loc;
  }

  // 4. Fleet Vehicles (Realistic Pakistani Cars)
  const carsData = [
    {
      name: 'Toyota Fortuner 2.8L Sigma 4 4x4',
      locations: ['isb_airport', 'isb_bluearea'],
      licensePlate: 'ICT-24-0010',
      type: 'diesel',
      gearbox: 'automatic',
      seats: 7,
      doors: 5,
      dailyPrice: 28000,
      hourlyPrice: 2500,
      deposit: 35000,
      range: 'Maxi',
      rating: 4.9,
      supplier: margallaSupplier._id
    },
    {
      name: 'Toyota Hilux Revo Rocco 4x4',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-24-5500',
      type: 'diesel',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 24000,
      hourlyPrice: 2200,
      deposit: 30000,
      range: 'Maxi',
      rating: 4.9,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'Honda Civic RS Turbo 1.5',
      locations: ['lhe_airport', 'lhe_gulberg'],
      licensePlate: 'LEA-24-7711',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 14000,
      hourlyPrice: 1400,
      deposit: 20000,
      range: 'Midi',
      rating: 4.9,
      supplier: indusSupplier._id
    },
    {
      name: 'Toyota Corolla Altis Grande 1.8',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-23-9012',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 9500,
      hourlyPrice: 1000,
      deposit: 15000,
      range: 'Midi',
      rating: 4.8,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'Toyota Yaris ATIV 1.3 CVT',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-23-8822',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 8000,
      hourlyPrice: 850,
      deposit: 12000,
      range: 'Midi',
      rating: 4.8,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'KIA Sportage AWD',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-23-9911',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 5,
      dailyPrice: 16500,
      hourlyPrice: 1600,
      deposit: 25000,
      range: 'Midi',
      rating: 4.8,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'Suzuki Cultus Auto Gear Shift (AGS)',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-23-4501',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 5800,
      hourlyPrice: 650,
      deposit: 10000,
      range: 'Mini',
      rating: 4.8,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'Suzuki Alto VXL 660cc',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-24-1180',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 4,
      doors: 4,
      dailyPrice: 4500,
      hourlyPrice: 500,
      deposit: 8000,
      range: 'Mini',
      rating: 4.7,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'Honda City Aspire 1.5 CVT',
      locations: ['lhe_airport', 'lhe_gulberg'],
      licensePlate: '',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 9000,
      hourlyPrice: 900,
      deposit: 15000,
      range: 'Midi',
      rating: 4.7,
      supplier: indusSupplier._id
    },
    {
      name: 'Suzuki Swift GLX CVT',
      locations: ['khi_airport'],
      licensePlate: '',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 8500,
      hourlyPrice: 850,
      deposit: 14000,
      range: 'Mini',
      rating: 4.6,
      supplier: suppliersMap['mehran@safarrent.pk']._id
    },
    {
      name: 'Toyota HiAce Grand Cabin 14-Seater',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-23-2211',
      type: 'diesel',
      gearbox: 'automatic',
      seats: 14,
      doors: 4,
      dailyPrice: 22000,
      hourlyPrice: 2000,
      deposit: 25000,
      range: 'Maxi',
      rating: 4.8,
      supplier: sahiwalSupplier._id
    },
    {
      name: 'Changan Karvaan Plus 7-Seater',
      locations: ['sahiwal_center', 'sahiwal_bypass', 'sahiwal_station'],
      licensePlate: 'SL-23-6677',
      type: 'gasoline',
      gearbox: 'manual',
      seats: 7,
      doors: 4,
      dailyPrice: 7500,
      hourlyPrice: 800,
      deposit: 12000,
      range: 'Maxi',
      rating: 4.7,
      supplier: sahiwalSupplier._id
    }
  ];

  const carsMap = {};
  for (const [carIndex, carItem] of carsData.entries()) {
    const listingStatus = carIndex >= carsData.length - 2 ? 'PENDING_REVIEW' : 'APPROVED';
    let car = await Car.findOne({ name: carItem.name });
    if (!car) {
      car = await Car.create({
        name: carItem.name,
        // Synthetic listings intentionally carry no invented registration number.
        licensePlate: '',
        registrationPlate: '',
        engineCc: engineCcFor(carItem.name),
        terrainCapability: /Fortuner|Hilux|Revo|4x4/i.test(carItem.name) ? 'NORTHERN_MOUNTAINS' : 'HIGHWAY_INTERCITY',
        selfDriveAvailable: true,
        withDriverAvailable: true,
        driverDailyAllowancePkr: 2500,
        outOfCitySurchargePkr: 1500,
        securityDepositPkr: carItem.deposit,
        listingStatus,
        complianceNotes: listingStatus === 'APPROVED' ? 'Synthetic FYP demo listing; approval state is for workflow demonstration only.' : undefined,
        reviewedBy: listingStatus === 'APPROVED' ? demoAdmin._id : undefined,
        reviewedAt: listingStatus === 'APPROVED' ? new Date() : undefined,
        supplier: carItem.supplier,
        locations: carItem.locations.map((key) => locationsMap[key]._id),
        dailyPrice: carItem.dailyPrice,
        hourlyPrice: carItem.hourlyPrice,
        deposit: carItem.deposit,
        type: carItem.type,
        gearbox: carItem.gearbox,
        seats: carItem.seats,
        doors: carItem.doors,
        aircon: true,
        available: true,
        minimumAge: 21,
        fuelPolicy: 'TANK_TO_TANK',
        mileage: -1,
        rating: undefined,
        range: carItem.range
      });
      console.log(`Created car: ${carItem.name}`);
    } else {
      car.licensePlate = '';
      car.registrationPlate = '';
      car.engineCc = engineCcFor(carItem.name);
      car.terrainCapability = /Fortuner|Hilux|Revo|4x4/i.test(carItem.name) ? 'NORTHERN_MOUNTAINS' : 'HIGHWAY_INTERCITY';
      car.selfDriveAvailable = true;
      car.withDriverAvailable = true;
      car.driverDailyAllowancePkr = 2500;
      car.outOfCitySurchargePkr = 1500;
      car.securityDepositPkr = carItem.deposit;
      car.listingStatus = listingStatus;
      car.complianceNotes = listingStatus === 'APPROVED' ? 'Synthetic FYP demo listing; approval state is for workflow demonstration only.' : undefined;
      car.reviewedBy = listingStatus === 'APPROVED' ? demoAdmin._id : undefined;
      car.reviewedAt = listingStatus === 'APPROVED' ? new Date() : undefined;
      car.fuelPolicy = 'TANK_TO_TANK';
      car.locations = carItem.locations.map((key) => locationsMap[key]._id);
      car.supplier = carItem.supplier;
      car.available = true;
      car.licensePlate = '';
      car.rating = undefined;
      car.trips = 0;
      await car.save();
    }
    carsMap[carItem.name] = car;
  }

  // 5. Pakistani Customers (Users)
  const customersData = [
    {
      fullName: 'FYP Demo Customer (Sahiwal)',
      email: 'demo-customer@safarrent.local',
      phone: '',
      location: 'Sahiwal, Pakistan'
    },
    {
      fullName: 'FYP Demo Customer (Lahore)',
      email: 'demo-customer-lahore@safarrent.local',
      phone: '',
      location: 'Lahore, Pakistan'
    },
    {
      fullName: 'FYP Demo Customer (Islamabad)',
      email: 'demo-customer-isb@safarrent.local',
      phone: '',
      location: 'Islamabad, Pakistan'
    },
    {
      fullName: 'FYP Demo Customer (Karachi)',
      email: 'demo-customer-khi@safarrent.local',
      phone: '',
      location: 'Karachi, Pakistan'
    },
    {
      fullName: 'FYP Demo Customer (Punjab)',
      email: 'demo-customer-punjab@safarrent.local',
      phone: '',
      location: 'Punjab, Pakistan'
    }
  ];

  const customersMap = {};
  for (const c of customersData) {
    let customer = await User.findOne({ email: c.email });
    if (!customer) {
      customer = await User.create({
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        location: c.location,
        type: 'user',
        password: await hashDemoPassword(),
        active: true,
        verified: true,
        verifiedAt: new Date()
      });
      console.log(`Created customer: ${c.fullName}`);
    } else {
      customer.password = await hashDemoPassword();
      customer.active = true;
      customer.verified = true;
      customer.verifiedAt = customer.verifiedAt || new Date();
      customer.phone = '';
      await customer.save();
    }
    customersMap[c.email] = customer;
  }

  // Historical rows are synthetic examples and opt-in only. New demo bookings
  // should be created through customer checkout and decided through supplier login.
  const now = new Date();
  const past3Days = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
  const past1Day = new Date(now.getTime() - 1 * 24 * 3600 * 1000);
  const in2Days = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  const in5Days = new Date(now.getTime() + 5 * 24 * 3600 * 1000);
  const in10Days = new Date(now.getTime() + 10 * 24 * 3600 * 1000);
  if (process.env.BC_FYP_SEED_SAMPLE_BOOKINGS === 'true') {
  // 6. Synthetic booking history (FYP demo only)

  const bookingsData = [
    {
      supplier: sahiwalSupplier._id,
      car: carsMap['Toyota Corolla Altis Grande 1.8']._id,
      driver: customersMap['demo-customer@safarrent.local']._id,
      pickupLocation: locationsMap['sahiwal_center']._id,
      dropOffLocation: locationsMap['lhe_airport']._id,
      from: past3Days,
      to: past1Day,
      status: 'paid', // Completed
      price: 19000,
      isPayedInFull: true
    },
    {
      supplier: sahiwalSupplier._id,
      car: carsMap['Suzuki Cultus Auto Gear Shift (AGS)']._id,
      driver: customersMap['demo-customer@safarrent.local']._id,
      pickupLocation: locationsMap['sahiwal_bypass']._id,
      dropOffLocation: locationsMap['sahiwal_bypass']._id,
      from: past1Day,
      to: in2Days,
      status: 'paidInFull', // Active / In-Transit
      price: 17400,
      isPayedInFull: true
    },
    {
      supplier: margallaSupplier._id,
      car: carsMap['Toyota Fortuner 2.8L Sigma 4 4x4']._id,
      driver: customersMap['demo-customer@safarrent.local']._id,
      pickupLocation: locationsMap['isb_airport']._id,
      dropOffLocation: locationsMap['skardu_hub']._id,
      from: in2Days,
      to: in10Days,
      status: 'deposit', // Confirmed upcoming
      price: 224000,
      isDeposit: true
    },
    {
      supplier: indusSupplier._id,
      car: carsMap['Honda Civic RS Turbo 1.5']._id,
      driver: customersMap['demo-customer@safarrent.local']._id,
      pickupLocation: locationsMap['lhe_gulberg']._id,
      dropOffLocation: locationsMap['sahiwal_center']._id,
      from: in5Days,
      to: in10Days,
      status: 'reserved', // Confirmed
      price: 70000,
      isPayedInFull: false
    },
    {
      supplier: sahiwalSupplier._id,
      car: carsMap['Toyota Hilux Revo Rocco 4x4']._id,
      driver: customersMap['demo-customer@safarrent.local']._id,
      pickupLocation: locationsMap['sahiwal_center']._id,
      dropOffLocation: locationsMap['multan_cantt']._id,
      from: past3Days,
      to: past1Day,
      status: 'paid', // Completed
      price: 48000,
      isPayedInFull: true
    }
  ];

  for (const b of bookingsData) {
    const existing = await Booking.findOne({
      supplier: b.supplier,
      car: b.car,
      driver: b.driver,
      price: b.price
    });
    if (!existing) {
      await Booking.create(b);
      console.log(`Created booking for: ${b.price} PKR (${b.status})`);
    }
  }
  }

  // 7. Vehicle Documents (Registration, Punjab Token Tax, Insurance)
  const nextYear = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
  const revo = carsMap['Toyota Hilux Revo Rocco 4x4'];
  const altis = carsMap['Toyota Corolla Altis Grande 1.8'];

  if (revo) {
    await VehicleDocument.findOneAndUpdate(
      { vehicle: revo._id, type: 'registration' },
      { expiryDate: nextYear, status: 'pending', notes: 'FYP demo placeholder; no registration document uploaded or verified.' },
      { upsert: true }
    );
    await VehicleDocument.findOneAndUpdate(
      { vehicle: revo._id, type: 'token_tax' },
      { expiryDate: nextYear, status: 'pending', notes: 'FYP demo placeholder; no token tax document uploaded or verified.' },
      { upsert: true }
    );
    await VehicleDocument.findOneAndUpdate(
      { vehicle: revo._id, type: 'insurance' },
      { expiryDate: nextYear, status: 'pending', notes: 'FYP demo placeholder; no insurance document uploaded or verified.' },
      { upsert: true }
    );
  }

  if (altis) {
    await VehicleDocument.findOneAndUpdate(
      { vehicle: altis._id, type: 'registration' },
      { expiryDate: nextYear, status: 'pending', notes: 'FYP demo placeholder; no registration document uploaded or verified.' },
      { upsert: true }
    );
    await VehicleDocument.findOneAndUpdate(
      { vehicle: altis._id, type: 'token_tax' },
      { expiryDate: nextYear, status: 'pending', notes: 'FYP demo placeholder; no token tax document uploaded or verified.' },
      { upsert: true }
    );
  }

  // 8. Vehicle Maintenance Records
  if (revo) {
    await Maintenance.findOneAndUpdate(
      { vehicle: revo._id, type: 'oil_change' },
      {
        reportedBy: sahiwalSupplier._id,
        supplier: sahiwalSupplier._id,
        type: 'oil_change',
        description: 'Synthetic FYP demo maintenance record.',
        status: 'scheduled',
        startDate: past3Days,
        expectedCompletionDate: past1Day,
        completedDate: undefined,
        mileage: 18450,
        cost: 16500,
        notes: 'Demo record only; this maintenance work was not performed.'
      },
      { upsert: true }
    );
  }

  console.log('--- FYP DEMO DATA READY: synthetic listings, no real supplier/payment ---');
  console.log('Supplier demo login: sahiwal@safarrent.pk / same password printed below');
  console.log('Customer demo login: demo-customer@safarrent.local / same password printed below');
  console.log('Other demo suppliers: indus@safarrent.pk, margalla@safarrent.pk, mehran@safarrent.pk, karakoram@safarrent.pk');
  console.log(`Demo password: ${demoPassword}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});

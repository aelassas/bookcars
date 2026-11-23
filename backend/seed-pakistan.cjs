const mongoose = require('mongoose');

if (process.env.BC_ENABLE_DEMO_DATA !== 'true' || process.env.NODE_ENV === 'production') {
  throw new Error('This script inserts synthetic development data. Set BC_ENABLE_DEMO_DATA=true in a non-production environment to continue.');
}

const DB_URI = process.env.BC_DB_URI;
if (!DB_URI) {
  throw new Error('BC_DB_URI must be configured explicitly.');
}

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
  type: { type: String, default: 'supplier' },
  blacklisted: { type: Boolean, default: false },
  payLater: { type: Boolean, default: true }
}, { collection: 'User', timestamps: true });

const CarSchema = new mongoose.Schema({
  name: { type: String, required: true },
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

const LocationValue = mongoose.model('LocationValue', LocationValueSchema);
const Country = mongoose.model('Country', CountrySchema);
const Location = mongoose.model('Location', LocationSchema);
const User = mongoose.model('User', UserSchema);
const Car = mongoose.model('Car', CarSchema);

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

  // 1. Create or find SafarRent Supplier
  let supplier = await User.findOne({ email: 'fleet@safarrent.pk' });
  if (!supplier) {
    supplier = await User.create({
      fullName: 'SafarRent Premier Pakistan Fleet',
      email: 'fleet@safarrent.pk',
      phone: '+92 300 1234567',
      type: 'supplier',
      active: false,
      verified: false,
      payLater: true
    });
    console.log('Created SafarRent Fleet Supplier:', supplier._id);
  } else {
    console.log('Found existing supplier:', supplier._id);
  }

  // 2. Create Country Pakistan
  let country = await Country.findOne({});
  if (!country) {
    const countryValIds = await createLocationValues({
      en: 'Pakistan',
      ur: 'پاکستان',
      fr: 'Pakistan',
      es: 'Pakistán',
      de: 'Pakistan',
      pt: 'Paquistão',
      it: 'Pakistan',
      zh: '巴基斯坦',
      ja: 'パキスタン'
    });
    country = await Country.create({
      values: countryValIds,
      supplier: supplier._id
    });
    console.log('Created Country Pakistan:', country._id);
  } else {
    console.log('Found existing country:', country._id);
  }

  // 3. Pakistan Locations
  const cityData = [
    {
      en: "Islamabad Int'l Airport (ISB)",
      ur: "اسلام آباد انٹرنیشنل ایئرپورٹ",
      lat: 33.5651,
      lng: 72.8540
    },
    {
      en: "Blue Area, Islamabad",
      ur: "بلیو ایریا، اسلام آباد",
      lat: 33.7103,
      lng: 73.0645
    },
    {
      en: "Allama Iqbal Int'l Airport, Lahore (LHE)",
      ur: "علامہ اقبال انٹرنیشنل ایئرپورٹ، لاہور",
      lat: 31.5216,
      lng: 74.4036
    },
    {
      en: "Gulberg / DHA, Lahore",
      ur: "گلبرگ / ڈی ایچ اے، لاہور",
      lat: 31.5102,
      lng: 74.3441
    },
    {
      en: "Jinnah Int'l Airport, Karachi (KHI)",
      ur: "جناح انٹرنیشنل ایئرپورٹ، کراچی",
      lat: 24.9065,
      lng: 67.1608
    },
    {
      en: "Clifton / DHA, Karachi",
      ur: "کلفٹن / ڈی ایچ اے، کراچی",
      lat: 24.8138,
      lng: 67.0300
    },
    {
      en: "Saddar, Rawalpindi",
      ur: "صدر، راولپنڈی",
      lat: 33.5973,
      lng: 73.0538
    },
    {
      en: "Bacha Khan Int'l Airport, Peshawar (PEW)",
      ur: "باچا خان انٹرنیشنل ایئرپورٹ، پشاور",
      lat: 33.9940,
      lng: 71.5146
    },
    {
      en: "Faisalabad Clock Tower & City",
      ur: "گھنٹہ گھر و سٹی سینٹر، فیصل آباد",
      lat: 31.4187,
      lng: 73.0791
    },
    {
      en: "Multan Cantt & Airport",
      ur: "ملتان کینٹ و ایئرپورٹ",
      lat: 30.1984,
      lng: 71.4304
    },
    {
      en: "Skardu / Gilgit Hub (Northern Areas)",
      ur: "سکردو / گلگت ہب (شمالی علاقہ جات)",
      lat: 35.2971,
      lng: 75.6333
    }
  ];

  const createdLocations = [];
  for (const city of cityData) {
    let loc = await Location.findOne({ latitude: city.lat, longitude: city.lng });
    if (!loc) {
      const valIds = await createLocationValues({
        en: city.en,
        ur: city.ur
      });
      loc = await Location.create({
        country: country._id,
        latitude: city.lat,
        longitude: city.lng,
        values: valIds,
        supplier: supplier._id
      });
      console.log(`Created location: ${city.en} (${loc._id})`);
    } else {
      console.log(`Location exists: ${city.en}`);
    }
    createdLocations.push(loc._id);
  }

  // 4. Seed Fleet of Cars
  const carsData = [
    {
      name: 'Toyota Fortuner 2.8L Sigma 4 4x4',
      type: 'diesel',
      gearbox: 'automatic',
      seats: 7,
      doors: 5,
      dailyPrice: 28000,
      hourlyPrice: 2500,
      deposit: 30000,
      range: 'Maxi',
      rating: 4.9
    },
    {
      name: 'Toyota Corolla Altis Grande 1.8',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 9500,
      hourlyPrice: 1000,
      deposit: 15000,
      range: 'Midi',
      rating: 4.8
    },
    {
      name: 'Honda Civic RS Turbo 1.5',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 14000,
      hourlyPrice: 1400,
      deposit: 20000,
      range: 'Midi',
      rating: 4.9
    },
    {
      name: 'KIA Sportage AWD',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 5,
      dailyPrice: 16500,
      hourlyPrice: 1600,
      deposit: 25000,
      range: 'Midi',
      rating: 4.8
    },
    {
      name: 'Suzuki Alto VXL AGS',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 4,
      doors: 4,
      dailyPrice: 4500,
      hourlyPrice: 500,
      deposit: 10000,
      range: 'Mini',
      rating: 4.7
    },
    {
      name: 'Suzuki Cultus Auto Gear Shift (AGS)',
      type: 'gasoline',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 5800,
      hourlyPrice: 650,
      deposit: 12000,
      range: 'Mini',
      rating: 4.8
    },
    {
      name: 'Toyota Hilux Revo Rocco 4x4',
      type: 'diesel',
      gearbox: 'automatic',
      seats: 5,
      doors: 4,
      dailyPrice: 24000,
      hourlyPrice: 2200,
      deposit: 30000,
      range: 'Maxi',
      rating: 4.9
    },
    {
      name: 'Toyota HiAce Grand Cabin 14-Seater',
      type: 'diesel',
      gearbox: 'automatic',
      seats: 14,
      doors: 4,
      dailyPrice: 22000,
      hourlyPrice: 2000,
      deposit: 25000,
      range: 'Maxi',
      rating: 4.8
    }
  ];

  for (const carItem of carsData) {
    let existingCar = await Car.findOne({ name: carItem.name });
    if (!existingCar) {
      existingCar = await Car.create({
        name: carItem.name,
        supplier: supplier._id,
        locations: createdLocations,
        dailyPrice: carItem.dailyPrice,
        hourlyPrice: carItem.hourlyPrice,
        deposit: carItem.deposit,
        type: carItem.type,
        gearbox: carItem.gearbox,
        seats: carItem.seats,
        doors: carItem.doors,
        aircon: true,
        available: false,
        minimumAge: 21,
        fuelPolicy: 'likeForLike',
        mileage: -1,
        cancellation: 0,
        amendments: 0,
        theftProtection: 0,
        collisionDamageWaiver: 0,
        fullInsurance: 0,
        additionalDriver: 0,
        rating: carItem.rating,
        range: carItem.range
      });
      console.log(`Created car: ${carItem.name} (${existingCar._id})`);
    } else {
      console.log(`Car exists: ${carItem.name}`);
    }
  }

  console.log('Seeding Pakistan data completed successfully!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error during seeding:', err);
  process.exit(1);
});

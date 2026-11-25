const mongoose = require('mongoose')
require('dotenv').config()
const bcrypt = require('bcrypt')

if (process.env.BC_ENABLE_FYP_DEMO !== 'true' && process.env.BC_FYP_DEMO_MODE !== 'true') {
  throw new Error('Synthetic seeding requires BC_ENABLE_FYP_DEMO=true or BC_FYP_DEMO_MODE=true.')
}

const DB_URI = process.env.BC_DB_URI
if (!DB_URI) throw new Error('BC_DB_URI must be configured explicitly.')

const LocationValue = mongoose.model('FypLocationValue', new mongoose.Schema({ language: { type: String, required: true }, value: { type: String, required: true } }, { collection: 'LocationValue', timestamps: true }), 'LocationValue')
const Country = mongoose.model('FypCountry', new mongoose.Schema({ values: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FypLocationValue' }], supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'FypUser' } }, { collection: 'Country', timestamps: true }), 'Country')
const Location = mongoose.model('FypLocation', new mongoose.Schema({ country: { type: mongoose.Schema.Types.ObjectId, ref: 'FypCountry', required: true }, latitude: Number, longitude: Number, parentLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'FypLocation' }, values: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FypLocationValue' }], image: String, supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'FypUser' } }, { collection: 'Location', timestamps: true }), 'Location')
const User = mongoose.model('FypUser', new mongoose.Schema({ fullName: { type: String, required: true }, language: { type: String, default: 'en' }, contracts: [Object], enableEmailNotifications: {type: Boolean, default: false}, email: { type: String, required: true, unique: true }, phone: String, password: String, active: { type: Boolean, default: true }, verified: { type: Boolean, default: true }, verifiedAt: Date, type: { type: String, default: 'user' }, avatar: String, bio: String, location: String, blacklisted: { type: Boolean, default: false }, payLater: { type: Boolean, default: true }, cnicNumber: String, drivingLicenseNumber: String, kycStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' } }, { collection: 'User', timestamps: true }), 'User')
const Car = mongoose.model('FypCar', new mongoose.Schema({ name: { type: String, required: true }, deliveryLocations: [mongoose.Schema.Types.ObjectId], dateBasedPrices: [mongoose.Schema.Types.ObjectId], multimedia: [String], image: String, licensePlate: String, registrationPlate: String, supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'FypUser', required: true, index: true }, minimumAge: { type: Number, default: 21 }, locations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FypLocation', index: true }], dailyPrice: { type: Number, required: true }, hourlyPrice: Number, deposit: { type: Number, default: 15000 }, available: { type: Boolean, default: true, index: true }, fullyBooked: { type: Boolean, default: false }, comingSoon: { type: Boolean, default: false }, engineCc: Number, terrainCapability: { type: String, enum: ['CITY_ONLY', 'HIGHWAY_INTERCITY', 'NORTHERN_MOUNTAINS'], default: 'HIGHWAY_INTERCITY', index: true }, selfDriveAvailable: { type: Boolean, default: true }, withDriverAvailable: { type: Boolean, default: true }, driverDailyAllowancePkr: { type: Number, default: 2500 }, outOfCitySurchargePkr: { type: Number, default: 1500 }, securityDepositPkr: { type: Number, default: 15000 }, listingStatus: { type: String, enum: ['PENDING_REVIEW', 'APPROVED', 'SUSPENDED'], default: 'PENDING_REVIEW', index: true }, complianceNotes: String, reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'FypUser' }, reviewedAt: Date, fuelPolicy: { type: String, default: 'TANK_TO_TANK' }, type: { type: String, default: 'gasoline' }, gearbox: { type: String, default: 'automatic' }, aircon: { type: Boolean, default: true }, seats: { type: Number, default: 5 }, doors: { type: Number, default: 4 }, mileage: { type: Number, default: -1 }, cancellation: { type: Number, default: 0 }, amendments: { type: Number, default: 0 }, rating: { type: Number, default: 4.8 }, theftProtection: { type: Number, default: 0 }, collisionDamageWaiver: { type: Number, default: 0 }, fullInsurance: { type: Number, default: 0 }, additionalDriver: { type: Number, default: 0 }, blockOnPay: { type: Boolean, default: false }, range: { type: String, default: 'Midi' } }, { collection: 'Car', timestamps: true }), 'Car')
const Booking = mongoose.model('FypBooking', new mongoose.Schema({ supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'FypUser', required: true, index: true }, car: { type: mongoose.Schema.Types.ObjectId, ref: 'FypCar', required: true, index: true }, driver: { type: mongoose.Schema.Types.ObjectId, ref: 'FypUser', required: true, index: true }, pickupLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'FypLocation', required: true }, dropOffLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'FypLocation', required: true }, from: { type: Date, required: true }, to: { type: Date, required: true }, lifecycleStatus: String, seedKey: String, cancellation: Boolean, status: { type: String, enum: ['void', 'pending', 'deposit', 'paid', 'paidInFull', 'reserved', 'cancelled', 'PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], required: true, index: true }, price: { type: Number, required: true }, rentalMode: { type: String, enum: ['SELF_DRIVE', 'WITH_DRIVER'], default: 'WITH_DRIVER' }, tripScope: { type: String, enum: ['INTRA_CITY', 'OUT_OF_CITY', 'NORTHERN_TOUR'], default: 'INTRA_CITY' }, paymentState: { type: String, enum: ['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED', 'FAILED'], default: 'PENDING_PAYMENT', index: true }, paymentStatus: { type: String, enum: ['PENDING_PAYMENT', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING_PAYMENT' }, isDeposit: Boolean, isPayedInFull: Boolean, handoverChecklist: { completedAt: Date, odometerStart: Number, fuelLevel: String, spareTirePresent: Boolean, exteriorNotes: String, verifiedBySupplier: Boolean }, priceBreakdown: { baseRentPkr: Number, driverAllowancePkr: Number, outOfCitySurchargePkr: Number, securityDepositPkr: Number, totalPayablePkr: Number } }, { collection: 'Booking', timestamps: true }), 'Booking')

const demoPassword = process.env.BC_FYP_DEMO_PASSWORD || 'SafarRent-Demo-2026!'
const hashDemoPassword = () => bcrypt.hash(demoPassword, 10)

async function locationValues(en, ur) {
  const ids = []
  for (const language of ['en', 'fr', 'es', 'de', 'pt', 'it', 'zh', 'ja', 'ur']) {
    const doc = await LocationValue.create({ language, value: language === 'ur' ? ur : en })
    ids.push(doc._id)
  }
  return ids
}

async function run() {
  await mongoose.connect(DB_URI)

  // Never remove existing records: users may have completed evaluation workflows.
  const pakistanValue = await LocationValue.findOne({ language: 'en', value: 'Pakistan' })
  let country = pakistanValue ? await Country.findOne({ values: pakistanValue._id }) : null
  if (!country) country = await Country.create({ values: await locationValues('Pakistan', 'پاکستان') })

  const supplierSpecs = [
    { key: 'margalla', name: 'Margalla Executive Motors', email: 'margalla@safarrent.pk', location: 'Islamabad', bio: 'Synthetic Pakistani fleet for Islamabad and northern inter-city delivery.' },
    { key: 'lahore', name: 'Lahore Royal Fleet', email: 'lahore@safarrent.pk', location: 'Lahore', bio: 'Synthetic Pakistani fleet for Lahore and Punjab.' },
    { key: 'karakoram', name: 'Karakoram 4x4 Expeditions', email: 'karakoram@safarrent.pk', location: 'Gilgit / Hunza', bio: 'Synthetic Pakistani northern fleet for Gilgit-Baltistan and mountain routes.' },
    { key: 'sindh', name: 'Sindh Coastal Rentals', email: 'karachi@safarrent.pk', location: 'Karachi', bio: 'Synthetic Pakistani fleet for Karachi and Sindh.' },
  ]
  const suppliers = {}
  for (const spec of supplierSpecs) {
    let user = await User.findOne({ email: spec.email })
    const fields = { fullName: spec.name, email: spec.email, phone: '03005550101', password: await hashDemoPassword(), location: spec.location, bio: spec.bio, type: 'supplier', active: true, verified: true, verifiedAt: new Date(), payLater: true }
    if (!user) user = await User.create(fields)

    suppliers[spec.key] = user
  }

  // Stable emails identify the four demonstration agencies.


  const adminEmail = (process.env.BC_FYP_DEMO_ADMIN_EMAIL || 'demo-admin@safarrent.local').trim().toLowerCase()
  let admin = await User.findOne({ email: adminEmail })
  if (!admin) admin = await User.create({ fullName: 'SafarRent Demo Admin', email: adminEmail, phone: '03005550100', password: await hashDemoPassword(), location: 'Pakistan', bio: 'Synthetic demo administrator.', type: 'admin', active: true, verified: true, verifiedAt: new Date(), kycStatus: 'VERIFIED' })


  const locationSpecs = [
    ['islamabad','Islamabad','اسلام آباد',33.6844,73.0479], ['rawalpindi','Rawalpindi','راولپنڈی',33.6261,73.0718], ['lahore','Lahore','لاہور',31.5204,74.3587], ['karachi','Karachi','کراچی',24.8607,67.0011], ['peshawar','Peshawar','پشاور',34.0151,71.5249], ['multan','Multan','ملتان',30.1978,71.4711], ['faisalabad','Faisalabad','فیصل آباد',31.4504,73.1350], ['sialkot','Sialkot','سیالکوٹ',32.4945,74.5229], ['gilgit','Gilgit','گلگت',35.9211,74.8750], ['hunza','Hunza','ہنزہ',36.3167,74.6500], ['skardu','Skardu','سکردو',35.2971,75.6333], ['swat','Swat','سوات',35.2227,72.4258], ['murree','Murree','مری',33.9062,73.3903], ['naran','Naran','ناران',34.9093,73.6507]
  ]
  const locations = {}
  for (const [key, en, ur, lat, lng] of locationSpecs) {
    let loc = await Location.findOne({ latitude: lat, longitude: lng })
    if (!loc) loc = await Location.create({ country: country._id, latitude: lat, longitude: lng, values: await locationValues(en, ur), supplier: suppliers.margalla._id })
    else await Location.updateOne({ _id: loc._id }, { $set: { values: loc.values, country: country._id } })
    locations[key] = loc
  }

  const cars = [
    ['Suzuki Alto VXR 660cc','islamabad','margalla',660,4500,8000,'CITY_ONLY','Mini'],['Suzuki Cultus VXL','rawalpindi','margalla',1000,5800,10000,'HIGHWAY_INTERCITY','Mini'],['Suzuki WagonR VXL','lahore','lahore',1000,6000,11000,'HIGHWAY_INTERCITY','Mini'],['Toyota Yaris ATIV','lahore','lahore',1300,8000,14000,'HIGHWAY_INTERCITY','Midi'],['Toyota Corolla GLi','islamabad','margalla',1300,9500,16000,'HIGHWAY_INTERCITY','Midi'],['Toyota Corolla Altis Grande','lahore','lahore',1800,11500,18000,'HIGHWAY_INTERCITY','Midi'],['Honda City Aspire','lahore','lahore',1500,10000,16000,'HIGHWAY_INTERCITY','Midi'],['Honda Civic RS','islamabad','margalla',1500,14000,22000,'HIGHWAY_INTERCITY','Midi'],['Honda BR-V','rawalpindi','margalla',1500,12500,20000,'HIGHWAY_INTERCITY','Midi'],['Kia Sportage AWD','islamabad','margalla',2000,16500,26000,'NORTHERN_MOUNTAINS','Midi'],['Hyundai Tucson','lahore','lahore',2000,17000,27000,'HIGHWAY_INTERCITY','Midi'],['Toyota Fortuner Legender','islamabad','margalla',2800,28000,40000,'NORTHERN_MOUNTAINS','Maxi'],['Toyota Land Cruiser Prado TX','islamabad','margalla',2800,35000,50000,'NORTHERN_MOUNTAINS','Maxi'],['Toyota HiAce Grand Cabin','lahore','lahore',2800,22000,30000,'HIGHWAY_INTERCITY','Maxi'],
    ['Suzuki Alto VXR 660cc','karachi','sindh',660,4200,8000,'CITY_ONLY','Mini'],['Suzuki Cultus VXL','karachi','sindh',1000,5500,10000,'HIGHWAY_INTERCITY','Mini'],['Suzuki WagonR VXL','karachi','sindh',1000,5900,11000,'HIGHWAY_INTERCITY','Mini'],['Toyota Yaris ATIV','multan','lahore',1300,7800,14000,'HIGHWAY_INTERCITY','Midi'],['Toyota Corolla GLi','faisalabad','lahore',1300,9200,16000,'HIGHWAY_INTERCITY','Midi'],['Honda Civic RS','sialkot','lahore',1500,13500,22000,'HIGHWAY_INTERCITY','Midi'],['Toyota Fortuner Legender','gilgit','karakoram',2800,30000,45000,'NORTHERN_MOUNTAINS','Maxi'],['Toyota Land Cruiser Prado TX','hunza','karakoram',2800,36000,55000,'NORTHERN_MOUNTAINS','Maxi'],['Toyota HiAce Grand Cabin','skardu','karakoram',2800,24000,35000,'NORTHERN_MOUNTAINS','Maxi'],['Kia Sportage AWD','swat','karakoram',2000,17000,28000,'NORTHERN_MOUNTAINS','Midi']
  ]
  cars.push(['Demo Review: Toyota Yaris ATIV','lahore','lahore',1300,8000,14000,'HIGHWAY_INTERCITY','Midi'], ['Demo Review: Kia Sportage AWD','islamabad','margalla',2000,16500,26000,'NORTHERN_MOUNTAINS','Midi'])

  // Approved inventory for every hub shown as a quick-search pill.
  cars.push(
    ['Toyota Corolla Altis','peshawar','margalla',1800,10500,17000,'HIGHWAY_INTERCITY','Midi'],
    ['Suzuki Cultus VXL','murree','margalla',1000,6500,11000,'NORTHERN_MOUNTAINS','Mini'],
    ['Toyota Fortuner Legender','naran','karakoram',2800,29000,42000,'NORTHERN_MOUNTAINS','Maxi']
  )
  const carMap = {}
  for (let i = 0; i < cars.length; i++) {
    const [name, locKey, supplierKey, engineCc, dailyPrice, deposit, terrain, range] = cars[i]
    // Only the two "Demo Review" fixtures await admin approval.
    const listingStatus = name.startsWith('Demo Review:') ? 'PENDING_REVIEW' : 'APPROVED'
    const plate = `SR-DEMO-${String(i + 1).padStart(2, '0')}`
    const fields = { name, licensePlate: plate, registrationPlate: plate, engineCc, supplier: suppliers[supplierKey]._id, locations: [locations[locKey]._id], dailyPrice, hourlyPrice: Math.round(dailyPrice / 9), deposit, securityDepositPkr: deposit, available: true, fullyBooked: false, comingSoon: false, minimumAge: 21, terrainCapability: terrain, selfDriveAvailable: true, withDriverAvailable: true, driverDailyAllowancePkr: 2500, outOfCitySurchargePkr: 1500, listingStatus, complianceNotes: listingStatus === 'APPROVED' ? 'Synthetic approved demo listing.' : 'Demo vehicle awaiting admin compliance approval.', reviewedBy: listingStatus === 'APPROVED' ? admin._id : undefined, reviewedAt: listingStatus === 'APPROVED' ? new Date() : undefined, fuelPolicy: 'TANK_TO_TANK', type: engineCc === 2800 ? 'diesel' : 'gasoline', gearbox: 'automatic', aircon: true, seats: terrain === 'NORTHERN_MOUNTAINS' && /Fortuner|Prado|HiAce/.test(name) ? 7 : 5, doors: 4, mileage: -1, cancellation: 0, amendments: 0, theftProtection: 0, collisionDamageWaiver: 0, fullInsurance: 0, additionalDriver: 0, blockOnPay: false, rating: 4.7 + (i % 3) * 0.1, range: String(range).toLowerCase() }
    let car = await Car.findOne({ licensePlate: plate })
    if (!car) car = await Car.create(fields)
    if (car.complianceNotes?.startsWith('Synthetic approved demo listing') || car.complianceNotes === 'Demo vehicle awaiting admin compliance approval.') {
      await Car.collection.updateOne({ _id: car._id, demoAvailabilityVersion: { $exists: false } }, { $set: { blockOnPay: true, demoAvailabilityVersion: 1 } })
    }

    // Migrate the two old pending fixtures now that dedicated review cars exist.
    // Match the original seed note so subsequent operator reviews are untouched.
    if (['SR-DEMO-23', 'SR-DEMO-24'].includes(plate)) {
      await Car.updateOne({ _id: car._id, listingStatus: 'PENDING_REVIEW', complianceNotes: 'Demo vehicle awaiting admin compliance approval.' }, { $set: { listingStatus: 'APPROVED', complianceNotes: 'Synthetic approved demo listing.', reviewedBy: admin._id, reviewedAt: new Date() } })
    }

    // Upgrade only missing structural fixture fields; retain operator edits and review decisions.
    if (!car.deliveryLocations?.length) {
      const deliveryLocations = terrain === 'CITY_ONLY' ? [] : Object.entries(locations).filter(([key]) => terrain === 'NORTHERN_MOUNTAINS' || !['gilgit','hunza','skardu','swat','murree','naran'].includes(key)).map(([, value]) => value._id)
      await Car.updateOne({ _id: car._id }, { $set: { deliveryLocations } })
    }
    await Car.collection.updateOne({ _id: car._id, dateBasedPrices: { $exists: false } }, { $set: { dateBasedPrices: [], multimedia: [] } })
    carMap[`${name}-${i}`] = car
  }

  // Repair references left by the old destructive demo seed, only on identified
  // synthetic vehicles. Existing valid locations and operator decisions survive.
  const validLocations = new Set(Object.values(locations).map(location => String(location._id)))
  for (const car of await Car.find({ complianceNotes: /^Synthetic|^Demo vehicle awaiting/ })) {
    if (!car.locations.length || car.locations.some(id => !validLocations.has(String(id)))) {
      const agency = Object.entries(suppliers).find(([, user]) => String(user._id) === String(car.supplier))?.[0]
      const home = locations[({ lahore: 'lahore', sindh: 'karachi', karakoram: 'gilgit' })[agency] || 'islamabad']
      await Car.updateOne({ _id: car._id }, { $set: { locations: [home._id] } })
    }
  }

  const customerSpecs = [
    ['demo-customer@safarrent.local','FYP Demo Customer','Islamabad','35202-1234567-1'], ['demo-customer-lahore@safarrent.local','Lahore Demo Customer','Lahore','35202-7654321-2'], ['demo-customer-isb@safarrent.local','Islamabad Demo Customer','Islamabad','61101-1234567-3'], ['demo-customer-khi@safarrent.local','Karachi Demo Customer','Karachi','42101-7654321-4'],
    // Left unverified so the admin KYC queue and the self-drive KYC gate can be demonstrated.
    ['demo-customer-new@safarrent.local','New Demo Customer','Islamabad','','PENDING']
  ]
  const customers = {}
  for (const [email, name, location, cnic, kycStatus] of customerSpecs) {
    let user = await User.findOne({ email })
    const pendingKyc = kycStatus === 'PENDING'
    const fields = { fullName: name, email, phone: '03005550201', password: await hashDemoPassword(), location, type: 'user', active: true, verified: true, verifiedAt: new Date(), cnicNumber: cnic || undefined, drivingLicenseNumber: pendingKyc ? undefined : 'PK-DL-DEMO-001', kycStatus: kycStatus || 'VERIFIED', payLater: true }
    if (!user) user = await User.create(fields)

    customers[email] = user
  }

  const supplierUser = suppliers.margalla
  const lahoreUser = suppliers.lahore
  const karakoramUser = suppliers.karakoram
  const sindhUser = suppliers.sindh
  const firstCar = await Car.findOne({ listingStatus: 'APPROVED', supplier: supplierUser._id })
  const lahoreCar = await Car.findOne({ listingStatus: 'APPROVED', supplier: lahoreUser._id })
  const northernCar = await Car.findOne({ listingStatus: 'APPROVED', supplier: karakoramUser._id })
  const coastalCar = await Car.findOne({ listingStatus: 'APPROVED', supplier: sindhUser._id })
  const customer = customers['demo-customer@safarrent.local']

  const now = new Date()
  const day = 86400000
  const bookingSpecs = [
    ['PENDING_PAYMENT','pending', supplierUser._id, firstCar._id, locations.islamabad._id, locations.rawalpindi._id, 2, 4, 'WITH_DRIVER'],['CONFIRMED','reserved', lahoreUser._id, lahoreCar._id, locations.lahore._id, locations.multan._id, 5, 8, 'SELF_DRIVE'],['IN_PROGRESS','paidInFull', karakoramUser._id, northernCar._id, locations.islamabad._id, locations.hunza._id, -2, 5, 'WITH_DRIVER'],['COMPLETED','paid', sindhUser._id, coastalCar._id, locations.karachi._id, locations.karachi._id, -8, -3, 'WITH_DRIVER'],['CANCELLED','cancelled', lahoreUser._id, lahoreCar._id, locations.lahore._id, locations.faisalabad._id, -6, -4, 'SELF_DRIVE'],['PENDING_PAYMENT','pending', supplierUser._id, firstCar._id, locations.rawalpindi._id, locations.murree._id, 8, 10, 'SELF_DRIVE'],['CONFIRMED','deposit', karakoramUser._id, northernCar._id, locations.islamabad._id, locations.skardu._id, 12, 17, 'WITH_DRIVER'],['COMPLETED','paid', lahoreUser._id, lahoreCar._id, locations.lahore._id, locations.sialkot._id, -18, -15, 'SELF_DRIVE'],['IN_PROGRESS','paidInFull', sindhUser._id, coastalCar._id, locations.karachi._id, locations.swat._id, -1, 3, 'WITH_DRIVER'],['CANCELLED','cancelled', supplierUser._id, firstCar._id, locations.islamabad._id, locations.peshawar._id, -12, -10, 'WITH_DRIVER']
  ]
  for (let i = 0; i < bookingSpecs.length; i++) {
    const [paymentState, status, supplierId, carId, pickup, dropoff, startOffset, endOffset, rentalMode] = bookingSpecs[i]
    const from = new Date(now.getTime() + startOffset * day)
    const to = new Date(now.getTime() + endOffset * day)
    // Price is derived from the selected vehicle, not a fixture total.
    const seedKey = `pakistan-evaluation-booking-${i + 1}`
    const seeded = await Booking.findOne({ seedKey })
    // Adopt old fixtures once instead of duplicating the earlier, unkeyed seed.
    const legacy = await Booking.findOne({ seedKey: { $exists: false }, supplier: supplierId, car: carId, driver: customer._id, status, from: { $gte: new Date(now.getTime() + (startOffset - 1) * day), $lte: new Date(now.getTime() + (startOffset + 1) * day) } })
    if (legacy) {
      if (!seeded) await Booking.updateOne({ _id: legacy._id }, { $set: { seedKey, lifecycleStatus: paymentState } })
    }
    if (seeded || legacy) continue
    const seedCar = await Car.findById(carId)
    const days = Math.max(1, endOffset - startOffset)
    const breakdown = { baseRentPkr: seedCar.dailyPrice * days, driverAllowancePkr: rentalMode === 'WITH_DRIVER' ? 2500 * days : 0, outOfCitySurchargePkr: 1500, securityDepositPkr: seedCar.securityDepositPkr }
    breakdown.totalPayablePkr = Object.values(breakdown).reduce((sum, amount) => sum + amount, 0)
    const key = { seedKey, supplier: supplierId, car: carId, driver: customer._id, price: breakdown.totalPayablePkr, from, to, lifecycleStatus: paymentState, cancellation: true }
    const seedPaymentState = ['COMPLETED', 'CANCELLED'].includes(paymentState) ? 'CONFIRMED' : paymentState === 'PENDING_PAYMENT' ? 'PENDING_PAYMENT' : 'CONFIRMED'
    await Booking.create({ ...key, pickupLocation: pickup, dropOffLocation: dropoff, status, rentalMode, tripScope: rentalMode === 'WITH_DRIVER' && [2,6,8].includes(i) ? 'NORTHERN_TOUR' : 'OUT_OF_CITY', paymentState: seedPaymentState, paymentStatus: status === 'paid' || status === 'paidInFull' || seedPaymentState === 'CONFIRMED' ? 'PAID' : 'PENDING_PAYMENT', isDeposit: status === 'deposit', isPayedInFull: status === 'paidInFull' || status === 'paid', handoverChecklist: i === 2 || i === 8 ? { completedAt: new Date(), odometerStart: 12000 + i * 100, fuelLevel: '3/4', spareTirePresent: true, exteriorNotes: 'Demo handover: minor road dust only.', verifiedBySupplier: true } : undefined, priceBreakdown: breakdown })
  }

  await Promise.all([Car.collection.createIndex({ listingStatus: 1, available: 1, supplier: 1 }), Car.collection.createIndex({ locations: 1, available: 1, listingStatus: 1 }), Booking.collection.createIndex({ supplier: 1, status: 1 }), Booking.collection.createIndex({ driver: 1, status: 1 }), Booking.collection.createIndex({ customer: 1, status: 1 }), Booking.collection.createIndex({ status: 1 }), Booking.collection.createIndex({ car: 1, from: 1, to: 1 })])

  console.log(JSON.stringify({ locations: await Location.countDocuments(), suppliers: await User.countDocuments({ type: 'supplier' }), cars: await Car.countDocuments(), approvedCars: await Car.countDocuments({ listingStatus: 'APPROVED' }), pendingCars: await Car.countDocuments({ listingStatus: 'PENDING_REVIEW' }), bookings: await Booking.countDocuments(), seededBookings: await Booking.countDocuments({ seedKey: /^pakistan-evaluation/ }), customers: await User.countDocuments({ type: 'user' }), demoPassword }, null, 2))
  await mongoose.disconnect()
}

run().catch(async (err) => { console.error('Error during seeding:', err); await mongoose.disconnect(); process.exit(1) })

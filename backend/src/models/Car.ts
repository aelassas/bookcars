import { Schema, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'

const carSchema = new Schema<env.Car>(
  {
    name: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
      trim: true,
    },
    licensePlate: {
      type: String,
      index: true,
      trim: true,
    },
    registrationPlate: { type: String, index: true, trim: true, uppercase: true },
    engineCc: { type: Number, min: 0, max: 20000 },
    terrainCapability: {
      type: String,
      enum: Object.values(bookcarsTypes.TerrainCapability),
      default: bookcarsTypes.TerrainCapability.HighwayIntercity,
      index: true,
    },
    selfDriveAvailable: { type: Boolean, default: true },
    withDriverAvailable: { type: Boolean, default: true },
    driverDailyAllowancePkr: { type: Number, default: 2500, min: 0 },
    outOfCitySurchargePkr: { type: Number, default: 1500, min: 0 },
    securityDepositPkr: { type: Number, default: 15000, min: 0 },
    listingStatus: {
      type: String,
      enum: Object.values(bookcarsTypes.ListingStatus),
      default: bookcarsTypes.ListingStatus.PendingReview,
      index: true,
    },
    complianceNotes: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    supplier: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
    },
    deliveryLocations: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
    minimumAge: {
      type: Number,
      required: [true, "can't be blank"],
      min: env.MINIMUM_AGE,
      max: 99,
    },
    locations: {
      type: [Schema.Types.ObjectId],
      ref: 'Location',
      validate: (value: any): boolean => Array.isArray(value) && value.length > 0,
    },

    // --------- price fields ---------
    dailyPrice: {
      type: Number,
      required: [true, "can't be blank"],
    },
    discountedDailyPrice: {
      type: Number,
    },
    hourlyPrice: {
      type: Number,
    },
    discountedHourlyPrice: {
      type: Number,
    },
    biWeeklyPrice: {
      type: Number,
    },
    discountedBiWeeklyPrice: {
      type: Number,
    },
    weeklyPrice: {
      type: Number,
    },
    discountedWeeklyPrice: {
      type: Number,
    },
    monthlyPrice: {
      type: Number,
    },
    discountedMonthlyPrice: {
      type: Number,
    },

    // date based price fields
    isDateBasedPrice: {
      type: Boolean,
      default: false,
    },
    dateBasedPrices: {
      type: [Schema.Types.ObjectId],
      ref: 'DateBasedPrice',
    },
    // --------- end of price fields ---------

    deposit: {
      type: Number,
      required: [true, "can't be blank"],
    },
    available: {
      type: Boolean,
      required: [true, "can't be blank"],
      index: true,
    },
    fullyBooked: {
      type: Boolean,
      default: false,
    },
    comingSoon: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: [
        bookcarsTypes.CarType.Diesel,
        bookcarsTypes.CarType.Gasoline,
        bookcarsTypes.CarType.Electric,
        bookcarsTypes.CarType.Hybrid,
        bookcarsTypes.CarType.PlugInHybrid,
        bookcarsTypes.CarType.Unknown,
      ],
      required: [true, "can't be blank"],
    },
    gearbox: {
      type: String,
      enum: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
      required: [true, "can't be blank"],
    },
    aircon: {
      type: Boolean,
      required: [true, "can't be blank"],
    },
    image: {
      type: String,
    },
    seats: {
      type: Number,
      required: [true, "can't be blank"],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer',
      },
    },
    doors: {
      type: Number,
      required: [true, "can't be blank"],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer',
      },
    },
    fuelPolicy: {
      type: String,
      enum: [
        bookcarsTypes.FuelPolicy.LikeForLike,
        bookcarsTypes.FuelPolicy.FreeTank,
        bookcarsTypes.FuelPolicy.FullToFull,
        bookcarsTypes.FuelPolicy.FullToEmpty,
        bookcarsTypes.FuelPolicy.TankToTank,
        bookcarsTypes.FuelPolicy.SameToSame,
        bookcarsTypes.FuelPolicy.FuelIncluded,
      ],
      required: [true, "can't be blank"],
    },
    mileage: {
      type: Number,
      required: [true, "can't be blank"],
    },
    cancellation: {
      type: Number,
      required: [true, "can't be blank"],
    },
    amendments: {
      type: Number,
      required: [true, "can't be blank"],
    },
    theftProtection: {
      type: Number,
      required: [true, "can't be blank"],
    },
    collisionDamageWaiver: {
      type: Number,
      required: [true, "can't be blank"],
    },
    fullInsurance: {
      type: Number,
      required: [true, "can't be blank"],
    },
    additionalDriver: {
      type: Number,
      required: [true, "can't be blank"],
    },
    range: {
      type: String,
      enum: [
        bookcarsTypes.CarRange.Mini,
        bookcarsTypes.CarRange.Midi,
        bookcarsTypes.CarRange.Maxi,
        bookcarsTypes.CarRange.Scooter,
        bookcarsTypes.CarRange.Bus,
        bookcarsTypes.CarRange.Truck,
        bookcarsTypes.CarRange.Caravan,
      ],
      required: [true, "can't be blank"],
    },
    multimedia: [{
      type: String,
      enum: [
        bookcarsTypes.CarMultimedia.AndroidAuto,
        bookcarsTypes.CarMultimedia.AppleCarPlay,
        bookcarsTypes.CarMultimedia.Bluetooth,
        bookcarsTypes.CarMultimedia.Touchscreen,
      ],
    }],
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    trips: {
      type: Number,
      default: 0,
    },
    co2: {
      type: Number,
    },
    blockOnPay: {
      type: Boolean,
      default: true,
    },
    bookingReservationVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Car',
  },
)

// Add custom indexes
carSchema.index({ updatedAt: -1, _id: 1 })
carSchema.index({ supplier: 1, type: 1, available: 1, rating: -1, updatedAt: -1, _id: 1 })
carSchema.index({ available: 1, gearbox: 1, deposit: 1 })
carSchema.index({ listingStatus: 1, available: 1, supplier: 1 })
carSchema.index({ listingStatus: 1, locations: 1, available: 1, terrainCapability: 1 })
carSchema.index({ seats: 1, doors: 1 })
carSchema.index({ mileage: 1, fuelPolicy: 1 })
carSchema.index({ locations: 1, available: 1, fullyBooked: 1 })
carSchema.index({ comingSoon: 1 })
carSchema.index({ range: 1 })
carSchema.index({ multimedia: 1 })
carSchema.index({ dailyPrice: 1, _id: 1 })
carSchema.index({ dateBasedPrices: 1 })
carSchema.index(
  { name: 'text' },
  {
    default_language: 'none', // This disables stemming
    language_override: '_none', // Prevent MongoDB from expecting a language field
    background: true,
  },
)

const Car = model<env.Car>('Car', carSchema)

export default Car

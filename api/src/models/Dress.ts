import { Schema, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import * as logger from '../common/logger'

const dressSchema = new Schema<env.Dress>(
  {
    name: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
      trim: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
    },
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
        bookcarsTypes.DressType.Traditional,
        bookcarsTypes.DressType.Modern,
        bookcarsTypes.DressType.Designer,
        bookcarsTypes.DressType.Vintage,
        bookcarsTypes.DressType.Casual,
        bookcarsTypes.DressType.Unknown,
      ],
      required: [true, "can't be blank"],
    },
    size: {
      type: String,
      enum: [bookcarsTypes.DressSize.Small, bookcarsTypes.DressSize.Medium, bookcarsTypes.DressSize.Large, bookcarsTypes.DressSize.ExtraLarge],
      required: [true, "can't be blank"],
    },

    image: {
      type: String,
    },
    color: {
      type: String,
      required: [true, "can't be blank"],
    },
    length: {
      type: Number,
      required: [true, "can't be blank"],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer',
      },
    },
    material: {
      type: String,
      enum: [
        bookcarsTypes.DressMaterial.Silk,
        bookcarsTypes.DressMaterial.Cotton,
        bookcarsTypes.DressMaterial.Lace,
        bookcarsTypes.DressMaterial.Satin,
        bookcarsTypes.DressMaterial.Chiffon,
      ],
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
    range: {
      type: String,
      enum: [
        bookcarsTypes.DressRange.Mini,
        bookcarsTypes.DressRange.Midi,
        bookcarsTypes.DressRange.Maxi,
        bookcarsTypes.DressRange.Bridal,
        bookcarsTypes.DressRange.Evening,
        bookcarsTypes.DressRange.Cocktail,
        bookcarsTypes.DressRange.Casual,
      ],
      required: [true, "can't be blank"],
    },
    accessories: [{
      type: String,
      enum: [
        bookcarsTypes.DressAccessories.Veil,
        bookcarsTypes.DressAccessories.Jewelry,
        bookcarsTypes.DressAccessories.Shoes,
        bookcarsTypes.DressAccessories.Headpiece,
      ],
    }],
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    rentals: {
      type: Number,
      default: 0,
    },
    designerName: {
      type: String,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Dress',
  },
)

// Add custom indexes
dressSchema.index({ updatedAt: -1, _id: 1 })
dressSchema.index({ name: 'text' })
dressSchema.index({ supplier: 1, type: 1, available: 1, rating: -1, updatedAt: -1, _id: 1 })
dressSchema.index({ available: 1, size: 1, deposit: 1 })
dressSchema.index({ color: 1, length: 1 })
dressSchema.index({ material: 1 })
dressSchema.index({ locations: 1, available: 1, fullyBooked: 1 })
dressSchema.index({ comingSoon: 1 })
dressSchema.index({ range: 1 })
dressSchema.index({ accessories: 1 })
dressSchema.index({ dailyPrice: 1, _id: 1 })
dressSchema.index({ dateBasedPrices: 1 })

const Dress = model<env.Dress>('Dress', dressSchema)

// Create indexes manually and handle potential errors
Dress.syncIndexes().catch((err) => {
  logger.error('Error creating Dress indexes:', err)
})

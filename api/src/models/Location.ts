import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'
import * as logger from '../common/logger'

const locationSchema = new Schema<env.Location>(
  {
    country: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Country',
      index: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    values: {
      type: [Schema.Types.ObjectId],
      ref: 'LocationValue',
      required: [true, "can't be blank"],
      validate: (value: any): boolean => Array.isArray(value),
    },
    image: {
      type: String,
    },
    parkingSpots: {
      type: [Schema.Types.ObjectId],
      ref: 'ParkingSpot',
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Location',
  },
)

// Add custom indexes
locationSchema.index({ values: 1 })

const Location = model<env.Location>('Location', locationSchema)

// Create indexes manually and handle potential errors
Location.syncIndexes().catch((err) => {
  logger.error('Error creating Location indexes:', err)
})

export default Location

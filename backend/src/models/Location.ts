import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

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
    parentLocation: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
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

export default Location

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
      validate: (value: any): boolean => Array.isArray(value) && value.length > 1,
    },
    image: {
      type: String,
    },
    parkingSpots: {
      type: [Schema.Types.ObjectId],
      ref: 'ParkingSpot',
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Location',
  },
)

const Location = model<env.Location>('Location', locationSchema)

export default Location

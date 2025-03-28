import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const dateBasedPriceSchema = new Schema<env.DateBasedPrice>(
  {
    startDate: {
      type: Date,
      required: [true, "can't be blank"],
    },
    endDate: {
      type: Date,
      required: [true, "can't be blank"],
    },
    dailyPrice: {
      type: Number,
      required: [true, "can't be blank"],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'DateBasedPrice',
  },
)

const DateBasedPrice = model<env.DateBasedPrice>('DateBasedPrice', dateBasedPriceSchema)

export default DateBasedPrice

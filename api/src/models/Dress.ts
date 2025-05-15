import mongoose from 'mongoose'
import * as env from '../config/env.config'

const { Schema } = mongoose

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
    price: {
      type: Number,
      required: [true, "can't be blank"],
    },
    deposit: {
      type: Number,
      required: [true, "can't be blank"],
    },
    available: {
      type: Boolean,
      required: [true, "can't be blank"],
      index: true,
    },
    type: {
      type: String,
      enum: ['Wedding', 'Evening', 'Cocktail', 'Prom', 'Other'],
      required: [true, "can't be blank"],
    },
    size: {
      type: String,
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom'],
      required: [true, "can't be blank"],
    },
    style: {
      type: String,
      enum: ['Traditional', 'Modern', 'Vintage', 'Designer'],
      required: [true, "can't be blank"],
    },
    color: {
      type: String,
      required: [true, "can't be blank"],
    },
    image: {
      type: String,
    },
    images: {
      type: [String],
    }
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Dress',
  }
)

const Dress = mongoose.model<env.Dress>('Dress', dressSchema)

export default Dress

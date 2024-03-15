import { Schema, model } from 'mongoose'
import * as bookcarsTypes from 'bookcars-types'
import * as env from '../config/env.config'

const bookingSchema = new Schema<env.Booking>(
  {
    company: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
    },
    car: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Car',
    },
    driver: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
    },
    pickupLocation: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Location',
    },
    dropOffLocation: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Location',
    },
    from: {
      type: Date,
      required: [true, "can't be blank"],
    },
    to: {
      type: Date,
      required: [true, "can't be blank"],
    },
    status: {
      type: String,
      enum: [
        bookcarsTypes.BookingStatus.Void,
        bookcarsTypes.BookingStatus.Pending,
        bookcarsTypes.BookingStatus.Deposit,
        bookcarsTypes.BookingStatus.Paid,
        bookcarsTypes.BookingStatus.Reserved,
        bookcarsTypes.BookingStatus.Cancelled,
      ],
      required: [true, "can't be blank"],
    },
    cancellation: {
      type: Boolean,
      default: false,
    },
    amendments: {
      type: Boolean,
      default: false,
    },
    theftProtection: {
      type: Boolean,
      default: false,
    },
    collisionDamageWaiver: {
      type: Boolean,
      default: false,
    },
    fullInsurance: {
      type: Boolean,
      default: false,
    },
    additionalDriver: {
      type: Boolean,
      default: false,
    },
    _additionalDriver: {
      type: Schema.Types.ObjectId,
      ref: 'AdditionalDriver',
    },
    price: {
      type: Number,
      required: [true, "can't be blank"],
    },
    cancelRequest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Booking',
  },
)

const Booking = model<env.Booking>('Booking', bookingSchema)

export default Booking

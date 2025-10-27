import { Schema, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'

export const BOOKING_EXPIRE_AT_INDEX_NAME = 'expireAt'

const bookingSchema = new Schema<env.Booking>(
  {
    supplier: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
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
      index: true,
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
        bookcarsTypes.BookingStatus.PaidInFull,
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
    sessionId: {
      type: String,
      index: true,
    },
    paymentIntentId: {
      type: String,
    },
    customerId: {
      type: String,
    },
    isDeposit: {
      type: Boolean,
      default: false,
    },
    isPayedInFull: {
      type: Boolean,
      default: false,
    },
    paypalOrderId: {
      type: String,
    },
    expireAt: {
      //
      // Bookings created from checkout with Stripe are temporary and
      // are automatically deleted if the payment checkout session expires.
      //
      type: Date,
      index: { name: BOOKING_EXPIRE_AT_INDEX_NAME, expireAfterSeconds: env.BOOKING_EXPIRE_AT, background: true },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Booking',
  },
)

// Common filter for every query
bookingSchema.index({ 'supplier._id': 1, status: 1, expireAt: 1 })

// Optional filters (can combine with the above depending on frequency)
bookingSchema.index({ 'driver._id': 1 })
bookingSchema.index({ 'car._id': 1 })
bookingSchema.index({ from: 1, to: 1 }) // For date range filtering
bookingSchema.index({ 'pickupLocation._id': 1 })
bookingSchema.index({ 'dropOffLocation._id': 1 })

// If keyword is used often with regex, and performance is an issue:
bookingSchema.index({ 'supplier.fullName': 1 }) // Consider text index if full-text search is needed
bookingSchema.index({ 'driver.fullName': 1 })
bookingSchema.index({ 'car.name': 1 })

const Booking = model<env.Booking>('Booking', bookingSchema)

export default Booking

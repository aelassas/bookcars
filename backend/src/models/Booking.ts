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
    lifecycleStatus: { type: String, enum: ['PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PENDING_PAYMENT', index: true },
    seedKey: { type: String, unique: true, sparse: true },
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
    paymentReference: { type: String, trim: true, maxlength: 100 },
    paymentProof: { type: String, trim: true },
    paymentVerificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
    },
    paymentIntentId: {
      type: String,
      unique: true,
      sparse: true,
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
    paymentMethod: { type: String, enum: [...Object.values(bookcarsTypes.RentalPaymentMethod), 'payLater', 'stripe', 'payPal', 'jazzCash', 'easypaisa'] },
    rentalMode: {
      type: String,
      enum: Object.values(bookcarsTypes.RentalMode),
      required: true,
      default: bookcarsTypes.RentalMode.WithDriver,
      index: true,
    },
    tripScope: {
      type: String,
      enum: Object.values(bookcarsTypes.TripScope),
      default: bookcarsTypes.TripScope.IntraCity,
      index: true,
    },
    destinationRegion: { type: String, trim: true },
    priceBreakdown: {
      baseRentPkr: { type: Number, min: 0, default: 0 },
      driverAllowancePkr: { type: Number, min: 0, default: 0 },
      outOfCitySurchargePkr: { type: Number, min: 0, default: 0 },
      securityDepositPkr: { type: Number, min: 0, default: 0 },
      totalPayablePkr: { type: Number, min: 0, default: 0 },
    },
    paymentStatus: {
      type: String,
      enum: Object.values(bookcarsTypes.RentalPaymentStatus),
      default: bookcarsTypes.RentalPaymentStatus.PendingPayment,
      index: true,
    },
    paymentState: { type: String, enum: ['PENDING_PAYMENT', 'PROCESSING', 'CONFIRMED', 'FAILED'], default: 'PENDING_PAYMENT', index: true },
    transactionRef: { type: String, trim: true, unique: true, sparse: true },
    handoverChecklist: {
      completedAt: Date,
      odometerStart: { type: Number, min: 0 },
      fuelLevel: { type: String, trim: true },
      spareTirePresent: Boolean,
      exteriorNotes: { type: String, trim: true },
      verifiedBySupplier: { type: Boolean, default: false },
    },
    demoPaymentAttempts: [{
      reference: { type: String, required: true },
      idempotencyKey: { type: String, required: true },
      outcome: { type: String, required: true, enum: ['success', 'failed', 'cancelled'] },
      paymentMethod: { type: String, enum: Object.values(bookcarsTypes.RentalPaymentMethod) },
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true },
      createdAt: { type: Date, required: true },
    }],
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

// Common operational queries
bookingSchema.index({ supplier: 1, status: 1, expireAt: 1 })
bookingSchema.index({ customer: 1, status: 1 })
bookingSchema.index({ driver: 1, status: 1 })
bookingSchema.index({ car: 1, from: 1, to: 1 })
bookingSchema.index({ status: 1, paymentState: 1 })

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

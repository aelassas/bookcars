import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

export const OTP_EXPIRE_AT_INDEX_NAME = 'expireAt'

const otpSchema = new Schema<env.OTP>(
  {
    identifier: {
      // Can be email or phone number
      type: String,
      required: [true, "can't be blank"],
      index: true,
      trim: true,
    },
    otp: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
    type: {
      // 'email' or 'sms'
      type: String,
      enum: ['email', 'sms'],
      required: [true, "can't be blank"],
    },
    purpose: {
      // 'signup', 'signin', 'password-reset', 'phone-verification'
      type: String,
      enum: ['signup', 'signin', 'password-reset', 'phone-verification'],
      required: [true, "can't be blank"],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    expireAt: {
      // OTPs expire after 10 minutes
      type: Date,
      default: Date.now,
      index: { name: OTP_EXPIRE_AT_INDEX_NAME, expireAfterSeconds: 600, background: true },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'OTP',
  },
)

// Add indexes for faster lookups
otpSchema.index({ identifier: 1, type: 1, purpose: 1, verified: 1 })
otpSchema.index({ identifier: 1, otp: 1, verified: 1 })

const OTP = model<env.OTP>('OTP', otpSchema)

export default OTP



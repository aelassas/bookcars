import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const settingSchema = new Schema<env.BankDetails>({
  accountHolder: {
    type: String,
    required: true,
  },
  bankName: {
    type: String,
    required: true,
  },
  iban: {
    type: String,
    required: true,
  },
  swiftBic: {
    type: String,
    required: true,
  },
  showBankDetailsPage: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
  strict: true,
  collection: 'BankDetails',
})

const BankDetails = model<env.BankDetails>('BankDetails', settingSchema)

export default BankDetails

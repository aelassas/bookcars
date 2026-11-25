import { addDays, isValidIsoDate } from './bookingIntakeDate'
import { normalizeRelativeDate } from '../utils/tripSchemaValidator'
import * as bookcarsTypes from ':bookcars-types'

export type BookingIntakeRentalType = 'self-drive' | 'chauffeur' | 'airport-transfer' | 'intercity' | 'corporate' | null

export interface BookingIntakeData {
  rentalType: BookingIntakeRentalType
  vehicleCategory: string | null
  chauffeurRequired: boolean
  pickupLocation: string | null
  dropoffLocation: string | null
  startDate: string | null
  endDate: string | null
  passengerCount: number | null
  extras: string[]
  paymentMethod: string | null
  rentalMode?: bookcarsTypes.RentalMode | null
  missingFields: string[]
  ambiguities: string[]
  confidence: number
  requiresApproval: true
}

const locations = [
  'Muzaffarabad', 'Rawalakot', 'Gilgit', 'Skardu', 'Hunza', 'Chitral', 'Mardan', 'Swat', 'Abbottabad', 'Mansehra', 'Murree', 'Naran', 'Kaghan', 'Peshawar',
  'Islamabad', 'Rawalpindi', 'Jhelum', 'Gujrat', 'Sialkot', 'Gujranwala', 'Lahore', 'Kasur', 'Okara', 'Sahiwal', 'Chichawatni', 'Pakpattan', 'Arifwala',
  'Faisalabad', 'Sargodha', 'Dera Ghazi Khan', 'Multan', 'Bahawalpur', 'Rahim Yar Khan', 'Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Quetta', 'Gwadar',
]

const months: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}

const getLocation = (text: string, start = 0): string | null => {
  const remainingText = text.slice(start)
  const matches = locations
    .map((location) => ({
      location,
      index: remainingText.search(new RegExp(`\\b${location}\\b`, 'i')),
    }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index || right.location.length - left.location.length)
  return matches[0]?.location || null
}

const getDate = (text: string): string | null => {
  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (iso && isValidIsoDate(iso[1])) {
    return iso[1]
  }

  const named = text.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i)
  if (!named) {
    return null
  }
  const date = `${named[3]}-${months[named[2].toLowerCase()]}-${named[1].padStart(2, '0')}`
  return isValidIsoDate(date) ? date : null
}

const getDuration = (text: string): number | null => {
  // English ("for 4 days") and Roman Urdu ("4 din ke liye") duration phrases.
  const match = text.match(/\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|ek|do|teen|char|chaar|panch|paanch|chhe|che|saat)\s*(?:days?|din|raat(?:ein)?|nights?)\b/i)
  if (!match) {
    return null
  }
  const values: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    ek: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chhe: 6, che: 6, saat: 7,
  }
  const parsed = Number.isNaN(Number(match[1])) ? values[match[1].toLowerCase()] : Number(match[1])
  return parsed && parsed > 0 ? Math.min(parsed, 30) : null
}

/**
 * Self-drive intent, including the negated-phrasing variants ("without driver",
 * Roman Urdu "bina driver") that must never fall through to the chauffeur rule.
 */
const selfDrivePattern = /\b(?:self[-\s]?drive|without\s+(?:a\s+)?driver|no\s+driver|bina\s+driver|baghair\s+driver|driver\s+ke\s+baghair|khud\s+(?:drive|chalana))\b/i

const isSelfDrive = (text: string): boolean => selfDrivePattern.test(text)

const getRentalType = (text: string): BookingIntakeRentalType => {
  if (/\b(?:airport|terminal)\b/i.test(text)) {
    return 'airport-transfer'
  }
  if (/\b(?:corporate|company|business)\b/i.test(text)) {
    return 'corporate'
  }
  if (/\b(?:intercity|inter-city|to another city)\b/i.test(text)) {
    return 'intercity'
  }
  if (isSelfDrive(text)) {
    return 'self-drive'
  }
  if (/\b(?:with driver|chauffeur|driver)\b/i.test(text)) {
    return 'chauffeur'
  }
  return null
}

const getVehicle = (text: string): string | null => {
  const match = text.match(/\b(corolla|civic|city|alto|cultus|vitz|suzuki|toyota|honda|suv|sedan|van)\b/i)
  return match ? match[1] : null
}

const getPaymentMethod = (text: string): string | null => {
  const match = text.match(/\b(cash|card|bank transfer|easypaisa|jazzcash|pay at counter)\b/i)
  return match ? match[1].toLowerCase() : null
}

/** Today's date (YYYY-MM-DD) in the marketplace timezone. */
const karachiToday = (): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())

export const extractBookingIntake = (originalRequest: string): BookingIntakeData => {
  const text = originalRequest.trim()
  const pickupLocation = getLocation(text)
  const dropoffLocation = pickupLocation ? getLocation(text, text.toLowerCase().indexOf(pickupLocation.toLowerCase()) + pickupLocation.length) : null
  const duration = getDuration(text)
  // A duration-only prompt ("4 din ke liye") starts tomorrow so the planner still returns a usable window.
  const startDate = getDate(text) || normalizeRelativeDate(text) || (duration ? addDays(karachiToday(), 1) : null)
  const endDate = startDate && duration ? addDays(startDate, duration) : null
  const rentalType = getRentalType(text)
  const chauffeurRequired = !isSelfDrive(text) && (rentalType === 'chauffeur' || /\bchauffeur\b|\bwith driver\b/i.test(text))
  const rentalMode = isSelfDrive(text)
    ? bookcarsTypes.RentalMode.SelfDrive
    : chauffeurRequired ? bookcarsTypes.RentalMode.WithDriver : null
  const missingFields: string[] = []
  const ambiguities: string[] = []

  if (!pickupLocation) {
    missingFields.push('pickupLocation')
  }
  if (!dropoffLocation) {
    missingFields.push('dropoffLocation')
  }
  if (!startDate) {
    missingFields.push('startDate')
  }
  if (!endDate) {
    missingFields.push('endDate')
  }
  if (!rentalType) {
    ambiguities.push('rentalType')
  }
  if (/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(text)) {
    ambiguities.push('dateYear')
  }
  if (startDate && endDate && endDate <= startDate) {
    ambiguities.push('dateRange')
  }

  const knownFields = 6 - missingFields.length
  const confidence = Math.max(0, Math.min(1, Number((knownFields / 6 - ambiguities.length * 0.1).toFixed(2))))

  return {
    rentalType,
    vehicleCategory: getVehicle(text),
    chauffeurRequired,
    pickupLocation,
    dropoffLocation,
    startDate,
    endDate,
    passengerCount: (() => {
      const match = text.match(/\b(\d{1,2})\s+(?:passengers?|people|persons?|log|afraad|bande)\b/i)
      const count = match ? Number(match[1]) : null
      return count && count > 0 && count <= 20 ? count : null
    })(),
    extras: [],
    paymentMethod: getPaymentMethod(text),
    rentalMode,
    missingFields,
    ambiguities,
    confidence,
    requiresApproval: true,
  }
}

export const validateBookingIntakeRequest = (value: unknown): string => {
  if (!value || typeof value !== 'object' || typeof (value as { request?: unknown }).request !== 'string') {
    return 'request must be a string'
  }
  const request = (value as { request: string }).request.trim()
  if (!request) {
    return 'request must not be empty'
  }
  if (request.length > 2000) {
    return 'request must be 2000 characters or fewer'
  }
  return ''
}

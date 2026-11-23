import { addDays, isValidIsoDate } from './bookingIntakeDate'

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
  missingFields: string[]
  ambiguities: string[]
  confidence: number
  requiresApproval: true
}

const locations = [
  'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Gujranwala',
  'Karachi', 'Hyderabad', 'Sukkur', 'Peshawar', 'Abbottabad', 'Quetta', 'Gwadar',
  'Murree',
]

const months: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
}

const getLocation = (text: string, start = 0): string | null => {
  const slice = text.slice(start)
  let earliest: { location: string, index: number } | null = null
  for (const location of locations) {
    const match = slice.match(new RegExp(`\\b${location}\\b`, 'i'))
    if (match?.index !== undefined
      && (!earliest || match.index < earliest.index)) {
      earliest = { location, index: match.index }
    }
  }
  return earliest?.location || null
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
  const match = text.match(/\b(?:for|over)\s+(\d+|one|two|three|four|five|six|seven)\s+days?\b/i)
  if (!match) {
    return null
  }
  const values: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 }
  return Number.isNaN(Number(match[1])) ? values[match[1].toLowerCase()] : Number(match[1])
}

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
  if (/\b(?:with driver|chauffeur|driver)\b/i.test(text)) {
    return 'chauffeur'
  }
  if (/\b(?:self[- ]?drive|without driver)\b/i.test(text)) {
    return 'self-drive'
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

export const extractBookingIntake = (originalRequest: string): BookingIntakeData => {
  const text = originalRequest.trim()
  const pickupLocation = getLocation(text)
  const dropoffLocation = pickupLocation ? getLocation(text, text.toLowerCase().indexOf(pickupLocation.toLowerCase()) + pickupLocation.length) : null
  const startDate = getDate(text)
  const duration = getDuration(text)
  const endDate = startDate && duration ? addDays(startDate, duration) : null
  const rentalType = getRentalType(text)
  const chauffeurRequired = rentalType === 'chauffeur' || /\bchauffeur\b|\bwith driver\b/i.test(text)
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
    passengerCount: text.match(/\b(\d+)\s+(?:passengers?|people|persons?)\b/i)?.[1] ? Number(text.match(/\b(\d+)\s+(?:passengers?|people|persons?)\b/i)?.[1]) : null,
    extras: [],
    paymentMethod: getPaymentMethod(text),
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

import type * as bookcarsTypes from ':bookcars-types'

export interface TripCandidate {
  rentalType: string | null
  vehicleCategory: string | null
  chauffeurRequired: boolean
  pickupLocation: string | null
  dropoffLocation: string | null
  startDate: string | null
  endDate: string | null
  passengerCount: number | null
  extras: string[]
  paymentMethod: string | null
  rentalMode: bookcarsTypes.RentalMode | null
}

const allowedKeys = new Set([
  'rentalType', 'vehicleCategory', 'chauffeurRequired', 'pickupLocation', 'dropoffLocation',
  'startDate', 'endDate', 'passengerCount', 'extras', 'paymentMethod', 'rentalMode',
])

export const isTripCandidate = (value: unknown): value is TripCandidate => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
return false
}
  const item = value as Record<string, unknown>
  if (Object.keys(item).some((key) => !allowedKeys.has(key))) {
return false
}
  const nullableString = (entry: unknown) => entry === null || typeof entry === 'string'
  const rentalTypes = ['self-drive', 'chauffeur', 'airport-transfer', 'intercity', 'corporate']
  const isoDate = (entry: unknown) => {
    if (entry === null) {
return true
}
    if (typeof entry !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry)) {
return false
}
    const date = new Date(`${entry}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === entry
  }
  const methods = ['cash', 'card', 'bank transfer', 'easypaisa', 'jazzcash', 'raast', 'pay at counter']
  return nullableString(item.rentalType)
    && (item.rentalType === null || rentalTypes.includes(item.rentalType as string))
    && nullableString(item.vehicleCategory)
    && typeof item.chauffeurRequired === 'boolean'
    && nullableString(item.pickupLocation)
    && nullableString(item.dropoffLocation)
    && isoDate(item.startDate)
    && isoDate(item.endDate)
    && (item.passengerCount === null || (Number.isInteger(item.passengerCount) && Number(item.passengerCount) > 0))
    && Array.isArray(item.extras) && item.extras.length <= 20 && item.extras.every((entry) => typeof entry === 'string')
    && nullableString(item.paymentMethod)
    && (item.paymentMethod === null || methods.includes((item.paymentMethod as string).toLowerCase()))
    && (item.rentalMode === null || item.rentalMode === 'SELF_DRIVE' || item.rentalMode === 'WITH_DRIVER')
}

export function assertTripCandidate(value: unknown): asserts value is TripCandidate {
  if (!isTripCandidate(value)) {
throw new Error('Invalid trip assistant response schema')
}
}

export const sanitizeTripText = (value: unknown, maxLength = 120): string | null => {
  if (typeof value !== 'string') {
return null
}
  const clean = Array.from(value, (char) => {
    const code = char.charCodeAt(0)
    return code >= 32 && code !== 127 && char !== '<' && char !== '>' ? char : ' '
  }).join('').replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, maxLength) : null
}

const karachiDate = (now: Date): Date => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const read = (key: string) => parts.find((part) => part.type === key)?.value || '01'
  return new Date(`${read('year')}-${read('month')}-${read('day')}T12:00:00+05:00`)
}

export const normalizeRelativeDate = (text: string, now = new Date()): string | null => {
  const base = karachiDate(now)
  const lower = text.toLowerCase()
  let add = 0
  if (/\btoday\b/.test(lower)) {
add = 0
} else if (/\bday after tomorrow\b/.test(lower)) {
add = 2
} else if (/\btomorrow\b/.test(lower)) {
add = 1
} else {
    const inDays = lower.match(/\bin\s+(\d{1,2})\s+days?\b/)
    const nextWeek = /\bnext week\b/.test(lower)
    if (inDays) {
add = Math.min(90, Number(inDays[1]))
} else if (nextWeek) {
add = 7
} else {
      const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const weekday = lower.match(/\b(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/)
      if (weekday) {
        const target = weekdayNames.indexOf(weekday[1])
        add = (target - base.getUTCDay() + 7) % 7
        if (add === 0 || weekday[0].startsWith('next')) {
add += 7
}
      }
    }
  }
  if (!/\btoday\b/.test(lower) && !add) {
return null
}
  base.setDate(base.getDate() + add)
  return base.toISOString().slice(0, 10)
}

const normalizeCity = (text: string) => text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

const levenshtein = (left: string, right: string): number => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]
    row[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[right.length]
}

export const NORTHERN_DESTINATIONS = [
  'gilgit', 'skardu', 'hunza', 'chitral', 'swat', 'naran', 'kaghan',
  'murree', 'muzaffarabad', 'rawalakot', 'kalam', 'neelum', 'neelam',
  'astore', 'astor', 'shigar', 'khaplu', 'passu', 'babusar', 'fairy meadows',
] as const

export const NORTHERN_ROUTE_ADVISORY = 'Northern route detected. Confirm vehicle terrain capability, seasonal road conditions, permits, and supplier approval before booking.'

export const isNorthernRoute = (...sources: Array<string | null | undefined>): boolean => {
  const combined = sources.filter(Boolean).join(' ').toLowerCase()
  if (!combined) {
return false
}
  return NORTHERN_DESTINATIONS.some((place) => combined.includes(place))
}

export const fuzzyMatchCity = (value: string | null, candidates: string[]): string | null => {
  if (!value) {
return null
}
  const needle = normalizeCity(value)
  if (!needle) {
return null
}
  let best: { name: string, distance: number } | undefined
  for (const name of candidates) {
    const candidate = normalizeCity(name)
    if (!candidate) {
continue
}
    const distance = candidate.includes(needle) || needle.includes(candidate)
      ? 0
      : levenshtein(needle, candidate)
    const threshold = Math.max(1, Math.floor(Math.max(needle.length, candidate.length) * 0.22))
    if (distance <= threshold && (!best || distance < best.distance)) {
best = { name, distance }
}
  }
  return best?.name || null
}

import axios from 'axios'
import * as bookcarsTypes from ':bookcars-types'
import type { BookingIntakeData, BookingIntakeRentalType } from './bookingIntake'
import { isValidIsoDate } from './bookingIntakeDate'
import { extractBookingIntake } from './bookingIntake'
import { assertTripCandidate, sanitizeTripText } from '../utils/tripSchemaValidator'

export interface BookingIntakeProvider {
  name: string
  extract: (request: string) => Promise<BookingIntakeData>
}

export type BookingIntakeFailureCode = 'missing_api_key' | 'rate_limited' | 'invalid_api_key' | 'provider_unavailable' | 'local_ai_unavailable' | 'invalid_provider_response'

class BookingIntakeProviderError extends Error {
  public code: BookingIntakeFailureCode

  constructor(code: BookingIntakeFailureCode, message: string) {
    super(message)
    this.code = code
  }
}

interface OpenAIResponse {
  output?: Array<{
    type?: string
    content?: Array<{ type?: string, text?: string }>
  }>
}

interface OllamaResponse {
  message?: { content?: string }
}

const rentalTypes: BookingIntakeRentalType[] = ['self-drive', 'chauffeur', 'airport-transfer', 'intercity', 'corporate', null]

const bookingIntakeSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    rentalType: { type: ['string', 'null'], enum: ['self-drive', 'chauffeur', 'airport-transfer', 'intercity', 'corporate', null] },
    vehicleCategory: { type: ['string', 'null'] },
    chauffeurRequired: { type: 'boolean' },
    pickupLocation: { type: ['string', 'null'] },
    dropoffLocation: { type: ['string', 'null'] },
    startDate: { type: ['string', 'null'] },
    endDate: { type: ['string', 'null'] },
    passengerCount: { type: ['integer', 'null'] },
    extras: { type: 'array', items: { type: 'string' } },
    paymentMethod: { type: ['string', 'null'] },
    rentalMode: { type: ['string', 'null'], enum: ['SELF_DRIVE', 'WITH_DRIVER', null] },
  },
  required: [
    'rentalType', 'vehicleCategory', 'chauffeurRequired', 'pickupLocation', 'dropoffLocation',
    'startDate', 'endDate', 'passengerCount', 'extras', 'paymentMethod', 'rentalMode',
  ],
}

const normalizeText = (value: unknown): string | null => sanitizeTripText(value, 160)

const validateExtraction = (value: unknown): BookingIntakeData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('The AI returned an invalid booking request.')
  }

  const raw = value as Record<string, unknown>
  const rentalTypesList = ['self-drive', 'chauffeur', 'airport-transfer', 'intercity', 'corporate']
  const methodsList = ['cash', 'card', 'bank transfer', 'easypaisa', 'jazzcash', 'raast', 'pay at counter']
  const parseIsoDate = (entry: unknown): string | null => {
    if (typeof entry !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry)) {
return null
}
    return isValidIsoDate(entry) ? entry : null
  }

  const rawRentalType = typeof raw.rentalType === 'string' ? raw.rentalType.toLowerCase() : null
  const rentalType = rawRentalType && rentalTypesList.includes(rawRentalType) ? rawRentalType as BookingIntakeRentalType : null
  const rawPayment = typeof raw.paymentMethod === 'string' ? raw.paymentMethod.toLowerCase().trim() : null
  const paymentMethod = rawPayment && methodsList.includes(rawPayment) ? rawPayment : null
  const rentalMode = raw.rentalMode === 'SELF_DRIVE'
    ? bookcarsTypes.RentalMode.SelfDrive
    : raw.rentalMode === 'WITH_DRIVER'
      ? bookcarsTypes.RentalMode.WithDriver
      : null

  const candidate = {
    rentalType,
    vehicleCategory: normalizeText(raw.vehicleCategory),
    chauffeurRequired: raw.chauffeurRequired === true || rentalType === 'chauffeur',
    pickupLocation: normalizeText(raw.pickupLocation),
    dropoffLocation: normalizeText(raw.dropoffLocation),
    startDate: parseIsoDate(raw.startDate),
    endDate: parseIsoDate(raw.endDate),
    passengerCount: Number.isInteger(raw.passengerCount) && Number(raw.passengerCount) > 0 ? Number(raw.passengerCount) : null,
    extras: Array.isArray(raw.extras)
      ? raw.extras.filter((extra): extra is string => typeof extra === 'string').map((extra) => extra.slice(0, 100)).slice(0, 20)
      : [],
    paymentMethod,
    rentalMode,
  }

  assertTripCandidate(candidate)

  const pickupLocation = candidate.pickupLocation
  const dropoffLocation = candidate.dropoffLocation
  const startDate = candidate.startDate
  const endDate = candidate.endDate
  const dateRangeValid = !!startDate && !!endDate && endDate > startDate
  const passengerCount = candidate.passengerCount
  const extras = candidate.extras
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
  if (startDate && endDate && !dateRangeValid) {
    missingFields.push('endDate')
    ambiguities.push('dateRange')
  }
  if (!rentalType) {
ambiguities.push('rentalType')
}

  const extractedCount = [pickupLocation, dropoffLocation, startDate, endDate, rentalType].filter(Boolean).length
  const confidence = Math.max(0, Math.min(1, Number((extractedCount / 5 - ambiguities.length * 0.1).toFixed(2))))

  return {
    rentalType,
    vehicleCategory: candidate.vehicleCategory,
    chauffeurRequired: candidate.chauffeurRequired,
    pickupLocation,
    dropoffLocation,
    startDate,
    endDate,
    passengerCount,
    extras,
    paymentMethod,
    rentalMode,
    missingFields,
    ambiguities,
    confidence,
    requiresApproval: true,
  }
}

const openAIProvider: BookingIntakeProvider = {
  name: 'openai',
  extract: async (request) => {
    const apiKey = process.env.BC_OPENAI_API_KEY?.trim()
    if (!apiKey) {
      throw new BookingIntakeProviderError('missing_api_key', 'OpenAI API key is not configured.')
    }

    const model = process.env.BC_OPENAI_MODEL?.trim() || 'gpt-4o-mini'
    let data: OpenAIResponse
    try {
      const response = await axios.post<OpenAIResponse>(
        'https://api.openai.com/v1/responses',
        {
          model,
          store: false,
          instructions: [
            'Extract only details stated or clearly implied by this rental request. Never invent customer facts, dates, cities, availability, prices, or policies.',
            'This is a Pakistan-wide rental service. Recognize pickup and drop-off cities anywhere in Pakistan, including Sahiwal, Lahore, Islamabad, Karachi, Peshawar, Quetta, Multan, Faisalabad, northern destinations, and other cities. Preserve city names as written; never assume a city has available vehicles.',
            'Return trip dates as YYYY-MM-DD. If a year or a date is unclear, leave it null.',
            'If a trip duration and start date are both clear, calculate the return date by adding the stated number of rental days.',
            'If pickup, drop-off, dates, or rental type are unclear, return null for that field. Do not guess.',
            'Set rentalMode to SELF_DRIVE only when explicitly requested without a driver; set WITH_DRIVER only when a driver is requested; otherwise null.',
            'The output is a draft for an operator to review. Do not claim a booking has been made or payment collected.',
          ].join(' '),
          input: request,
          text: {
            format: {
              type: 'json_schema',
              name: 'booking_intake',
              strict: true,
              schema: bookingIntakeSchema,
            },
          },
          max_output_tokens: 500,
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 30_000,
        },
      )
      data = response.data
    } catch (error) {
      // Never log the Axios error object: it contains request headers, including the API key.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      const code = axios.isAxiosError(error) ? error.code : undefined
      console.warn('[ai.bookingIntake] OpenAI provider unavailable', { status: status || 'network-error', code: code || 'unknown' })
      const failureCode: BookingIntakeFailureCode = status === 429
        ? 'rate_limited'
        : status === 401 || status === 403
          ? 'invalid_api_key'
          : 'provider_unavailable'
      throw new BookingIntakeProviderError(failureCode, 'OpenAI booking extraction is temporarily unavailable.')
    }

    const output = data.output
      ?.flatMap((item) => item.content || [])
      .filter((part) => part.type === 'output_text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')

    if (!output) {
      throw new BookingIntakeProviderError('invalid_provider_response', 'The AI returned no booking details.')
    }

    const modelData = JSON.parse(output) as Record<string, unknown>
    const explicitDetails = extractBookingIntake(request)
    // Preserve exact entities the customer wrote when the deterministic parser can identify them.
    // The model still handles phrasing and extras, while simple known facts are protected from typos.
    return validateExtraction({
      ...modelData,
      rentalType: explicitDetails.rentalType ?? modelData.rentalType,
      vehicleCategory: explicitDetails.vehicleCategory ?? modelData.vehicleCategory,
      chauffeurRequired: explicitDetails.chauffeurRequired || modelData.chauffeurRequired,
      pickupLocation: explicitDetails.pickupLocation ?? modelData.pickupLocation,
      dropoffLocation: explicitDetails.dropoffLocation ?? modelData.dropoffLocation,
      startDate: explicitDetails.startDate ?? modelData.startDate,
      endDate: explicitDetails.endDate ?? modelData.endDate,
      passengerCount: explicitDetails.passengerCount ?? modelData.passengerCount,
      paymentMethod: explicitDetails.paymentMethod ?? modelData.paymentMethod,
      rentalMode: explicitDetails.rentalMode ?? modelData.rentalMode,
    })
  },
}

const ollamaProvider: BookingIntakeProvider = {
  name: 'ollama-local',
  extract: async (request) => {
    const baseUrl = (process.env.BC_OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434').replace(/\/$/, '')
    const model = process.env.BC_OLLAMA_MODEL?.trim() || 'qwen3:0.6b'
    let data: OllamaResponse
    try {
      const response = await axios.post<OllamaResponse>(
        `${baseUrl}/api/chat`,
        {
          model,
          stream: false,
          think: false,
          keep_alive: '30m',
          format: bookingIntakeSchema,
          options: { temperature: 0, num_ctx: 2048, num_predict: 256 },
          messages: [
            {
              role: 'system',
              content: [
                'Extract only details stated or clearly implied by this rental request. Never invent customer facts, dates, cities, availability, prices, or policies.',
                'This is a Pakistan-wide rental service. Recognize pickup and drop-off cities anywhere in Pakistan. Preserve city names as written; never assume availability.',
                'Return dates as YYYY-MM-DD. If a year or date is unclear, use null. If trip duration and start date are clear, calculate the return date by adding the stated rental days.',
                'If pickup, drop-off, dates, or rental type are unclear, use null. Do not guess. This is a draft for human review; never claim a booking or payment was completed.',
              'Set rentalMode to SELF_DRIVE only when explicitly requested without a driver; set WITH_DRIVER only when a driver is requested; otherwise null.',
                'Return an object matching the provided JSON schema.',
              ].join(' '),
            },
            { role: 'user', content: request },
          ],
        },
        { timeout: Number.parseInt(process.env.BC_OLLAMA_TIMEOUT_MS || '120000', 10) },
      )
      data = response.data
    } catch {
      // Ollama is local; never leak connection details into API responses or logs.
      throw new BookingIntakeProviderError('local_ai_unavailable', 'The local AI model is unavailable.')
    }

    const output = data.message?.content
    if (!output) {
      throw new BookingIntakeProviderError('invalid_provider_response', 'The local AI returned no booking details.')
    }
    const modelData = JSON.parse(output) as Record<string, unknown>
    const explicitDetails = extractBookingIntake(request)
    return validateExtraction({
      ...modelData,
      rentalType: explicitDetails.rentalType ?? modelData.rentalType,
      vehicleCategory: explicitDetails.vehicleCategory ?? modelData.vehicleCategory,
      chauffeurRequired: explicitDetails.chauffeurRequired || modelData.chauffeurRequired,
      pickupLocation: explicitDetails.pickupLocation ?? modelData.pickupLocation,
      dropoffLocation: explicitDetails.dropoffLocation ?? modelData.dropoffLocation,
      startDate: explicitDetails.startDate ?? modelData.startDate,
      endDate: explicitDetails.endDate ?? modelData.endDate,
      passengerCount: explicitDetails.passengerCount ?? modelData.passengerCount,
      paymentMethod: explicitDetails.paymentMethod ?? modelData.paymentMethod,
      rentalMode: explicitDetails.rentalMode ?? modelData.rentalMode,
    })
  },
}

const testProvider: BookingIntakeProvider = {
  name: 'mock',
  extract: async (request) => extractBookingIntake(request),
}

export interface BookingIntakeExtractionResult {
  provider: string
  extractedData: BookingIntakeData
  degraded: boolean
  failureCode?: BookingIntakeFailureCode
}

export const extractBookingIntakeWithFallback = async (
  provider: BookingIntakeProvider,
  request: string,
): Promise<BookingIntakeExtractionResult> => {
  try {
    return {
      provider: provider.name,
      extractedData: await provider.extract(request),
      degraded: false,
    }
  } catch (error) {
    // This is an explicit, non-AI rules draft; no facts or inventory are invented.
    return {
      provider: 'rules-fallback',
      extractedData: extractBookingIntake(request),
      degraded: true,
      failureCode: error instanceof BookingIntakeProviderError ? error.code : 'invalid_provider_response',
    }
  }
}

export const getBookingIntakeProvider = (): BookingIntakeProvider => {
  const configuredProvider = process.env.BC_AI_PROVIDER?.trim().toLowerCase()
  const provider = configuredProvider || (process.env.NODE_ENV === 'test' ? 'mock' : 'ollama')
  if (provider === 'openai') {
    return openAIProvider
  }
  if (provider === 'ollama') {
    return ollamaProvider
  }
  if (provider === 'mock') {
    return testProvider
  }
  throw new Error(`Unsupported AI provider: ${provider}`)
}

export const warmBookingIntakeProvider = async (): Promise<void> => {
  const configuredProvider = process.env.BC_AI_PROVIDER?.trim().toLowerCase() || 'ollama'
  if (configuredProvider !== 'ollama' || process.env.BC_AI_WARMUP_ON_START !== 'true') {
    return
  }

  try {
    await ollamaProvider.extract('Warm-up only. Return a valid booking intake object with all unknown fields set to null.')
    console.info('[ai.bookingIntake] Local model is ready.')
  } catch {
    console.warn('[ai.bookingIntake] Local model warm-up failed; requests will use the rules-based fallback until Ollama is ready.')
  }
}

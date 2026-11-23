import { extractBookingIntake, BookingIntakeData } from './bookingIntake'

export interface BookingIntakeProvider {
  name: string
  extract: (request: string) => Promise<BookingIntakeData>
}

const mockProvider: BookingIntakeProvider = {
  name: 'mock',
  extract: async (request) => extractBookingIntake(request),
}

const ollamaProvider: BookingIntakeProvider = {
  name: 'ollama',
  extract: async (request) => {
    const baseUrl = (process.env.BC_OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '')
    const model = process.env.BC_OLLAMA_MODEL || 'llama3.1'
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        prompt: `Extract a Pakistan car-rental booking from the request and return strict JSON only. Request: ${request}`,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`)
    }
    const result = await response.json() as { response?: string }
    let parsed: Partial<BookingIntakeData>
    try {
      parsed = JSON.parse(result.response || '{}') as Partial<BookingIntakeData>
    } catch {
      throw new Error('Ollama returned invalid JSON')
    }
    const fallback = extractBookingIntake(request)
    const validRentalTypes = ['self-drive', 'chauffeur', 'airport-transfer', 'intercity', 'corporate', null]
    if (parsed.rentalType !== undefined && !validRentalTypes.includes(parsed.rentalType)) {
      throw new Error('Ollama returned an invalid rental type')
    }
    if (parsed.confidence !== undefined && (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1)) {
      throw new Error('Ollama returned invalid confidence')
    }
    const resolvedLocation = (value: unknown): string | null => {
      if (typeof value !== 'string') return null
      return ['Lahore','Islamabad','Rawalpindi','Faisalabad','Multan','Gujranwala','Karachi','Hyderabad','Sukkur','Peshawar','Abbottabad','Quetta','Gwadar','Murree']
        .find((location) => location.toLowerCase() === value.trim().toLowerCase()) || null
    }
    return {
      ...fallback,
      ...parsed,
      pickupLocation: resolvedLocation(parsed.pickupLocation),
      dropoffLocation: resolvedLocation(parsed.dropoffLocation),
      requiresApproval: true,
    }
  },
}

export const getBookingIntakeProvider = (): BookingIntakeProvider => {
  const provider = (process.env.BC_AI_PROVIDER || 'mock').trim().toLowerCase()
  if (provider === 'mock') {
    return mockProvider
  }
  if (provider === 'ollama') {
    return ollamaProvider
  }
  throw new Error(`Unsupported AI provider: ${provider}`)
}

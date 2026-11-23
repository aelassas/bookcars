import { describe, expect, test } from '@jest/globals'
import { extractBookingIntake, validateBookingIntakeRequest } from '../src/ai/bookingIntake'
import { formatKarachiDate, parseLocalDate } from '../src/utils/timezone'
import Kyc from '../src/models/Kyc'
import Handover from '../src/models/Handover'

describe('Pakistan feature utilities', () => {
  test('extracts Murree pickup and Islamabad drop-off', () => {
    const result = extractBookingIntake(
      'Self-drive from Murree to Islamabad on 2026-12-15 for three days',
    )
    expect(result.pickupLocation).toBe('Murree')
    expect(result.dropoffLocation).toBe('Islamabad')
  })

  test('validates booking intake request shape', () => {
    expect(validateBookingIntakeRequest({ request: 'Trip Lahore to Islamabad' })).toBe('')
    expect(validateBookingIntakeRequest({ request: '' })).not.toBe('')
  })

  test('uses Karachi timezone date-only parsing', () => {
    const date = parseLocalDate('2026-12-15')
    expect(formatKarachiDate(date)).toBe('2026-12-15')
  })

  test('defines CNIC review statuses', () => {
    const statusPath = Kyc.schema.path('status') as unknown as { enumValues: string[] }
    expect(statusPath.enumValues).toEqual([
      'pending_review', 'approved', 'rejected', 'suspended',
    ])
  })

  test('defines digital handover statuses', () => {
    const statusPath = Handover.schema.path('status') as unknown as { enumValues: string[] }
    expect(statusPath.enumValues).toEqual([
      'scheduled', 'in_progress', 'completed', 'cancelled',
    ])
  })
})

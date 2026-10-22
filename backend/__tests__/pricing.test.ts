import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

describe('calculateTotalPrice', () => {
  it('chooses the cheapest combination of configured rental-duration rates', () => {
    const car = {
      isDateBasedPrice: false,
      dailyPrice: 100,
      discountedDailyPrice: null,
      hourlyPrice: null,
      discountedHourlyPrice: null,
      biWeeklyPrice: 100,
      discountedBiWeeklyPrice: null,
      weeklyPrice: 1000,
      discountedWeeklyPrice: null,
      monthlyPrice: null,
      discountedMonthlyPrice: null,
    } as unknown as bookcarsTypes.Car

    const total = bookcarsHelper.calculateTotalPrice(
      car,
      new Date('2026-01-01T10:00:00Z'),
      new Date('2026-01-08T10:00:00Z'),
      0,
    )

    // Two synthetic 3-day blocks and one daily block cost less than the weekly rate.
    expect(total).toBe(300)
  })
})

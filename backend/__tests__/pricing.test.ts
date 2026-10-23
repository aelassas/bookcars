import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'

describe('calculateTotalPrice', () => {
  const baseCar: bookcarsTypes.Car = {
    isDateBasedPrice: false,
    dailyPrice: 100,
    discountedDailyPrice: null,
    hourlyPrice: null,
    discountedHourlyPrice: null,
    biWeeklyPrice: null,
    discountedBiWeeklyPrice: null,
    weeklyPrice: null,
    discountedWeeklyPrice: null,
    monthlyPrice: null,
    discountedMonthlyPrice: null,
    dateBasedPrices: [],
    cancellation: 0,
    amendments: 0,
    theftProtection: 0,
    collisionDamageWaiver: 0,
    fullInsurance: 0,
    additionalDriver: 0,
  } as unknown as bookcarsTypes.Car

  describe('Standard Tiered Pricing (DP Combinations)', () => {
    it('chooses the cheapest combination when multiple shorter packages are cheaper than a long package', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
        biWeeklyPrice: 100, // 3-day rate
        weeklyPrice: 1000, // 7-day rate (intentionally expensive)
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-08T10:00:00Z'), // 7 days
        0,
      )

      // 2 x 3-day bi-weekly blocks ($200) + 1 x daily block ($100) = $300 (cheaper than $1000)
      expect(total).toBe(300)
    })

    it('uses discounted prices over standard prices when available', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
        discountedDailyPrice: 80,
        biWeeklyPrice: 250,
        discountedBiWeeklyPrice: 200,
        weeklyPrice: 500,
        discountedWeeklyPrice: 400,
        monthlyPrice: 1800,
        discountedMonthlyPrice: 1500,
      } as unknown as bookcarsTypes.Car

      // 1 day
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-02T10:00:00Z'),
          0,
        )
      ).toBe(80)

      // 3 days
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-04T10:00:00Z'),
          0,
        )
      ).toBe(200)

      // 7 days
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-08T10:00:00Z'),
          0,
        )
      ).toBe(400)

      // 30 days
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-31T10:00:00Z'),
          0,
        )
      ).toBe(1500)
    })

    it('correctly calculates long-term rentals (31+ days) without DP memory corruption', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
        monthlyPrice: 2000, // 30 days
      } as unknown as bookcarsTypes.Car

      // 31 days
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-02-01T10:00:00Z'),
          0,
        )
      ).toBe(2100) // 1 x 30-day + 1 x 1-day

      // 62 days
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-03-04T10:00:00Z'),
          0,
        )
      ).toBe(4200) // 2 x 30-day + 2 x 1-day
    })
  })

  describe('Complex Date Periods & Edge Cases', () => {
    it('handles cross-month rentals correctly', () => {
      const car = {
        ...baseCar,
        dailyPrice: 50,
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-28T10:00:00Z'),
        new Date('2026-02-05T10:00:00Z'), // 8 days across Jan/Feb
        0,
      )

      expect(total).toBe(400) // 8 * 50
    })

    it('handles leap year date spans correctly', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
      } as unknown as bookcarsTypes.Car

      // 2028 is a leap year (Feb 28 to Mar 1 = 2 days)
      const totalLeapYear = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2028-02-28T10:00:00Z'),
        new Date('2028-03-01T10:00:00Z'),
        0,
      )

      expect(totalLeapYear).toBe(200)
    })

    it('handles Daylight Saving Time (DST) shift boundaries correctly', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
        hourlyPrice: 10,
      } as unknown as bookcarsTypes.Car

      // Spring forward transition (23 hours real time, 1 calendar day)
      const totalSpring = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-03-28T10:00:00Z'),
        new Date('2026-03-29T10:00:00Z'),
        0,
      )

      expect(totalSpring).toBe(100)
    })

    it('calculates complex multi-day rentals with leftover partial-day hours', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
        hourlyPrice: 15,
        weeklyPrice: 500, // 7 days
      } as unknown as bookcarsTypes.Car

      // 8 days + 5 hours
      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-09T15:00:00Z'),
        0,
      )

      // 1 x weekly ($500) + 1 x daily ($100) + 5 hours x $15 ($75) = $675
      expect(total).toBe(675)
    })
  })

  describe('Hourly and Partial Day Rates', () => {
    it('calculates hourly rates when rental duration is less than 24 hours', () => {
      const car = {
        ...baseCar,
        hourlyPrice: 15,
        dailyPrice: 100,
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T15:00:00Z'), // 5 hours
        0,
      )

      expect(total).toBe(75) // 5 * 15
    })

    it('uses discounted hourly price when available', () => {
      const car = {
        ...baseCar,
        hourlyPrice: 20,
        discountedHourlyPrice: 12,
        dailyPrice: 100,
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T14:00:00Z'), // 4 hours
        0,
      )

      expect(total).toBe(48) // 4 * 12
    })

    it('falls back to full daily rate when rental is less than 24 hours and no hourly price is set', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
        hourlyPrice: null,
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-01T15:00:00Z'), // 5 hours
        0,
      )

      expect(total).toBe(100)
    })
  })

  describe('Date-Based Pricing', () => {
    it('applies custom date-based rates when rental falls within a date range', () => {
      const car = {
        ...baseCar,
        isDateBasedPrice: true,
        dailyPrice: 100,
        dateBasedPrices: [
          {
            startDate: new Date('2026-01-02T00:00:00Z'),
            endDate: new Date('2026-01-03T23:59:59Z'),
            dailyPrice: 200, // Peak price
          },
        ],
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-04T10:00:00Z'), // 3 days
        0,
      )

      // Day 1: $100 (standard), Day 2: $200 (custom), Day 3: $200 (custom) = $500
      expect(total).toBe(500)
    })

    it('uses discounted daily price as default in date-based mode when custom rate does not match', () => {
      const car = {
        ...baseCar,
        isDateBasedPrice: true,
        dailyPrice: 100,
        discountedDailyPrice: 80,
        dateBasedPrices: [],
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-03T10:00:00Z'), // 2 days
        0,
      )

      expect(total).toBe(160) // 2 * 80
    })
  })

  describe('Comprehensive Booking Options & Add-ons', () => {
    const optionsCar = {
      ...baseCar,
      dailyPrice: 100,
      cancellation: 20, // Flat
      amendments: 10, // Flat
      theftProtection: 5, // Per day
      collisionDamageWaiver: 8, // Per day
      fullInsurance: 15, // Per day
      additionalDriver: 7, // Per day
    } as unknown as bookcarsTypes.Car

    it('calculates total correctly when all booking options are enabled', () => {
      const options: bookcarsTypes.CarOptions = {
        cancellation: true,
        amendments: true,
        theftProtection: true,
        collisionDamageWaiver: true,
        fullInsurance: true,
        additionalDriver: true,
      }

      const total = bookcarsHelper.calculateTotalPrice(
        optionsCar,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-04T10:00:00Z'), // 3 days
        0,
        options,
      )

      // Base: 3 * 100 = 300
      // Flat options: 20 + 10 = 30
      // Per-day options (3 days): (5 + 8 + 15 + 7) * 3 = 35 * 3 = 105
      // Total: 300 + 30 + 105 = 435
      expect(total).toBe(435)
    })

    it('calculates total correctly for partial/selected options', () => {
      const options: bookcarsTypes.CarOptions = {
        cancellation: true,
        amendments: false,
        theftProtection: false,
        collisionDamageWaiver: true,
        fullInsurance: false,
        additionalDriver: true,
      }

      const total = bookcarsHelper.calculateTotalPrice(
        optionsCar,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-03T10:00:00Z'), // 2 days
        0,
        options,
      )

      // Base: 2 * 100 = 200
      // Flat options: cancellation (20) = 20
      // Per-day options (2 days): (collisionDamageWaiver 8 + additionalDriver 7) * 2 = 15 * 2 = 30
      // Total: 200 + 20 + 30 = 250
      expect(total).toBe(250)
    })

    it('ignores option fees when option is enabled but car fee is set to 0', () => {
      const carZeroFees = {
        ...baseCar,
        dailyPrice: 100,
        cancellation: 0,
        fullInsurance: 0,
      } as unknown as bookcarsTypes.Car

      const options: bookcarsTypes.CarOptions = {
        cancellation: true,
        fullInsurance: true,
      }

      const total = bookcarsHelper.calculateTotalPrice(
        carZeroFees,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-02T10:00:00Z'),
        0,
        options,
      )

      expect(total).toBe(100)
    })
  })

  describe('Price Change Rate and Rounding', () => {
    it('applies positive and negative price change rates', () => {
      const car = {
        ...baseCar,
        dailyPrice: 100,
      } as unknown as bookcarsTypes.Car

      // +15% rate
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-02T10:00:00Z'),
          15,
        )
      ).toBe(115)

      // -10% rate
      expect(
        bookcarsHelper.calculateTotalPrice(
          car,
          new Date('2026-01-01T10:00:00Z'),
          new Date('2026-01-02T10:00:00Z'),
          -10,
        )
      ).toBe(90)
    })

    it('correctly rounds final result to 2 decimal places', () => {
      const car = {
        ...baseCar,
        dailyPrice: 33.333,
      } as unknown as bookcarsTypes.Car

      const total = bookcarsHelper.calculateTotalPrice(
        car,
        new Date('2026-01-01T10:00:00Z'),
        new Date('2026-01-02T10:00:00Z'),
        7.5,
      )

      // 33.333 + (33.333 * 0.075) = 35.832975 -> 35.83
      expect(total).toBe(35.83)
    })
  })
})

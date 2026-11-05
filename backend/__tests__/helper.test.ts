import * as helper from '../src/utils/helper'

describe('Test string to boolean', () => {
  it('should convert a string to boolean', () => {
    // test success (true)
    expect(helper.StringToBoolean('true')).toBeTruthy()
    // test success (false)
    expect(helper.StringToBoolean('false')).toBeFalsy()
    // test success (falsy value)
    expect(helper.StringToBoolean('')).toBeFalsy()
  })
})

describe('Test join url', () => {
  it('should join two url parts', () => {
    // test success (second part starts with slash)
    expect(helper.joinURL('part1/', '/part2')).toBe('part1/part2')
    // test success (first part not ending with slash)
    expect(helper.joinURL('part1', '/part2')).toBe('part1/part2')
    // test success (second part not starting with slash)
    expect(helper.joinURL('part1/', 'part2')).toBe('part1/part2')
  })
})

describe('Test clone', () => {
  it('should clone an object or an array', () => {
    // test success (object)
    expect(helper.clone({ foo: 'bar' })).toStrictEqual({ foo: 'bar' })
    // test success (array)
    expect(helper.clone([1, 2, 3])).toStrictEqual([1, 2, 3])
  })
})

describe('Test trim', () => {
  it('should test trim', () => {
    // test success (begins and ends with spaces)
    expect(helper.trim('   xxxxxxxx   ', ' ')).toBe('xxxxxxxx')
  })
})

describe('Test getStripeLocale', () => {
  it('should test getStripeLocale', () => {
    // test success (value found)
    expect(helper.getStripeLocale('en')).toBe('en')
    // test success (value not found so should return default one)
    expect(helper.getStripeLocale('')).toBe('auto')
  })
})

describe('Test safeStringify', () => {
  it('should safe stringify an object', () => {
    // test success (object)
    expect(helper.safeStringify({ foo: 'bar' })).toStrictEqual('{"foo":"bar"}')
    // test failure
    const obj = {
      get foo() {
        throw new Error('Cannot access foo')
      }
    }
    expect(helper.safeStringify(obj)).toStrictEqual('[Unserializable object]')
  })
})

describe('Test days', () => {
  it('should return number of days between two dates', () => {
    expect(helper.days(new Date(2025, 0, 1), new Date(2025, 0, 3))).toBe(2)
    expect(helper.days(undefined, undefined)).toBe(0)
  })
})

describe('formatPayPalPrice', () => {
  it('should format PayPal price', () => {
    expect(helper.formatPayPalPrice(11)).toBe('11.00')
    expect(helper.formatPayPalPrice(11.1)).toBe('11.10')
    expect(helper.formatPayPalPrice(11.12)).toBe('11.12')
    // amounts that aren't exact in floating point (x * 100 is just below the integer)
    expect(helper.formatPayPalPrice(1.13)).toBe('1.13')
    expect(helper.formatPayPalPrice(285.71)).toBe('285.71')
    // the amount sent to PayPal matches the booking price checkPayPalOrder expects
    for (let cents = 1; cents <= 100000; cents += 1) {
      const price = cents / 100
      expect(Number(helper.formatPayPalPrice(price))).toBe(Number.parseFloat(price.toFixed(2)))
    }
  })
})

describe('toCents', () => {
  it('should convert an amount to cents', () => {
    expect(helper.toCents(0)).toBe(0)
    expect(helper.toCents(11)).toBe(1100)
    expect(helper.toCents(11.1)).toBe(1110)
    expect(helper.toCents(1.13)).toBe(113)
    expect(helper.toCents(285.71)).toBe(28571)
    // a weekly price of 1000 for 2 days, as calculateTotalPrice computes it
    expect(helper.toCents(Number((1000 * 2 / 7).toFixed(2)))).toBe(28571)
  })
})

describe('getPaymentAmount', () => {
  it('should return the amount to charge for the payment option', () => {
    // pay online: the booking price
    expect(helper.getPaymentAmount(312, 950, 0)).toBe(312)
    expect(helper.getPaymentAmount(312, 950, 10, false, false)).toBe(312)
    // pay the deposit
    expect(helper.getPaymentAmount(312, 950, 0, true)).toBe(950)
    expect(helper.getPaymentAmount(312, 950, 10, true)).toBe(1045)
    // pay in full: the booking price plus the deposit
    expect(helper.getPaymentAmount(312, 950, 0, false, true)).toBe(1262)
    expect(helper.getPaymentAmount(312, 950, 10, false, true)).toBe(1357)
    expect(helper.getPaymentAmount(285.71, 333.33, 7, false, true)).toBe(642.37)
    // no deposit: the booking price
    expect(helper.getPaymentAmount(312, 0, 10, false, true)).toBe(312)
    expect(helper.getPaymentAmount(312, 0, 10, true)).toBe(312)
  })
})

describe('delay', () => {
  it('should delay in ms', async () => {
    let res = true
    try {
      await helper.delay(100)
    } catch {
      res = false
    }
    expect(res).toBeTruthy()
  })
})

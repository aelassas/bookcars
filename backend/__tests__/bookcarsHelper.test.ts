import { jest } from '@jest/globals'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from ':bookcars-helper'
import CurrencyConverter from ':currency-converter'

describe('bookcarsHelper', () => {
  describe('formatNumber', () => {
    it('should format numbers with proper separators according to language', () => {
      expect(helper.formatNumber(1234567, 'en')).toBe('1,234,567')
      expect(helper.formatNumber(1234567, 'fr')).toBe('1 234 567')
      expect(helper.formatNumber(0, 'en')).toBe('0')
      expect(helper.formatNumber(999, 'en')).toBe('999')
      expect(helper.formatNumber(1234.5, 'en')).toBe('1,234.50')
      expect(helper.formatNumber(0.5, 'en')).toBe('0.50')
      expect(helper.formatNumber(-1234.5, 'en')).toBe('-1,234.50')
    })
  })

  describe('formatDatePart', () => {
    it('should pad single digits with a leading zero', () => {
      expect(helper.formatDatePart(0)).toBe('00')
      expect(helper.formatDatePart(5)).toBe('05')
      expect(helper.formatDatePart(9)).toBe('09')
      expect(helper.formatDatePart(10)).toBe('10')
      expect(helper.formatDatePart(31)).toBe('31')
    })
  })

  describe('capitalize', () => {
    it('should upper-case the first character only', () => {
      expect(helper.capitalize('hello world')).toBe('Hello world')
      expect(helper.capitalize('Hello')).toBe('Hello')
      expect(helper.capitalize('')).toBe('')
    })
  })

  describe('isDate', () => {
    it('should return true for valid Date objects and false otherwise', () => {
      expect(helper.isDate(new Date())).toBe(true)
      expect(helper.isDate(new Date('invalid'))).toBe(false)
      expect(helper.isDate('2026-01-01')).toBe(false)
      expect(helper.isDate(null)).toBe(false)
      expect(helper.isDate(undefined)).toBe(false)
    })
  })

  describe('joinURL', () => {
    it('should join url parts correctly', () => {
      expect(helper.joinURL('http://localhost', 'cdn')).toBe('http://localhost/cdn')
      expect(helper.joinURL('http://localhost/', 'cdn')).toBe('http://localhost/cdn')
      expect(helper.joinURL('http://localhost', '/cdn')).toBe('http://localhost/cdn')
      expect(helper.joinURL('http://localhost/', '/cdn')).toBe('http://localhost/cdn')
    })

    it('should throw an error if a part is missing', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
      expect(() => helper.joinURL(undefined, 'cdn')).toThrow('[joinURL] part undefined')
      expect(() => helper.joinURL('http://localhost', undefined)).toThrow('[joinURL] part undefined')
      logSpy.mockRestore()
    })
  })

  describe('isInteger, isYear, and isCvv', () => {
    it('isInteger should validate digit strings', () => {
      expect(helper.isInteger('123')).toBe(true)
      expect(helper.isInteger('0')).toBe(true)
      expect(helper.isInteger('12.5')).toBe(false)
      expect(helper.isInteger('abc')).toBe(false)
    })

    it('isYear should validate 2-digit strings', () => {
      expect(helper.isYear('26')).toBe(true)
      expect(helper.isYear('00')).toBe(true)
      expect(helper.isYear('2026')).toBe(false)
      expect(helper.isYear('a')).toBe(false)
    })

    it('isCvv should validate 3 or 4 digit strings', () => {
      expect(helper.isCvv('123')).toBe(true)
      expect(helper.isCvv('1234')).toBe(true)
      expect(helper.isCvv('12')).toBe(false)
      expect(helper.isCvv('12345')).toBe(false)
    })
  })

  describe('arrayEqual', () => {
    it('should compare arrays for equality', () => {
      const arr = [1, 2]
      expect(helper.arrayEqual(arr, arr)).toBe(true)
      expect(helper.arrayEqual([1, 2], [1, 2])).toBe(true)
      expect(helper.arrayEqual([1, 2], [2, 1])).toBe(false)
      expect(helper.arrayEqual([1], [1, 2])).toBe(false)
      expect(helper.arrayEqual(null, null)).toBe(true)
      expect(helper.arrayEqual(null, [])).toBe(false)
    })
  })

  describe('clone and cloneArray', () => {
    it('clone should shallow-copy objects and arrays', () => {
      const obj = { a: 1 }
      const clonedObj = helper.clone(obj)
      expect(clonedObj).toEqual(obj)
      expect(clonedObj).not.toBe(obj)

      const arr = [1, 2]
      const clonedArr = helper.clone(arr)
      expect(clonedArr).toEqual(arr)
      expect(clonedArr).not.toBe(arr)
    })

    it('cloneArray should clone arrays and preserve null/undefined', () => {
      const arr = ['a']
      expect(helper.cloneArray(arr)).toEqual(arr)
      expect(helper.cloneArray(undefined as unknown as string[])).toBeUndefined()
      expect(helper.cloneArray(null as unknown as string[])).toBeNull()
    })
  })

  describe('filterEqual', () => {
    const from = new Date('2026-01-01')
    const to = new Date('2026-01-05')

    it('should compare filters for equality', () => {
      const filterA: bookcarsTypes.Filter = { from, to, pickupLocation: 'loc1', dropOffLocation: 'loc1', keyword: 'test' }
      const filterB: bookcarsTypes.Filter = { from, to, pickupLocation: 'loc1', dropOffLocation: 'loc1', keyword: 'test' }

      expect(helper.filterEqual(filterA, filterB)).toBe(true)
      expect(helper.filterEqual(filterA, { ...filterB, keyword: 'other' })).toBe(false)
      expect(helper.filterEqual(filterA, { ...filterB, pickupLocation: 'loc2' })).toBe(false)
      expect(helper.filterEqual(filterA, { ...filterB, dropOffLocation: 'loc2' })).toBe(false)
      expect(helper.filterEqual(null, null)).toBe(true)
      expect(helper.filterEqual(filterA, null)).toBe(false)
    })
  })

  describe('flattenSuppliers', () => {
    it('should return array of supplier IDs', () => {
      const suppliers = [{ _id: 's1' }, { _id: 's2' }, {}] as bookcarsTypes.User[]
      expect(helper.flattenSuppliers(suppliers)).toEqual(['s1', 's2', ''])
    })
  })

  describe('days and hours', () => {
    const from = new Date('2026-01-01T10:00:00.000Z')
    const to = new Date('2026-01-03T14:00:00.000Z')

    it('days should return rounded difference in days', () => {
      expect(helper.days(from, to)).toBe(3)
      expect(helper.days()).toBe(0)
    })

    it('hours should return rounded difference in hours', () => {
      expect(helper.hours(from, to)).toBe(52)
      expect(helper.hours()).toBe(0)
    })
  })

  describe('currencies and formatting', () => {
    it('currencyRTL should correctly identify RTL symbols', () => {
      expect(helper.currencyRTL('$')).toBe(true)
      expect(helper.currencyRTL('£')).toBe(true)
      expect(helper.currencyRTL('€')).toBe(false)
    })

    it('formatPrice should format price according to currency and language', () => {
      expect(helper.formatPrice(100, '$', 'en')).toBe('$100')
      expect(helper.formatPrice(100, '€', 'fr')).toBe('100 €')
    })

    it('checkCurrency should validate supported currencies', () => {
      expect(helper.checkCurrency('USD')).toBe(true)
      expect(helper.checkCurrency('INVALID')).toBe(false)
    })

    it('convertPrice should perform conversion or throw on unsupported currency', async () => {
      expect(await helper.convertPrice(100, 'USD', 'USD')).toBe(100)

      const convertSpy = jest.spyOn(CurrencyConverter.prototype, 'convert').mockResolvedValue(85.5)
      expect(await helper.convertPrice(100, 'USD', 'EUR')).toBe(85.5)
      convertSpy.mockRestore()

      await expect(helper.convertPrice(100, 'INVALID', 'USD')).rejects.toThrow('Currency INVALID not supported')
    })
  })

  describe('isFrench', () => {
    it('should return true if language code is fr', () => {
      expect(helper.isFrench('fr')).toBe(true)
      expect(helper.isFrench('en')).toBe(false)
      expect(helper.isFrench(undefined)).toBe(false)
    })
  })

  describe('enum and option getters', () => {
    it('should return all enum option arrays', () => {
      expect(helper.getAllCarTypes().length).toBeGreaterThan(0)
      expect(helper.getAllUserTypes().length).toBe(3)
      expect(helper.getAllRanges().length).toBeGreaterThan(0)
      expect(helper.getAllMultimedias().length).toBeGreaterThan(0)
      expect(helper.getAllFuelPolicies().length).toBeGreaterThan(0)
      expect(helper.getAllBookingStatuses().length).toBeGreaterThan(0)
    })
  })

  describe('shuffle', () => {
    it('should shuffle array elements in-place', () => {
      const arr = [1, 2, 3, 4, 5]
      helper.shuffle(arr)
      expect(arr.length).toBe(5)
    })
  })

  describe('distance and formatDistance', () => {
    it('distance should calculate distance in kilometers and miles', () => {
      const distK = helper.distance(33.5731, -7.5898, 33.5898, -7.6000, 'K')
      const distM = helper.distance(33.5731, -7.5898, 33.5898, -7.6000, 'M')
      expect(distK).toBeGreaterThan(0)
      expect(distM).toBeGreaterThan(0)
    })

    it('formatDistance should format distance correctly', () => {
      expect(helper.formatDistance(15.5, 'en')).toBe('15.50 Km')
      expect(helper.formatDistance(0.5, 'en')).toBe('500 Km')
      expect(helper.formatDistance(0, 'en')).toBe('')
    })
  })

  describe('trim helpers', () => {
    it('trimStart should trim leading character', () => {
      expect(helper.trimStart('/test/', '/')).toBe('test/')
    })

    it('trimEnd should trim trailing character', () => {
      expect(helper.trimEnd('/test/', '/')).toBe('/test')
    })

    it('trim should trim leading and trailing characters', () => {
      expect(helper.trim('/test/', '/')).toBe('test')
    })
  })

  describe('delay', () => {
    it('should delay execution for specified duration', async () => {
      const start = Date.now()
      await helper.delay(50)
      expect(Date.now() - start).toBeGreaterThanOrEqual(40)
    })
  })

  describe('truncateString', () => {
    it('should truncate string to max length', () => {
      expect(helper.truncateString('hello world', 5)).toBe('hello')
      expect(helper.truncateString('hello world', 8)).toBe('hello...')
      expect(helper.truncateString('hello', 10)).toBe('hello')
    })
  })
})

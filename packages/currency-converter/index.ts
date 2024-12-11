import { Convert } from 'easy-currencies'

export type CurrencyCode =
  | 'USD'
  | 'AED'
  | 'AFN'
  | 'ALL'
  | 'AMD'
  | 'ANG'
  | 'AOA'
  | 'ARS'
  | 'AUD'
  | 'AWG'
  | 'AZN'
  | 'BAM'
  | 'BBD'
  | 'BDT'
  | 'BGN'
  | 'BIF'
  | 'BMD'
  | 'BND'
  | 'BOB'
  | 'BRL'
  | 'BSD'
  | 'BWP'
  | 'BYN'
  | 'BZD'
  | 'CAD'
  | 'CDF'
  | 'CHF'
  | 'CLP'
  | 'CNY'
  | 'COP'
  | 'CRC'
  | 'CVE'
  | 'CZK'
  | 'DJF'
  | 'DKK'
  | 'DOP'
  | 'DZD'
  | 'EGP'
  | 'ETB'
  | 'EUR'
  | 'FJD'
  | 'FKP'
  | 'GBP'
  | 'GEL'
  | 'GIP'
  | 'GMD'
  | 'GNF'
  | 'GTQ'
  | 'GYD'
  | 'HKD'
  | 'HNL'
  | 'HTG'
  | 'HUF'
  | 'IDR'
  | 'ILS'
  | 'INR'
  | 'ISK'
  | 'JMD'
  | 'JPY'
  | 'KES'
  | 'KGS'
  | 'KHR'
  | 'KMF'
  | 'KRW'
  | 'KYD'
  | 'KZT'
  | 'LAK'
  | 'LBP'
  | 'LKR'
  | 'LRD'
  | 'LSL'
  | 'MAD'
  | 'MDL'
  | 'MGA'
  | 'MKD'
  | 'MMK'
  | 'MNT'
  | 'MOP'
  | 'MUR'
  | 'MVR'
  | 'MWK'
  | 'MXN'
  | 'MYR'
  | 'MZN'
  | 'NAD'
  | 'NGN'
  | 'NIO'
  | 'NOK'
  | 'NPR'
  | 'NZD'
  | 'PAB'
  | 'PEN'
  | 'PGK'
  | 'PHP'
  | 'PKR'
  | 'PLN'
  | 'PYG'
  | 'QAR'
  | 'RON'
  | 'RSD'
  | 'RUB'
  | 'RWF'
  | 'SAR'
  | 'SBD'
  | 'SCR'
  | 'SEK'
  | 'SGD'
  | 'SHP'
  | 'SLE'
  | 'SOS'
  | 'SRD'
  | 'STD'
  | 'SZL'
  | 'THB'
  | 'TJS'
  | 'TOP'
  | 'TRY'
  | 'TTD'
  | 'TWD'
  | 'TZS'
  | 'UAH'
  | 'UGX'
  | 'UYU'
  | 'UZS'
  | 'VND'
  | 'VUV'
  | 'WST'
  | 'XAF'
  | 'XCD'
  | 'XOF'
  | 'XPF'
  | 'YER'
  | 'ZAR'
  | 'ZMW'

type CurrencyPair = { expiryDate: Date, rate: number }

export const currencies: CurrencyCode[] = [
  'USD',
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BRL',
  'BSD',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHF',
  'CLP',
  'CNY',
  'COP',
  'CRC',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JMD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KRW',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SOS',
  'SRD',
  'STD',
  'SZL',
  'THB',
  'TJS',
  'TOP',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'UYU',
  'UZS',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XCD',
  'XOF',
  'XPF',
  'YER',
  'ZAR',
  'ZMW',
]

class CurrencyConverter {
  currencyFrom: string
  currencyTo: string
  currencyAmount: number
  convertedValue: number
  isRatesCaching: boolean
  ratesCacheDuration: number
  ratesCache: Record<string, CurrencyPair>
  currencyCode: CurrencyCode[] = currencies
  currencies: Record<CurrencyCode, string> = {
    'AFN': 'Afghan Afghani',
    'ALL': 'Albanian Lek',
    'DZD': 'Algerian Dinar',
    'AOA': 'Angolan Kwanza',
    'ARS': 'Argentine Peso',
    'AMD': 'Armenian Dram',
    'AWG': 'Aruban Florin',
    'AUD': 'Australian Dollar',
    'AZN': 'Azerbaijani M anat',
    'BSD': 'Bahamian Dollar',
    'BBD': 'Bajan Dollar',
    'BDT': 'Bangladeshi Taka',
    'BYN': 'Belarusian Ruble',
    'BZD': 'Belize Dollar',
    'BMD': 'Bermudan Dollar',
    'BOB': 'Bolivian Boliviano',
    'BAM': 'Bosnia-Herzegovina Convertible Mark',
    'BWP': 'Botswanan Pula',
    'BRL': 'Brazilian Real',
    'BND': 'Brunei Dollar',
    'BGN': 'Bulgarian Lev',
    'BIF': 'Burundian Fra nc',
    'XPF': 'CFP Franc',
    'KHR': 'Cambodian riel',
    'CAD': 'Canadian Dollar',
    'CVE': 'Cape Verdean Escudo',
    'KYD': 'Cayman Islands Dollar',
    'CLP': 'Chilean Peso',
    'CNY': 'Chinese Yuan',
    'COP': 'Colombian Peso',
    'KMF': 'Comorian Franc',
    'CDF': 'Congolese Franc',
    'CRC': 'Costa Rican Colón',
    'CZK': 'Czech Koruna',
    'DKK': 'Danish Krone',
    'DJF': 'Djiboutian Franc',
    'DOP': 'Dominican Pe so',
    'XCD': 'East Caribbean Dollar',
    'EGP': 'Egyptian Pound',
    'ETB': 'Ethiopian Birr',
    'FJD': 'Fijian Dollar',
    'GMD': 'Gambian dalasi',
    'GEL': 'Georgian Lari',
    'GIP': 'Gibraltar pound',
    'GTQ': 'Guatemalan Quetzal',
    'GNF': 'Guinean Franc',
    'GYD': 'Guyanaese Dollar',
    'HTG': 'Haitian Gourde',
    'FKP': 'Falkland Islands pound',
    'HNL': 'Honduran Lempira',
    'HKD': 'Hong Kong Dollar',
    'HUF': 'Hungarian Forint',
    'ISK': 'Icelandic Króna',
    'INR': 'Indian Rupee',
    'IDR': 'Indonesian Rupiah',
    'ILS': 'Israeli New Shekel',
    'JMD': 'Jamaican Dollar',
    'JPY': 'Japanese Yen',
    'KZT': 'Kazakhstani Tenge',
    'KES': 'Kenyan Shilling',
    'KGS': 'Kyrgystani Som',
    'LAK': 'Laotian Kip',
    'LBP': 'Lebanese pound',
    'LSL': 'Lesotho Loti',
    'LRD': 'Liberian Dollar',
    'MOP': 'Macanese Pataca',
    'MKD': 'Macedonian Denar',
    'MGA': 'Malagasy Ariary',
    'MWK': 'Malawian Kwacha',
    'MYR': 'Malaysian Ringgit',
    'MVR': 'Maldivian Rufiyaa',
    'MUR': 'Mauritian Rupee',
    'MXN': 'Mexican Peso',
    'MDL': 'Moldovan Leu',
    'MAD': 'Moroccan Dirham',
    'MZN': 'Mozambican metical',
    'MMK': 'Myanmar Kyat',
    'MNT': 'Mongolia',
    'NAD': 'Namibian dol lar',
    'NPR': 'Nepalese Rupee',
    'ANG': 'Netherlands Antillean Guilder',
    'NZD': 'New Zealand Dollar',
    'NIO': 'Nicaraguan Córdoba',
    'NGN': 'Nigerian Naira',
    'NOK': 'Norwegian Krone',
    'PKR': 'Pakistani Rupee',
    'PAB': 'Panamanian Balboa',
    'PGK': 'Papua New Guinean Kina',
    'PYG': 'Paraguayan Guarani',
    'PHP': 'Philippine peso',
    'PLN': 'Poland Złoty',
    'GBP': 'Pound sterling',
    'QAR': 'Qatari Rial',
    'RON': 'Romania n Leu',
    'RUB': 'Russian Ruble',
    'RWF': 'Rwandan franc',
    'SAR': 'Saudi Riyal',
    'RSD': 'Serbian Dinar',
    'SCR': 'Seychellois Rupee',
    'SGD': 'Singapore Dollar',
    'SBD': 'Solomon Islands Dollar',
    'SOS': 'Somali Shilling',
    'ZAR': 'South African Rand',
    'KRW': 'South Korean won',
    'LKR': 'Sri Lankan Rupee',
    'SHP': 'Saint Helena pound',
    'SLE': 'Sierra Leonean leone',
    'SRD': 'Surinamese Dollar',
    'STD': 'São Tomé and Príncipe',
    'SZL': 'Swazi Lilangeni',
    'SEK': 'Swedish Krona',
    'CHF': 'Swiss Franc',
    'TJS': 'Tajikistani Somoni',
    'TZS': 'Tanzanian Shilling',
    'THB': 'Thai Baht',
    'TOP': 'Tongan Pa\'anga',
    'TTD': 'Trinidad and Tobago Dollar',
    'TRY': 'Turkish lira',
    'UGX': 'Ugandan Shilling',
    'UAH': 'Ukrainian hryvnia',
    'AED': 'United Arab Emirates Dirham',
    'USD': 'United States Dollar',
    'UYU': 'Uruguayan Peso',
    'UZS': 'Uzbekistani Som',
    'VUV': 'Vanuatu Vatu',
    'VND': 'Vietnamese dong',
    'WST': 'Samoa',
    'XAF': 'Central African CFA franc',
    'XOF': 'West African CFA franc',
    'YER': 'Yemeni Rial',
    'ZMW': 'Zambian Kwacha',
    'EUR': 'Euro',
    'TWD': 'NT$',
    'PEN': 'Peruvian Sol'
  }

  constructor(
    params: {
      from: string,
      to: string,
      amount: number,
    }) {
    this.currencyFrom = ''
    this.currencyTo = ''
    this.currencyAmount = 1
    this.convertedValue = 0
    this.isRatesCaching = false
    this.ratesCacheDuration = 0
    this.ratesCache = {}

    if (params != undefined) {
      if (params['from'] !== undefined)
        this.from(params['from'])

      if (params['to'] !== undefined)
        this.to(params['to'])

      if (params['amount'] !== undefined)
        this.amount(params['amount'])
    }
  }

  from(currencyFrom: string) {
    if (typeof currencyFrom !== 'string')
      throw new TypeError('currency code should be a string')

    if (!this.currencyCode.includes(currencyFrom.toUpperCase() as CurrencyCode))
      throw new Error(`${currencyFrom} is not a valid currency code`)

    this.currencyFrom = currencyFrom.toUpperCase()
    return this
  }
  to(currencyTo: string) {
    if (typeof currencyTo !== 'string')
      throw new TypeError('currency code should be a string')

    if (!this.currencyCode.includes(currencyTo.toUpperCase() as CurrencyCode))
      throw new Error(`${currencyTo} is not a valid currency code`)

    this.currencyTo = currencyTo
    return this
  }
  amount(currencyAmount: number) {
    if (typeof currencyAmount !== 'number')
      throw new TypeError('amount should be a number')

    if (currencyAmount <= 0)
      throw new Error('amount should be a positive number')

    this.currencyAmount = currencyAmount
    return this
  }

  replaceAll(text: string, queryString: string, replaceString: string) {
    let text_ = ''
    for (let i = 0; i < text.length; i++) {
      if (text[i] === queryString) {
        text_ += replaceString
      } else {
        text_ += text[i]
      }
    }
    return text_
  }

  setupRatesCache(ratesCacheOptions: { isRatesCaching: boolean, ratesCacheDuration: number }) {
    if (typeof ratesCacheOptions != 'object')
      throw new TypeError('ratesCacheOptions should be an object')

    if (ratesCacheOptions.isRatesCaching === undefined)
      throw new Error(`ratesCacheOptions should have a property called isRatesCaching`)

    if (typeof ratesCacheOptions.isRatesCaching != 'boolean')
      throw new TypeError('ratesCacheOptions.isRatesCaching should be a boolean')

    if (typeof ratesCacheOptions.ratesCacheDuration != 'number')
      throw new TypeError('ratesCacheOptions.ratesCacheDuration should be a number')

    if (ratesCacheOptions.ratesCacheDuration <= 0)
      throw new Error('ratesCacheOptions.ratesCacheDuration should be a positive number of seconds')

    this.isRatesCaching = ratesCacheOptions.isRatesCaching

    if (ratesCacheOptions.ratesCacheDuration === undefined)
      this.ratesCacheDuration = 3600 // Defaults to 3600 seconds (1 hour)
    else
      this.ratesCacheDuration = ratesCacheOptions.ratesCacheDuration

    return this
  }

  rates(): Promise<number> {
    if (this.currencyFrom === this.currencyTo) {
      return new Promise((resolve, _) => {
        resolve(1)
      })
    } else {
      let currencyPair = this.currencyFrom.toUpperCase() + this.currencyTo.toUpperCase()
      let now = new Date()
      if (currencyPair in this.ratesCache && now < this.ratesCache[currencyPair].expiryDate) {
        return new Promise((resolve, _) => {
          resolve(this.ratesCache[currencyPair].rate)
        })
      } else {
        return new Promise((resolve, reject) => {
          Convert(this.currencyAmount).from(this.currencyFrom).to(this.currencyTo)
            .then((res) => resolve(res))
            .catch((err) => reject(err))
        })
          .then((rates: unknown) => {
            const ratesNum = rates as number / this.currencyAmount
            if (this.isRatesCaching) {
              this.addRateToRatesCache(currencyPair, ratesNum)
            }
            return ratesNum
          })
      }
    }
  }

  convert(currencyAmount?: number) {
    if (currencyAmount !== undefined) {
      this.amount(currencyAmount)
    }

    if (this.currencyFrom == '')
      throw new Error('currency code cannot be an empty string')

    if (this.currencyTo == '')
      throw new Error('currency code cannot be an empty string')

    if (this.currencyAmount == 0)
      throw new Error('currency amount should be a positive value')

    return this.rates().then((rates) => {
      this.convertedValue = rates * this.currencyAmount
      return this.convertedValue
    })
  }

  currencyName(currencyCode_: string) {
    if (typeof currencyCode_ != 'string')
      throw new TypeError('currency code should be a string')

    if (!this.currencyCode.includes(currencyCode_.toUpperCase() as CurrencyCode))
      throw new Error(`${currencyCode_} is not a valid currency code`)

    return this.currencies[currencyCode_ as CurrencyCode]
  }

  addRateToRatesCache(currencyPair: string, rate_: number) {
    if (typeof currencyPair != 'string')
      throw new TypeError('currency pair should be a string')

    if (typeof rate_ != 'number')
      throw new TypeError('rate should be a number')

    let now = new Date()
    if (currencyPair in this.ratesCache) {
      if (now > this.ratesCache[currencyPair].expiryDate) {
        let newExpiry = new Date()
        newExpiry.setSeconds(newExpiry.getSeconds() + this.ratesCacheDuration)
        this.ratesCache[currencyPair] = {
          rate: rate_,
          expiryDate: newExpiry
        }
      }
    } else {
      let newExpiry = new Date()
      newExpiry.setSeconds(newExpiry.getSeconds() + this.ratesCacheDuration)
      this.ratesCache[currencyPair] = {
        rate: rate_,
        expiryDate: newExpiry
      }
    }
  }
}

export default CurrencyConverter

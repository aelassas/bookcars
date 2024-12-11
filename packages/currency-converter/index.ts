import * as cheerio from 'cheerio'

export type CurrencyCode =
  | 'AFN'
  | 'ALL'
  | 'DZD'
  | 'AOA'
  | 'ARS'
  | 'AMD'
  | 'AWG'
  | 'AUD'
  | 'AZN'
  | 'BSD'
  | 'BHD'
  | 'BBD'
  | 'BDT'
  | 'BYN'
  | 'BZD'
  | 'BMD'
  | 'BTN'
  | 'XBT'
  | 'BOB'
  | 'BAM'
  | 'BWP'
  | 'BRL'
  | 'BND'
  | 'BGN'
  | 'BIF'
  | 'XPF'
  | 'KHR'
  | 'CAD'
  | 'CVE'
  | 'KYD'
  | 'FCFA'
  | 'CLP'
  | 'CLF'
  | 'CNY'
  | 'CNY'
  | 'COP'
  | 'KMF'
  | 'CF'
  | 'CDF'
  | 'CRC'
  | 'HRK'
  | 'CUC'
  | 'CZK'
  | 'DKK'
  | 'DJF'
  | 'DOP'
  | 'XCD'
  | 'EGP'
  | 'ETB'
  | 'FJD'
  | 'GMD'
  | 'GBP'
  | 'GEL'
  | 'GHS'
  | 'GTQ'
  | 'GNF'
  | 'GYD'
  | 'HTG'
  | 'HNL'
  | 'HKD'
  | 'HUF'
  | 'ISK'
  | 'INR'
  | 'IDR'
  | 'IRR'
  | 'IQD'
  | 'ILS'
  | 'JMD'
  | 'JPY'
  | 'JOD'
  | 'KZT'
  | 'KES'
  | 'KWD'
  | 'KGS'
  | 'LAK'
  | 'LBP'
  | 'LSL'
  | 'LRD'
  | 'LYD'
  | 'MOP'
  | 'MKD'
  | 'MGA'
  | 'MWK'
  | 'MYR'
  | 'MVR'
  | 'MRO'
  | 'MUR'
  | 'MXN'
  | 'MDL'
  | 'MAD'
  | 'MZN'
  | 'MMK'
  | 'NAD'
  | 'NPR'
  | 'ANG'
  | 'NZD'
  | 'NIO'
  | 'NGN'
  | 'NOK'
  | 'OMR'
  | 'PKR'
  | 'PAB'
  | 'PGK'
  | 'PYG'
  | 'PHP'
  | 'PLN'
  | 'QAR'
  | 'RON'
  | 'RUB'
  | 'RWF'
  | 'SVC'
  | 'SAR'
  | 'RSD'
  | 'SCR'
  | 'SLL'
  | 'SGD'
  | 'SBD'
  | 'SOS'
  | 'ZAR'
  | 'KRW'
  | 'VES'
  | 'LKR'
  | 'SDG'
  | 'SRD'
  | 'SZL'
  | 'SEK'
  | 'CHF'
  | 'TJS'
  | 'TZS'
  | 'THB'
  | 'TOP'
  | 'TTD'
  | 'TND'
  | 'TRY'
  | 'TMT'
  | 'UGX'
  | 'UAH'
  | 'AED'
  | 'USD'
  | 'UYU'
  | 'UZS'
  | 'VND'
  | 'XAF'
  | 'XOF'
  | 'YER'
  | 'ZMW'
  | 'ETH'
  | 'EUR'
  | 'LTC'
  | 'TWD'
  | 'PEN'

type CurrencyPair = { expiryDate: Date, rate: number }

class CurrencyConverter {
  currencyFrom: string
  currencyTo: string
  currencyAmount: number
  convertedValue: number
  isDecimalComma: boolean
  isRatesCaching: boolean
  ratesCacheDuration: number
  ratesCache: Record<string, CurrencyPair>
  currencyCode: CurrencyCode[] = ['AFN', 'ALL', 'DZD', 'AOA', 'ARS', 'AMD', 'AWG', 'AUD', 'AZN', 'BSD', 'BHD', 'BBD', 'BDT', 'BYN', 'BZD', 'BMD', 'BTN', 'XBT', 'BOB', 'BAM', 'BWP', 'BRL', 'BND', 'BGN', 'BIF', 'XPF', 'KHR', 'CAD', 'CVE', 'KYD', 'FCFA', 'CLP', 'CLF', 'CNY', 'CNY', 'COP', 'CF', 'CHF', 'CDF', 'CRC', 'HRK', 'CUC', 'CZK', 'DKK', 'DJF', 'DOP', 'XCD', 'EGP', 'ETB', 'FJD', 'GMD', 'GBP', 'GEL', 'GHS', 'GTQ', 'GNF', 'GYD', 'HTG', 'HNL', 'HKD', 'HUF', 'ISK', 'INR', 'IDR', 'IRR', 'IQD', 'ILS', 'JMD', 'JPY', 'JOD', 'KMF', 'KZT', 'KES', 'KWD', 'KGS', 'LAK', 'LBP', 'LSL', 'LRD', 'LYD', 'MOP', 'MKD', 'MGA', 'MWK', 'MYR', 'MVR', 'MRO', 'MUR', 'MXN', 'MDL', 'MAD', 'MZN', 'MMK', 'NAD', 'NPR', 'ANG', 'NZD', 'NIO', 'NGN', 'NOK', 'OMR', 'PKR', 'PAB', 'PGK', 'PYG', 'PHP', 'PLN', 'QAR', 'RON', 'RUB', 'RWF', 'SVC', 'SAR', 'RSD', 'SCR', 'SLL', 'SGD', 'SBD', 'SOS', 'ZAR', 'KRW', 'VES', 'LKR', 'SDG', 'SRD', 'SZL', 'SEK', 'CHF', 'TJS', 'TZS', 'THB', 'TOP', 'TTD', 'TND', 'TRY', 'TMT', 'UGX', 'UAH', 'AED', 'USD', 'UYU', 'UZS', 'VND', 'XAF', 'XOF', 'YER', 'ZMW', 'ETH', 'EUR', 'LTC', 'TWD', 'PEN']
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
    'BHD': 'Bahraini Dinar',
    'BBD': 'Bajan Dollar',
    'BDT': 'Bangladeshi Taka',
    'BYN': 'Belarusian Ruble',
    'BZD': 'Belize Dollar',
    'BMD': 'Bermudan Dollar',
    'BTN': 'Bhutan currency',
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
    'FCFA': 'Central African CFA Franc',
    'CLP': 'Chilean Peso',
    'CLF': 'Chilean Unit of Account (UF)',
    'CNY': 'Chinese Yuan',
    'COP': 'Colombian Peso',
    'KMF': 'Comorian Franc',
    'CDF': 'Congolese Franc',
    'CRC': 'Costa Rican Colón',
    'HRK': 'Croatian Kuna',
    'CUC': 'Cuban Peso',
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
    'GHS': 'Ghanaian Cedi',
    'GTQ': 'Guatemalan Quetzal',
    'GNF': 'Guinean Franc',
    'GYD': 'Guyanaese Dollar',
    'HTG': 'Haitian Gourde',
    'HNL': 'Honduran Lempira',
    'HKD': 'Hong Kong Dollar',
    'HUF': 'Hungarian Forint',
    'ISK': 'Icelandic Króna',
    'INR': 'Indian Rupee',
    'IDR': 'Indonesian Rupiah',
    'IRR': 'Iranian Rial',
    'IQD': 'Iraqi Dinar',
    'ILS': 'Israeli New Shekel',
    'JMD': 'Jamaican Dollar',
    'JPY': 'Japanese Yen',
    'JOD': 'Jordanian Dinar',
    'KZT': 'Kazakhstani Tenge',
    'KES': 'Kenyan Shilling',
    'KWD': 'Kuwaiti Dinar',
    'KGS': 'Kyrgystani Som',
    'LAK': 'Laotian Kip',
    'LBP': 'Lebanese pound',
    'LSL': 'Lesotho Loti',
    'LRD': 'Liberian Dollar',
    'LYD': 'Libyan Dinar',
    'MOP': 'Macanese Pataca',
    'MKD': 'Macedonian Denar',
    'MGA': 'Malagasy Ariary',
    'MWK': 'Malawian Kwacha',
    'MYR': 'Malaysian Ringgit',
    'MVR': 'Maldivian Rufiyaa',
    'MRO': 'Mauritanian Ouguiya',
    'MUR': 'Mauritian Rupee',
    'MXN': 'Mexican Peso',
    'MDL': 'Moldovan Leu',
    'MAD': 'Moroccan Dirham',
    'MZN': 'Mozambican metical',
    'MMK': 'Myanmar Kyat',
    'NAD': 'Namibian dol lar',
    'NPR': 'Nepalese Rupee',
    'ANG': 'Netherlands Antillean Guilder',
    'NZD': 'New Zealand Dollar',
    'NIO': 'Nicaraguan Córdoba',
    'NGN': 'Nigerian Naira',
    'NOK': 'Norwegian Krone',
    'OMR': 'Omani Rial',
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
    'SVC': 'Salvadoran Colón',
    'SAR': 'Saudi Riyal',
    'RSD': 'Serbian Dinar',
    'SCR': 'Seychellois Rupee',
    'SLL': 'Sierra Leonean Leone',
    'SGD': 'Singapore Dollar',
    'SBD': 'Solomon Islands Dollar',
    'SOS': 'Somali Shilling',
    'ZAR': 'South African Rand',
    'KRW': 'South Korean won',
    'VES': 'Sovereign Bolivar',
    'LKR': 'Sri Lankan Rupee',
    'SDG': 'Sudanese pound',
    'SRD': 'Surinamese Dollar',
    'SZL': 'Swazi Lilangeni',
    'SEK': 'Swedish Krona',
    'CF': 'Swiss Franc',
    'CHF': 'Swiss Franc',
    'TJS': 'Tajikistani Somoni',
    'TZS': 'Tanzanian Shilling',
    'THB': 'Thai Baht',
    'TOP': 'Tongan Pa\'anga',
    'TTD': 'Trinidad and Tobago Dollar',
    'TND': 'Tunisian Dinar',
    'TRY': 'Turkish lira',
    'TMT': 'Turkmenistan manat',
    'UGX': 'Ugandan Shilling',
    'UAH': 'Ukrainian hryvnia',
    'AED': 'United Arab Emirates Dirham',
    'USD': 'United States Dollar',
    'UYU': 'Uruguayan Peso',
    'UZS': 'Uzbekistani Som',
    'VND': 'Vietnamese dong',
    'XAF': 'Central African CFA franc',
    'XOF': 'West African CFA franc',
    'YER': 'Yemeni Rial',
    'ZMW': 'Zambian Kwacha',
    'XBT': 'Bitcoin',
    'ETH': 'Ether',
    'EUR': 'Euro',
    'LTC': 'Litecoin',
    'TWD': 'NT$',
    'PEN': 'Peruvian Sol'
  }

  constructor(
    params: {
      from: string,
      to: string,
      amount: number,
      isDecimalComma?: boolean
    }) {
    this.currencyFrom = ''
    this.currencyTo = ''
    this.currencyAmount = 1
    this.convertedValue = 0
    this.isDecimalComma = false
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

      if (params['isDecimalComma'] !== undefined)
        this.setDecimalComma(params['isDecimalComma'])
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

  setDecimalComma(isDecimalComma: boolean) {
    if (typeof isDecimalComma !== 'boolean')
      throw new TypeError('isDecimalComma should be a boolean')

    this.isDecimalComma = isDecimalComma
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
          const url = `https://www.google.com/search?q=${this.currencyAmount}+${this.currencyFrom}+to+${this.currencyTo}+&hl=en`
          // console.log('URL:', url)
          fetch(url)
            .then((res) => res.text())
            .then((html) => resolve(html))
            .catch((err) => reject(err))
        }).then((body) => {
          return cheerio.load(body as string)
        })
          .then(($) => {
            return $('.iBp4i').text().split(' ')[0]
          })
          .then((rates: string) => {
            if (this.isDecimalComma) {
              if (rates.includes('.'))
                rates = this.replaceAll(rates, '.', '')
              if (rates.includes(','))
                rates = this.replaceAll(rates, ',', '.')
            } else {
              if (rates.includes(','))
                rates = this.replaceAll(rates, ',', '')
            }
            const ratesNum = parseFloat(rates) / this.currencyAmount
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

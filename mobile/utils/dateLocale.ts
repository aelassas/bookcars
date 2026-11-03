import type { Locale } from 'date-fns'
import { de, enUS, es, fr } from 'date-fns/locale'

/**
 * Get date-fns locale from language code.
 *
 * @param {?string} [language]
 * @returns {Locale}
 */
export const getDateLocale = (language?: string): Locale => {
  switch (language) {
    case 'fr':
      return fr
    case 'es':
      return es
    case 'de':
      return de
    case 'en':
    default:
      return enUS
  }
}

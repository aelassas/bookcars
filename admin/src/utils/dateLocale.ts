import { Locale } from 'date-fns'
import { fr, enUS, es, de, pt } from 'date-fns/locale'

const dateLocales: Record<string, Locale> = { en: enUS, fr, es, de, pt }

/**
 * Get date-fns locale from language code.
 *
 * @param {?string} [language]
 * @returns {Locale}
 */
export const getDateLocale = (language?: string): Locale => (language && dateLocales[language]) || enUS

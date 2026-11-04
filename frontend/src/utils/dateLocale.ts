import type { Locale } from 'date-fns'
import { fr, enUS, es, de, pt } from 'date-fns/locale'

const locales: Record<string, Locale> = { fr, es, de, pt }

/**
 * Get date-fns locale from language code.
 *
 * @param {?string} [language]
 * @returns {Locale}
 */
export const getDateLocale = (language?: string): Locale => (language && locales[language]) || enUS

import * as env from '../config/env.config'

type LocationTranslation = Pick<env.LocationValue, 'language' | 'value'>

/**
 * Resolve a location name using the requested language and configured fallbacks.
 *
 * @param {LocationTranslation[] | null | undefined} values
 * @param {string} language
 * @returns {string}
 */
export const resolveLocationTranslation = (
  values: ReadonlyArray<LocationTranslation> | null | undefined,
  language: string,
): string => {
  const validValues = values?.filter((value) =>
    value
    && typeof value.language === 'string'
    && typeof value.value === 'string'
    && value.value.trim().length > 0
  ) || []

  return validValues.find((value) => value.language === language)?.value
    || validValues.find((value) => value.language === 'en')?.value
    || validValues[0]?.value
    || ''
}

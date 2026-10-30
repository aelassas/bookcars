import { resolveLocationTranslation } from '../src/utils/locationHelper'

const translation = (language: string, value: string) => ({ language, value })

describe('resolveLocationTranslation', () => {
  it('returns the requested language when available', () => {
    expect(resolveLocationTranslation([
      translation('en', 'English'),
      translation('fr', 'French'),
    ], 'fr')).toBe('French')
  })

  it('falls back to English when the requested language is missing', () => {
    expect(resolveLocationTranslation([
      translation('en', 'English'),
      translation('es', 'Spanish'),
    ], 'fr')).toBe('English')
  })

  it('falls back to the first valid translation when English is missing', () => {
    expect(resolveLocationTranslation([
      translation('es', 'Spanish'),
      translation('de', 'German'),
    ], 'fr')).toBe('Spanish')
  })

  it('returns the only available translation', () => {
    expect(resolveLocationTranslation([translation('es', 'Spanish')], 'fr')).toBe('Spanish')
  })

  it('returns an empty string for an empty or missing collection', () => {
    expect(resolveLocationTranslation([], 'fr')).toBe('')
    expect(resolveLocationTranslation(undefined, 'fr')).toBe('')
  })

  it('ignores translations without a usable value', () => {
    expect(resolveLocationTranslation([
      { language: 'es', value: '' },
      translation('en', 'English'),
    ], 'fr')).toBe('English')
  })
})

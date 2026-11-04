import { en } from '../src/lang/en'
import { fr } from '../src/lang/fr'
import { es } from '../src/lang/es'
import { de } from '../src/lang/de'
import { pt } from '../src/lang/pt'

describe('Test language files', () => {
  const expectedKeys = Object.keys(en).sort()

  it.each([
    ['fr', fr],
    ['es', es],
    ['de', de],
    ['pt', pt],
  ])('should have the same keys as en for %s', (_lang, translations) => {
    expect(Object.keys(translations).sort()).toEqual(expectedKeys)
  })
})

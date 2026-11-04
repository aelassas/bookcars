import { en } from '../src/lang/en'
import { fr } from '../src/lang/fr'
import { es } from '../src/lang/es'
import { de } from '../src/lang/de'
import { pt } from '../src/lang/pt'
import { it as itLang } from '../src/lang/it'
import { zh } from '../src/lang/zh'
import { ja } from '../src/lang/ja'

describe('Test language files', () => {
  const expectedKeys = Object.keys(en).sort()

  it.each([
    ['fr', fr],
    ['es', es],
    ['de', de],
    ['pt', pt],
    ['it', itLang],
    ['zh', zh],
    ['ja', ja],
  ])('should have the same keys as en for %s', (_lang, translations) => {
    expect(Object.keys(translations).sort()).toEqual(expectedKeys)
  })
})

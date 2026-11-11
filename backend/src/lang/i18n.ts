import { I18n } from 'i18n-js'
import { en } from './en'
import { fr } from './fr'
import { es } from './es'
import { de } from './de'
import { pt } from './pt'
import { it } from './it'
import { zh } from './zh'
import { ja } from './ja'
import { ur } from './ur'

const i18n = new I18n({ en, fr, es, de, pt, it, zh, ja, ur })
i18n.enableFallback = true
export default i18n

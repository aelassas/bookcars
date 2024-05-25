import { I18n } from 'i18n-js'
import { en } from './en'
import { fr } from './fr'
import { el } from './el'

const i18n = new I18n({ en, fr, el })
i18n.enableFallback = true
export default i18n

import LocalizedStrings from 'react-localization'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    VIEW_ON_MAP: 'Voir sur la carte',
  },
  en: {
    VIEW_ON_MAP: 'View on map',
  },
})

langHelper.setLanguage(strings)
export { strings }

import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_PARKING_SPOT: 'Nouvelle place de parking',
  },
  en: {
    NEW_PARKING_SPOT: 'New parking spot',
  },
})

langHelper.setLanguage(strings)
export { strings }

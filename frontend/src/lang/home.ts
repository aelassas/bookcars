import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const COPYRIGHT_PART1 = `Copyright © ${new Date().getFullYear()} BookCars`

const strings = new LocalizedStrings({
  fr: {
    DROP_OFF: 'Restituer au même endroit',
    COPYRIGHT_PART1,
    COPYRIGHT_PART2: '®',
    COPYRIGHT_PART3: '. Tous droits réservés.',
    COVER: 'Les meilleurs agences de location de voitures',
  },
  en: {
    DROP_OFF: 'Return to same location',
    COPYRIGHT_PART1,
    COPYRIGHT_PART2: '®',
    COPYRIGHT_PART3: '. All rights reserved.',
    COVER: 'All the top car rental companies',
  },
})

langHelper.setLanguage(strings)
export { strings }

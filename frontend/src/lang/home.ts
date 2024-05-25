import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const COPYRIGHT_PART1 = `Copyright © ${new Date().getFullYear()} BookCars.ma`

const strings = new LocalizedStrings({
  fr: {
    DROP_OFF: 'Restituer au même endroit',
    COPYRIGHT_PART1,
    COPYRIGHT_PART2: '®',
    COPYRIGHT_PART3: '. Tous droits réservés.',
  },
  en: {
    DROP_OFF: 'Return to same location',
    COPYRIGHT_PART1,
    COPYRIGHT_PART2: '®',
    COPYRIGHT_PART3: '. All rights reserved.',
  },
  el: {
     DROP_OFF: 'Επιστροφή στην ίδια τοποθεσία',
     COPYRIGHT_PART1,
     COPYRIGHT_PART2: '®',
     COPYRIGHT_PART3: '. Ολα τα δικαιώματα διατηρούνται.',
   },
})

langHelper.setLanguage(strings)
export { strings }

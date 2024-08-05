import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    PICK_UP_DATE: 'Date de prise en charge',
    DROP_OFF_DATE: 'Date de retour',
    DROP_OFF: 'Restituer au même endroit',
    COVER: 'Les meilleurs agences de location de voitures',
    SUPPLIERS_TITLE: 'Vous Connecter aux plus Grandes Enseignes',
    MAP_TITLE: 'Carte des Agences de Location de Voitures',
    MAP_PICK_UP_SELECTED: 'Lieu de prise en charge sélectionné',
    MAP_DROP_OFF_SELECTED: 'Lieu de restitution sélectionné',
    DESTINATIONS_TITLE: 'Parcourir par destinations',
  },
  en: {
    PICK_UP_DATE: 'Pick-up Date',
    DROP_OFF_DATE: 'Drop-off Date',
    DROP_OFF: 'Return to same location',
    COVER: 'Top Car Rental Companies',
    SUPPLIERS_TITLE: 'Connecting you to the Biggest Brands',
    MAP_TITLE: 'Map of Car Rental Locations',
    MAP_PICK_UP_SELECTED: 'Pick-up Location selected',
    MAP_DROP_OFF_SELECTED: 'Drop-off Location selected',
    DESTINATIONS_TITLE: 'Browse by Destinations',
  },
})

langHelper.setLanguage(strings)
export { strings }

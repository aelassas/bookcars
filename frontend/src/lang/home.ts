import LocalizedStrings from 'react-localization'
import * as langHelper from '@/common/langHelper'

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
    CAR_SIZE_TITLE: 'Consulter nos tailles de voitures',
    CAR_SIZE_TEXT: 'Nos véhicules sont disponibles en trois tailles principales.',
    MINI: 'MINI',
    MIDI: 'MIDI',
    MAXI: 'MAXI',
    SEARCH_FOR_CAR: 'Rechercher une voiture',
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
    CAR_SIZE_TITLE: 'Meet Some of Our Car sizes',
    CAR_SIZE_TEXT: 'Our vehicles come in three main sizes.',
    MINI: 'MINI',
    MIDI: 'MIDI',
    MAXI: 'MAXI',
    SEARCH_FOR_CAR: 'Search for a car',
  },
  es: {
    PICK_UP_DATE: 'Fecha de recogida',
    DROP_OFF_DATE: 'Fecha de devolución',
    DROP_OFF: 'Devolver en el mismo lugar',
    COVER: 'Las mejores empresas de alquiler de coches',
    SUPPLIERS_TITLE: 'Conectándote con las marcas más grandes',
    MAP_TITLE: 'Mapa de ubicaciones de alquiler de coches',
    MAP_PICK_UP_SELECTED: 'Ubicación de recogida seleccionada',
    MAP_DROP_OFF_SELECTED: 'Ubicación de devolución seleccionada',
    DESTINATIONS_TITLE: 'Buscar por destinos',
    CAR_SIZE_TITLE: 'Descubre algunos de nuestros tamaños de coches',
    CAR_SIZE_TEXT: 'Nuestros vehículos están disponibles en tres tamaños principales.',
    MINI: 'MINI',
    MIDI: 'MIDI',
    MAXI: 'MAXI',
    SEARCH_FOR_CAR: 'Buscar un coche',
  },
})

langHelper.setLanguage(strings)
export { strings }

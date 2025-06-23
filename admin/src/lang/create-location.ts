import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_LOCATION_HEADING: 'Nouveau lieu',
    LOCATION_NAME: 'Lieu',
    INVALID_LOCATION: 'Ce lieu existe déjà.',
    LOCATION_CREATED: 'Lieu créé avec succès.',
    COUNTRY: 'Pays',
    PARKING_SPOTS: 'Places de parking',
    PARENT_LOCATION: 'Lieu Parent',
  },
  en: {
    NEW_LOCATION_HEADING: 'New location',
    LOCATION_NAME: 'Location',
    INVALID_LOCATION: 'This location already exists.',
    LOCATION_CREATED: 'Location created successfully.',
    COUNTRY: 'Country',
    PARKING_SPOTS: 'Parking spots',
    PARENT_LOCATION: 'Parent Location',
  },
  es: {
    NEW_LOCATION_HEADING: 'Nuevo lugar',
    LOCATION_NAME: 'Lugar',
    INVALID_LOCATION: 'Este lugar ya existe.',
    LOCATION_CREATED: 'Lugar creado con éxito.',
    COUNTRY: 'País',
    PARKING_SPOTS: 'Plazas de aparcamiento',
    PARENT_LOCATION: 'Ubicación de los Padres',
  },
})

langHelper.setLanguage(strings)
export { strings }

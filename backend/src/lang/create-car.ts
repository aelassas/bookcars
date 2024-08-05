import LocalizedStrings from 'react-localization'
import env from '../config/env.config'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_CAR_HEADING: 'Nouvelle voiture',
    NAME: 'Nom',
    CAR_IMAGE_SIZE_ERROR: `L'image doit être au format ${env.CAR_IMAGE_WIDTH}x${env.CAR_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Taille d'image recommandée : ${env.CAR_IMAGE_WIDTH}x${env.CAR_IMAGE_HEIGHT}`,
    SUPPLIER: 'Fournisseur',
    LOCATIONS: 'Lieux de prise en charge',
    AVAILABLE: 'Disponible à la location',
    CAR_TYPE: 'Moteur',
    PRICE: 'Prix',
    SEATS: 'Sièges',
    DOORS: 'Portes',
    GEARBOX: 'Transmission',
    AIRCON: 'Climatisation',
    MINIMUM_AGE: 'Âge minimum',
    MINIMUM_AGE_NOT_VALID: `L'âge minimum doit être supérieur ou égal à ${env.MINIMUM_AGE} ans.`,
    CAR_RANGE: 'Gamme',
    MULTIMEDIA: 'Multimédia',
    RATING: 'Notation',
  },
  en: {
    NEW_CAR_HEADING: 'New car',
    NAME: 'Name',
    CAR_IMAGE_SIZE_ERROR: `The image must be in the format ${env.CAR_IMAGE_WIDTH}x${env.CAR_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Recommended image size: ${env.CAR_IMAGE_WIDTH}x${env.CAR_IMAGE_HEIGHT}`,
    SUPPLIER: 'Supplier',
    LOCATIONS: 'Pickup locations',
    AVAILABLE: 'Available for rental',
    CAR_TYPE: 'Engine',
    PRICE: 'Price',
    SEATS: 'Seats',
    DOORS: 'Doors',
    GEARBOX: 'Gearbox',
    AIRCON: 'Aircon',
    MINIMUM_AGE: 'Minimum age',
    MINIMUM_AGE_NOT_VALID: `Minimum age must be greater than or equal to ${env.MINIMUM_AGE} years old.`,
    CAR_RANGE: 'Car Range',
    MULTIMEDIA: 'Multimedia',
    RATING: 'Rating'
  },
})

langHelper.setLanguage(strings)
export { strings }

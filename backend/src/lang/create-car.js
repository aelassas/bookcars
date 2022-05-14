import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        NEW_CAR_HEADING: 'Nouvelle voiture',
        NAME: 'Nom',
        CAR_IMAGE_SIZE_ERROR: `L'image doit être au format ${Env.CAR_IMAGE_WIDTH}x${Env.CAR_IMAGE_HEIGHT}`,
        RECOMMENDED_IMAGE_SIZE: `Taille d'image recommandée : ${Env.CAR_IMAGE_WIDTH}x${Env.CAR_IMAGE_HEIGHT}`,
        COMPANY: 'Société',
        LOCATIONS: 'Lieux',
        AVAILABLE: 'Disponible pour la location',
        CAR_TYPE: 'Moteur',
        PRICE: 'Prix',
        SEATS: 'Sièges',
        DOORS: 'Portes',
        GEARBOX: 'Transmission',
        AIRCON: 'Climatisation'
    },
    en: {
        NEW_CAR_HEADING: 'New car',
        NAME: 'Name',
        CAR_IMAGE_SIZE_ERROR: `The image must be in the format ${Env.CAR_IMAGE_WIDTH}x${Env.CAR_IMAGE_HEIGHT}`,
        RECOMMENDED_IMAGE_SIZE: `Recommended image size: ${Env.CAR_IMAGE_WIDTH}x${Env.CAR_IMAGE_HEIGHT}`,
        COMPANY: 'Company',
        LOCATIONS: 'Locations',
        AVAILABLE: 'Available for rental',
        CAR_TYPE: 'Engine',
        PRICE: 'Price',
        SEATS: 'Seats',
        DOORS: 'Doors',
        GEARBOX: 'Gearbox',
        AIRCON: 'Aircon'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

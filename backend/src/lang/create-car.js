import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        NEW_CAR_HEADING: 'Nouvelle voiture',
        NAME: 'Nom',
        CAR_IMAGE_SIZE_ERROR: `L'image doit être au format ${Env.CAR_IMAGE_WIDTH}x${Env.CAR_IMAGE_HEIGHT}`
    },
    en: {
        NEW_CAR_HEADING: 'New car',
        NAME: 'Name',
        CAR_IMAGE_SIZE_ERROR: `The image must be in the format ${Env.CAR_IMAGE_WIDTH}x${Env.CAR_IMAGE_HEIGHT}`
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

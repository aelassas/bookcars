import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        CREATE_COMPANY_HEADING: 'Nouvelle société',
        INVALID_COMPANY_NAME: 'Cette société existe déjà',
        COMPANY_IMAGE_SIZE_ERROR: `L'image doit être au format ${Env.COMPANY_IMAGE_WIDTH}x${Env.COMPANY_IMAGE_HEIGHT}`,
        RECOMMENDED_IMAGE_SIZE: `Taille d'image recommandée : ${Env.COMPANY_IMAGE_WIDTH}x${Env.COMPANY_IMAGE_HEIGHT}`
    },
    en: {
        CREATE_COMPANY_HEADING: 'New company',
        INVALID_COMPANY_NAME: 'This company already exists',
        COMPANY_IMAGE_SIZE_ERROR: `The image must be in the format ${Env.COMPANY_IMAGE_WIDTH}x${Env.COMPANY_IMAGE_HEIGHT}`,
        RECOMMENDED_IMAGE_SIZE: `Recommended image size: ${Env.COMPANY_IMAGE_WIDTH}x${Env.COMPANY_IMAGE_HEIGHT}`
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

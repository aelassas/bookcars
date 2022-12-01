import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        UPDATE_LOCATION: 'Modification du lieu',
        LOCATION_UPDATED: 'Lieu modifié avec succès.',
    },
    en: {
        UPDATE_LOCATION: 'Location update',
        LOCATION_UPDATED: 'Location updated successfully.'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

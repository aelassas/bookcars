import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        CREATE_USER_HEADING: 'Nouvelle utilisateur',
        BIRTH_DATE: 'Date de naissance'
    },
    en: {
        CREATE_USER_HEADING: 'New user',
        BIRTH_DATE: 'Birth date'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

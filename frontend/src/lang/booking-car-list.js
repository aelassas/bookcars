import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        REQUIRED_FIELD: 'Veuillez renseigner le champ : ',
        REQUIRED_FIELDS: 'Veuillez renseigner les champs : ',
    },
    en: {
        REQUIRED_FIELD: 'Please fill in the field: ',
        REQUIRED_FIELDS: 'Please fill in the fields: ',
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        PICKUP_LOCATION: 'Lieu de prise en charge',
        DROP_OFF_LOCATION: 'Lieu de restitution',
    },
    en: {
        PICKUP_LOCATION: 'Pickup location',
        DROP_OFF_LOCATION: 'Drop-off location',
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

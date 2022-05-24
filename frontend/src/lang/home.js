import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

const COPYRIGHT = `Copyright © ${new Date().getFullYear()} BookCars.ma®`;

export const strings = new LocalizedStrings({
    fr: {
        DROP_OFF: 'Restituer au même endroit',
        COPYRIGHT: `${COPYRIGHT}. Tous droits réservés.`
    },
    en: {
        DROP_OFF: 'Return to same location',
        COPYRIGHT: `${COPYRIGHT}. All rights reserved.`
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

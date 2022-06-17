import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        NO_MATCH: 'Rien à voir ici !'
    },
    en: {
        NO_MATCH: 'Nothing to see here!'
    }
});


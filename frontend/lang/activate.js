import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        ACTIVATE_HEADING: 'Activation du compte',
        TOKEN_EXPIRED: "Votre lien d'activation du compte a expiré.",
        ACTIVATE: 'Activer'
    },
    en: {
        ACTIVATE_HEADING: 'Account Activation',
        TOKEN_EXPIRED: 'Your account activation link expired.',
        ACTIVATE: 'Activate'
    }
});

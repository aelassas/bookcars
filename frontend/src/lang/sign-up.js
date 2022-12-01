import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        SIGN_UP_HEADING: 'Inscription',
        SIGN_UP: "S'inscrire",
        SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription."
    },
    en: {
        SIGN_UP_HEADING: 'Sign up',
        SIGN_UP: 'Sign up',
        SIGN_UP_ERROR: 'An error occurred during sign up.'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

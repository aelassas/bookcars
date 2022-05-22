import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        SIGN_IN_HEADING: 'Connexion',
        SIGN_IN: 'Se connecter',
        ERROR_IN_SIGN_IN: "L'adresse e-mail ou le mot de passe est incorrect.",
        IS_BLACKLISTED: 'Votre compte est suspendu.',
        RESET_PASSWORD: 'Mot de passe oublié ?'
    },
    en: {
        SIGN_IN_HEADING: 'Sign in',
        SIGN_IN: 'Sign in',
        ERROR_IN_SIGN_IN: 'The email address or password is incorrect.',
        IS_BLACKLISTED: 'Your account is suspended.',
        RESET_PASSWORD: 'Forgot password?'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

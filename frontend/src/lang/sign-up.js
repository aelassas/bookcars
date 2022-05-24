import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        SIGN_UP_HEADING: 'Inscription',
        TOS_SIGN_UP: "J'ai lu et j'accepte les conditions générales d'utilisation.",
        SIGN_UP: "S'inscrire",
        RECAPTCHA_ERROR: 'Veuillez remplir le captcha pour continuer.',
        TOS_ERROR: "Veuillez accepter les conditions générales d'utilisation.",
        SIGN_UP_ERROR: "Une erreur s'est produite lors de l'inscription.",
        BIRTH_DATE: 'Date de naissance'
    },
    en: {
        SIGN_UP_HEADING: 'Sign up',
        TOS_SIGN_UP: 'I read and agree with the Terms of Use.',
        SIGN_UP: 'Sign up',
        RECAPTCHA_ERROR: 'Fill out the captcha to continue.',
        TOS_ERROR: 'Please accept the Terms of Use.',
        SIGN_UP_ERROR: 'An error occurred during sign up.',
        BIRTH_DATE: 'Birth date'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

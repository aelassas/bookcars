import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    fr: {
        SIGN_IN_HEADING: 'Connexion',
        SIGN_IN: 'Se connecter',
        SIGN_UP: "S'inscrire",
        ERROR_IN_SIGN_IN: "E-mail ou mot de passe incorrect.",
        IS_BLACKLISTED: 'Votre compte est suspendu.',
        RESET_PASSWORD: 'Mot de passe oublié ?',
        STAY_CONNECTED: 'Rester connecté'
    },
    en: {
        SIGN_IN_HEADING: 'Sign in',
        SIGN_IN: 'Sign in',
        SIGN_UP: 'Sign up',
        ERROR_IN_SIGN_IN: 'Incorrect email or password.',
        IS_BLACKLISTED: 'Your account is suspended.',
        RESET_PASSWORD: 'Forgot password?',
        STAY_CONNECTED: 'Stay connected'
    },
    pl: {
        SIGN_IN_HEADING: 'Zaloguj się',
        SIGN_IN: 'Zaloguj się',
        SIGN_UP: 'Utwórz konto',
        ERROR_IN_SIGN_IN: 'Nieprawidłowy e-mail lub hasło.',
        IS_BLACKLISTED: 'Twoje konto jest zawieszone.',
        RESET_PASSWORD: 'Zapomniałeś hasła?',
        STAY_CONNECTED: 'Zapamiętaj hasło'
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)

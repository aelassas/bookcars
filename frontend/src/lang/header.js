import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    fr: {
        SIGN_IN: 'Se connecter',
        HOME: 'Accueil',
        BOOKINGS: 'Réservations',
        ABOUT: 'À propos',
        TOS: "Conditions d'utilisation",
        CONTACT: 'Contact',
        LANGUAGE: 'Langue',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        LANGUAGE_PL: 'Polski',
        SETTINGS: 'Paramètres',
        SIGN_OUT: 'Déconnexion'
    },
    en: {
        SIGN_IN: 'Sign in',
        HOME: 'Home',
        BOOKINGS: 'Bookings',
        ABOUT: 'About',
        TOS: 'Terms of Service',
        CONTACT: 'Contact',
        LANGUAGE: 'Language',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        LANGUAGE_PL: 'Polski',
        SETTINGS: 'Settings',
        SIGN_OUT: 'Sign out',
    },
    pl: {
        SIGN_IN: 'Sign in',
        HOME: 'Home',
        BOOKINGS: 'Rezerwacje',
        USERS: 'Użytkownicy',
        ABOUT: 'O nas',
        TOS: 'Regulamin',
        CONTACT: 'Kontakt',
        LANGUAGE: 'Język',
        LANGUAGE_FR: 'Francuski',
        LANGUAGE_EN: 'Angielski',
        LANGUAGE_PL: 'Polski',
        SETTINGS: 'Ustawienia',
        SIGN_OUT: 'Wyloguj się'
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)

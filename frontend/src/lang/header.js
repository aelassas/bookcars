import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

const strings = new LocalizedStrings({
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
    SETTINGS: 'Paramètres',
    SIGN_OUT: 'Déconnexion',
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
    SETTINGS: 'Settings',
    SIGN_OUT: 'Sign out',
  },
})

LangHelper.setLanguage(strings)
export { strings }

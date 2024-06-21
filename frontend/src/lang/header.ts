import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SIGN_IN: 'Se connecter',
    HOME: 'Accueil',
    BOOKINGS: 'Réservations',
    ABOUT: 'À propos',
    TOS: "Conditions d'utilisation",
    CONTACT: 'Contact',
    LANGUAGE: 'Langue',
    SETTINGS: 'Paramètres',
    SIGN_OUT: 'Déconnexion',
    SUPPLIERS: 'Fournisseurs',
    LOCATIONS: 'Lieux',
  },
  en: {
    SIGN_IN: 'Sign in',
    HOME: 'Home',
    BOOKINGS: 'Bookings',
    ABOUT: 'About',
    TOS: 'Terms of Service',
    CONTACT: 'Contact',
    LANGUAGE: 'Language',
    SETTINGS: 'Settings',
    SIGN_OUT: 'Sign out',
    SUPPLIERS: 'Suppliers',
    LOCATIONS: 'Locations',
  },
})

langHelper.setLanguage(strings)
export { strings }

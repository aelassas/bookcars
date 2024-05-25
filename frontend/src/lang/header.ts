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
  },
  el: {
  SIGN_IN: 'Είσοδος',
  HOME: 'Αρχική σελίδα',
  BOOKINGS: 'Κρατήσεις',
  ABOUT: 'ΣΧΕΤΙΚΑ ΜΕ',
  TOS: 'Όροι χρήσης',
  CONTACT: 'Επικοινωνία',
  LANGUAGE: 'Γλώσσα',
  SETTINGS: 'Ρυθμίσεις',
  SIGN_OUT: 'Αποσύνδεση',
},
})

langHelper.setLanguage(strings)
export { strings }

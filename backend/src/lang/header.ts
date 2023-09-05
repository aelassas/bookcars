import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

const strings = new LocalizedStrings({
  fr: {
    DASHBOARD: 'Tableau de bord',
    HOME: 'Accueil',
    COMPANIES: 'Fournisseurs',
    LOCATIONS: 'Lieux',
    CARS: 'Voitures',
    USERS: 'Utilisateurs',
    ABOUT: 'À propos',
    TOS: "Conditions d'utilisation",
    CONTACT: 'Contact',
    LANGUAGE: 'Langue',
    LANGUAGE_FR: 'Français',
    LANGUAGE_EN: 'English',
    SETTINGS: 'Paramètres',
    SIGN_OUT: 'Déconnexion',
    CHANGE_LANGUAGE_ERROR: "Une erreur s'est produite.",
  },
  en: {
    DASHBOARD: 'Dashboard',
    HOME: 'Home',
    COMPANIES: 'Suppliers',
    LOCATIONS: 'Locations',
    CARS: 'Cars',
    USERS: 'Users',
    ABOUT: 'About',
    TOS: 'Terms of Service',
    CONTACT: 'Contact',
    LANGUAGE: 'Language',
    LANGUAGE_FR: 'Français',
    LANGUAGE_EN: 'English',
    SETTINGS: 'Settings',
    SIGN_OUT: 'Sign out',
    CHANGE_LANGUAGE_ERROR: 'An error occured.',
  },
})

LangHelper.setLanguage(strings)
export { strings }

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
    SETTINGS: 'Paramètres',
    SIGN_OUT: 'Déconnexion',
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
    SETTINGS: 'Settings',
    SIGN_OUT: 'Sign out',
  },
})

LangHelper.setLanguage(strings)
export { strings }

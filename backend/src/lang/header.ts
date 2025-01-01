import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

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
    COUNTRIES: 'Pays',
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
    COUNTRIES: 'Countries',
  },
})

langHelper.setLanguage(strings)
export { strings }

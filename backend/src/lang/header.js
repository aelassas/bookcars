import LocalizedStrings from 'react-localization'
import * as LangHelper from '../common/LangHelper'

export const strings = new LocalizedStrings({
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
        SIGN_OUT: 'Déconnexion'
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
        SIGN_OUT: 'Sign out'
    }
})

const language = LangHelper.getLanguage()
strings.setLanguage(language)

import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        DASHBOARD: 'Tableau de bord',
        COMPANIES: 'Sociétés de location',
        LOCATIONS: 'Lieux',
        RESERVATIONS: 'Réservations',
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
        COMPANIES: 'Booking companies',
        LOCATIONS: 'Locations',
        RESERVATIONS: 'Bookings',
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
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

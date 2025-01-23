import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    DASHBOARD: 'Tableau de bord',
    SCHEDULER: 'Planificateur',
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
    SCHEDULER: 'Vehicle Scheduler',
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
  es: {
    DASHBOARD: 'Panel de control',
    SCHEDULER: 'Programador',
    HOME: 'Inicio',
    COMPANIES: 'Proveedores',
    LOCATIONS: 'Ubicaciones',
    CARS: 'Coches',
    USERS: 'Usuarios',
    ABOUT: 'Acerca de',
    TOS: 'Términos de servicio',
    CONTACT: 'Contacto',
    LANGUAGE: 'Idioma',
    SETTINGS: 'Configuración',
    SIGN_OUT: 'Cerrar sesión',
    COUNTRIES: 'Países',
  },
})

langHelper.setLanguage(strings)
export { strings }

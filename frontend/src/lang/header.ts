import LocalizedStrings from 'react-localization'
import * as langHelper from '@/common/langHelper'

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
    PRIVACY_POLICY: 'Politique de Confidentialité',
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
    PRIVACY_POLICY: 'Privacy Policy',
  },
  es: {
    SIGN_IN: 'Iniciar sesión',
    HOME: 'Inicio',
    BOOKINGS: 'Reservas',
    ABOUT: 'Acerca de',
    TOS: 'Términos de Servicio',
    CONTACT: 'Contacto',
    LANGUAGE: 'Idioma',
    SETTINGS: 'Configuración',
    SIGN_OUT: 'Cerrar sesión',
    SUPPLIERS: 'Proveedores',
    LOCATIONS: 'Ubicaciones',
    PRIVACY_POLICY: 'Política de Privacidad',
  },
})

langHelper.setLanguage(strings)
export { strings }

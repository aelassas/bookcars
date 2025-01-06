import LocalizedStrings from 'localized-strings'
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
    FAQ: 'FAQ',
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
    FAQ: 'FAQ',
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
    FAQ: 'Preguntas frecuentes',
  },
})

langHelper.setLanguage(strings)
export { strings }

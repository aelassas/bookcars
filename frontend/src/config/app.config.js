import LocalizedStrings from 'react-localization';
import { LANGUAGES } from '../config/env.config';
import { getQueryLanguage, getLanguage } from '../services/user-service';

export const strings = new LocalizedStrings({
    fr: {
        /* Common */
        VALIDATE_EMAIL: "Un e-mail de validation a été envoyé à votre adresse e-mail. Veuillez vérifier votre boîte aux lettres et valider votre compte en cliquant sur le lien dans l'e-mail. Il expirera au bout d'un jour. Si vous n'avez pas reçu d'e-mail de validation, cliquez sur renvoyer.",
        RESEND: 'Renvoyer',
        VALIDATION_EMAIL_SENT: 'E-mail de validation envoyé.',
        VALIDATION_EMAIL_ERROR: "Une erreur s'est produite lors de l'envoi de l'e-mail de validation.",
        /* Header */
        HOME: 'Acceuil',
        COMPANIES: 'Sociétés de location',
        RESERVATIONS: 'Réservations',
        ABOUT: 'À propos',
        TOS: "Conditions d'utilisation",
        CONTACT: 'Contact',
        LANGUAGE: 'Langue',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        SETTINGS: 'Paramètres',
        SIGN_OUT: 'Déconnexion',
        CHANGE_LANGUAGE_ERROR: "Une erreur s'est produite lors du changement de langue.",
        /* No Match */
        NO_MATCH: 'Rien à voir ici!',
        GO_TO_HOME: "Aller à la page d'acceuil",
        /* Sign up */
        SIGN_UP_HEADING: 'Inscription',
        FULL_NAME: 'Nom complet',
        EMAIL: 'E-mail',
        PASSWORD: 'Mot de passe',
        INVALID_EMAIL: 'Adresse e-mail invalide',
        CONFIRM_PASSWORD: 'Confirmer le mot de passe',
        TOS_SIGN_UP: "J'ai lu et j'accepte les conditions générales d'utilisation.",
        SIGN_UP: "S'inscrire",
        CANCEL: 'Annuler',
        ERROR_IN_RECAPTCHA: 'Veuillez remplir le captcha pour continuer.',
        ERROR_IN_PASSWORD: 'Le mot de passe doit contenir au moins 6 caractères.',
        PASSWORDS_DONT_MATCH: "Les mots de passe ne correspondent pas.",
        ERROR_IN_SIGN_UP: "Une erreur s'est produite lors de l'inscription.",
        PLEASE_WAIT: 'Veuillez patienter...',
        /*Sign in */
        SIGN_IN_HEADING: 'Connexion',
        SIGN_IN: 'Se connecter',
        ERROR_IN_SIGN_IN: 'Nous ne pouvons pas nous connecter à votre compte.',
        IS_BLACKLISTED: 'Votre compte est suspendu.',
    },
    en: {
        /* Common */
        VALIDATE_EMAIL: "A validation email has been sent to your email address. Please check your mailbox and validate your account by clicking the link in the email. It will be expire after one day. If you didn't receive the validation email click on resend.",
        RESEND: 'Resend',
        VALIDATION_EMAIL_SENT: 'Validation email sent.',
        VALIDATION_EMAIL_ERROR: 'An error occurred while sending validation email.',
        /* Header */
        HOME: 'Home',
        COMPANIES: 'Booking companies',
        RESERVATIONS: 'Bookings',
        ABOUT: 'About',
        TOS: 'Terms of Service',
        CONTACT: 'Contact',
        LANGUAGE: 'Language',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        SETTINGS: 'Settings',
        SIGN_OUT: 'Sign out',
        CHANGE_LANGUAGE_ERROR: 'An error occurred while changing language.',
        /* No Match */
        NO_MATCH: 'Nothing to see here!',
        GO_TO_HOME: 'Go to the home page',
        /* Sign up */
        SIGN_UP_HEADING: 'Sign up',
        FULL_NAME: 'Full name',
        EMAIL: 'Email',
        PASSWORD: 'Password',
        INVALID_EMAIL: 'Invalid email address',
        CONFIRM_PASSWORD: 'Confirm Password',
        TOS_SIGN_UP: 'I read and agree with the Terms of Use.',
        SIGN_UP: 'Sign up',
        CANCEL: 'Cancel',
        ERROR_IN_RECAPTCHA: 'Fill out the captcha to continue.',
        ERROR_IN_PASSWORD: 'Password must be at least 6 characters long.',
        PASSWORDS_DONT_MATCH: "Passwords don't match.",
        ERROR_IN_SIGN_UP: 'An error occurred during sign up.',
        PLEASE_WAIT: 'Please wait...',
        /*Sign in */
        SIGN_IN_HEADING: 'Sign in',
        SIGN_IN: 'Sign in',
        ERROR_IN_SIGN_IN: "We can't sign in to your account.",
        IS_BLACKLISTED: 'Your account is suspended.',
    }
});

let language = getQueryLanguage();

if (language === '' || !LANGUAGES.includes(language)) {
    language = getLanguage();
}

strings.setLanguage(language);
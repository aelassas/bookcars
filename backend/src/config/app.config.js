import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        /* Common */
        VALIDATE_EMAIL: "Un e-mail de validation a été envoyé à votre adresse e-mail. Veuillez vérifier votre boîte aux lettres et valider votre compte en cliquant sur le lien dans l'e-mail. Il expirera au bout d'un jour. Si vous n'avez pas reçu d'e-mail de validation, cliquez sur renvoyer.",
        RESEND: 'Renvoyer',
        VALIDATION_EMAIL_SENT: 'E-mail de validation envoyé.',
        VALIDATION_EMAIL_ERROR: "Une erreur s'est produite lors de l'envoi de l'e-mail de validation.",
        GENERIC_ERROR: "Une erreur non gérée s'est produite.",
        UPDATED: 'Modifications effectuées avec succès.',
        /* Header */
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
        SIGN_OUT: 'Déconnexion',
        CHANGE_LANGUAGE_ERROR: "Une erreur s'est produite lors du changement de langue.",
        /* No Match */
        NO_MATCH: 'Rien à voir ici !',
        GO_TO_HOME: "Aller à la page d'accueil",
        /* Unauthorized */
        UNAUTHORIZED: 'Accès non autorisé',
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
        /* Create Company */
        CREATE_COMPANY_HEADING: 'Nouvelle société',
        CREATE: 'Créer',
        PHONE: 'Téléphone',
        LOCATION: 'Localisation',
        BIO: 'Bio',
        INVALID_COMPANY_NAME: 'Cette société existe déjà.',
        /* Companies */
        LOADING: 'Chargement...',
        SEARCH_PLACEHOLDER: 'Rechercher...',
        NEW_COMPANY: 'Nouvelle société',
        CONFIRM_TITLE: 'Confirmation',
        DELETE_COMPANY: 'Êtes-vous sûr de vouloir supprimer cette société et toutes ses données ?',
        DELETE: 'Supprimer',
        /* Update Company */
        SAVE: 'Sauvegarder',
        DELETE_AVATAR_CONFIRM: 'Êtes-vous sûr de vouloir supprimer la photo de profil ?',
        /* Reset Password */
        PASSWORD_RESET_HEADING: 'Réinitialisation du mot de passe',
        CURRENT_PASSWORD: 'Mot de passe actuel',
        YOUR_PASSWORD: 'Votre mot de passe',
        CURRENT_PASSWORD_ERROR: 'Mauvais mot de passe',
        NEW_PASSWORD: 'Nouveau mot de passe',
        NEW_PASSWORD_ERROR: 'Veuillez choisir un nouveau mot de passe',
        RESET_PASSWORD: 'Changer le mot de passe',
        PASSWORD_UPDATE_ERROR: "Une erreur s'est produite lors de la modification du mot de passe.",
        PASSWORD_UPDATE: 'Le mot de passe a été mofifié avec succès.',
        /* Settings */
        SETTINGS_UPDATED: 'Paramètres modifiés avec succès.',
        NETWORK_SETTINGS: 'Paramètres Réseau',
        SETTINGS_EMAIL_NOTIFICATIONS: 'Activer les notifications par email',
        /* Locations */
        NEW_LOCATION: 'Nouveau lieu',
        DELETE_LOCATION: 'Êtes-vous sûr de vouloir supprimer ce lieu ?',
        /* Create Location */
        LOCATION_NAME: 'Lieu',
        INVALID_LOCATION: 'Ce lieu existe déjà.',
        LOCATION_CREATED: 'Lieu créé avec succès.',
        /* Update Location */
        UPDATE_LOCATION: 'Modification du lieu',
        LOCATION_UPDATED: 'Lieu modifié avec succès.',
        /* Extras */
        EXTRAS: 'Suppléments',
        NEW_EXTRA: 'Nouveau supplément',
        DELETE_EXTRA: 'Êtes-vous sûr de vouloir supprimer ce supplément ?',
        /* Create Extra */
        EXTRA: 'Supplément',
        INVALID_EXTRA: 'Ce supplément existe déjà.',
        EXTRA_CREATED: 'Supplément créé avec succès.',
        /* Update Extra */
        UPDATE_EXTRA: 'Modification du supplément',
        EXTRA_UPDATED: 'Supplément modifié avec succès.',

        /* Cars */
        NEW_CAR: 'Nouvelle voiture',
        DELETE_CAR: 'Êtes-vous sûr de vouloir supprimer cette voiture ?',
        CAR_CURRENCY: ' DH/jour',
        UPDATE: 'Modifier',
        FUEL_POLICY: 'Politique carburant',
        DIESEL: 'Diesel',
        GASOLINE: 'Essence',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'E',
        GEARBOX_MANUAL: 'Manuelle',
        GEARBOX_AUTOMATIC: 'Automatic',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY_LIKE_TO_LIKE: 'Plein/Plein',
        FUEL_POLICY_FREE_TANK: 'Plein inclus',
        CAR_TYPE_TOOLTIP: 'Cette voiture a un moteur',
        GEARBOX_TYPE_TOOLTIP: 'Cette voiture a une transmission',
        SEATS_TOOLTIP_1: 'Cette voiture a ',
        SEATS_TOOLTIP_2: 'sièges.',
        DOORS_TOOLTIP_1: 'Cette voiture a ',
        DOORS_TOOLTIP_2: 'portes.',
        AIRCON_TOOLTIP: 'Cette voiture a de la climatisation.',
        FUEL_POLICY_LIKE_TO_LIKE_TOOLTIP: 'Cette voiture est fournie avec du carburant dans le réservoir et doit être rendu avec la même quantité de carburant.',
        FUEL_POLICY_FREE_TANK_TOOLTIP: 'Le prix inclus un plein de carburant.',
        MILEAGE: 'Kilométrage',
        MILEAGE_UNIT: 'KM/jour',
        UNLIMITED: 'Illimité',
        CANCELLATION: 'Annulation',
        CANCELLATION_TOOLTIP: 'La réservation peut être annulée avant la date de commencement de la location.',
        AMENDMENTS: 'Modification',
        AMENDMENTS_TOOLTIP: 'La réservation peut être modifiée avant la date de commencement de la location.',
        THEFT_PROTECTION: 'Prontection contre le vol',
        THEFT_PROTECTION_TOOLTIP: 'La location peut inclure une protection contre le vol.',
        COLLISION_DAMAGE_WAVER: 'Couverture en cas de collision',
        COLLISION_DAMAGE_WAVER_TOOLTIP: 'La location peut inclure une couverture en cas de collision.',
        FULL_INSURANCE: 'Assurance Tous Risques',
        FULL_INSURANCE_TOOLTIP: 'La location peut inclure une couverture en cas de collision, de dommages et vol du véhicule.',
        ADDITIONAL_DRIVER: 'Conducteur supplémentaire',
        INCLUDED: 'Inclus',
        UNAVAILABLE: 'Indisponible',
        UNCHECK_ALL: 'Décocher tout',
        CHECK_ALL: 'Cocher tout',

        /* Companies */
        VIEW_COMPANY_TOOLTIP: 'Voir le profil de cette société',
        UPDATE_COMPANY_TOOLTIP: 'Modifier cette société',
        MESSAGE_COMPANY_TOOLTIP: 'Envoyer un message à cette société',
        DELETE_COMPANY_TOOLTIP: 'Supprimer cette société et toutes ses données',

        /* Create Company */
        AVATAR_MANDATORY: "L'image est obligatoire.",
        AVATAR_SIZE_ERROR: "L'image doit être au format 62x24",

        /* Create Car */
        NAME: 'Nom',
        CAR_IMAGE_SIZE_ERROR: "L'image doit être au format 240x160",
    },
    en: {
        /* Common */
        VALIDATE_EMAIL: "A validation email has been sent to your email address. Please check your mailbox and validate your account by clicking the link in the email. It will be expire after one day. If you didn't receive the validation email click on resend.",
        RESEND: 'Resend',
        VALIDATION_EMAIL_SENT: 'Validation email sent.',
        VALIDATION_EMAIL_ERROR: 'An error occurred while sending validation email.',
        GENERIC_ERROR: 'An unhandled error occurred.',
        UPDATED: 'Changes made successfully.',
        /* Header */
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
        SIGN_OUT: 'Sign out',
        CHANGE_LANGUAGE_ERROR: 'An error occurred while changing language.',
        /* No Match */
        NO_MATCH: 'Nothing to see here!',
        GO_TO_HOME: 'Go to the home page',
        /* Unauthorized */
        UNAUTHORIZED: 'Unauthorized access',
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
        /* Create Company */
        CREATE_COMPANY_HEADING: 'New company',
        CREATE: 'Create',
        PHONE: 'Phone',
        LOCATION: 'Location',
        BIO: 'Bio',
        INVALID_COMPANY_NAME: 'This company already exists.',
        /* Companies */
        LOADING: 'Loading...',
        SEARCH_PLACEHOLDER: 'Search...',
        NEW_COMPANY: 'New company',
        CONFIRM_TITLE: 'Confirmation',
        DELETE_COMPANY: 'Are you sure you want to delete this company and all its data?',
        DELETE: 'Delete',
        /* Update Company */
        SAVE: 'Save',
        DELETE_AVATAR_CONFIRM: 'Are you sure you want to delete the profile picture?',
        /* Reset Password */
        PASSWORD_RESET_HEADING: 'Password Reset',
        CURRENT_PASSWORD: 'Current Password',
        YOUR_PASSWORD: 'Your password',
        CURRENT_PASSWORD_ERROR: 'Wrong password',
        NEW_PASSWORD: 'New Password',
        NEW_PASSWORD_ERROR: 'Please choose a new password',
        RESET_PASSWORD: 'Change Password',
        PASSWORD_UPDATE_ERROR: 'An error occurred while updating password.',
        PASSWORD_UPDATE: 'Password changed successfully.',
        /* Settings */
        SETTINGS_UPDATED: 'Settings updated successfully.',
        NETWORK_SETTINGS: 'Network settings',
        SETTINGS_EMAIL_NOTIFICATIONS: 'Enable email notifications',
        /* Locations */
        NEW_LOCATION: 'New location',
        DELETE_LOCATION: 'Are you sure you want to delete this location?',
        /* Create Location */
        LOCATION_NAME: 'Location',
        INVALID_LOCATION: 'This location already exists.',
        LOCATION_CREATED: 'Location created successfully.',
        /* Update Location */
        UPDATE_LOCATION: 'Location update',
        LOCATION_UPDATED: 'Location updated successfully.',
        /* Extras */
        EXTRAS: 'Extras',
        NEW_EXTRA: 'New extra',
        DELETE_EXTRA: 'Are you sure you want to delete this extra?',
        /* Create Extra */
        EXTRA: 'Extra',
        INVALID_EXTRA: 'This extra already exists.',
        EXTRA_CREATED: 'Extra created successfully.',
        /* Update Extra */
        UPDATE_EXTRA: 'Extra update',
        EXTRA_UPDATED: 'Extra updated successfully.',
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

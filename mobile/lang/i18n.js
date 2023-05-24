import i18n from 'i18n-js'
import Env from '../config/env.config'

const COPYRIGHT_PART1 = `Copyright © ${new Date().getFullYear()} Minimalka`

i18n.translations = {
    fr: {
        GENERIC_ERROR: "Une erreur non gérée s'est produite.",
        CHANGE_LANGUAGE_ERROR: "Une erreur s'est produite lors du changement de langue.",
        UPDATED: 'Modifications effectuées avec succès.',
        GO_TO_HOME: "Aller à la page d'accueil",
        FULL_NAME: 'Nom complet',
        EMAIL: 'E-mail',
        PASSWORD: 'Mot de passe',
        EMAIL_ALREADY_REGISTERED: 'Cette adresse e-mail est déjà enregistrée.',
        CONFIRM_PASSWORD: 'Confirmer le mot de passe',
        PHONE: 'Téléphone',
        LOCATION: 'Localisation',
        BIO: 'Bio',
        IMAGE_REQUIRED: "Veuillez ajouter une image.",
        LOADING: 'Chargement...',
        PLEASE_WAIT: 'Veuillez patienter...',
        SEARCH: 'Rechercher',
        SEARCH_PLACEHOLDER: 'Rechercher...',
        CONFIRM_TITLE: 'Confirmation',
        PASSWORD_LENGTH_ERROR: 'Le mot de passe doit contenir au moins 6 caractères.',
        PASSWORDS_DONT_MATCH: "Les mots de passe ne correspondent pas.",
        CREATE: 'Créer',
        UPDATE: 'Modifier',
        DELETE: 'Supprimer',
        SAVE: 'Sauvegarder',
        CANCEL: 'Annuler',
        CHANGE_PASSWORD: 'Changer le mot de passe',
        CHANGE_PASSWORD_TITLE: 'Modification du mot de passe',
        CURRENCY: 'DH',
        DELETE_AVATAR_CONFIRM: 'Êtes-vous sûr de vouloir supprimer la photo ?',
        DELETE_IMAGE: "Supprimer l'image",
        UPLOAD_IMAGE: "Charger une image",
        UNCHECK_ALL: 'Décocher tout',
        CHECK_ALL: 'Cocher tout',
        CLOSE: 'Fermer',
        BOOKING_STATUS: 'Statut',
        BOOKING_STATUS_VOID: 'Vide',
        BOOKING_STATUS_PENDING: 'En cours',
        BOOKING_STATUS_DEPOSIT: 'Acompte',
        BOOKING_STATUS_PAID: 'Payée',
        BOOKING_STATUS_RESERVED: 'Réservée',
        BOOKING_STATUS_CANCELLED: 'Annulée',
        FROM: 'Du',
        TO: 'Au',
        OPTIONAL: 'Paramètres optionnels',
        AND: 'et',
        RECORD_TYPE_ADMIN: 'Admin',
        RECORD_TYPE_COMPANY: 'Société',
        RECORD_TYPE_USER: 'Conducteur',
        TYPE: 'Type',
        CONFIRM: 'Confirmer',
        USER: 'Utilisateur',
        INFO: 'Information',
        USER_TYPE_REQUIRED: 'Veuillez renseigner le champ : Type',
        FIX_ERRORS: 'Veuillez corriger les erreurs.',
        SEND_MESSAGE: 'Envoyer un message',
        VERIFIED: 'Compte vérifié',
        RESEND_ACTIVATION_LINK: "Renvoyer le lien d'activation du compte",
        ACTIVATION_EMAIL_SENT: "E-mail d'activation envoyé.",
        EMAIL_NOT_VALID: 'E-mail non valide',
        PICKUP_LOCATION: 'Lieu de prise en charge',
        DROP_OFF_LOCATION: 'Lieu de restitution',
        PHONE_NOT_VALID: 'Numéro de téléphone non valide',
        ALL: 'Tous',
        ACCEPT_TOS: "J'ai lu et j'accepte les conditions générales d'utilisation.",
        BIRTH_DATE: 'Date de naissance',
        RECAPTCHA_ERROR: 'Veuillez remplir le captcha pour continuer.',
        TOS_ERROR: "Veuillez accepter les conditions générales d'utilisation.",
        BIRTH_DATE_NOT_VALID: 'Vous devez avoir au moins ' + Env.MINIMUM_AGE + ' ans.',
        BIRTH_DATE_NOT_VALID_PART1: 'Le conducteur doit avoir au moins',
        BIRTH_DATE_NOT_VALID_PART2: 'ans.',
        SUPPLIER: 'Fournisseur',
        COPYRIGHT_PART1: COPYRIGHT_PART1,
        COPYRIGHT_PART2: '®',
        COPYRIGHT_PART3: '. Tous droits réservés.',
        SAME_LOCATION: 'Restituer au même endroit',
        FROM_DATE: 'Date de prise en charge',
        FROM_TIME: 'Heure de prise en charge',
        TO_DATE: 'Date de restitution',
        TO_TIME: 'Heure de restitution',
        PICKUP_LOCATION_EMPTY: 'Veuillez saisir un lieu de prise en charge.',
        DROP_OFF_LOCATION_EMPTY: 'Veuillez saisir un lieu de restitution.',
        HOME: 'Accueil',
        ABOUT: 'À propos',
        VALIDATE_EMAIL: "Un e-mail de validation a été envoyé à votre adresse e-mail. Veuillez vérifier votre boîte aux lettres et valider votre compte en cliquant sur le lien dans l'e-mail. Il expirera au bout d'un jour. Si vous n'avez pas reçu d'e-mail de validation, cliquez sur renvoyer.",
        RESEND: 'Renvoyer',
        VALIDATION_EMAIL_SENT: 'E-mail de validation envoyé.',
        VALIDATION_EMAIL_ERROR: "Une erreur s'est produite lors de l'envoi de l'e-mail de validation.",
        TOS: 'Conditions',
        CONTACT: 'Contact',
        SIGN_IN: 'Se connecter',
        SIGN_IN_TITLE: 'Connexion',
        SIGN_UP: "S'inscrire",
        SIGN_UP_TITLE: 'Inscription',
        SIGN_IN_ERROR: "E-mail ou mot de passe incorrect.",
        IS_BLACKLISTED: 'Votre compte est suspendu.',
        FORGOT_PASSWORD: 'Mot de passe oublié ?',
        RESET_PASSWORD: 'Veuillez saisir votre adresse e-mail afin de vous envoyer un e-mail pour réinitialiser votre mot de passe.',
        RESET: 'Réinitialiser',
        RESET_EMAIL_SENT: 'E-mail de réinitialisation du mot de passe envoyé.',
        REQUIRED: 'Veuillez renseigner ce champ.',
        SIGN_OUT: 'Déconnexion',
        BOOKINGS: 'Réservations',
        LANGUAGE: 'Langue',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        CARS: 'Voitures',
        EMAIL_ERROR: 'Adresse e-mail non enregistrée',
        SETTINGS: 'Paramètres',
        ENABLE_EMAIL_NOTIFICATIONS: 'Activer les notifications par email',
        SETTINGS_UPDATED: 'Paramètres modifiés avec succès.',
        CURRENT_PASSWORD: 'Mot de passe actuel',
        PASSWORD_ERROR: 'Mot de passe incorrect',
        NEW_PASSWORD: 'Nouveau mot de passe',
        PASSWORD_UPDATE: 'Le mot de passe a été mofifié avec succès.',
        PASSWORD_UPDATE_ERROR: "Une erreur s'est produite lors de la modification du mot de passe.",
        EMPTY_CAR_LIST: 'Pas de voitures.',
        CAR_CURRENCY: ' DH/jour',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'E',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY: 'Politique carburant',
        FUEL_POLICY_LIKE_FOR_LIKE: 'Plein/Plein',
        FUEL_POLICY_FREE_TANK: 'Plein inclus',
        MILEAGE: 'Kilométrage',
        MILEAGE_UNIT: 'KM/jour',
        UNLIMITED: 'Illimité',
        LIMITED: 'Limité',
        CANCELLATION: 'Annulation',
        AMENDMENTS: 'Modifications',
        THEFT_PROTECTION: 'Protection contre le vol',
        COLLISION_DAMAGE_WAVER: 'Couverture en cas de collision',
        FULL_INSURANCE: 'Assurance Tous Risques',
        ADDITIONAL_DRIVER: 'Conducteur supplémentaire',
        INCLUDED: 'Inclus',
        UNAVAILABLE: 'Indisponible',
        PRICE_DAYS_PART_1: 'Prix pour',
        PRICE_DAYS_PART_2: 'jour',
        PRICE_PER_DAY: 'Prix par jour :',
        BOOK: 'Réserver',
        STAY_CONNECTED: 'Rester connecté',
        CREATE_BOOKING: 'Réserver Maintenant',
        BOOKING_OPTIONS: 'Vos options de réservation',
        BOOKING_DETAILS: 'Vos données de réservation',
        DAYS: 'Jours',
        COMPANY: 'Société',
        CAR: 'Voiture',
        COST: 'Total',
        DRIVER_DETAILS: 'Informations du conducteur principal',
        EMAIL_INFO: 'Vous recevrez une confirmation à cette adresse.',
        PHONE_INFO: "Si nous avons besoin de vous contacter d'urgence.",
        PAYMENT: 'Paiement sécurisé',
        CARD_NAME: 'Nom du titulaire',
        CARD_NUMBER: 'Numéro de la carte',
        CARD_MONTH: 'Mois (MM)',
        CARD_MONTH_NOT_VALID: 'Mois non valide',
        CARD_YEAR: 'Année (AA)',
        CARD_YEAR_NOT_VALID: 'Année non valide',
        CARD_NUMBER_NOT_VALID: 'Numéro de carte non valide',
        CVV: 'Code de sécurité',
        CVV_NOT_VALID: 'Code de sécurité non valide',
        BOOK_NOW: 'Réserver',
        SECURE_PAYMENT_INFO: 'Vos données sont protégées par le paiement sécurisé SSL.',
        CARD_DATE_ERROR: 'Date de carte non valide.',
        BOOKING_SUCCESS: 'Votre réservation et votre paiement ont été effectués avec succès. Nous vous avons envoyé un e-mail de confirmation.',
        BOOKING_EMAIL_ALREADY_REGISTERED: 'Cette adresse e-mail est déjà enregistrée. Veuillez vous connecter.',
        EMPTY_BOOKING_LIST: 'Pas de réservations.',
        OPTIONS: 'Options',
        ENGINE: 'Moteur',
        DIESEL: 'Diesel',
        GASOLINE: 'Essence',
        GEARBOX: 'Transmission',
        GEARBOX_AUTOMATIC: 'Automatique',
        GEARBOX_MANUAL: 'Manuelle',
        DEPOSIT: 'Dépôt de garantie',
        LESS_THAN_2500: 'Moins de 2500 DH',
        LESS_THAN_5000: 'Moins de 5000 DH',
        LESS_THAN_7500: 'Moins de 7500 DH',
        CANCEL_BOOKING_BTN: 'Annuler cette réservation',
        CANCEL_BOOKING: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
        CANCEL_BOOKING_REQUEST_SENT: "Votre requête d'annulation a bien été prise en compte. Nous vous contacterons pour finaliser la procédure d'annulation.",
        OF: 'sur',
        EMPTY_NOTIFICATION_LIST: 'Pas de notifications',
        DELETE_NOTIFICATION: 'Êtes-vous sûr de vouloir supprimer cette notification ?',
        DELETE_NOTIFICATIONS: 'Êtes-vous sûr de vouloir supprimer ces notifications ?',
        DELETE_AVATAR: 'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
        CAMERA_PERMISSION: "L'autorisation d'accéder aux fichiers et contenus multimédias est requise!",
        BOOKING_DELETED: 'Cette réservation a été supprimée.',
        PAYMENT_OPTIONS: 'Options de paiement',
        PAY_LATER: 'Payer plus tard',
        PAY_LATER_INFO: 'Modification et annulation gratuites',
        PAY_ONLINE: 'Payer en ligne',
        PAY_ONLINE_INFO: 'Modification et annulation sous conditions',
        PAY_LATER_SUCCESS: 'Votre réservation a été effectué avec succès. Nous vous avons envoyé un e-mail de confirmation.',
    },
    en: {
        GENERIC_ERROR: 'An unhandled error occurred.',
        CHANGE_LANGUAGE_ERROR: 'An error occurred while changing language.',
        UPDATED: 'Changes made successfully.',
        GO_TO_HOME: 'Go to the home page',
        FULL_NAME: 'Full name',
        EMAIL: 'Email',
        PASSWORD: 'Password',
        EMAIL_ALREADY_REGISTERED: 'This email address is already registered.',
        CONFIRM_PASSWORD: 'Confirm Password',
        PHONE: 'Phone',
        LOCATION: 'Location',
        BIO: 'Bio',
        IMAGE_REQUIRED: 'Please add an image.',
        LOADING: 'Loading...',
        PLEASE_WAIT: 'Please wait...',
        SEARCH: 'Search',
        SEARCH_PLACEHOLDER: 'Search...',
        CONFIRM_TITLE: 'Confirmation',
        PASSWORD_LENGTH_ERROR: 'Password must be at least 6 characters long.',
        PASSWORDS_DONT_MATCH: "Passwords don't match.",
        CREATE: 'Create',
        UPDATE: 'Save',
        DELETE: 'Delete',
        SAVE: 'Save',
        CANCEL: 'Cancel',
        CHANGE_PASSWORD: 'Change Password',
        CHANGE_PASSWORD_TITLE: 'Password modification',
        CURRENCY: 'DH',
        DELETE_AVATAR_CONFIRM: 'Are you sure you want to delete the picture?',
        UPLOAD_IMAGE: 'Upload image',
        DELETE_IMAGE: 'Delete image',
        UNCHECK_ALL: 'Uncheck all',
        CHECK_ALL: 'Check all',
        CLOSE: 'Close',
        BOOKING_STATUS: 'Status',
        BOOKING_STATUS_VOID: 'Void',
        BOOKING_STATUS_PENDING: 'Pending',
        BOOKING_STATUS_DEPOSIT: 'Deposit',
        BOOKING_STATUS_PAID: 'Paid',
        BOOKING_STATUS_RESERVED: 'Reserved',
        BOOKING_STATUS_CANCELLED: 'Cancelled',
        FROM: 'From',
        TO: 'To',
        OPTIONAL: 'Optional Parameters',
        AND: 'and',
        RECORD_TYPE_ADMIN: 'Admin',
        RECORD_TYPE_COMPANY: 'Company',
        RECORD_TYPE_USER: 'Driver',
        TYPE: 'Type',
        CONFIRM: 'Confirm',
        USER: 'User',
        INFO: 'Information',
        USER_TYPE_REQUIRED: 'Please fill in the field: Type',
        FIX_ERRORS: 'Please fix errors.',
        SEND_MESSAGE: 'Send a message',
        VERIFIED: 'Verified account',
        CAR: 'car',
        RESEND_ACTIVATION_LINK: "Resend account activation link",
        ACTIVATION_EMAIL_SENT: 'Activation email sent.',
        EMAIL_NOT_VALID: 'Invalid email address',
        PICKUP_LOCATION: 'Pickup location',
        DROP_OFF_LOCATION: 'Drop-off location',
        PHONE_NOT_VALID: 'Invalid phone number',
        ALL: 'All',
        BIRTH_DATE: 'Birth date',
        RECAPTCHA_ERROR: 'Fill out the captcha to continue.',
        TOS_ERROR: 'Please accept the Terms of Use.',
        BIRTH_DATE_NOT_VALID: 'You must be at least ' + Env.MINIMUM_AGE + ' years old.',
        BIRTH_DATE_NOT_VALID_PART1: 'The driver must be at least',
        BIRTH_DATE_NOT_VALID_PART2: 'years old.',
        SUPPLIER: 'Supplier',
        COPYRIGHT_PART1: COPYRIGHT_PART1,
        COPYRIGHT_PART2: '®',
        COPYRIGHT_PART3: '. All rights reserved.',
        SAME_LOCATION: 'Return to same location',
        FROM_DATE: 'Pickup date',
        FROM_TIME: 'Pickup time',
        TO_DATE: 'Drop-off date',
        TO_TIME: 'Drop-off time',
        PICKUP_LOCATION_EMPTY: 'Please enter a pick up location.',
        DROP_OFF_LOCATION_EMPTY: 'Please enter a drop-off location.',
        HOME: 'Home',
        ABOUT: 'About',
        VALIDATE_EMAIL: "A validation email has been sent to your email address. Please check your mailbox and validate your account by clicking the link in the email. It will be expire after one day. If you didn't receive the validation email click on resend.",
        RESEND: 'Resend',
        VALIDATION_EMAIL_SENT: 'Validation email sent.',
        VALIDATION_EMAIL_ERROR: 'An error occurred while sending validation email.',
        TOS: 'Terms of Service',
        CONTACT: 'Contact',
        SIGN_IN: 'Sign in',
        SIGN_IN_TITLE: 'Sign in',
        SIGN_UP: 'Sign up',
        SIGN_UP_TITLE: 'Sign up',
        SIGN_IN_ERROR: 'Incorrect email or password.',
        IS_BLACKLISTED: 'Your account is suspended.',
        FORGOT_PASSWORD: 'Forgot password?',
        ACCEPT_TOS: 'I read and agree with the Terms of Use.',
        RESET_PASSWORD: 'Please enter your email address so we can send you an email to reset your password.',
        RESET: 'Reset',
        RESET_EMAIL_SENT: 'Password reset email sent.',
        REQUIRED: 'This field is required',
        SIGN_OUT: 'Sign out',
        BOOKINGS: 'Bookings',
        LANGUAGE: 'Language',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        CARS: 'Cars',
        EMAIL_ERROR: 'Email address not registered',
        SETTINGS: 'Settings',
        ENABLE_EMAIL_NOTIFICATIONS: 'Enable email notifications',
        SETTINGS_UPDATED: 'Settings updated successfully.',
        CURRENT_PASSWORD: 'Current Password',
        PASSWORD_ERROR: 'Wrong password',
        NEW_PASSWORD: 'New Password',
        PASSWORD_UPDATE: 'Password changed successfully.',
        PASSWORD_UPDATE_ERROR: 'An error occurred while updating password.',
        EMPTY_CAR_LIST: 'No cars.',
        CAR_CURRENCY: ' DH/day',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'G',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY: 'Fuel policy',
        FUEL_POLICY_LIKE_FOR_LIKE: 'Like for Like',
        FUEL_POLICY_FREE_TANK: 'Free tank',
        MILEAGE: 'Mileage',
        MILEAGE_UNIT: 'KM/day',
        UNLIMITED: 'Unlimited',
        LIMITED: 'Limited',
        CANCELLATION: 'Cancellation',
        AMENDMENTS: 'Amendments',
        THEFT_PROTECTION: 'Theft protection',
        COLLISION_DAMAGE_WAVER: 'Collision damage waiver',
        FULL_INSURANCE: 'Full insurance',
        ADDITIONAL_DRIVER: 'Additional driver',
        INCLUDED: 'Included',
        UNAVAILABLE: 'Unavailable',
        PRICE_DAYS_PART_1: 'Price for',
        PRICE_DAYS_PART_2: 'day',
        PRICE_PER_DAY: 'Price per day:',
        BOOK: 'Choose this car',
        STAY_CONNECTED: 'Stay connected',
        CREATE_BOOKING: 'Book Now',
        BOOKING_OPTIONS: 'Your booking options',
        BOOKING_DETAILS: 'Your booking details',
        DAYS: 'Days',
        COMPANY: 'Company',
        COST: 'COST',
        DRIVER_DETAILS: 'Driver details',
        EMAIL_INFO: 'You will receive a confirmation email at this address.',
        PHONE_INFO: 'If we need to contact you urgently.',
        PAYMENT: 'Secure payment',
        CARD_NAME: 'Name on Card',
        CARD_NUMBER: 'Card number',
        CARD_MONTH: 'Month (MM)',
        CARD_MONTH_NOT_VALID: 'Invalid month',
        CARD_YEAR: 'Year (YY)',
        CARD_YEAR_NOT_VALID: 'Invalid year',
        CARD_NUMBER_NOT_VALID: 'Invalid card number',
        CVV: 'Card Validation Code',
        CVV_NOT_VALID: 'Invalid Card Validation Code',
        BOOK_NOW: 'Book  now',
        SECURE_PAYMENT_INFO: 'Your data is protected by SSL secure payment.',
        CARD_DATE_ERROR: 'Invalid card date.',
        BOOKING_SUCCESS: 'Your booking and payment were successfully done. We have sent you a confirmation email.',
        BOOKING_EMAIL_ALREADY_REGISTERED: 'This email address is already registered. Please sign in.',
        EMPTY_BOOKING_LIST: 'No bookings.',
        OPTIONS: 'Options',
        ENGINE: 'Engine',
        DIESEL: 'Diesel',
        GASOLINE: 'Gasoline',
        GEARBOX: 'Gearbox',
        GEARBOX_AUTOMATIC: 'Automatic',
        GEARBOX_MANUAL: 'Manual',
        DEPOSIT: 'Deposit at pick-up',
        LESS_THAN_2500: 'Less than 2500 DH',
        LESS_THAN_5000: 'Less than 5000 DH',
        LESS_THAN_7500: 'Less than 7500 DH',
        CANCEL_BOOKING_BTN: 'Cancel this booking',
        CANCEL_BOOKING: 'Are you sure you want to cancel this booking?',
        CANCEL_BOOKING_REQUEST_SENT: 'Your cancel request hes been submited. We will contact you to finalize the cancellation procedure.',
        OF: 'of',
        EMPTY_NOTIFICATION_LIST: 'No notifications',
        DELETE_NOTIFICATION: 'Are you sure you want to delete this notification?',
        DELETE_NOTIFICATIONS: 'Are you sure you want to delete these notifications?',
        DELETE_AVATAR: 'Are you sure you want to delete your profile picture?',
        CAMERA_PERMISSION: 'Permission to access camera roll is required!',
        BOOKING_DELETED: 'This booking was deleted.',
        PAYMENT_OPTIONS: 'Payment options',
        PAY_LATER: 'Paye later',
        PAY_LATER_INFO: 'Free amendments and cancellation',
        PAY_ONLINE: 'Pay online',
        PAY_ONLINE_INFO: 'Amendments and cancellation under conditions',
        PAY_LATER_SUCCESS: 'Your booking were successfully done. We have sent you a confirmation email.',
    },
    pl: {
        GENERIC_ERROR: 'An unhandled error occurred.',
        CHANGE_LANGUAGE_ERROR: 'An error occurred while changing language.',
        UPDATED: 'Changes made successfully.',
        GO_TO_HOME: 'Go to the home page',
        FULL_NAME: 'Full name',
        EMAIL: 'Email',
        PASSWORD: 'Password',
        EMAIL_ALREADY_REGISTERED: 'This email address is already registered.',
        CONFIRM_PASSWORD: 'Confirm Password',
        LOCATION: 'Location',
        BIO: 'Bio',
        IMAGE_REQUIRED: 'Please add an image.',
        LOADING: 'Loading...',
        PLEASE_WAIT: 'Please wait...',
        SEARCH: 'Search',
        SEARCH_PLACEHOLDER: 'Search...',
        CONFIRM_TITLE: 'Confirmation',
        PASSWORD_LENGTH_ERROR: 'Password must be at least 6 characters long.',
        PASSWORDS_DONT_MATCH: "Passwords don't match.",
        CREATE: 'Create',
        UPDATE: 'Save',
        DELETE: 'Delete',
        SAVE: 'Save',
        CANCEL: 'Cancel',
        CHANGE_PASSWORD: 'Change Password',
        CHANGE_PASSWORD_TITLE: 'Password modification',
        CURRENCY: 'DH',
        DELETE_AVATAR_CONFIRM: 'Are you sure you want to delete the picture?',
        UPLOAD_IMAGE: 'Upload image',
        DELETE_IMAGE: 'Delete image',
        UNCHECK_ALL: 'Uncheck all',
        CHECK_ALL: 'Check all',
        CLOSE: 'Close',
        BOOKING_STATUS: 'Status',
        BOOKING_STATUS_VOID: 'Void',
        BOOKING_STATUS_PENDING: 'Pending',
        BOOKING_STATUS_DEPOSIT: 'Deposit',
        BOOKING_STATUS_PAID: 'Paid',
        BOOKING_STATUS_RESERVED: 'Reserved',
        BOOKING_STATUS_CANCELLED: 'Cancelled',
        FROM: 'From',
        TO: 'To',
        OPTIONAL: 'Optional Parameters',
        AND: 'and',
        RECORD_TYPE_ADMIN: 'Admin',
        RECORD_TYPE_COMPANY: 'Company',
        RECORD_TYPE_USER: 'Driver',
        TYPE: 'Type',
        CONFIRM: 'Confirm',
        USER: 'User',
        INFO: 'Information',
        USER_TYPE_REQUIRED: 'Please fill in the field: Type',
        FIX_ERRORS: 'Please fix errors.',
        SEND_MESSAGE: 'Send a message',
        VERIFIED: 'Verified account',
        CAR: 'car',
        RESEND_ACTIVATION_LINK: "Resend account activation link",
        ACTIVATION_EMAIL_SENT: 'Activation email sent.',
        EMAIL_NOT_VALID: 'Invalid email address',
        PICKUP_LOCATION: 'Pickup location',
        DROP_OFF_LOCATION: 'Drop-off location',
        PHONE_NOT_VALID: 'Invalid phone number',
        ALL: 'All',
        TOS: 'I read and agree with the Terms of Use.',
        BIRTH_DATE: 'Birth date',
        RECAPTCHA_ERROR: 'Fill out the captcha to continue.',
        TOS_ERROR: 'Please accept the Terms of Use.',
        BIRTH_DATE_NOT_VALID: 'You must be at least ' + Env.MINIMUM_AGE + ' years old.',
        BIRTH_DATE_NOT_VALID_PART1: 'The driver must be at least',
        BIRTH_DATE_NOT_VALID_PART2: 'years old.',
        SUPPLIER: 'Supplier',
        COPYRIGHT_PART1: COPYRIGHT_PART1,
        COPYRIGHT_PART2: '®',
        COPYRIGHT_PART3: '. All rights reserved.',
        SAME_LOCATION: 'Return to same location',
        FROM_DATE: 'Pickup date',
        FROM_TIME: 'Pickup time',
        TO_DATE: 'Drop-off date',
        TO_TIME: 'Drop-off time',
        PICKUP_LOCATION_EMPTY: 'Please enter a pick up location.',
        DROP_OFF_LOCATION_EMPTY: 'Please enter a drop-off location.',
        HOME: 'Home',
        ABOUT: 'About',
        VALIDATE_EMAIL: "A validation email has been sent to your email address. Please check your mailbox and validate your account by clicking the link in the email. It will be expire after one day. If you didn't receive the validation email click on resend.",
        RESEND: 'Resend',
        VALIDATION_EMAIL_SENT: 'Validation email sent.',
        VALIDATION_EMAIL_ERROR: 'An error occurred while sending validation email.',
        CONTACT: 'Contact',
        SIGN_IN: 'Sign in',
        SIGN_IN_TITLE: 'Sign in',
        SIGN_UP: 'Sign up',
        SIGN_UP_TITLE: 'Sign up',
        SIGN_IN_ERROR: 'Incorrect email or password.',
        IS_BLACKLISTED: 'Your account is suspended.',
        FORGOT_PASSWORD: 'Forgot password?',
        PHONE: 'Phone',
        ACCEPT_TOS: 'I read and agree with the Terms of Use.',
        RESET_PASSWORD: 'Please enter your email address so we can send you an email to reset your password.',
        RESET: 'Reset',
        RESET_EMAIL_SENT: 'Password reset email sent.',
        REQUIRED: 'This field is required',
        SIGN_OUT: 'Sign out',
        BOOKINGS: 'Bookings',
        LANGUAGE: 'Language',
        LANGUAGE_FR: 'Français',
        LANGUAGE_EN: 'English',
        CARS: 'Cars',
        EMAIL_ERROR: 'Email address not registered',
        SETTINGS: 'Settings',
        ENABLE_EMAIL_NOTIFICATIONS: 'Enable email notifications',
        SETTINGS_UPDATED: 'Settings updated successfully.',
        CURRENT_PASSWORD: 'Current Password',
        PASSWORD_ERROR: 'Wrong password',
        NEW_PASSWORD: 'New Password',
        PASSWORD_UPDATE: 'Password changed successfully.',
        PASSWORD_UPDATE_ERROR: 'An error occurred while updating password.',
        EMPTY_CAR_LIST: 'No cars.',
        CAR_CURRENCY: ' DH/day',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'G',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY: 'Fuel policy',
        FUEL_POLICY_LIKE_FOR_LIKE: 'Like for Like',
        FUEL_POLICY_FREE_TANK: 'Free tank',
        MILEAGE: 'Mileage',
        MILEAGE_UNIT: 'KM/day',
        UNLIMITED: 'Unlimited',
        LIMITED: 'Limited',
        CANCELLATION: 'Cancellation',
        AMENDMENTS: 'Amendments',
        THEFT_PROTECTION: 'Theft protection',
        COLLISION_DAMAGE_WAVER: 'Collision damage waiver',
        FULL_INSURANCE: 'Full insurance',
        ADDITIONAL_DRIVER: 'Additional driver',
        INCLUDED: 'Included',
        UNAVAILABLE: 'Unavailable',
        PRICE_DAYS_PART_1: 'Price for',
        PRICE_DAYS_PART_2: 'day',
        PRICE_PER_DAY: 'Price per day:',
        BOOK: 'Choose this car',
        STAY_CONNECTED: 'Stay connected',
        CREATE_BOOKING: 'Book Now',
        BOOKING_OPTIONS: 'Your booking options',
        BOOKING_DETAILS: 'Your booking details',
        DAYS: 'Days',
        COMPANY: 'Company',
        COST: 'COST',
        DRIVER_DETAILS: 'Driver details',
        EMAIL_INFO: 'You will receive a confirmation email at this address.',
        PHONE_INFO: 'If we need to contact you urgently.',
        PAYMENT: 'Secure payment',
        CARD_NAME: 'Name on Card',
        CARD_NUMBER: 'Card number',
        CARD_MONTH: 'Month (MM)',
        CARD_MONTH_NOT_VALID: 'Invalid month',
        CARD_YEAR: 'Year (YY)',
        CARD_YEAR_NOT_VALID: 'Invalid year',
        CARD_NUMBER_NOT_VALID: 'Invalid card number',
        CVV: 'Card Validation Code',
        CVV_NOT_VALID: 'Invalid Card Validation Code',
        BOOK_NOW: 'Book  now',
        SECURE_PAYMENT_INFO: 'Your data is protected by SSL secure payment.',
        CARD_DATE_ERROR: 'Invalid card date.',
        BOOKING_SUCCESS: 'Your booking and payment were successfully done. We have sent you a confirmation email.',
        BOOKING_EMAIL_ALREADY_REGISTERED: 'This email address is already registered. Please sign in.',
        EMPTY_BOOKING_LIST: 'No bookings.',
        OPTIONS: 'Options',
        ENGINE: 'Engine',
        DIESEL: 'Diesel',
        GASOLINE: 'Gasoline',
        GEARBOX: 'Gearbox',
        GEARBOX_AUTOMATIC: 'Automatic',
        GEARBOX_MANUAL: 'Manual',
        DEPOSIT: 'Deposit at pick-up',
        LESS_THAN_2500: 'Less than 2500 DH',
        LESS_THAN_5000: 'Less than 5000 DH',
        LESS_THAN_7500: 'Less than 7500 DH',
        CANCEL_BOOKING_BTN: 'Cancel this booking',
        CANCEL_BOOKING: 'Are you sure you want to cancel this booking?',
        CANCEL_BOOKING_REQUEST_SENT: 'Your cancel request hes been submited. We will contact you to finalize the cancellation procedure.',
        OF: 'of',
        EMPTY_NOTIFICATION_LIST: 'No notifications',
        DELETE_NOTIFICATION: 'Are you sure you want to delete this notification?',
        DELETE_NOTIFICATIONS: 'Are you sure you want to delete these notifications?',
        DELETE_AVATAR: 'Are you sure you want to delete your profile picture?',
        CAMERA_PERMISSION: 'Permission to access camera roll is required!',
        BOOKING_DELETED: 'This booking was deleted.',
        PAYMENT_OPTIONS: 'Payment options',
        PAY_LATER: 'Paye later',
        PAY_LATER_INFO: 'Free amendments and cancellation',
        PAY_ONLINE: 'Pay online',
        PAY_ONLINE_INFO: 'Amendments and cancellation under conditions',
        PAY_LATER_SUCCESS: 'Your booking were successfully done. We have sent you a confirmation email.',
    }
}

i18n.fallbacks = true
export default i18n

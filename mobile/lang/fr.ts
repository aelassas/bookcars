import * as env from '../config/env.config'

export const fr = {
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
  IMAGE_REQUIRED: 'Veuillez ajouter une image.',
  LOADING: 'Chargement...',
  PLEASE_WAIT: 'Veuillez patienter...',
  SEARCH: 'Rechercher',
  SEARCH_PLACEHOLDER: 'Rechercher...',
  CONFIRM_TITLE: 'Confirmation',
  PASSWORD_LENGTH_ERROR: 'Le mot de passe doit contenir au moins 6 caractères.',
  PASSWORDS_DONT_MATCH: 'Les mots de passe ne correspondent pas.',
  CREATE: 'Créer',
  UPDATE: 'Modifier',
  DELETE: 'Supprimer',
  SAVE: 'Sauvegarder',
  CANCEL: 'Annuler',
  CHANGE_PASSWORD: 'Changer le mot de passe',
  CHANGE_PASSWORD_TITLE: 'Modification du mot de passe',
  DELETE_AVATAR_CONFIRM: 'Êtes-vous sûr de vouloir supprimer la photo ?',
  DELETE_IMAGE: "Supprimer l'image",
  UPLOAD_IMAGE: 'Charger une image',
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
  RECORD_TYPE_SUPPLIER: 'Fournisseur',
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
  TOS_MENU: 'Conditions',
  ACCEPT_TOS: "J'ai lu et j'accepte les conditions générales d'utilisation.",
  BIRTH_DATE: 'Date de naissance',
  RECAPTCHA_ERROR: 'Veuillez remplir le captcha pour continuer.',
  TOS_ERROR: "Veuillez accepter les conditions générales d'utilisation.",
  BIRTH_DATE_NOT_VALID: `Vous devez avoir au moins ${env.MINIMUM_AGE} ans.`,
  BIRTH_DATE_NOT_VALID_PART1: 'Le conducteur doit avoir au moins',
  BIRTH_DATE_NOT_VALID_PART2: 'ans.',
  SUPPLIER: 'Fournisseur',
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
  CONTACT: 'Contact',
  SIGN_IN: 'Se connecter',
  SIGN_IN_TITLE: 'Connexion',
  SIGN_UP: "S'inscrire",
  SIGN_UP_TITLE: 'Inscription',
  SIGN_IN_ERROR: 'E-mail ou mot de passe incorrect.',
  IS_BLACKLISTED: 'Votre compte est suspendu.',
  FORGOT_PASSWORD: 'Mot de passe oublié ?',
  RESET_PASSWORD: 'Veuillez saisir votre adresse e-mail afin de vous envoyer un e-mail pour réinitialiser votre mot de passe.',
  RESET: 'Réinitialiser',
  RESET_EMAIL_SENT: 'E-mail de réinitialisation du mot de passe envoyé.',
  REQUIRED: 'Veuillez renseigner ce champ.',
  SIGN_OUT: 'Déconnexion',
  BOOKINGS: 'Réservations',
  LANGUAGE: 'Langue',
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
  CURRENCY: env.CURRENCY,
  DAILY: '/jour',
  DIESEL_SHORT: 'D',
  GASOLINE_SHORT: 'E',
  ELECTRIC_SHORT: 'ELEC',
  HYBRID_SHORT: 'H',
  PLUG_IN_HYBRID_SHORT: 'HR',
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
  BOOKING_SUCCESS: 'Votre paiement a été effectué avec succès. Nous vous avons envoyé un e-mail de confirmation.',
  BOOKING_EMAIL_ALREADY_REGISTERED: 'Cette adresse e-mail est déjà enregistrée. Veuillez vous connecter.',
  EMPTY_BOOKING_LIST: 'Pas de réservations.',
  OPTIONS: 'Options',
  ENGINE: 'Moteur',
  DIESEL: 'Diesel',
  GASOLINE: 'Essence',
  ELECTRIC: 'Électrique',
  HYBRID: 'Hybride',
  PLUG_IN_HYBRID: 'Hybride rechargeable',
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
  PAY_LATER_SUCCESS: 'Votre réservation a été effectuée avec succès. Nous vous avons envoyé un e-mail de confirmation.',
  FROM_DATE_EMPTY: 'Veuillez saisir la date de prise en charge.',
  FROM_TIME_EMPTY: "Veuillez saisir l'heure de prise en charge.",
  TO_DATE_EMPTY: 'Veuillez saisir la date de restitution.',
  TO_TIME_EMPTY: "Veuillez saisir l'heure de restitution.",
  PAYMENT_FAILED: 'Paiement échoué.',
}

import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        BOOKING_HEADING: 'Réserver Maintenant',
        BOOKING_OPTIONS: 'Vos options de réservation',
        BOOKING_DETAILS: 'Vos données de réservation',
        DAYS: 'Jours',
        CAR: 'Voiture',
        COMPANY: 'Société',
        COST: 'Total',
        DRIVER_DETAILS: 'Informations du conducteur principal',
        EMAIL_INFO: 'Vous recevrez une confirmation à cette adresse.',
        PHONE_INFO: "Si nous avons besoin de vous contacter d'urgence.",
        PAYMENT: 'Paiement sécurisé',
        CARD_NUMBER: 'Numéro de la carte',
        CARD_MONTH: 'Mois (MM)',
        CARD_MONTH_NOT_VALID: 'Mois non valide',
        CARD_YEAR: 'Année (AA)',
        CARD_YEAR_NOT_VALID: 'Année non valide',
        CARD_NUMBER_NOT_VALID: 'Numéro de carte non valide',
        CVV: 'Code de sécurité',
        CVV_NOT_VALID: 'Code de sécurité non valide',
        BOOK: 'Réserver',
        SIGN_IN: 'Se connecter ?',
        SECURE_PAYMENT_INFO: 'Vos données sont protégées par le paiement sécurisé SSL.',
        CARD_DATE_ERROR: 'Date de carte non valide.'
    },
    en: {
        BOOKING_HEADING: 'Book now',
        BOOKING_OPTIONS: 'Your booking options',
        BOOKING_DETAILS: 'Your booking details',
        DAYS: 'Days',
        CAR: 'Car',
        COMPANY: 'Company',
        COST: 'COST',
        DRIVER_DETAILS: 'Driver details',
        EMAIL_INFO: 'You will receive a confirmation email at this address.',
        PHONE_INFO: 'If we need to contact you urgently.',
        PAYMENT: 'Secure payment',
        CARD_NUMBER: 'Card number',
        CARD_MONTH: 'Month (MM)',
        CARD_MONTH_NOT_VALID: 'Invalid month',
        CARD_YEAR: 'Year (YY)',
        CARD_YEAR_NOT_VALID: 'Invalid year',
        CARD_NUMBER_NOT_VALID: 'Invalid card number',
        CVV: 'Card Validation Code',
        CVV_NOT_VALID: 'Invalid Card Validation Code',
        BOOK: 'Book  now',
        SIGN_IN: 'Sign in?',
        SECURE_PAYMENT_INFO: 'Your data is protected by SSL secure payment.',
        CARD_DATE_ERROR: 'Invalid card date.'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

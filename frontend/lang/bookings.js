import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        NEW_BOOKING: 'Nouvelle réservation',
    },
    en: {
        NEW_BOOKING: 'New Booking',
    }
});

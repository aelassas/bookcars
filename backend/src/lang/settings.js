import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        SETTINGS_UPDATED: 'Paramètres modifiés avec succès.',
        NETWORK_SETTINGS: 'Paramètres Réseau',
        SETTINGS_EMAIL_NOTIFICATIONS: 'Activer les notifications par email'
    },
    en: {
        SETTINGS_UPDATED: 'Settings updated successfully.',
        NETWORK_SETTINGS: 'Network settings',
        SETTINGS_EMAIL_NOTIFICATIONS: 'Enable email notifications'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        NEW_COMPANY: 'Nouvelle société',
        DELETE_COMPANY: 'Êtes-vous sûr de vouloir supprimer cette société et toutes ses données ?',
        VIEW_COMPANY_TOOLTIP: 'Voir le profil de cette société',
        UPDATE_COMPANY_TOOLTIP: 'Modifier cette société',
        MESSAGE_COMPANY_TOOLTIP: 'Envoyer un message à cette société',
        DELETE_COMPANY_TOOLTIP: 'Supprimer cette société et toutes ses données',
    },
    en: {
        NEW_COMPANY: 'New company',
        DELETE_COMPANY: 'Are you sure you want to delete this company and all its data?',
        VIEW_COMPANY_TOOLTIP: 'View company profile',
        UPDATE_COMPANY_TOOLTIP: 'Edit this company',
        MESSAGE_COMPANY_TOOLTIP: 'Send a message to this company',
        DELETE_COMPANY_TOOLTIP: 'Delete this company and all its data'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

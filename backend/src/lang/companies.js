import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        NEW_COMPANY: 'Nouvelle société',
        DELETE_COMPANY: 'Êtes-vous sûr de vouloir supprimer cette société et toutes ses données ?',
        VIEW_COMPANY: 'Voir le profil de cette société',
    },
    en: {
        NEW_COMPANY: 'New company',
        DELETE_COMPANY: 'Are you sure you want to delete this company and all its data?',
        VIEW_COMPANY: 'View company profile',
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

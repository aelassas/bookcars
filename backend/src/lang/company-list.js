import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        EMPTY_LIST: 'Pas de sociétés.',
        VIEW_COMPANY: 'Voir le profil de cette société',
        DELETE_COMPANY: 'Êtes-vous sûr de vouloir supprimer cette société et toutes ses données ?'
    },
    en: {
        EMPTY_LIST: 'No companies.',
        VIEW_COMPANY: 'View company profile',
        DELETE_COMPANY: 'Are you sure you want to delete this company and all its data?'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

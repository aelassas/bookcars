import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import * as UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        EMPTY_LIST: 'Pas de fournisseurs.',
        VIEW_COMPANY: 'Voir le profil de ce fournisseur',
        DELETE_COMPANY: 'Êtes-vous sûr de vouloir supprimer ce fournisseur et toutes ses données ?'
    },
    en: {
        EMPTY_LIST: 'No suppliers.',
        VIEW_COMPANY: 'View supplier profile',
        DELETE_COMPANY: 'Are you sure you want to delete this supplier and all its data?'
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

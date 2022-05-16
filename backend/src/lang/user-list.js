import LocalizedStrings from 'react-localization';
import Env from '../config/env.config';
import UserService from '../services/UserService';

export const strings = new LocalizedStrings({
    fr: {
        DELETE_USER: 'Êtes-vous sûr de vouloir supprimer cette utilisateur et toutes ses données ?',
        DELETE_USERS: 'Êtes-vous sûr de vouloir supprimer les utilisateurs sélectionnés et toutes leurs données ?',
        DELETE_SELECTION: 'Supprimer les utilisateurs sélectionnés',
        BLACKLIST_SELECTION: 'Ajouter les utilisateurs sélectionnés à la liste noire',
        BLACKLIST_USERS: 'Êtes-vous sûr de vouloir ajouter les utilisateurs sélectionnés à la liste noire ?',
    },
    en: {
        DELETE_USER: 'Are you sure you want to delete this user and all his data?',
        DELETE_USERS: 'Are you sure you want to delete the selected users and all their data?',
        DELETE_SELECTION: 'Delete selectied users',
        BLACKLIST_SELECTION: 'Add selected users to the blacklist',
        BLACKLIST_USERS: 'Are you sure you want to add selected users to the blacklist?',
    }
});

let language = UserService.getQueryLanguage();

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage();
}

strings.setLanguage(language);

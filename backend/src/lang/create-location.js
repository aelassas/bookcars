import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    fr: {
        NEW_LOCATION_HEADING: 'Nouveau lieu',
        LOCATION_NAME: 'Lieu',
        INVALID_LOCATION: 'Ce lieu existe déjà.',
        LOCATION_CREATED: 'Lieu créé avec succès.'
    },
    en: {
        NEW_LOCATION_HEADING: 'New location',
        LOCATION_NAME: 'Location',
        INVALID_LOCATION: 'This location already exists.',
        LOCATION_CREATED: 'Location created successfully.'
    },
    pl: {
        NEW_LOCATION_HEADING: 'Nowa lokalizacja',
        LOCATION_NAME: 'Lokalizacja',
        INVALID_LOCATION: 'Wybrana lokalizacja już istnieje.',
        LOCATION_CREATED: 'Lokalizacja została pomyślnie utworzona.'
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)

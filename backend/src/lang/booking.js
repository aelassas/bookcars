import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    fr: {
        TOTAL: 'Total :',
        DELETE_BOOKING: 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
    },
    en: {
        TOTAL: 'Total:',
        DELETE_BOOKING: 'Are you sure you want to delete this booking?',
    },
    pl: {
        TOTAL: 'Suma:',
        DELETE_BOOKING: 'Czy na pewno chcesz usunąć tę rezerwację?',
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)

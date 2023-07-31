import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const getLanguage = () => {
    let language = UserService.getQueryLanguage()

    if (language === '' || !Env.LANGUAGES.includes(language)) {
        language = UserService.getLanguage()
    }

    return language
}
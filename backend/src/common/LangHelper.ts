import { LocalizedStrings } from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const getLanguage = () => {
  let language = UserService.getQueryLanguage() ?? ''

  if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
  }

  return language
}

export const setLanguage = (strings: LocalizedStrings<any>, language?: string) => {
  const lang = language || getLanguage()
  strings.setLanguage(lang)
}

import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    UNAUTHORIZED: 'Accès non autorisé',
  },
  en: {
    UNAUTHORIZED: 'Unauthorized access',
  },
  es: {
    UNAUTHORIZED: 'Acceso no autorizado',
  },
  de: {
    UNAUTHORIZED: 'Zugriff nicht autorisiert',
  },
  pt: {
    UNAUTHORIZED: 'Acesso não autorizado',
  },
  it: {
    UNAUTHORIZED: 'Accesso non autorizzato',
  },
  zh: {
    UNAUTHORIZED: '未经授权的访问',
  },
  ja: {
    UNAUTHORIZED: '許可されていないアクセス',
  },
})

langHelper.setLanguage(strings)
export { strings }

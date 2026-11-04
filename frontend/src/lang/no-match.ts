import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NO_MATCH: 'Rien à voir ici !',
  },
  en: {
    NO_MATCH: 'Nothing to see here!',
  },
  es: {
    NO_MATCH: '¡No hay nada que ver aquí!',
  },
  de: {
    NO_MATCH: 'Hier gibt es nichts zu sehen!',
  },
  pt: {
    NO_MATCH: 'Não há nada para ver aqui!',
  },
  it: {
    NO_MATCH: "Qui non c'è niente da vedere!",
  },
  zh: {
    NO_MATCH: '这里什么都没有！',
  },
  ja: {
    NO_MATCH: 'ここには何もありません！',
  },
})

langHelper.setLanguage(strings)
export { strings }

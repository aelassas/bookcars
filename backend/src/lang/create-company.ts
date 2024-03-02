import LocalizedStrings from 'react-localization'
import env from '../config/env.config'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CREATE_COMPANY_HEADING: 'Nouveau fournisseur',
    INVALID_COMPANY_NAME: 'Ce fournisseur existe déjà.',
    COMPANY_IMAGE_SIZE_ERROR: `L'image doit être au format ${env.COMPANY_IMAGE_WIDTH}x${env.COMPANY_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Taille d'image recommandée : ${env.COMPANY_IMAGE_WIDTH}x${env.COMPANY_IMAGE_HEIGHT}`,
  },
  en: {
    CREATE_COMPANY_HEADING: 'New supplier',
    INVALID_COMPANY_NAME: 'This supplier already exists.',
    COMPANY_IMAGE_SIZE_ERROR: `The image must be in the format ${env.COMPANY_IMAGE_WIDTH}x${env.COMPANY_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Recommended image size: ${env.COMPANY_IMAGE_WIDTH}x${env.COMPANY_IMAGE_HEIGHT}`,
  },
})

langHelper.setLanguage(strings)
export { strings }

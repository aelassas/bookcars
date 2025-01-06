import LocalizedStrings from 'localized-strings'
import env from '@/config/env.config'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CREATE_SUPPLIER_HEADING: 'Nouveau fournisseur',
    INVALID_SUPPLIER_NAME: 'Ce fournisseur existe déjà.',
    SUPPLIER_IMAGE_SIZE_ERROR: `L'image doit être au format ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Taille d'image recommandée : ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
  en: {
    CREATE_SUPPLIER_HEADING: 'New supplier',
    INVALID_SUPPLIER_NAME: 'This supplier already exists.',
    SUPPLIER_IMAGE_SIZE_ERROR: `The image must be in the format ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Recommended image size: ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
})

langHelper.setLanguage(strings)
export { strings }

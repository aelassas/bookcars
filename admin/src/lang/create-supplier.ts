import LocalizedStrings from 'localized-strings'
import env from '@/config/env.config'
import * as langHelper from '@/utils/langHelper'

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
  es: {
    CREATE_SUPPLIER_HEADING: 'Nuevo proveedor',
    INVALID_SUPPLIER_NAME: 'Este proveedor ya existe.',
    SUPPLIER_IMAGE_SIZE_ERROR: `La imagen debe tener el formato ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Tamaño de imagen recomendado: ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
  de: {
    CREATE_SUPPLIER_HEADING: 'Neuer Anbieter',
    INVALID_SUPPLIER_NAME: 'Dieser Anbieter existiert bereits.',
    SUPPLIER_IMAGE_SIZE_ERROR: `Das Bild muss das Format ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT} haben`,
    RECOMMENDED_IMAGE_SIZE: `Empfohlene Bildgröße: ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
  pt: {
    CREATE_SUPPLIER_HEADING: 'Novo fornecedor',
    INVALID_SUPPLIER_NAME: 'Este fornecedor já existe.',
    SUPPLIER_IMAGE_SIZE_ERROR: `A imagem deve ter o formato ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Tamanho de imagem recomendado: ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
  it: {
    CREATE_SUPPLIER_HEADING: 'Nuovo fornitore',
    INVALID_SUPPLIER_NAME: 'Questo fornitore esiste già.',
    SUPPLIER_IMAGE_SIZE_ERROR: `L'immagine deve avere il formato ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `Dimensione immagine consigliata: ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
  zh: {
    CREATE_SUPPLIER_HEADING: '新增供应商',
    INVALID_SUPPLIER_NAME: '该供应商已存在。',
    SUPPLIER_IMAGE_SIZE_ERROR: `图片尺寸必须为 ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
    RECOMMENDED_IMAGE_SIZE: `建议图片尺寸：${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
  ja: {
    CREATE_SUPPLIER_HEADING: '新しいサプライヤー',
    INVALID_SUPPLIER_NAME: 'このサプライヤーは既に存在します。',
    SUPPLIER_IMAGE_SIZE_ERROR: `画像のサイズは ${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT} にしてください`,
    RECOMMENDED_IMAGE_SIZE: `推奨画像サイズ：${env.SUPPLIER_IMAGE_WIDTH}x${env.SUPPLIER_IMAGE_HEIGHT}`,
  },
})

langHelper.setLanguage(strings)
export { strings }

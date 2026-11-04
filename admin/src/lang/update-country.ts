import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    UPDATE_COUNTRY: 'Modification du pays',
    COUNTRY_UPDATED: 'Pays modifié avec succès.',
  },
  en: {
    UPDATE_COUNTRY: 'Country update',
    COUNTRY_UPDATED: 'Country updated successfully.',
  },
  es: {
    UPDATE_COUNTRY: 'Actualización del país',
    COUNTRY_UPDATED: 'País actualizado correctamente.',
  },
  de: {
    UPDATE_COUNTRY: 'Land bearbeiten',
    COUNTRY_UPDATED: 'Land erfolgreich aktualisiert.',
  },
  pt: {
    UPDATE_COUNTRY: 'Atualização do país',
    COUNTRY_UPDATED: 'País atualizado com sucesso.',
  },
})

langHelper.setLanguage(strings)
export { strings }

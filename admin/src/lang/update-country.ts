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
  it: {
    UPDATE_COUNTRY: 'Modifica del paese',
    COUNTRY_UPDATED: 'Paese aggiornato con successo.',
  },
  zh: {
    UPDATE_COUNTRY: '更新国家',
    COUNTRY_UPDATED: '国家更新成功。',
  },
  ja: {
    UPDATE_COUNTRY: '国の更新',
    COUNTRY_UPDATED: '国を更新しました。',
  },
})

langHelper.setLanguage(strings)
export { strings }

import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    UPDATE_LOCATION: 'Modification du lieu',
    LOCATION_UPDATED: 'Lieu modifié avec succès.',
  },
  en: {
    UPDATE_LOCATION: 'Location update',
    LOCATION_UPDATED: 'Location updated successfully.',
  },
  es: {
    UPDATE_LOCATION: 'Actualización del lugar',
    LOCATION_UPDATED: 'Lugar actualizado correctamente.',
  },
  de: {
    UPDATE_LOCATION: 'Standort bearbeiten',
    LOCATION_UPDATED: 'Standort erfolgreich aktualisiert.',
  },
  pt: {
    UPDATE_LOCATION: 'Atualização do local',
    LOCATION_UPDATED: 'Local atualizado com sucesso.',
  },
  it: {
    UPDATE_LOCATION: 'Modifica della località',
    LOCATION_UPDATED: 'Località aggiornata con successo.',
  },
  zh: {
    UPDATE_LOCATION: '更新地点',
    LOCATION_UPDATED: '地点更新成功。',
  },
  ja: {
    UPDATE_LOCATION: '場所の更新',
    LOCATION_UPDATED: '場所を更新しました。',
  },
})

langHelper.setLanguage(strings)
export { strings }

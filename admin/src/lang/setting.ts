import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    SETTINGS: 'Paramètres de location',
    MIN_PICKUP_HOURS: 'Délai minimum requis en heures avant le retrait',
    MIN_RENTAL_HOURS: 'Durée minimale de location en heures entre le retrait et le retour',
    MIN_PICKUP_DROPOFF_HOUR: 'Heure minimale autorisée pour le retrait et le retour (par ex. 9 pour 09:00)',
    MAX_PICKUP_DROPOFF_HOUR: 'Heure maximale autorisée pour le retrait et le retour (par ex. 19 pour 19:00)',
  },
  en: {
    SETTINGS: 'Rental Settings',
    MIN_PICKUP_HOURS: 'Minimum required time in hours before pick-up',
    MIN_RENTAL_HOURS: 'Minimum rental duration in hours between pick up and drop off',
    MIN_PICKUP_DROPOFF_HOUR: 'Minimum allowed hour for pickup and drop-off (e.g., 9 for 09:00)',
    MAX_PICKUP_DROPOFF_HOUR: 'Maximum allowed hour for pickup and drop-off (e.g., 19 for 19:00)',
  },
  es: {
    SETTINGS: 'Configuración del alquiler',
    MIN_PICKUP_HOURS: 'Tiempo mínimo requerido en horas antes del retiro',
    MIN_RENTAL_HOURS: 'Duración mínima del alquiler en horas entre el retiro y la devolución',
    MIN_PICKUP_DROPOFF_HOUR: 'Hora mínima permitida para el retiro y la devolución (por ej. 9 para las 09:00)',
    MAX_PICKUP_DROPOFF_HOUR: 'Hora máxima permitida para el retiro y la devolución (por ej. 19 para las 19:00)',
  },
})

langHelper.setLanguage(strings)
export { strings }

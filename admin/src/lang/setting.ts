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
  de: {
    SETTINGS: 'Mieteinstellungen',
    MIN_PICKUP_HOURS: 'Mindestvorlaufzeit in Stunden vor der Abholung',
    MIN_RENTAL_HOURS: 'Mindestmietdauer in Stunden zwischen Abholung und Rückgabe',
    MIN_PICKUP_DROPOFF_HOUR: 'Früheste zulässige Stunde für Abholung und Rückgabe (z. B. 9 für 09:00)',
    MAX_PICKUP_DROPOFF_HOUR: 'Späteste zulässige Stunde für Abholung und Rückgabe (z. B. 19 für 19:00)',
  },
  pt: {
    SETTINGS: 'Definições de aluguer',
    MIN_PICKUP_HOURS: 'Tempo mínimo exigido, em horas, antes da recolha',
    MIN_RENTAL_HOURS: 'Duração mínima do aluguer, em horas, entre a recolha e a devolução',
    MIN_PICKUP_DROPOFF_HOUR: 'Hora mínima permitida para a recolha e a devolução (p. ex., 9 para as 09:00)',
    MAX_PICKUP_DROPOFF_HOUR: 'Hora máxima permitida para a recolha e a devolução (p. ex., 19 para as 19:00)',
  },
  it: {
    SETTINGS: 'Impostazioni di noleggio',
    MIN_PICKUP_HOURS: 'Anticipo minimo richiesto in ore prima del ritiro',
    MIN_RENTAL_HOURS: 'Durata minima del noleggio in ore tra il ritiro e la riconsegna',
    MIN_PICKUP_DROPOFF_HOUR: 'Ora minima consentita per il ritiro e la riconsegna (es. 9 per le 09:00)',
    MAX_PICKUP_DROPOFF_HOUR: 'Ora massima consentita per il ritiro e la riconsegna (es. 19 per le 19:00)',
  },
  zh: {
    SETTINGS: '租车设置',
    MIN_PICKUP_HOURS: '取车前所需的最短提前时间（小时）',
    MIN_RENTAL_HOURS: '取车与还车之间的最短租期（小时）',
    MIN_PICKUP_DROPOFF_HOUR: '取车和还车的最早允许时间（例如：9 表示 09:00）',
    MAX_PICKUP_DROPOFF_HOUR: '取车和还车的最晚允许时间（例如：19 表示 19:00）',
  },
  ja: {
    SETTINGS: 'レンタル設定',
    MIN_PICKUP_HOURS: '受け取りまでに必要な最短時間（時間）',
    MIN_RENTAL_HOURS: '受け取りから返却までの最短レンタル期間（時間）',
    MIN_PICKUP_DROPOFF_HOUR: '受け取りおよび返却が可能な最も早い時刻（例：9 は 09:00）',
    MAX_PICKUP_DROPOFF_HOUR: '受け取りおよび返却が可能な最も遅い時刻（例：19 は 19:00）',
  },
})

langHelper.setLanguage(strings)
export { strings }

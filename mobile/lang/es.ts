import * as env from '@/config/env.config'

export const es = {
  GENERIC_ERROR: 'Se ha producido un error no controlado.',
  CHANGE_LANGUAGE_ERROR: 'Se ha producido un error al cambiar el idioma.',
  UPDATED: 'Cambios realizados con éxito.',
  GO_TO_HOME: 'Ir a la página de inicio',
  FULL_NAME: 'Nombre completo',
  EMAIL: 'Correo electrónico',
  PASSWORD: 'Contraseña',
  EMAIL_ALREADY_REGISTERED: 'Esta dirección de correo electrónico ya está registrada.',
  CONFIRM_PASSWORD: 'Confirmar contraseña',
  PHONE: 'Teléfono',
  LOCATION: 'Ubicación',
  BIO: 'Biografía',
  IMAGE_REQUIRED: 'Por favor, agregue una imagen.',
  LOADING: 'Cargando...',
  PLEASE_WAIT: 'Por favor, espere...',
  SEARCH: 'Buscar',
  SEARCH_PLACEHOLDER: 'Buscar...',
  CONFIRM_TITLE: 'Confirmación',
  PASSWORD_LENGTH_ERROR: 'La contraseña debe tener al menos 6 caracteres.',
  PASSWORDS_DONT_MATCH: 'Las contraseñas no coinciden.',
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  SAVE: 'Guardar',
  CANCEL: 'Cancelar',
  CHANGE_PASSWORD: 'Cambiar la contraseña',
  CHANGE_PASSWORD_TITLE: 'Cambio de contraseña',
  DELETE_AVATAR_CONFIRM: '¿Está seguro de que desea eliminar la foto?',
  DELETE_IMAGE: 'Eliminar la imagen',
  UPLOAD_IMAGE: 'Subir una imagen',
  UNCHECK_ALL: 'Deseleccionar todo',
  CHECK_ALL: 'Seleccionar todo',
  CLOSE: 'Cerrar',
  BOOKING_STATUS: 'Estado',
  BOOKING_STATUS_VOID: 'Vacío',
  BOOKING_STATUS_PENDING: 'Pendiente',
  BOOKING_STATUS_DEPOSIT: 'Depósito',
  BOOKING_STATUS_PAID: 'Pagada',
  BOOKING_STATUS_RESERVED: 'Reservada',
  BOOKING_STATUS_CANCELLED: 'Cancelada',
  FROM: 'De',
  TO: 'A',
  OPTIONAL: 'Configuraciones opcionales',
  AND: 'y',
  RECORD_TYPE_ADMIN: 'Administrador',
  RECORD_TYPE_SUPPLIER: 'Proveedor',
  RECORD_TYPE_USER: 'Conductor',
  TYPE: 'Tipo',
  CONFIRM: 'Confirmar',
  USER: 'Usuario',
  INFO: 'Información',
  USER_TYPE_REQUIRED: 'Por favor, complete el campo: Tipo',
  FIX_ERRORS: 'Por favor, corrija los errores.',
  SEND_MESSAGE: 'Enviar mensaje',
  VERIFIED: 'Cuenta verificada',
  RESEND_ACTIVATION_LINK: 'Reenviar el enlace de activación de la cuenta',
  ACTIVATION_EMAIL_SENT: 'Correo de activación enviado.',
  EMAIL_NOT_VALID: 'Correo electrónico no válido',
  PICKUP_LOCATION: 'Lugar de recogida',
  DROP_OFF_LOCATION: 'Lugar de devolución',
  PHONE_NOT_VALID: 'Número de teléfono no válido',
  ALL: 'Todos',
  TOS_MENU: 'Condiciones',
  ACCEPT_TOS: 'He leído y acepto los términos y condiciones de uso.',
  BIRTH_DATE: 'Fecha de nacimiento',
  RECAPTCHA_ERROR: 'Por favor, complete el captcha para continuar.',
  TOS_ERROR: 'Por favor, acepte los términos y condiciones de uso.',
  BIRTH_DATE_NOT_VALID: `Debe tener al menos ${env.MINIMUM_AGE} años.`,
  BIRTH_DATE_NOT_VALID_PART1: 'El conductor debe tener al menos',
  BIRTH_DATE_NOT_VALID_PART2: 'años.',
  SUPPLIER: 'Proveedor',
  SAME_LOCATION: 'Devolver en el mismo lugar',
  FROM_DATE: 'Fecha de recogida',
  FROM_TIME: 'Hora de recogida',
  TO_DATE: 'Fecha de devolución',
  TO_TIME: 'Hora de devolución',
  PICKUP_LOCATION_EMPTY: 'Por favor, ingrese un lugar de recogida.',
  DROP_OFF_LOCATION_EMPTY: 'Por favor, ingrese un lugar de devolución.',
  HOME: 'Inicio',
  ABOUT: 'Acerca de',
  VALIDATE_EMAIL: 'Se ha enviado un correo de validación a su dirección de correo electrónico. Por favor, revise su buzón y valide su cuenta haciendo clic en el enlace del correo electrónico. Expirará en un día. Si no ha recibido el correo de validación, haga clic en reenviar.',
  RESEND: 'Reenviar',
  VALIDATION_EMAIL_SENT: 'Correo de validación enviado.',
  VALIDATION_EMAIL_ERROR: 'Se ha producido un error al enviar el correo de validación.',
  CONTACT: 'Contacto',
  SIGN_IN: 'Iniciar sesión',
  SIGN_IN_TITLE: 'Iniciar sesión',
  SIGN_UP: 'Registrarse',
  SIGN_UP_TITLE: 'Registrarse',
  SIGN_IN_ERROR: 'Correo electrónico o contraseña incorrectos.',
  IS_BLACKLISTED: 'Su cuenta está suspendida.',
  FORGOT_PASSWORD: '¿Olvidó su contraseña?',
  RESET_PASSWORD: 'Por favor, ingrese su correo electrónico para enviarle un enlace de restablecimiento de contraseña.',
  RESET: 'Restablecer',
  RESET_EMAIL_SENT: 'Correo de restablecimiento de contraseña enviado.',
  REQUIRED: 'Por favor, complete este campo.',
  SIGN_OUT: 'Cerrar sesión',
  BOOKINGS: 'Reservas',
  LANGUAGE: 'Idioma',
  CARS: 'Coches',
  EMAIL_ERROR: 'Dirección de correo no registrada',
  SETTINGS: 'Configuraciones',
  ENABLE_EMAIL_NOTIFICATIONS: 'Habilitar notificaciones por correo electrónico',
  SETTINGS_UPDATED: 'Configuraciones actualizadas con éxito.',
  CURRENT_PASSWORD: 'Contraseña actual',
  PASSWORD_ERROR: 'Contraseña incorrecta',
  NEW_PASSWORD: 'Nueva contraseña',
  PASSWORD_UPDATE: 'La contraseña ha sido modificada con éxito.',
  PASSWORD_UPDATE_ERROR: 'Se ha producido un error al cambiar la contraseña.',
  EMPTY_CAR_LIST: 'No hay coches.',
  DAILY: '/día',
  DIESEL_SHORT: 'D',
  GASOLINE_SHORT: 'G',
  ELECTRIC_SHORT: 'ELEC',
  HYBRID_SHORT: 'H',
  PLUG_IN_HYBRID_SHORT: 'HR',
  GEARBOX_MANUAL_SHORT: 'M',
  GEARBOX_AUTOMATIC_SHORT: 'A',
  FUEL_POLICY: 'Política de combustible',
  FUEL_POLICY_LIKE_FOR_LIKE: 'Lleno/Lleno',
  FUEL_POLICY_FREE_TANK: 'Tanque lleno incluido',
  FUEL_POLICY_FULL_TO_FULL: 'Lleno/Lleno',
  FUEL_POLICY_FULL_TO_EMPTY: 'Lleno/Vacío',
  MILEAGE: 'Kilometraje',
  MILEAGE_UNIT: 'KM/día',
  UNLIMITED: 'Ilimitado',
  LIMITED: 'Limitado',
  CANCELLATION: 'Cancelación',
  AMENDMENTS: 'Modificaciones',
  THEFT_PROTECTION: 'Protección contra robo',
  COLLISION_DAMAGE_WAVER: 'Exención por daños por colisión',
  FULL_INSURANCE: 'Seguro a todo riesgo',
  ADDITIONAL_DRIVER: 'Conductor adicional',
  INCLUDED: 'Incluido',
  UNAVAILABLE: 'No disponible',
  PRICE_DAYS_PART_1: 'Precio por',
  PRICE_DAYS_PART_2: 'día',
  PRICE_PER_DAY: 'Precio por día:',
  BOOK: 'Reservar',
  STAY_CONNECTED: 'Mantente conectado',
  CREATE_BOOKING: 'Reservar ahora',
  BOOKING_OPTIONS: 'Tus opciones de reserva',
  BOOKING_DETAILS: 'Tus datos de reserva',
  DAYS: 'Días',
  CAR: 'Coche',
  COST: 'Total',
  DRIVER_DETAILS: 'Información del conductor principal',
  EMAIL_INFO: 'Recibirás la confirmación en esta dirección.',
  PHONE_INFO: 'Si necesitamos contactarte de urgencia.',
  PAYMENT: 'Pago seguro',
  CARD_NAME: 'Nombre del titular',
  CARD_NUMBER: 'Número de tarjeta',
  CARD_MONTH: 'Mes (MM)',
  CARD_MONTH_NOT_VALID: 'Mes no válido',
  CARD_YEAR: 'Año (AA)',
  CARD_YEAR_NOT_VALID: 'Año no válido',
  CARD_NUMBER_NOT_VALID: 'Número de tarjeta no válido',
  CVV: 'Código de seguridad',
  CVV_NOT_VALID: 'Código de seguridad no válido',
  BOOK_NOW: 'Reservar',
  SECURE_PAYMENT_INFO: 'Tus datos están protegidos por el pago seguro SSL.',
  CARD_DATE_ERROR: 'Fecha de tarjeta no válida.',
  BOOKING_SUCCESS: 'Tu pago se ha realizado con éxito. Te hemos enviado un correo de confirmación.',
  BOOKING_EMAIL_ALREADY_REGISTERED: 'Esta dirección de correo electrónico ya está registrada. Por favor, inicia sesión.',
  EMPTY_BOOKING_LIST: 'No hay reservas.',
  OPTIONS: 'Opciones',
  ENGINE: 'Motor',
  DIESEL: 'Diesel',
  GASOLINE: 'Gasolina',
  ELECTRIC: 'Eléctrico',
  HYBRID: 'Híbrido',
  PLUG_IN_HYBRID: 'Híbrido enchufable',
  GEARBOX: 'Caja de cambios',
  GEARBOX_AUTOMATIC: 'Automática',
  GEARBOX_MANUAL: 'Manual',
  DEPOSIT: 'Depósito',
  LESS_THAN_2500: 'Menos de 2500 DH',
  LESS_THAN_5000: 'Menos de 5000 DH',
  LESS_THAN_7500: 'Menos de 7500 DH',
  CANCEL_BOOKING_BTN: 'Cancelar esta reserva',
  CANCEL_BOOKING: '¿Está seguro de que desea cancelar esta reserva?',
  CANCEL_BOOKING_REQUEST_SENT: 'Tu solicitud de cancelación ha sido recibida. Nos pondremos en contacto contigo para finalizar el procedimiento de cancelación.',
  OF: 'de',
  EMPTY_NOTIFICATION_LIST: 'No hay notificaciones',
  DELETE_NOTIFICATION: '¿Está seguro de que desea eliminar esta notificación?',
  DELETE_NOTIFICATIONS: '¿Está seguro de que desea eliminar estas notificaciones?',
  DELETE_AVATAR: '¿Está seguro de que desea eliminar su foto de perfil?',
  CAMERA_PERMISSION: '¡Se requiere permiso para acceder a archivos y contenido multimedia!',
  BOOKING_DELETED: 'Esta reserva ha sido eliminada.',
  PAYMENT_OPTIONS: 'Opciones de pago',
  PAY_LATER: 'Pagar en el mostrador',
  PAY_DEPOSIT: 'Pagar el depósito en línea y confirmar la reserva',
  PAY_LATER_INFO: 'Modificación y cancelación gratuitas',
  PAY_ONLINE: 'Pagar en línea',
  PAY_ONLINE_INFO: 'Modificación y cancelación bajo condiciones',
  PAY_LATER_SUCCESS: 'Tu reserva se ha realizado con éxito. Te hemos enviado un correo de confirmación.',
  FROM_DATE_EMPTY: 'Por favor, ingrese la fecha de recogida.',
  FROM_TIME_EMPTY: 'Por favor, ingrese la hora de recogida.',
  TO_DATE_EMPTY: 'Por favor, ingrese la fecha de devolución.',
  TO_TIME_EMPTY: 'Por favor, ingrese la hora de devolución.',
  PAYMENT_FAILED: 'Pago fallido.',
  ERROR: 'Error',
  LOGIN_ERROR: 'Autenticación fallida.',
  OR: 'o',
  CAR_RANGE: 'Gama',
  CAR_RANGE_MINI: 'Auto',
  CAR_RANGE_MIDI: 'Todoterreno',
  CAR_RANGE_MAXI: 'furgoneta',
  CAR_RANGE_SCOOTER: 'Scooter',
  CAR_RANGE_BUS: 'Autobús',
  CAR_RANGE_TRUCK: 'Camión',
  CAR_RANGE_CARAVAN: 'Caravana',
  CAR_MULTIMEDIA: 'Multimedia',
  CAR_MULTIMEDIA_TOUCHSCREEN: 'Pantalla táctil',
  CAR_MULTIMEDIA_BLUETOOTH: 'Bluetooth',
  CAR_MULTIMEDIA_ANDROID_AUTO: 'Android Auto',
  CAR_MULTIMEDIA_APPLE_CAR_PLAY: 'Apple Car Play',
  CAR_SEATS: 'Asientos',
  CAR_SEATS_TWO: '2 Asientos',
  CAR_SEATS_FOUR: '4 Asientos',
  CAR_SEATS_FIVE: '5 Asientos',
  CAR_SEATS_FIVE_PLUS: '5+ Asientos',
  ANY: 'Cualquiera',
  BOOKCARS: env.WEBSITE_NAME,
  SEARCH_TITLE_1: 'Auto',
  SEARCH_TITLE_2: ' para ti',
  CAR_AVAILABLE: 'coche disponible',
  CARS_AVAILABLE: 'coches disponibles',
  CAR_SPECS: 'Especificaciones del vehículo',
  AIRCON: 'Aire acondicionado',
  MORE_THAN_FOOR_DOORS: '4+ puertas',
  MORE_THAN_FIVE_SEATS: '5+ asientos',
  LOCATION_TERM: 'Lugar / término',
  RATING: 'Clasificación',
  RATING_1: '1/5 y superior',
  RATING_2: '2/5 y superior',
  RATING_3: '3/5 y superior',
  RATING_4: '4/5 y superior',
  TRIPS: 'alquileres',
  CO2: 'Efecto CO2',
  FROM_YOU: 'de ti',
  DRIVER_LICENSE: 'Licencia de conducir',
  LICENSE_REQUIRED: 'Se requiere licencia de conducir',
  UPLOAD_FILE: 'Subir archivo...',
  SHOW_FILTERS: 'Mostrar filtros',
  HIDE_FILTERS: 'Ocultar filtros',
  COMING_SOON: 'Próximamente',
  FULLY_BOOKED: 'Ya Reservado',
  MIN_PICK_UP_HOURS_ERROR: 'La hora de recogida debe programarse con varias horas de anticipación',
  MIN_RENTAL_HOURS_ERROR: 'La duración del alquiler es demasiado corta',
  INVALID_PICK_UP_TIME: 'Hora de recogida no válida',
  INVALID_DROP_OFF_TIME: 'Hora de devolución no válida',
}

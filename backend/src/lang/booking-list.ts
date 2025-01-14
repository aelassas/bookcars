import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    CAR: 'Voiture',
    SUPPLIER: 'Fournisseur',
    DRIVER: 'Conducteur',
    PRICE: 'Prix',
    STATUS: 'Statut',
    UPDATE_SELECTION: 'Modifier la sélection',
    DELETE_SELECTION: 'Supprimer la sélection',
    UPDATE_STATUS: 'Modification du statut',
    NEW_STATUS: 'Nouveau statut',
    DELETE_BOOKING: 'Êtes-vous sûr de vouloir supprimer cette réservation ?',
    DELETE_BOOKINGS: 'Êtes-vous sûr de vouloir supprimer les réservations sélectionnées ?',
    EMPTY_LIST: 'Pas de réservations.',
    DAYS: 'Jours',
    COST: 'Total',
  },
  en: {
    CAR: 'Car',
    SUPPLIER: 'Supplier',
    DRIVER: 'Driver',
    PRICE: 'Price',
    STATUS: 'Status',
    UPDATE_SELECTION: 'Edit selection',
    DELETE_SELECTION: 'Delete selection',
    UPDATE_STATUS: 'Status modification',
    NEW_STATUS: 'New status',
    DELETE_BOOKING: 'Are you sure you want to delete this booking?',
    DELETE_BOOKINGS: 'Are you sure you want to delete the selected bookings?',
    EMPTY_LIST: 'No bookings.',
    DAYS: 'Days',
    COST: 'COST',
  },
  es: {
    CAR: 'Coche',
    SUPPLIER: 'Proveedor',
    DRIVER: 'Conductor',
    PRICE: 'Precio',
    STATUS: 'Estado',
    UPDATE_SELECTION: 'Modificar selección',
    DELETE_SELECTION: 'Eliminar selección',
    UPDATE_STATUS: 'Modificación del estado',
    NEW_STATUS: 'Nuevo estado',
    DELETE_BOOKING: '¿Estás seguro de que quieres eliminar esta reserva?',
    DELETE_BOOKINGS: '¿Estás seguro de que quieres eliminar las reservas seleccionadas?',
    EMPTY_LIST: 'Sin reservas.',
    DAYS: 'Días',
    COST: 'Coste',
  },
})

langHelper.setLanguage(strings)
export { strings }

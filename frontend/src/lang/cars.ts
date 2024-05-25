import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  fr: {
    NEW_CAR: 'Nouvelle voiture',
    DELETE_CAR: 'Êtes-vous sûr de vouloir supprimer cette voiture ?',
    FUEL_POLICY: 'Politique carburant',
    DIESEL: 'Diesel',
    GASOLINE: 'Essence',
    ELECTRIC: 'Électrique',
    HYBRID: 'Hybride',
    PLUG_IN_HYBRID: 'Hybride rechargeable',
    UNKNOWN: 'Non spécifié',
    DIESEL_SHORT: 'D',
    GASOLINE_SHORT: 'E',
    ELECTRIC_SHORT: 'ELEC',
    HYBRID_SHORT: 'H',
    PLUG_IN_HYBRID_SHORT: 'HR',
    GEARBOX_MANUAL: 'Manuelle',
    GEARBOX_AUTOMATIC: 'Automatique',
    GEARBOX_MANUAL_SHORT: 'M',
    GEARBOX_AUTOMATIC_SHORT: 'A',
    FUEL_POLICY_LIKE_FOR_LIKE: 'Plein/Plein',
    FUEL_POLICY_FREE_TANK: 'Plein inclus',
    DIESEL_TOOLTIP: 'Cette voiture a un moteur diesel',
    GASOLINE_TOOLTIP: 'Cette voiture a un moteur essence',
    ELECTRIC_TOOLTIP: 'Cette voiture est électrique',
    HYBRID_TOOLTIP: 'Cette voiture est hybride',
    PLUG_IN_HYBRID_TOOLTIP: 'Cette voiture est hybride rechargeable',
    GEARBOX_MANUAL_TOOLTIP: 'Cette voiture a une transmission manuelle',
    GEARBOX_AUTOMATIC_TOOLTIP: 'Cette voiture a une transmission automatique',
    SEATS_TOOLTIP_1: 'Cette voiture a ',
    SEATS_TOOLTIP_2: 'sièges',
    DOORS_TOOLTIP_1: 'Cette voiture a ',
    DOORS_TOOLTIP_2: 'portes',
    AIRCON_TOOLTIP: 'Cette voiture a de la climatisation',
    FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP: 'Cette voiture est fournie avec du carburant dans le réservoir et doit être rendu avec la même quantité de carburant.',
    FUEL_POLICY_FREE_TANK_TOOLTIP: 'Le prix inclut un plein de carburant',
    MILEAGE: 'Kilométrage',
    MILEAGE_UNIT: 'KM/jour',
    UNLIMITED: 'Illimité',
    LIMITED: 'Limité',
    CANCELLATION: 'Annulation',
    CANCELLATION_TOOLTIP: 'La réservation peut être annulée avant la date de commencement de la location.',
    AMENDMENTS: 'Modifications',
    AMENDMENTS_TOOLTIP: 'La réservation peut être modifiée avant la date de commencement de la location.',
    THEFT_PROTECTION: 'Protection contre le vol',
    THEFT_PROTECTION_TOOLTIP: 'La location peut inclure une protection contre le vol.',
    COLLISION_DAMAGE_WAVER: 'Couverture en cas de collision',
    COLLISION_DAMAGE_WAVER_TOOLTIP: 'La location peut inclure une couverture en cas de collision.',
    FULL_INSURANCE: 'Assurance Tous Risques',
    FULL_INSURANCE_TOOLTIP: 'La location peut inclure une couverture en cas de collision, de dommages et vol du véhicule.',
    ADDITIONAL_DRIVER: 'Conducteur supplémentaire',
    INCLUDED: 'Inclus',
    UNAVAILABLE: 'Indisponible',
    CAR_AVAILABLE: 'Disponible à la location',
    CAR_AVAILABLE_TOOLTIP: 'Cette voiture est disponible pour la location.',
    CAR_UNAVAILABLE: 'Indisponible pour la location',
    CAR_UNAVAILABLE_TOOLTIP: "Cette voiture n'est pas disponible pour la location.",
    VIEW_CAR: 'Voir cette voiture',
    EMPTY_LIST: 'Pas de voitures.',
    BOOK: 'Réserver',
    PRICE_DAYS_PART_1: 'Prix pour',
    PRICE_DAYS_PART_2: 'jour',
    PRICE_PER_DAY: 'Prix par jour :',
    GEARBOX: 'Transmission',
    ENGINE: 'Moteur',
    DEPOSIT: 'Dépôt de garantie',
    LESS_THAN_2500: 'Moins de 2500 DH',
    LESS_THAN_5000: 'Moins de 5000 DH',
    LESS_THAN_7500: 'Moins de 7500 DH',
  },
  en: {
    NEW_CAR: 'New car',
    DELETE_CAR: 'Are you sure you want to delete this car?',
    FUEL_POLICY: 'Fuel policy',
    DIESEL: 'Diesel',
    GASOLINE: 'Gasoline',
    ELECTRIC: 'Electric',
    HYBRID: 'Hybrid',
    PLUG_IN_HYBRID: 'Plug-in hybrid',
    UNKNOWN: 'Not specified',
    DIESEL_SHORT: 'D',
    GASOLINE_SHORT: 'G',
    ELECTRIC_SHORT: 'E',
    HYBRID_SHORT: 'H',
    PLUG_IN_HYBRID_SHORT: 'PH',
    GEARBOX_MANUAL: 'Manual',
    GEARBOX_AUTOMATIC: 'Automatic',
    GEARBOX_MANUAL_SHORT: 'M',
    GEARBOX_AUTOMATIC_SHORT: 'A',
    FUEL_POLICY_LIKE_FOR_LIKE: 'Like for Like',
    FUEL_POLICY_FREE_TANK: 'Free tank',
    DIESEL_TOOLTIP: 'This car has a diesel engine',
    GASOLINE_TOOLTIP: 'This car has a gasoline engine',
    ELECTRIC_TOOLTIP: 'This car is electric',
    HYBRID_TOOLTIP: 'This car is hybrid',
    PLUG_IN_HYBRID_TOOLTIP: 'This car is plug-in hybrid',
    GEARBOX_MANUAL_TOOLTIP: 'This car has a manual gearbox',
    GEARBOX_AUTOMATIC_TOOLTIP: 'This car has an automatic gearbox',
    SEATS_TOOLTIP_1: 'This car has ',
    SEATS_TOOLTIP_2: 'seats',
    DOORS_TOOLTIP_1: 'This car has ',
    DOORS_TOOLTIP_2: 'doors',
    AIRCON_TOOLTIP: 'This car has aircon',
    FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP: 'This car is supplied with fuel and must be returned with the same amount of fuel.',
    FUEL_POLICY_FREE_TANK_TOOLTIP: 'The price includes a full tank of fuel.',
    MILEAGE: 'Mileage',
    MILEAGE_UNIT: 'KM/day',
    UNLIMITED: 'Unlimited',
    LIMITED: 'Limited',
    CANCELLATION: 'Cancellation',
    CANCELLATION_TOOLTIP: 'The booking can be canceled before the start date of the rental.',
    AMENDMENTS: 'Amendments',
    AMENDMENTS_TOOLTIP: 'The booking can be modified before the start date of the rental.',
    THEFT_PROTECTION: 'Theft protection',
    THEFT_PROTECTION_TOOLTIP: 'Rental may include theft protection.',
    COLLISION_DAMAGE_WAVER: 'Collision damage waiver',
    COLLISION_DAMAGE_WAVER_TOOLTIP: 'Rental may include collision damage waiver.',
    FULL_INSURANCE: 'Full insurance',
    FULL_INSURANCE_TOOLTIP: 'The rental may include collision damage waiver and theft protection of the vehicle.',
    ADDITIONAL_DRIVER: 'Additional driver',
    INCLUDED: 'Included',
    UNAVAILABLE: 'Unavailable',
    CAR_AVAILABLE: 'Available for rental',
    CAR_AVAILABLE_TOOLTIP: 'This car is available for rental.',
    CAR_UNAVAILABLE: 'Unavailable for rental',
    CAR_UNAVAILABLE_TOOLTIP: 'This car is unavailable for rental.',
    VIEW_CAR: 'View this car',
    EMPTY_LIST: 'No cars.',
    BOOK: 'Choose this car',
    PRICE_DAYS_PART_1: 'Price for',
    PRICE_DAYS_PART_2: 'day',
    PRICE_PER_DAY: 'Price per day:',
    GEARBOX: 'Gearbox',
    ENGINE: 'Engine',
    DEPOSIT: 'Deposit at pick-up',
    LESS_THAN_2500: 'Less than 2500 DH',
    LESS_THAN_5000: 'Less than 5000 DH',
    LESS_THAN_7500: 'Less than 7500 DH',
  },
  el: {
    NEW_CAR: 'Νέο αυτοκίνητο',
    DELETE_CAR: 'Είστε σίγουρος ότι θέλετε να διαγράψετε αυτό το αυτοκίνητο;',
    FUEL_POLICY: 'Πολιτική καυσίμων',
    DIESEL: 'Πετρέλαιο',
    GASOLINE: 'Βενζίνη',
    ELECTRIC: 'Ηλεκτρικό',
    HYBRID: 'Hybrid',
    PLUG_IN_HYBRID: 'Plug-in hybrid',
    UNKNOWN: 'Δεν προσδιορίζεται',
    DIESEL_SHORT: 'D',
    GASOLINE_SHORT: 'G',
    ELECTRIC_SHORT: 'E',
    HYBRID_SHORT: 'H',
    PLUG_IN_HYBRID_SHORT: 'PH',
    GEARBOX_MANUAL: 'Manual',
    GEARBOX_AUTOMATIC: 'Αυτόματο',
    GEARBOX_MANUAL_SHORT: 'M',
    GEARBOX_AUTOMATIC_SHORT: 'A',
    FUEL_POLICY_LIKE_FOR_LIKE: 'Like for Like',
    FUEL_POLICY_FREE_TANK: 'Ελεύθερο ρεζερβουάρ',
    DIESEL_TOOLTIP: 'Αυτό το αυτοκίνητο έχει κινητήρα ντίζελ',
    GASOLINE_TOOLTIP: 'Αυτό το αυτοκίνητο έχει βενζινοκινητήρα',
    ELECTRIC_TOOLTIP: 'Αυτό το αυτοκίνητο είναι ηλεκτρικό',
    HYBRID_TOOLTIP: 'Αυτό το αυτοκίνητο είναι υβριδικό',
    PLUG_IN_HYBRID_TOOLTIP: 'Αυτό το αυτοκίνητο είναι υβριδικό με πρίζα',
    GEARBOX_MANUAL_TOOLTIP: 'Αυτό το αυτοκίνητο έχει χειροκίνητο κιβώτιο ταχυτήτων',
    GEARBOX_AUTOMATIC_TOOLTIP: 'Αυτό το αυτοκίνητο διαθέτει αυτόματο κιβώτιο ταχυτήτων',
    SEATS_TOOLTIP_1: 'Αυτό το αυτοκίνητο διαθέτει ',
    SEATS_TOOLTIP_2: 'καθίσματα',
    DOORS_TOOLTIP_1: 'Αυτό το αυτοκίνητο έχει ',
    DOORS_TOOLTIP_2: 'πόρτες',
    AIRCON_TOOLTIP: 'Αυτό το αυτοκίνητο έχει aircon',
    FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP: 'Αυτό το αυτοκίνητο εφοδιάζεται με καύσιμα και πρέπει να επιστραφεί με την ίδια ποσότητα καυσίμων',
    FUEL_POLICY_FREE_TANK_TOOLTIP: 'Η τιμή περιλαμβάνει ένα πλήρες ρεζερβουάρ καυσίμων',
    MILEAGE: 'Χιλιόμετρα',
    MILEAGE_UNIT: 'KM/ημέρα',
    UNLIMITED: 'Απεριόριστα',
    LIMITED: 'Περιορισμένο',
    CANCELLATION: 'Ακύρωση',
    CANCELLATION_TOOLTIP: 'Η κράτηση μπορεί να ακυρωθεί πριν από την ημερομηνία έναρξης της ενοικίασης.',
    AMENDMENTS: 'Τροποποιήσεις',
    AMENDMENTS_TOOLTIP: 'Η κράτηση μπορεί να τροποποιηθεί πριν από την ημερομηνία έναρξης της ενοικίασης.',
    THEFT_PROTECTION: 'Προστασία από κλοπή',
    THEFT_PROTECTION_TOOLTIP: 'Η μίσθωση μπορεί να περιλαμβάνει προστασία από κλοπή',
    COLLISION_DAMAGE_WAVER: 'Απαλλαγή από τις ζημίες σύγκρουσης',
    COLLISION_DAMAGE_WAVER_TOOLTIP: 'Η ενοικίαση μπορεί να περιλαμβάνει απαλλαγή από ζημίες σύγκρουσης',
    FULL_INSURANCE: 'Πλήρης ασφάλιση',
    FULL_INSURANCE_TOOLTIP: 'Η ενοικίαση μπορεί να περιλαμβάνει απαλλαγή από ζημίες σύγκρουσης και προστασία του οχήματος από κλοπή',
    ADDITIONAL_DRIVER: 'Πρόσθετος οδηγός',
    INCLUDED: 'Περιλαμβάνεται',
    UNAVAILABLE: 'Μη διαθέσιμο',
    CAR_AVAILABLE: 'Διαθέσιμο για ενοικίαση',
    CAR_AVAILABLE_TOOLTIP: 'Αυτό το αυτοκίνητο είναι διαθέσιμο για ενοικίαση',
    CAR_UNAVAILABLE: 'Μη διαθέσιμο για ενοικίαση',
    CAR_UNAVAILABLE_TOOLTIP: 'Αυτό το αυτοκίνητο δεν είναι διαθέσιμο για ενοικίαση.',
    VIEW_CAR: 'Δείτε αυτό το αυτοκίνητο',
    EMPTY_LIST: 'Δεν υπάρχουν αυτοκίνητα.',
    BOOK: 'Επιλέξτε αυτό το αυτοκίνητο',
    PRICE_DAYS_PART_1: 'Τιμή για',
    PRICE_DAYS_PART_2: 'ημέρα',
    PRICE_PER_DAY: 'Τιμή ανά ημέρα:',
    GEARBOX: 'Κιβώτιο ταχυτήτων',
    ENGINE: 'Κινητήρας',
    DEPOSIT: 'Προκαταβολή κατά την παραλαβή',
    LESS_THAN_2500: 'Λιγότερο από 2500 EU',
    LESS_THAN_5000: 'Λιγότερο από 5000 EU',
    LESS_THAN_7500: 'Λιγότερο από 7500 EU',
  },
})

langHelper.setLanguage(strings)
export { strings }

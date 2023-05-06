import LocalizedStrings from 'react-localization'
import Env from '../config/env.config'
import * as UserService from '../services/UserService'

export const strings = new LocalizedStrings({
    pl: {
        NEW_CAR: 'Nowe auto',
        DELETE_CAR: 'Jesteś pewien,że chcesz zrezygnować z tego auta?',
        CAR_CURRENCY: ' PLN/za dzień',
        FUEL_POLICY: 'Polityka paliwowa',
        DIESEL: 'Diesel',
        GASOLINE: 'Benzyna',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'B',
        GEARBOX_MANUAL: 'Manualna',
        GEARBOX_AUTOMATIC: 'Automatyczna',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY_LIKE_FOR_LIKE: 'dostajesz=zostawiasz auto z pełnym bakiem*',
        FUEL_POLICY_FREE_TANK: 'Bezpłatny zbiornik paliwa',
        DIESEL_TOOLTIP: 'Ten samochód jest z silnikiem Diesla',
        GASOLINE_TOOLTIP: 'Ten samochód jest z silnikiem benzynowym',
        GEARBOX_MANUAL_TOOLTIP: 'Ten samochód ma manualną skrzynię biegów',
        GEARBOX_AUTOMATIC_TOOLTIP: 'Ten samochód ma automatyczną skrzynię biegów',
        SEATS_TOOLTIP_1: 'Ten samochód posiada ',
        SEATS_TOOLTIP_2: 'miejsc/a',
        DOORS_TOOLTIP_1: 'Ten samochód posiada ',
        DOORS_TOOLTIP_2: 'drzwi',
        AIRCON_TOOLTIP: 'Ten samochód posiada klimatyzację',
        FUEL_POLICY_LIKE_FOR_LIKE_TOOLTIP: 'Samochód jest zatankowany do pełna i musi być zwrócony z taką samą ilością paliwa.',
        FUEL_POLICY_FREE_TANK_TOOLTIP: 'Cena obejmuje pełny zbiornik paliwa.',
        MILEAGE: 'Zasięg',
        MILEAGE_UNIT: 'KM/dziennie',
        UNLIMITED: 'Bez limitu',
        LIMITED: 'Limitowany',
        CANCELLATION: 'Możliwość odwołania',
        CANCELLATION_TOOLTIP: 'Ten wynajem można odwołać przed terminem wynajmu bez dodatkowego kosztu*.',
        AMENDMENTS: 'Elastyczny termin',
        AMENDMENTS_TOOLTIP: 'Ten wynajem można modyfikować do 5 dni przed terminem wynajmu.',
        THEFT_PROTECTION: 'Ochrona przed kradzieżą',
        THEFT_PROTECTION_TOOLTIP: 'Wynajem może obejmować ochronę przed kradzieżą.',
        COLLISION_DAMAGE_WAVER: 'Ubezpieczenie od uszkodzeń',
        COLLISION_DAMAGE_WAVER_TOOLTIP: 'Wynajem może obejmować ubezpieczenie od uszkodzeń.',
        FULL_INSURANCE: 'Pełne ubezpieczenie',
        FULL_INSURANCE_TOOLTIP: 'Wynajem może obejmować ochronę przed kradzieżą i ubezpieczenie od uszkodzeń.',
        ADDITIONAL_DRIVER: 'Dodatkowy kierowca',
        INCLUDED: 'Włączony',
        AVAILABLE: 'Dostępny',
        UNAVAILABLE: 'Niedostępny',
        CAR_AVAILABLE: 'Dostępny do wynajęcia',
        CAR_AVAILABLE_TOOLTIP: 'Ten samochód jest dostępny.',
        CAR_UNAVAILABLE: 'Niedostępny do wynajęcia',
        CAR_UNAVAILABLE_TOOLTIP: 'Ten samochód jest niedostępny.',
        VIEW_CAR: 'Zobacz ten samochód',
        EMPTY_LIST: 'Brak samochodów.',
        CANNOT_DELETE_CAR: 'Tego samochodu nie można usunąć, bo jest zarezerwowany. By go wyłączyć z wynajmu potrzeba go zmodyfikować.',
        GEARBOX: 'Skrzynia biegów',
        ENGINE: 'Silnik',
        DEPOSIT: 'Kaucja przy odbiorze',
        LESS_THAN_2500: 'Mniej niż 2500 PLN',
        LESS_THAN_5000: 'Mniej niż 5000 PLN',
        LESS_THAN_7500: 'Mniej niż 7500 PLN',
        AVAILABILITY: 'Dostępność',
        PRICE_DAYS_PART_1: 'Kwota za',
        PRICE_DAYS_PART_2: 'dni',
        PRICE_PER_DAY: 'dziennie:',
    },
    fr: {
        NEW_CAR: 'Nouvelle voiture',
        DELETE_CAR: 'Êtes-vous sûr de vouloir supprimer cette voiture ?',
        CAR_CURRENCY: ' DH/jour',
        FUEL_POLICY: 'Politique carburant',
        DIESEL: 'Diesel',
        GASOLINE: 'Essence',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'E',
        GEARBOX_MANUAL: 'Manuelle',
        GEARBOX_AUTOMATIC: 'Automatique',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY_LIKE_FOR_LIKE: 'Plein/Plein',
        FUEL_POLICY_FREE_TANK: 'Plein inclus',
        DIESEL_TOOLTIP: 'Cette voiture a un moteur diesel',
        GASOLINE_TOOLTIP: 'Cette voiture a un moteur essence',
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
        AVAILABLE: 'Disponile',
        UNAVAILABLE: 'Indisponible',
        CAR_AVAILABLE: 'Disponible à la location',
        CAR_AVAILABLE_TOOLTIP: 'Cette voiture est disponible à la location.',
        CAR_UNAVAILABLE: 'Indisponible à la location',
        CAR_UNAVAILABLE_TOOLTIP: "Cette voiture n'est pas disponible à la location.",
        VIEW_CAR: 'Voir cette voiture',
        EMPTY_LIST: 'Pas de voitures.',
        CANNOT_DELETE_CAR: 'Cette voiture ne peut pas être supprimée car elle est liée à des réservations. Vous pouvez cependant la rendre indisponible à la location en la modifiant.',
        GEARBOX: 'Transmission',
        ENGINE: 'Moteur',
        DEPOSIT: 'Dépôt de garantie',
        LESS_THAN_2500: 'Moins de 2500 DH',
        LESS_THAN_5000: 'Moins de 5000 DH',
        LESS_THAN_7500: 'Moins de 7500 DH',
        AVAILABILITY: 'Disponibilité',
        PRICE_DAYS_PART_1: 'Prix pour',
        PRICE_DAYS_PART_2: 'jour',
        PRICE_PER_DAY: 'Prix par jour :',
    },
    en: {
        NEW_CAR: 'New car',
        DELETE_CAR: 'Are you sure you want to delete this car?',
        CAR_CURRENCY: ' DH/day',
        FUEL_POLICY: 'Fuel policy',
        DIESEL: 'Diesel',
        GASOLINE: 'Gasoline',
        DIESEL_SHORT: 'D',
        GASOLINE_SHORT: 'G',
        GEARBOX_MANUAL: 'Manual',
        GEARBOX_AUTOMATIC: 'Automatic',
        GEARBOX_MANUAL_SHORT: 'M',
        GEARBOX_AUTOMATIC_SHORT: 'A',
        FUEL_POLICY_LIKE_FOR_LIKE: 'Like for Like',
        FUEL_POLICY_FREE_TANK: 'Free tank',
        DIESEL_TOOLTIP: 'This car has a diesel engine',
        GASOLINE_TOOLTIP: 'This car has a gasoline engine',
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
        AVAILABLE: 'Available',
        UNAVAILABLE: 'Unavailable',
        CAR_AVAILABLE: 'Available for rental',
        CAR_AVAILABLE_TOOLTIP: 'This car is available for rental.',
        CAR_UNAVAILABLE: 'Unavailable for rental',
        CAR_UNAVAILABLE_TOOLTIP: 'This car is unavailable for rental.',
        VIEW_CAR: 'View this car',
        EMPTY_LIST: 'No cars.',
        CANNOT_DELETE_CAR: 'This car cannot be deleted because it is linked to bookings. However, you can make it unavailable for rental by modifying it.',
        GEARBOX: 'Gearbox',
        ENGINE: 'Engine',
        DEPOSIT: 'Deposit at pick-up',
        LESS_THAN_2500: 'Less than 2500 DH',
        LESS_THAN_5000: 'Less than 5000 DH',
        LESS_THAN_7500: 'Less than 7500 DH',
        AVAILABILITY: 'Availablity',
        PRICE_DAYS_PART_1: 'Price for',
        PRICE_DAYS_PART_2: 'day',
        PRICE_PER_DAY: 'Price per day:',
    }
})

let language = UserService.getQueryLanguage()

if (language === '' || !Env.LANGUAGES.includes(language)) {
    language = UserService.getLanguage()
}

strings.setLanguage(language)

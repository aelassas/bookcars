import LocalizedStrings from 'react-localization'
import * as langHelper from '../common/langHelper'

const COPYRIGHT_PART1 = `Copyright © ${new Date().getFullYear()} BookCars`

const strings = new LocalizedStrings({
  fr: {
    COPYRIGHT_PART1,
    COPYRIGHT_PART2: '. Tous droits réservés.',

    CORPORATE: 'À Propos',
    ABOUT: 'À propos de Nous',
    TOS: "Conditions d'utilisation",
    RENT: 'Louer une Voiture',
    SUPPLIERS: 'Fournisseurs',
    LOCATIONS: 'Lieux',
    SUPPORT: 'Support',
    CONTACT: 'Contact',
    SECURE_PAYMENT: 'Paiement 100% sécurisé avec BookCars',
  },
  en: {
    COPYRIGHT_PART1,
    COPYRIGHT_PART2: '. All rights reserved.',

    CORPORATE: 'Corporate',
    ABOUT: 'About Us',
    TOS: 'Terms of Service',
    RENT: 'Rent a Car',
    SUPPLIERS: 'Suppliers',
    LOCATIONS: 'Locations',
    SUPPORT: 'Support',
    CONTACT: 'Contact',
    SECURE_PAYMENT: '100% secure payment with BookCars',
  },
})

langHelper.setLanguage(strings)
export { strings }

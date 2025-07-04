import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'

const strings = new LocalizedStrings({
  fr: {
    TITLE: 'Plans tarifaires',
    FREE_PLAN: 'Plan gratuit',
    FREE_PLAN_PRICE: 'Gratuit',
    FEATURE_1: 'Créer un nombre illimité de voitures',
    FEATURE_2: '1 voiture dans les résultats de recherche',
    BASIC_PLAN: 'Plan de base',
    BASIC_PLAN_PRICE: '$10/mois',
    FEATURE_3: '5 voitures dans les résultats de recherche',
    FEATURE_4: 'Support prioritaire',
    PREMIUM_PLAN: 'Plan premium',
    CONTACT_US: 'Contactez-nous',
    FEATURE_5: 'Voitures illimitées dans les résultats de recherche',
  },
  en: {
    TITLE: 'Pricing Plans',
    FREE_PLAN: 'Free Plan',
    FREE_PLAN_PRICE: 'Free',
    FEATURE_1: 'Create unlimited cars',
    FEATURE_2: '1 car in search results',
    BASIC_PLAN: 'Basic Plan',
    BASIC_PLAN_PRICE: '$10/month',
    FEATURE_3: '5 cars in search results',
    FEATURE_4: 'Priority support',
    PREMIUM_PLAN: 'Premium Plan',
    CONTACT_US: 'Contact us',
    FEATURE_5: 'Unlimited cars in search results',
  },
  es: {
    TITLE: 'Planes de precios',
    FREE_PLAN: 'Plan gratuito',
    FREE_PLAN_PRICE: 'Gratis',
    FEATURE_1: 'Crear coches ilimitados',
    FEATURE_2: '1 coche en los resultados de búsqueda',
    BASIC_PLAN: 'Plan básico',
    BASIC_PLAN_PRICE: '$10/mes',
    FEATURE_3: '5 coches en los resultados de búsqueda',
    FEATURE_4: 'Soporte prioritario',
    PREMIUM_PLAN: 'Plan premium',
    CONTACT_US: 'Contáctenos',
    FEATURE_5: 'Coches ilimitados en los resultados de búsqueda',
  },
})

langHelper.setLanguage(strings)
export { strings }

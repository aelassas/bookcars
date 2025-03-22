import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/common/langHelper'
import env from '@/config/env.config'

const strings = new LocalizedStrings({
  fr: {
    TITLE1: `${env.WEBSITE_NAME} - Votre service de location de voitures`,
    SUBTITLE1: 'Votre partenaire de confiance pour la location de voitures',
    CONTENT1: `Chez ${env.WEBSITE_NAME}, nous comprenons que chaque voyage est unique. Nous nous engageons à fournir à nos clients une sélection diversifiée de véhicules qui répondent à tous les besoins de voyage. Que vous exploriez une ville, que vous vous déplaciez pour affaires ou que vous recherchiez l'aventure, nos services de location de voitures fiables garantissent que votre aventure commence en toute transparence. Notre mission est de fournir un service client exceptionnel, rendant votre expérience agréable et sans stress. Avec des tarifs compétitifs, une variété de véhicules bien entretenus et une équipe dédiée prête à vous aider, nous nous efforçons d'être votre partenaire de confiance sur la route. Choisissez ${env.WEBSITE_NAME} pour tous vos besoins de location de voiture et découvrez la liberté d'explorer à votre rythme.`,
    TITLE2: `Pourquoi choisir ${env.WEBSITE_NAME}`,
    SUBTITLE2: "Découvrez l'excellence à chaque voyage",
    CONTENT2: "Profitez d'une commodité, d'une fiabilité et d'une valeur inégalées avec notre service de location de voitures. Des réservations sans effort aux véhicules de haute qualité, nous sommes votre partenaire de voyage de confiance.",
    FIND_DEAL: 'Trouver une Offre',
    PRICING: 'Tarification',

  },
  en: {
    TITLE1: `${env.WEBSITE_NAME} - Your Premier Car Rental Service`,
    SUBTITLE1: 'Your Trusted Partner for Car Rentals',
    CONTENT1: `At ${env.WEBSITE_NAME}, we understand that every journey is unique. We are committed to providing our customers with a diverse selection of vehicles that cater to every travel need. Whether you're exploring a city, commuting for business, or seeking adventure, our reliable car rental services ensure that your adventure begins seamlessly. Our mission is to deliver exceptional customer service, making your experience enjoyable and stress-free. With competitive rates, a variety of well-maintained vehicles, and a dedicated team ready to assist you, we strive to be your trusted partner on the road. Choose ${env.WEBSITE_NAME} for all your car rental needs and experience the freedom to explore at your own pace.`,
    TITLE2: `Why Choose ${env.WEBSITE_NAME}`,
    SUBTITLE2: 'Experience Excellence in Every Journey',
    CONTENT2: "Enjoy unmatched convenience, reliability, and value with our premier car rental service. From effortless bookings to high-quality vehicles, we're your trusted travel partner.",
    FIND_DEAL: 'Find Deal',
    PRICING: 'Pricing',
  },
  es: {
    TITLE1: `${env.WEBSITE_NAME} - Su servicio de alquiler de coches`,
    SUBTITLE1: 'Su socio de confianza para alquileres de coches',
    CONTENT1: `En ${env.WEBSITE_NAME}, entendemos que cada viaje es único. Nos comprometemos a brindarles a nuestros clientes una selección diversa de vehículos que satisfagan todas las necesidades de viaje. Ya sea que esté explorando una ciudad, viajando por negocios o buscando aventuras, nuestros confiables servicios de alquiler de automóviles garantizan que su aventura comience sin problemas. Nuestra misión es brindar un servicio al cliente excepcional, haciendo que su experiencia sea agradable y sin estrés. Con tarifas competitivas, una variedad de vehículos bien mantenidos y un equipo dedicado listo para ayudarlo, nos esforzamos por ser su socio de confianza en la carretera. Elija ${env.WEBSITE_NAME} para todas sus necesidades de alquiler de automóviles y experimente la libertad de explorar a su propio ritmo.`,
    TITLE2: `Por qué elegir ${env.WEBSITE_NAME}`,
    SUBTITLE2: 'Experimenta la excelencia en cada viaje',
    CONTENT2: 'Disfruta de una comodidad, fiabilidad y valor inigualables con nuestro servicio de alquiler de coches de primera calidad. Desde reservas sencillas hasta vehículos de alta calidad, somos tu socio de viajes de confianza.',
    FIND_DEAL: 'Buscar oferta',
    PRICING: 'Precios',
  },
})

langHelper.setLanguage(strings)
export { strings }

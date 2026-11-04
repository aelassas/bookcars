import LocalizedStrings from 'localized-strings'
import * as langHelper from '@/utils/langHelper'
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
  },
  en: {
    TITLE1: `${env.WEBSITE_NAME} - Your Premier Car Rental Service`,
    SUBTITLE1: 'Your Trusted Partner for Car Rentals',
    CONTENT1: `At ${env.WEBSITE_NAME}, we understand that every journey is unique. We are committed to providing our customers with a diverse selection of vehicles that cater to every travel need. Whether you're exploring a city, commuting for business, or seeking adventure, our reliable car rental services ensure that your adventure begins seamlessly. Our mission is to deliver exceptional customer service, making your experience enjoyable and stress-free. With competitive rates, a variety of well-maintained vehicles, and a dedicated team ready to assist you, we strive to be your trusted partner on the road. Choose ${env.WEBSITE_NAME} for all your car rental needs and experience the freedom to explore at your own pace.`,
    TITLE2: `Why Choose ${env.WEBSITE_NAME}`,
    SUBTITLE2: 'Experience Excellence in Every Journey',
    CONTENT2: "Enjoy unmatched convenience, reliability, and value with our premier car rental service. From effortless bookings to high-quality vehicles, we're your trusted travel partner.",
    FIND_DEAL: 'Find Deal',
  },
  es: {
    TITLE1: `${env.WEBSITE_NAME} - Su servicio de alquiler de coches`,
    SUBTITLE1: 'Su socio de confianza para alquileres de coches',
    CONTENT1: `En ${env.WEBSITE_NAME}, entendemos que cada viaje es único. Nos comprometemos a brindarles a nuestros clientes una selección diversa de vehículos que satisfagan todas las necesidades de viaje. Ya sea que esté explorando una ciudad, viajando por negocios o buscando aventuras, nuestros confiables servicios de alquiler de automóviles garantizan que su aventura comience sin problemas. Nuestra misión es brindar un servicio al cliente excepcional, haciendo que su experiencia sea agradable y sin estrés. Con tarifas competitivas, una variedad de vehículos bien mantenidos y un equipo dedicado listo para ayudarlo, nos esforzamos por ser su socio de confianza en la carretera. Elija ${env.WEBSITE_NAME} para todas sus necesidades de alquiler de automóviles y experimente la libertad de explorar a su propio ritmo.`,
    TITLE2: `Por qué elegir ${env.WEBSITE_NAME}`,
    SUBTITLE2: 'Experimenta la excelencia en cada viaje',
    CONTENT2: 'Disfruta de una comodidad, fiabilidad y valor inigualables con nuestro servicio de alquiler de coches de primera calidad. Desde reservas sencillas hasta vehículos de alta calidad, somos tu socio de viajes de confianza.',
    FIND_DEAL: 'Buscar oferta',
  },
  de: {
    TITLE1: `${env.WEBSITE_NAME} - Ihr erstklassiger Autovermietungsservice`,
    SUBTITLE1: 'Ihr zuverlässiger Partner für Autovermietungen',
    CONTENT1: `Bei ${env.WEBSITE_NAME} wissen wir, dass jede Reise einzigartig ist. Wir haben es uns zur Aufgabe gemacht, unseren Kunden eine vielfältige Auswahl an Fahrzeugen anzubieten, die jedem Reisebedürfnis gerecht wird. Ob Sie eine Stadt erkunden, geschäftlich unterwegs sind oder das Abenteuer suchen – unsere zuverlässigen Autovermietungsdienste sorgen dafür, dass Ihr Abenteuer reibungslos beginnt. Unser Ziel ist es, einen außergewöhnlichen Kundenservice zu bieten, der Ihr Erlebnis angenehm und stressfrei macht. Mit wettbewerbsfähigen Preisen, einer Vielzahl gut gewarteter Fahrzeuge und einem engagierten Team, das Ihnen jederzeit zur Seite steht, möchten wir Ihr vertrauenswürdiger Partner auf der Straße sein. Wählen Sie ${env.WEBSITE_NAME} für alle Ihre Autovermietungsbedürfnisse und erleben Sie die Freiheit, in Ihrem eigenen Tempo zu entdecken.`,
    TITLE2: `Warum ${env.WEBSITE_NAME} wählen`,
    SUBTITLE2: 'Erleben Sie Exzellenz auf jeder Reise',
    CONTENT2: 'Genießen Sie unübertroffenen Komfort, Zuverlässigkeit und Wert mit unserem erstklassigen Autovermietungsservice. Von mühelosen Buchungen bis hin zu hochwertigen Fahrzeugen – wir sind Ihr vertrauenswürdiger Reisepartner.',
    FIND_DEAL: 'Angebot finden',
  },
  pt: {
    TITLE1: `${env.WEBSITE_NAME} - O seu serviço de aluguer de automóveis de excelência`,
    SUBTITLE1: 'O seu parceiro de confiança para o aluguer de automóveis',
    CONTENT1: `Na ${env.WEBSITE_NAME}, sabemos que cada viagem é única. Comprometemo-nos a oferecer aos nossos clientes uma seleção diversificada de veículos que respondem a todas as necessidades de viagem. Quer esteja a explorar uma cidade, em deslocação profissional ou à procura de aventura, os nossos fiáveis serviços de aluguer de automóveis garantem que a sua aventura começa sem contratempos. A nossa missão é prestar um serviço de atendimento ao cliente excecional, tornando a sua experiência agradável e sem stress. Com preços competitivos, uma variedade de veículos bem conservados e uma equipa dedicada pronta a ajudá-lo, esforçamo-nos por ser o seu parceiro de confiança na estrada. Escolha a ${env.WEBSITE_NAME} para todas as suas necessidades de aluguer de automóveis e descubra a liberdade de explorar ao seu próprio ritmo.`,
    TITLE2: `Porquê escolher a ${env.WEBSITE_NAME}`,
    SUBTITLE2: 'Viva a excelência em cada viagem',
    CONTENT2: 'Desfrute de uma comodidade, fiabilidade e qualidade inigualáveis com o nosso serviço de aluguer de automóveis de excelência. Desde reservas sem esforço a veículos de alta qualidade, somos o seu parceiro de viagem de confiança.',
    FIND_DEAL: 'Encontrar oferta',
  },
  it: {
    TITLE1: `${env.WEBSITE_NAME} - Il tuo servizio di noleggio auto d'eccellenza`,
    SUBTITLE1: 'Il tuo partner di fiducia per il noleggio auto',
    CONTENT1: `In ${env.WEBSITE_NAME} sappiamo che ogni viaggio è unico. Ci impegniamo a offrire ai nostri clienti una selezione diversificata di veicoli che soddisfano ogni esigenza di viaggio. Che tu stia esplorando una città, viaggiando per lavoro o cercando l'avventura, i nostri affidabili servizi di noleggio auto garantiscono che la tua avventura inizi senza intoppi. La nostra missione è offrire un servizio clienti eccezionale, rendendo la tua esperienza piacevole e senza stress. Con tariffe competitive, una vasta scelta di veicoli ben mantenuti e un team dedicato pronto ad assisterti, ci impegniamo a essere il tuo partner di fiducia su strada. Scegli ${env.WEBSITE_NAME} per tutte le tue esigenze di noleggio auto e scopri la libertà di esplorare al tuo ritmo.`,
    TITLE2: `Perché scegliere ${env.WEBSITE_NAME}`,
    SUBTITLE2: 'Vivi l\'eccellenza in ogni viaggio',
    CONTENT2: 'Goditi comodità, affidabilità e convenienza senza pari con il nostro servizio di noleggio auto di alto livello. Dalle prenotazioni semplici ai veicoli di alta qualità, siamo il tuo partner di viaggio di fiducia.',
    FIND_DEAL: 'Trova un\'offerta',
  },
  zh: {
    TITLE1: `${env.WEBSITE_NAME} - 您的优质租车服务`,
    SUBTITLE1: '您值得信赖的租车伙伴',
    CONTENT1: `在 ${env.WEBSITE_NAME}，我们深知每一次旅程都是独一无二的。我们致力于为客户提供多样化的车型选择，满足各种出行需求。无论您是在城市中探索、出差通勤，还是追寻冒险，我们可靠的租车服务都能确保您的旅程顺利开启。我们的使命是提供卓越的客户服务，让您的体验愉快而轻松。凭借具有竞争力的价格、种类丰富且保养良好的车辆，以及随时为您提供协助的专业团队，我们努力成为您旅途中值得信赖的伙伴。选择 ${env.WEBSITE_NAME} 满足您所有的租车需求，尽享按自己的节奏自由探索的乐趣。`,
    TITLE2: `为什么选择 ${env.WEBSITE_NAME}`,
    SUBTITLE2: '让每一次旅程都精彩卓越',
    CONTENT2: '我们的优质租车服务为您带来无与伦比的便利、可靠与价值。从轻松预订到高品质车辆，我们是您值得信赖的旅行伙伴。',
    FIND_DEAL: '查找优惠',
  },
  ja: {
    TITLE1: `${env.WEBSITE_NAME} - 上質なレンタカーサービス`,
    SUBTITLE1: 'レンタカーなら信頼のパートナーにお任せください',
    CONTENT1: `${env.WEBSITE_NAME}では、すべての旅がかけがえのないものだと考えています。あらゆる旅行のニーズにお応えできるよう、多彩な車両をご用意しています。街の散策、出張での移動、冒険の旅など、信頼できるレンタカーサービスで、旅のスタートをスムーズにお手伝いします。私たちの使命は、卓越したカスタマーサービスで、快適でストレスのないご体験をお届けすることです。競争力のある料金、よく整備された豊富な車両、そしてサポートに努める専任チームにより、道中の信頼できるパートナーを目指しています。レンタカーのご利用は ${env.WEBSITE_NAME} で、ご自分のペースで自由に旅をお楽しみください。`,
    TITLE2: `${env.WEBSITE_NAME} が選ばれる理由`,
    SUBTITLE2: 'すべての旅で卓越した体験を',
    CONTENT2: '上質なレンタカーサービスで、比類のない利便性、信頼性、価値をお楽しみください。かんたんな予約から高品質な車両まで、信頼できる旅のパートナーです。',
    FIND_DEAL: 'お得なプランを探す',
  },
})

langHelper.setLanguage(strings)
export { strings }

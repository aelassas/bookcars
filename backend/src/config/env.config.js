
const Env = {
    isMobile: () => window.innerWidth <= 960,

    API_HOST: process.env.REACT_APP_BC_API_HOST,
    LANGUAGES: ['fr', 'en'],
    DEFAULT_LANGUAGE: process.env.REACT_APP_BC_DEFAULT_LANGUAGE,
    DATE_FORMAT: process.env.REACT_APP_BC_DATE_FORMAT,
    PAGE_SIZE: parseInt(process.env.REACT_APP_BC_PAGE_SIZE),
    CARS_PAGE_SIZE: parseInt(process.env.REACT_APP_BC_CARS_PAGE_SIZE),
    BOOKINGS_PAGE_SIZE: parseInt(process.env.REACT_APP_BC_BOOKINGS_PAGE_SIZE),
    CDN_USERS: process.env.REACT_APP_BC_CDN_USERS,
    CDN_TEMP_USERS: process.env.REACT_APP_BC_CDN_TEMP_USERS,
    CDN_CARS: process.env.REACT_APP_BC_CDN_CARS,
    CDN_TEMP_CARS: process.env.REACT_APP_BC_CDN_TEMP_CARS,
    PAGE_OFFSET: 200,
    CAR_PAGE_OFFSET: 400,
    COMPANY_IMAGE_WIDTH: parseInt(process.env.REACT_APP_BC_COMAPANY_IMAGE_WIDTH),
    COMPANY_IMAGE_HEIGHT: parseInt(process.env.REACT_APP_BC_COMAPANY_IMAGE_HEIGHT),
    CAR_IMAGE_WIDTH: parseInt(process.env.REACT_APP_BC_CAR_IMAGE_WIDTH),
    CAR_IMAGE_HEIGHT: parseInt(process.env.REACT_APP_BC_CAR_IMAGE_HEIGHT),
    CAR_OPTION_IMAGE_HEIGHT: 85,
    SELECTED_CAR_OPTION_IMAGE_HEIGHT: 30,
    RECORD_TYPE: {
        ADMIN: 'admin',
        COMPANY: 'company',
        USER: 'user',
        CAR: 'car',
        LOCATION: 'location'
    },
    CAR_TYPE: {
        DIESEL: 'diesel',
        GASOLINE: 'gasoline'
    },
    GEARBOX_TYPE: {
        MANUAL: 'manual',
        AUTOMATIC: 'automatic'
    },
    FUEL_POLICY: {
        LIKE_FOR_LIKE: 'likeForlike',
        FREE_TANK: 'freeTank'
    },
    BOOKING_STATUS: {
        VOID: 'void',
        PENDING: 'pending',
        DEPOSIT: 'deposit',
        PAID: 'paid',
        RESERVED: 'reserved',
        CANCELLED: 'cancelled'
    }
};

export default Env;
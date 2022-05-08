
const Env = {
    isMobile: _ => window.innerWidth <= 960,

    API_HOST: process.env.REACT_APP_BC_API_HOST,
    LANGUAGES: ['fr', 'en'],
    DEFAULT_LANGUAGE: process.env.REACT_APP_BC_DEFAULT_LANGUAGE,
    RECORD_TYPE: {
        ADMIN: 'admin',
        COMPANY: 'company',
        USER: 'user',
        CAR: 'car'
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
        LIKE_TO_LIKE: 'likeTolike',
        FREE_TANK: 'freeTank'
    },
    DATE_FORMAT: process.env.REACT_APP_BC_DATE_FORMAT,
    PAGE_SIZE: parseInt(process.env.REACT_APP_BC_PAGE_SIZE),
    CARS_PAGE_SIZE: parseInt(process.env.REACT_APP_BC_CARS_PAGE_SIZE),
    CDN_USERS: process.env.REACT_APP_BC_CDN_USERS,
    CDN_TEMP_USERS: process.env.REACT_APP_BC_CDN_TEMP_USERS,
    CDN_CARS: process.env.REACT_APP_BC_CDN_CARS,
    CDN_TEMP_CARS: process.env.REACT_APP_BC_CDN_TEMP_CARS,
    PAGE_FETCH_OFFSET: 30,
    PAGE_TOP_OFFSET: 65,
    COMPANY_AVATAR_WIDTH: 62,
    COMPANY_AVATAR_HEIGHT: 24
};

export default Env;
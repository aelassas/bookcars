const Env = {
    API_HOST: process.env.REACT_APP_BC_API_HOST,
    LANGUAGES: ['fr', 'en'],
    DEFAULT_LANGUAGE: process.env.REACT_APP_BC_DEFAULT_LANGUAGE,
    DATE_FORMAT: process.env.REACT_APP_BC_DATE_FORMAT,
    PAGE_SIZE: parseInt(process.env.REACT_APP_BC_PAGE_SIZE),
    CDN: process.env.REACT_APP_BC_CDN,
    PAGE_FETCH_OFFSET: 30
};

export default Env;
import axios from 'axios';
import Env from '../config/env.config';

export const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('bc-user'));

    if (user && user.accessToken) {
        return { 'x-access-token': user.accessToken };
    } else {
        return {};
    }
};

export const create = (data) => (
    axios.post(`${Env.API_HOST}/api/create-user`, data, { headers: authHeader() }).then(res => res.status)
);

export const signup = (data) => (
    axios.post(`${Env.API_HOST}/api/admin-sign-up/ `, data).then(res => res.status)
);

export const checkToken = (userId, email, token) => (
    axios.get(`${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`).then(res => res.status)
);

export const deleteTokens = (userId) => (
    axios.delete(`${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`).then(res => res.status)
);

export const resend = (email, reset = false, appType) => (
    axios.post(`${Env.API_HOST}/api/resend/${appType}/${encodeURIComponent(email)}/${reset}`).then(res => res.status)
);

export const activate = (data) => (
    axios.post(`${Env.API_HOST}/api/activate/ `, data, { headers: authHeader() }).then(res => res.status)
);

export const validateEmail = (data) => (
    axios.post(`${Env.API_HOST}/api/validate-email`, data).then(exist => exist.status)
);

export const signin = (data) => (
    axios.post(`${Env.API_HOST}/api/sign-in/${Env.APP_TYPE}`, data).then(res => {
        if (res.data.accessToken) {
            localStorage.setItem('bc-user', JSON.stringify(res.data));
        }
        return { status: res.status, data: res.data };
    })
);

export const signout = (redirect = true) => {

    const _signout = () => {
        const deleteAllCookies = () => {
            const cookies = document.cookie.split(';');

            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT';
            }
        };

        sessionStorage.clear();
        localStorage.removeItem('bc-user');
        deleteAllCookies();

        if (redirect) {
            window.location.href = '/sign-in';
        }
    };

    _signout();
};

export const validateAccessToken = () => (
    axios.post(`${Env.API_HOST}/api/validate-access-token`, null, { headers: authHeader() }).then(res => res.status)
);

export const confirmEmail = (email, token) => (
    axios.post(`${Env.API_HOST}/api/confirm-email/` + encodeURIComponent(email) + '/' + encodeURIComponent(token)).then(res => res.status)
);

export const resendLink = (data) => (
    axios.post(`${Env.API_HOST}/api/resend-link`, data, { headers: authHeader() }).then(res => res.status)
);

export const getLanguage = () => {
    const user = JSON.parse(localStorage.getItem('bc-user'));

    if (user && user.language) {
        return user.language;
    } else {
        const lang = localStorage.getItem('bc-language');
        if (lang && lang.length === 2) {
            return lang;
        }
        return Env.DEFAULT_LANGUAGE;
    }
};

export const getQueryLanguage = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('l')) {
        return params.get('l');
    }
    return '';
};

export const updateLanguage = (data) => (
    axios.post(`${Env.API_HOST}/api/update-language`, data, { headers: authHeader() }).then(res => {
        if (res.status === 200) {
            const user = JSON.parse(localStorage.getItem('bc-user'));
            user.language = data.language;
            localStorage.setItem('bc-user', JSON.stringify(user));
        }
        return res.status;
    })
);

export const setLanguage = (lang) => {
    localStorage.setItem('bc-language', lang);
};

export const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem('bc-user'));
    if (user && user.accessToken) {
        return user;
    }
    return null;
};

export const getUser = (id) => (
    axios.get(`${Env.API_HOST}/api/user/` + encodeURIComponent(id), { headers: authHeader() }).then(res => res.data)
);

export const getDrivers = (keyword, page, size) => {
    const payload = { types: [Env.RECORD_TYPE.USER] };
    return axios.post(`${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`, payload, { headers: authHeader() }).then(res => res.data);
};

export const getUsers = (payload, keyword, page, size) => (
    axios.post(`${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`, payload, { headers: authHeader() }).then(res => res.data)
);

export const updateUser = (data) => (
    axios.post(`${Env.API_HOST}/api/update-user`, data, { headers: authHeader() }).then(res => res.status)
);

export const updateEmailNotifications = (data) => (
    axios.post(`${Env.API_HOST}/api/update-email-notifications`, data, { headers: authHeader() })
        .then(res => {
            if (res.status === 200) {
                const user = getCurrentUser();
                user.enableEmailNotifications = data.enableEmailNotifications;
                localStorage.setItem('bc-user', JSON.stringify(user));
            }
            return res.status;
        })
);

export const createAvatar = (file) => {
    const user = getCurrentUser();
    var formData = new FormData();
    formData.append('image', file);

    return axios.post(`${Env.API_HOST}/api/create-avatar`, formData,
        user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
            : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
};

export const updateAvatar = (userId, file) => {
    const user = getCurrentUser();
    var formData = new FormData();
    formData.append('image', file);

    return axios.post(`${Env.API_HOST}/api/update-avatar/${encodeURIComponent(userId)}`, formData,
        user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
            : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.status);
};

export const deleteAvatar = (userId) => (
    axios.post(`${Env.API_HOST}/api/delete-avatar/${encodeURIComponent(userId)}`, null, { headers: authHeader() }).then(res => res.status)
);

export const deleteTempAvatar = (avatar) => (
    axios.post(`${Env.API_HOST}/api/delete-temp-avatar/${encodeURIComponent(avatar)}`, null, { headers: authHeader() }).then(res => res.status)
);

export const checkPassword = (id, pass) => (
    axios.get(`${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`, { headers: authHeader() }).then(res => res.status)
);

export const changePassword = (data) => (
    axios.post(`${Env.API_HOST}/api/change-password/ `, data, { headers: authHeader() }).then(res => res.status)
);

export const deleteUsers = (ids) => (
    axios.post(`${Env.API_HOST}/api/delete-users`, ids, { headers: authHeader() }).then(res => res.status)
);
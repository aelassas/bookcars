import axios from 'axios';
import { API_HOST, DEFAULT_LANGUAGE } from '../config/env.config';
import bcrypt from 'bcryptjs';

export const authHeader = () => {
    const user = JSON.parse(localStorage.getItem('bc-user'));

    if (user && user.accessToken) {
        return { 'x-access-token': user.accessToken };
    } else {
        return {};
    }
};

export const signup = data => {
    const password = data.password;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    data['password'] = hash;

    return axios.post(API_HOST + '/api/sign-up', data)
        .then(res => res.status);
};

export const validateEmail = data => (
    axios.post(API_HOST + '/api/validate-email', data)
        .then(exist => exist.status)
);


export const signin = data => (
    axios.post(API_HOST + '/api/sign-in/frontend', data)
        .then(res => {
            if (res.data.accessToken) {
                localStorage.setItem('bc-auth', 'email');
                localStorage.setItem('bc-user', JSON.stringify(res.data));
            }
            return { status: res.status, data: res.data };
        })
);


export const signout = (redirect = true) => {

    const _signout = () => {
        const deleteAllCookies = () => {
            var cookies = document.cookie.split(";");

            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i];
                var eqPos = cookie.indexOf("=");
                var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
            }
        };

        sessionStorage.clear();
        localStorage.removeItem('bc-auth');
        localStorage.removeItem('bc-user');
        deleteAllCookies();

        if (redirect) {
            window.location.href = '/' + window.location.search;
        }
    };

    _signout();
};

export const validateAccessToken = () => (
    axios.post(API_HOST + '/api/validate-access-token', null, { headers: authHeader() })
        .then(res => res.status)
);

export const confirmEmail = (email, token) => (
    axios.post(API_HOST + '/api/confirm-email/' + encodeURIComponent(email) + '/' + encodeURIComponent(token))
        .then(res => {
            return res.status;
        })
);

export const resendLink = (data) => (
    axios.post(API_HOST + '/api/resend-link', data, { headers: authHeader() })
        .then(res => {
            return res.status;
        })
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
        return DEFAULT_LANGUAGE;
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
    axios.post(API_HOST + '/api/update-language', data, { headers: authHeader() })
        .then(res => {
            if (res.status === 200) {
                const user = JSON.parse(localStorage.getItem('bc-user'));
                user.language = data.language;
                localStorage.setItem('bc-user', JSON.stringify(user));
            }
            return res.status;
        })
);

export const setLanguage = (lang) => {
    localStorage.setItem('ws-language', lang);
};

export const getCurrentUser = () => {
    const user = JSON.parse(localStorage.getItem('bc-user'));
    if (user && user.accessToken) {
        return user;
    }
    return null;
};

export const getUser = (id) => (
    axios.get(API_HOST + '/api/user/' + encodeURIComponent(id), { headers: authHeader() })
        .then(res => res.data)
);

export const updateAvatar = (userId, file) => {
    const user = JSON.parse(localStorage.getItem('ws-user'));
    var formData = new FormData();
    formData.append('image', file);
    return axios.post(API_HOST + '/api/update-avatar/' + encodeURIComponent(userId), formData,
        user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
            : { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(res => res.status);
};

export const deleteAvatar = (userId) => (
    axios.post(API_HOST + '/api/delete-avatar/' + encodeURIComponent(userId), null, { headers: authHeader() })
        .then(res => res.status)
);
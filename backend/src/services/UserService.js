import axios from 'axios';
import Env from '../config/env.config';

export default class UserService {

    static authHeader() {
        const user = JSON.parse(localStorage.getItem('bc-user'));

        if (user && user.accessToken) {
            return { 'x-access-token': user.accessToken };
        } else {
            return {};
        }
    }

    static create(data) {
        return axios.post(`${Env.API_HOST}/api/create-user`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static signup(data) {
        return axios.post(`${Env.API_HOST}/api/admin-sign-up/ `, data).then(res => res.status);
    }

    static checkToken(userId, email, token) {
        return axios.get(`${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`).then(res => res.status);
    }

    static deleteTokens(userId) {
        return axios.delete(`${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`).then(res => res.status);
    }

    static resend(email, reset = false, appType) {
        return axios.post(`${Env.API_HOST}/api/resend/${appType}/${encodeURIComponent(email)}/${reset}`).then(res => res.status);
    }

    static activate(data) {
        return axios.post(`${Env.API_HOST}/api/activate/ `, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static validateEmail(data) {
        return axios.post(`${Env.API_HOST}/api/validate-email`, data).then(exist => exist.status);
    }

    static signin(data) {
        return axios.post(`${Env.API_HOST}/api/sign-in/${Env.APP_TYPE}`, data).then(res => {
            if (res.data.accessToken) {
                localStorage.setItem('bc-user', JSON.stringify(res.data));
            }
            return { status: res.status, data: res.data };
        });
    }

    static signout(redirect = true) {

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
                window.location.href = '/sign-in' + window.location.search;
            }
        };

        _signout();
    }

    static validateAccessToken() {
        return axios.post(`${Env.API_HOST}/api/validate-access-token`, null, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static confirmEmail(email, token) {
        return axios.post(`${Env.API_HOST}/api/confirm-email/` + encodeURIComponent(email) + '/' + encodeURIComponent(token)).then(res => res.status);
    }

    static resendLink(data) {
        return axios.post(`${Env.API_HOST}/api/resend-link`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static getLanguage() {
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

    static getQueryLanguage() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('l')) {
            return params.get('l');
        }
        return '';
    };

    static updateLanguage(data) {
        return axios.post(`${Env.API_HOST}/api/update-language`, data, { headers: UserService.authHeader() }).then(res => {
            if (res.status === 200) {
                const user = JSON.parse(localStorage.getItem('bc-user'));
                user.language = data.language;
                localStorage.setItem('bc-user', JSON.stringify(user));
            }
            return res.status;
        })
    }

    static setLanguage(lang) {
        localStorage.setItem('bc-language', lang);
    }

    static getCurrentUser() {
        const user = JSON.parse(localStorage.getItem('bc-user'));
        if (user && user.accessToken) {
            return user;
        }
        return null;
    };

    static getUser(id) {
        return axios.get(`${Env.API_HOST}/api/user/` + encodeURIComponent(id), { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getDrivers(keyword, page, size) {
        const payload = { types: [Env.RECORD_TYPE.USER] };
        return axios.post(`${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`, payload, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getUsers(payload, keyword, page, size) {
        return axios.post(`${Env.API_HOST}/api/users/${page}/${size}/?s=${encodeURIComponent(keyword)}`, payload, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static updateUser(data) {
        return axios.post(`${Env.API_HOST}/api/update-user`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static updateEmailNotifications(data) {
        return axios.post(`${Env.API_HOST}/api/update-email-notifications`, data, { headers: UserService.authHeader() })
            .then(res => {
                if (res.status === 200) {
                    const user = UserService.getCurrentUser();
                    user.enableEmailNotifications = data.enableEmailNotifications;
                    localStorage.setItem('bc-user', JSON.stringify(user));
                }
                return res.status;
            })
    }

    static createAvatar(file) {
        const user = UserService.getCurrentUser();
        var formData = new FormData();
        formData.append('image', file);
        return axios.post(`${Env.API_HOST}/api/create-avatar`, formData,
            user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
                : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
    }

    static updateAvatar(userId, file) {
        const user = UserService.getCurrentUser();
        var formData = new FormData();
        formData.append('image', file);
        return axios.post(`${Env.API_HOST}/api/update-avatar/${encodeURIComponent(userId)}`, formData,
            user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
                : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.status);
    }

    static deleteAvatar(userId) {
        return axios.post(`${Env.API_HOST}/api/delete-avatar/${encodeURIComponent(userId)}`, null, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static deleteTempAvatar(avatar) {
        return axios.post(`${Env.API_HOST}/api/delete-temp-avatar/${encodeURIComponent(avatar)}`, null, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static checkPassword(id, pass) {
        return axios.get(`${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static changePassword(data) {
        return axios.post(`${Env.API_HOST}/api/change-password/ `, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static delete(ids) {
        return axios.post(`${Env.API_HOST}/api/delete-users`, ids, { headers: UserService.authHeader() }).then(res => res.status);
    }
}
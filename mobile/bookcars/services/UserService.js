import axios from 'axios';
import Env from '../config/env.config';
import AsyncStorage from '../common/AsyncStorage';

export default class UserService {

    static async authHeader() {
        const user = await UserService.getCurrentUser();

        if (user && user.accessToken) {
            return { 'x-access-token': user.accessToken };
        } else {
            return {};
        }
    }

    static signup(data) {
        return axios.post(`${Env.API_HOST}/api/sign-up`, data).then(res => res.status);
    }

    static checkToken(userId, email, token) {
        return axios.get(`${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`).then(res => res.status);
    }

    static deleteTokens(userId) {
        return axios.delete(`${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`).then(res => res.status);
    }

    static resend(email, reset = false) {
        return axios.post(`${Env.API_HOST}/api/resend/${Env.APP_TYPE}/${encodeURIComponent(email)}/${reset}`).then(res => res.status);
    }

    static activate(data) {
        return axios.post(`${Env.API_HOST}/api/activate/ `, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static validateEmail(data) {
        return axios.post(`${Env.API_HOST}/api/validate-email`, data).then(exist => exist.status);
    }

    static async signin(data) {
        return axios.post(`${Env.API_HOST}/api/sign-in/frontend`, data).then(async res => {
            if (res.data.accessToken) {
                await AsyncStorage.storeObject('bc-user', res.data);
            }
            return { status: res.status, data: res.data };
        });
    }

    static async signout(navigation, redirect = true, redirectSignin = false) {
        await AsyncStorage.removeItem('bc-user');

        if (redirect) {
            navigation.navigate('Home', { d: new Date().getTime() });
        }
        if (redirectSignin) {
            navigation.navigate('SignIn');
        }
    }

    static async validateAccessToken() {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/validate-access-token`, null, { headers: authHeader }).then(res => res.status);
    }

    static confirmEmail(email, token) {
        return axios.post(`${Env.API_HOST}/api/confirm-email/` + encodeURIComponent(email) + '/' + encodeURIComponent(token)).then(res => res.status);
    }

    static async resendLink(data) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/resend-link`, data, { headers: authHeader }).then(res => res.status);
    }

    static async getLanguage() {
        const user = await AsyncStorage.getObject('bc-user');

        if (user && user.language) {
            return user.language;
        } else {
            const lang = await AsyncStorage.getString('bc-language');
            if (lang && lang.length === 2) {
                return lang;
            }
            return Env.DEFAULT_LANGUAGE;
        }
    };

    static async updateLanguage(data) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/update-language`, data, { headers: authHeader }).then(async res => {
            if (res.status === 200) {
                const user = await AsyncStorage.getObject('bc-user');
                user.language = data.language;
                await AsyncStorage.storeObject('bc-user', user);
            }
            return res.status;
        })
    }

    static async setLanguage(lang) {
        await AsyncStorage.storeString('bc-language', lang);
    }

    static async getCurrentUser() {
        const user = await AsyncStorage.getObject('bc-user');
        if (user && user.accessToken) {
            return user;
        }
        return null;
    };

    static async getUser(id) {
        const authHeader = await UserService.authHeader();
        return axios.get(`${Env.API_HOST}/api/user/` + encodeURIComponent(id), { headers: authHeader }).then(res => res.data);
    }

    static async updateUser(data) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/update-user`, data, { headers: authHeader }).then(res => res.status);
    }

    static async updateEmailNotifications(data) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/update-email-notifications`, data, { headers: authHeader })
            .then(async res => {
                if (res.status === 200) {
                    const user = UserService.getCurrentUser();
                    user.enableEmailNotifications = data.enableEmailNotifications;
                    await AsyncStorage.storeObject('bc-user', user);
                }
                return res.status;
            })
    }

    static async checkPassword(id, pass) {
        const authHeader = await UserService.authHeader();
        return axios.get(`${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`, { headers: authHeader }).then(res => res.status);
    }

    static async changePassword(data) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/change-password/ `, data, { headers: authHeader }).then(res => res.status);
    }

    static async updateAvatar(userId, file) {
        const user = await AsyncStorage.getObject('bc-user');
        var formData = new FormData();
        formData.append('image', file);
        return axios.post(`${Env.API_HOST}/api/update-avatar/` + encodeURIComponent(userId), formData,
            user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
                : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.status);
    }

    static async deleteAvatar(userId) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/delete-avatar/` + encodeURIComponent(userId), null, { headers: authHeader }).then(res => res.status);
    }

    static async loggedIn() {
        const currentUser = await UserService.getCurrentUser();
        if (currentUser) {
            const status = await UserService.validateAccessToken();
            if (status === 200) {
                const user = await UserService.getUser(currentUser.id);
                if (user) return true;
            }
        }

        return false;
    }
}
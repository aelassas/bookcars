import axios from 'axios';
import Env from '../config/env.config';
import * as AsyncStorage from '../common/AsyncStorage';

export const authHeader = async () => {
    const user = await getCurrentUser();

    if (user && user.accessToken) {
        return { 'x-access-token': user.accessToken };
    } else {
        return {};
    }
};

export const signup = (data) => (
    axios.post(`${Env.API_HOST}/api/sign-up`, data).then(res => res.status)
);

export const checkToken = (userId, email, token) => (
    axios.get(`${Env.API_HOST}/api/check-token/${Env.APP_TYPE}/${encodeURIComponent(userId)}/${encodeURIComponent(email)}/${encodeURIComponent(token)}`).then(res => res.status)
);

export const deleteTokens = (userId) => (
    axios.delete(`${Env.API_HOST}/api/delete-tokens/${encodeURIComponent(userId)}`).then(res => res.status)
);

export const resend = (email, reset = false) => (
    axios.post(`${Env.API_HOST}/api/resend/${Env.APP_TYPE}/${encodeURIComponent(email)}/${reset}`).then(res => res.status)
);

export const activate = async (data) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/activate/ `, data, { headers: headers }).then(res => res.status);
};

export const validateEmail = (data) => (
    axios.post(`${Env.API_HOST}/api/validate-email`, data).then(exist => exist.status)
);

export const signin = async (data) => {
    return axios.post(`${Env.API_HOST}/api/sign-in/frontend`, data).then(async res => {
        if (res.data.accessToken) {
            await AsyncStorage.storeObject('bc-user', res.data);
        }
        return { status: res.status, data: res.data };
    });
};

export const getPushToken = async (userId) => {
    const headers = await authHeader();
    return axios.get(`${Env.API_HOST}/api/push-token/${encodeURIComponent(userId)}`, { headers }).then(res => ({ status: res.status, data: res.data }));
};

export const createPushToken = async (userId, token) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/create-push-token/${encodeURIComponent(userId)}/${encodeURIComponent(token)}`, null, { headers }).then(res => res.status);
};

export const deletePushToken = async (userId) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/delete-push-token/${encodeURIComponent(userId)}`, null, { headers }).then(res => res.status);
};

export const signout = async (navigation, redirect = true, redirectSignin = false) => {
    await AsyncStorage.removeItem('bc-user');

    if (redirect) {
        navigation.navigate('Home', { d: new Date().getTime() });
    }
    if (redirectSignin) {
        navigation.navigate('SignIn');
    }
};

export const validateAccessToken = async () => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/validate-access-token`, null, { headers: headers, timeout: Env.AXIOS_TIMEOUT }).then(res => res.status);
};

export const confirmEmail = (email, token) => (
    axios.post(`${Env.API_HOST}/api/confirm-email/` + encodeURIComponent(email) + '/' + encodeURIComponent(token)).then(res => res.status)
);

export const resendLink = async (data) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/resend-link`, data, { headers: headers }).then(res => res.status);
};

export const getLanguage = async () => {
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

export const updateLanguage = async (data) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/update-language`, data, { headers: headers }).then(async res => {
        if (res.status === 200) {
            const user = await AsyncStorage.getObject('bc-user');
            user.language = data.language;
            await AsyncStorage.storeObject('bc-user', user);
        }
        return res.status;
    })
};

export const setLanguage = async (lang) => {
    await AsyncStorage.storeString('bc-language', lang);
};

export const getCurrentUser = async () => {
    const user = await AsyncStorage.getObject('bc-user');
    if (user && user.accessToken) {
        return user;
    }
    return null;
};

export const getUser = async (id) => {
    const headers = await authHeader();
    return axios.get(`${Env.API_HOST}/api/user/` + encodeURIComponent(id), { headers: headers }).then(res => res.data);
};

export const updateUser = async (data) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/update-user`, data, { headers: headers }).then(res => res.status);
};

export const updateEmailNotifications = async (data) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/update-email-notifications`, data, { headers: headers })
        .then(async res => {
            if (res.status === 200) {
                const user = getCurrentUser();
                user.enableEmailNotifications = data.enableEmailNotifications;
                await AsyncStorage.storeObject('bc-user', user);
            }
            return res.status;
        })
};

export const checkPassword = async (id, pass) => {
    const headers = await authHeader();
    return axios.get(`${Env.API_HOST}/api/check-password/${encodeURIComponent(id)}/${encodeURIComponent(pass)}`, { headers: headers }).then(res => res.status);
};

export const changePassword = async (data) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/change-password/ `, data, { headers: headers }).then(res => res.status);
};

export const updateAvatar = async (userId, image) => {
    async function _updateAvatar() {
        const user = await AsyncStorage.getObject('bc-user');
        const uri = Platform.OS === 'android' ? image.uri : image.uri.replace('file://', '');
        const formData = new FormData();
        formData.append('image', {
            uri,
            name: image.name,
            type: image.type
        });
        return axios.post(`${Env.API_HOST}/api/update-avatar/` + encodeURIComponent(userId), formData,
            user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
                : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.status);
    }

    let retries = 5;
    while (retries > 0) {
        try {
            return await _updateAvatar();
        } catch (err) {
            // Retry if Stream Closed
            retries--;
        }
    }
};

export const deleteAvatar = async (userId) => {
    const headers = await authHeader();
    return axios.post(`${Env.API_HOST}/api/delete-avatar/` + encodeURIComponent(userId), null, { headers: headers }).then(res => res.status);
};

export const loggedIn = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
        const status = await validateAccessToken();
        if (status === 200) {
            const user = await getUser(currentUser.id);
            if (user) return true;
        }
    }

    return false;
};
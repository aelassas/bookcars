import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class NotificationService {
    static async getNotificationCounter(userId) {
        const headers = await UserService.authHeader();
        return axios.get(`${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`, { headers }).then(res => res.data);
    }

    static async markAsRead(userId, ids) {
        const headers = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/mark-notifications-as-read/${encodeURIComponent(userId)}`, { ids }, { headers })
            .then(res => res.status);
    }

    static async markAsUnread(userId, ids) {
        const headers = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`, { ids }, { headers })
            .then(res => res.status);
    }

    static async delete(userId, ids) {
        const headers = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/delete-notifications/${encodeURIComponent(userId)}`, { ids }, { headers })
            .then(res => res.status);
    }

    static async getNotifications(userId, page) {
        const headers = await UserService.authHeader();
        return axios.get(`${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`, { headers })
            .then(res => res.data);
    }
}
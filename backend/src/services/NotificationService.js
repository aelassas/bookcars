import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class NotificationService {
    static getNotificationCounter(userId) {
        return axios.get(`${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static notify(data) {
        return axios.post(`${Env.API_HOST}/api/notify`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static markAsRead(userId, ids) {
        return axios.post(`${Env.API_HOST}/api/mark-notifications-as-read/${encodeURIComponent(userId)}`, { ids }, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static markAsUnread(userId, ids) {
        return axios.post(`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`, { ids }, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static delete(userId, ids) {
        return axios.post(`${Env.API_HOST}/api/delete-notifications/${encodeURIComponent(userId)}`, { ids }, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static getNotifications(userId, page) {
        return axios.get(`${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`, { headers: UserService.authHeader() })
            .then(res => res.data);
    }
}
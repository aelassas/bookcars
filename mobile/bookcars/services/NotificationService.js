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

    static markAsRead(notificationId) {
        return axios.post(`${Env.API_HOST}/api/mark-notification-as-read/${encodeURIComponent(notificationId)}`, null, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static markAsUnread(notificationId) {
        return axios.post(`${Env.API_HOST}/api/mark-notification-as-unread/${encodeURIComponent(notificationId)}`, null, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static getNotifications(userId, page) {
        return axios.get(`${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`, { headers: UserService.authHeader() })
            .then(res => res.data);
    }

    static deleteNotification(notificationId) {
        return axios.delete(`${Env.API_HOST}/api/delete-notification/${encodeURIComponent(notificationId)}`, { headers: UserService.authHeader() })
            .then(res => res.status);
    }
}
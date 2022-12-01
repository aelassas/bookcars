import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const getNotificationCounter = (userId) => (
    axios.get(`${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`, { headers: UserService.authHeader() }).then(res => res.data)
);

export const notify = (data) => (
    axios.post(`${Env.API_HOST}/api/notify`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const markAsRead = (userId, ids) => (
    axios.post(`${Env.API_HOST}/api/mark-notifications-as-read/${encodeURIComponent(userId)}`, { ids }, { headers: UserService.authHeader() })
        .then(res => res.status)
);

export const markAsUnread = (userId, ids) => (
    axios.post(`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`, { ids }, { headers: UserService.authHeader() })
        .then(res => res.status)
);

export const deleteNotifications = (userId, ids) => (
    axios.post(`${Env.API_HOST}/api/delete-notifications/${encodeURIComponent(userId)}`, { ids }, { headers: UserService.authHeader() })
        .then(res => res.status)
);

export const getNotifications = (userId, page) => (
    axios.get(`${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`, { headers: UserService.authHeader() })
        .then(res => res.data)
);
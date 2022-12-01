import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const getNotificationCounter = async (userId) => {
    const headers = await UserService.authHeader();
    return axios.get(`${Env.API_HOST}/api/notification-counter/${encodeURIComponent(userId)}`, { headers }).then(res => res.data);
};

export const markAsRead = async (userId, ids) => {
    const headers = await UserService.authHeader();
    return axios.post(`${Env.API_HOST}/api/mark-notifications-as-read/${encodeURIComponent(userId)}`, { ids }, { headers }).then(res => res.status);
};

export const markAsUnread = async (userId, ids) => {
    const headers = await UserService.authHeader();
    return axios.post(`${Env.API_HOST}/api/mark-notifications-as-unread/${encodeURIComponent(userId)}`, { ids }, { headers }).then(res => res.status);
};

export const deleteNotifications = async (userId, ids) => {
    const headers = await UserService.authHeader();
    return axios.post(`${Env.API_HOST}/api/delete-notifications/${encodeURIComponent(userId)}`, { ids }, { headers }).then(res => res.status);
};

export const getNotifications = async (userId, page) => {
    const headers = await UserService.authHeader();
    return axios.get(`${Env.API_HOST}/api/notifications/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`, { headers }).then(res => res.data);
};
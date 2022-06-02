import axios from 'axios';
import UserService from './UserService';
import Env from '../env.config';

export default class MessageService {
    static sendMessage(data) {
        return axios.post(`${Env.API_HOST}/api/send-message`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static getMessages(userId, page) {
        return axios.get(`${Env.API_HOST}/api/messages/${encodeURIComponent(userId)}/${page}/${Env.PAGE_SIZE}`, { headers: UserService.authHeader() })
            .then(res => res.data);
    }

    static getMessage(messageId) {
        return axios.get(`${Env.API_HOST}/api/message/${encodeURIComponent(messageId)}`, { headers: UserService.authHeader() })
            .then(res => res.data);
    }

    static markMessageAsRead(messageId) {
        return axios.post(`${Env.API_HOST}/api/mark-message-as-read/${encodeURIComponent(messageId)}`, null, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static markMessageAsUnread(messageId) {
        return axios.post(`${Env.API_HOST}/api/mark-message-as-unread/${encodeURIComponent(messageId)}`, null, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static deleteMessage(messageId) {
        return axios.delete(`${Env.API_HOST}/api/delete-message/${encodeURIComponent(messageId)}`, { headers: UserService.authHeader() })
            .then(res => res.status);
    }

    static getMessageCounter(userId) {
        return axios.get(`${Env.API_HOST}/api/message-counter/${encodeURIComponent(userId)}`, { headers: UserService.authHeader() })
            .then(res => res.data);
    }

    static getMessageId() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('m')) {
            return params.get('m');
        }
        return '';
    }
}
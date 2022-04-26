import axios from 'axios';
import { authHeader } from './user-service';
import { API_HOST, PAGE_SIZE } from '../config/env.config';

export const sendMessage = (data) => (
    axios.post(API_HOST + '/api/send-message', data, { headers: authHeader() })
        .then(res => res.status)
);

export const getMessages = (userId, page) => (
    axios.get(`${API_HOST}/api/messages/${encodeURIComponent(userId)}/${page}/${PAGE_SIZE}`, { headers: authHeader() })
        .then(res => res.data)
);

export const getMessage = (messageId) => (
    axios.get(`${API_HOST}/api/message/${encodeURIComponent(messageId)}`, { headers: authHeader() })
        .then(res => res.data)
);

export const markMessageAsRead = (messageId) => (
    axios.post(`${API_HOST}/api/mark-message-as-read/${encodeURIComponent(messageId)}`, null, { headers: authHeader() })
        .then(res => res.status)
);

export const markMessageAsUnread = (messageId) => (
    axios.post(`${API_HOST}/api/mark-message-as-unread/${encodeURIComponent(messageId)}`, null, { headers: authHeader() })
        .then(res => res.status)
);

export const deleteMessage = (messageId) => (
    axios.delete(`${API_HOST}/api/delete-message/${encodeURIComponent(messageId)}`, { headers: authHeader() })
        .then(res => res.status)
);

export const getMessageCounter = (userId) => (
    axios.get(`${API_HOST}/api/message-counter/${encodeURIComponent(userId)}`, { headers: authHeader() })
        .then(res => res.data)
);

export const getMessageId = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('m')) {
        return params.get('m');
    }
    return '';
};
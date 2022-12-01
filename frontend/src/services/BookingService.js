import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const book = (data) => (
    axios.post(`${Env.API_HOST}/api/book`, data).then(res => res.status)
);

export const update = (data) => (
    axios.put(`${Env.API_HOST}/api/update-booking`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const getBookings = (payload, page, size) => (
    axios.post(`${Env.API_HOST}/api/bookings/${page}/${size}/${UserService.getLanguage()}`, payload, { headers: UserService.authHeader() }).then(res => res.data)
);

export const getBooking = (id) => (
    axios.get(`${Env.API_HOST}/api/booking/${encodeURIComponent(id)}/${UserService.getLanguage()}`, { headers: UserService.authHeader() }).then(res => res.data)
);

export const cancel = (id) => (
    axios.post(`${Env.API_HOST}/api/cancel-booking/${encodeURIComponent(id)}`, null, { headers: UserService.authHeader() }).then(res => res.status)
);
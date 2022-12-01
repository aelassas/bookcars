import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const create = (data) => (
    axios.post(`${Env.API_HOST}/api/create-booking`, data, { headers: UserService.authHeader() }).then(res => res.data)
);

export const update = (data) => (
    axios.put(`${Env.API_HOST}/api/update-booking`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const updateStatus = (data) => (
    axios.post(`${Env.API_HOST}/api/update-booking-status`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const deleteBookings = (ids) => (
    axios.post(`${Env.API_HOST}/api/delete-bookings`, ids, { headers: UserService.authHeader() }).then(res => res.status)
);

export const getBooking = (id) => (
    axios.get(`${Env.API_HOST}/api/booking/${encodeURIComponent(id)}/${UserService.getLanguage()}`, { headers: UserService.authHeader() }).then(res => res.data)
);

export const getBookings = (payload, page, size) => (
    axios.post(`${Env.API_HOST}/api/bookings/${page}/${size}/${UserService.getLanguage()}`, payload, { headers: UserService.authHeader() }).then(res => res.data)
);
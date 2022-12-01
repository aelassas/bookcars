import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const getCars = (data, page, size) => (
    axios.post(`${Env.API_HOST}/api/frontend-cars/${page}/${size}}`, data).then(res => res.data)
);

export const getCar = (id) => (
    axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${UserService.getLanguage()}`).then(res => res.data)
);

export const getBookingCars = (keyword, data, page, size) => (
    axios.post(`${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader() }
    ).then(res => res.data)
);
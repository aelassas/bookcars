import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const getCars = (data, page, size) => (
    axios.post(`${Env.API_HOST}/api/frontend-cars/${page}/${size}}`, data).then(res => res.data)
);

export const getCar = async (id) => {
    const language = await UserService.getLanguage();
    return axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${language}`).then(res => res.data);
};

export const getBookingCars = async (keyword, data, page, size) => {
    const authHeader = await UserService.authHeader();
    return axios.post(`${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: authHeader }).then(res => res.data);
};
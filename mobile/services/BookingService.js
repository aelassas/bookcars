import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const book = (data) => (
    axios.post(`${Env.API_HOST}/api/book`, data).then(res => res.status)
);

export const getBookings = async (payload, page, size) => {
    const headers = await UserService.authHeader();
    const language = await UserService.getLanguage();
    return axios.post(`${Env.API_HOST}/api/bookings/${page}/${size}/${language}`, payload, { headers }).then(res => res.data);
};

export const getBooking = async (id) => {
    const headers = await UserService.authHeader();
    const language = await UserService.getLanguage();
    return axios.get(`${Env.API_HOST}/api/booking/${encodeURIComponent(id)}/${language}`, { headers }).then(res => res.data);
};

export const hasBookings = async (driver) => {
    const headers = await UserService.authHeader();
    return axios.get(`${Env.API_HOST}/api/has-bookings/${encodeURIComponent(driver)}`, { headers }).then(res => res.status);
};

export const minDate = async (driver) => {
    const headers = await UserService.authHeader();
    return axios.get(`${Env.API_HOST}/api/bookings-min-date/${encodeURIComponent(driver)}`, { headers }).then(res => res.data);
};

export const maxDate = async (driver) => {
    const headers = await UserService.authHeader();
    return axios.get(`${Env.API_HOST}/api/bookings-max-date/${encodeURIComponent(driver)}`, { headers }).then(res => res.data);
};

export const cancel = async (id) => {
    const headers = await UserService.authHeader();
    return axios.post(`${Env.API_HOST}/api/cancel-booking/${encodeURIComponent(id)}`, null, { headers }).then(res => res.status);
};
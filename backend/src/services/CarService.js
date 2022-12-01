import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const create = (data) => (
    axios.post(`${Env.API_HOST}/api/create-car`, data, { headers: UserService.authHeader() }).then(res => res.data)
);

export const update = (data) => (
    axios.put(`${Env.API_HOST}/api/update-car`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const check = (id) => (
    axios.get(`${Env.API_HOST}/api/check-car/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status)
);

export const deleteCar = (id) => (
    axios.delete(`${Env.API_HOST}/api/delete-car/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status)
);

export const createImage = (file) => {
    const user = UserService.getCurrentUser();
    var formData = new FormData();
    formData.append('image', file);

    return axios.post(`${Env.API_HOST}/api/create-car-image`, formData,
        user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
            : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
};

export const updateImage = (id, file) => {
    const user = UserService.getCurrentUser();
    var formData = new FormData();
    formData.append('image', file);

    return axios.post(`${Env.API_HOST}/api/update-car-image/${encodeURIComponent(id)}`, formData,
        user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
            : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.status);
};

export const deleteImage = (id) => (
    axios.post(`${Env.API_HOST}/api/delete-car-image/${encodeURIComponent(id)}`, null, { headers: UserService.authHeader() }).then(res => res.status)
);

export const deleteTempImage = (avatar) => (
    axios.post(`${Env.API_HOST}/api/delete-temp-car-image/${encodeURIComponent(avatar)}`, null, { headers: UserService.authHeader() }).then(res => res.status)
);

export const getCar = (id) => (
    axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${UserService.getLanguage()}`, { headers: UserService.authHeader() }).then(res => res.data)
);

export const getCars = (keyword, data, page, size) => (
    axios.post(`${Env.API_HOST}/api/cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader() }
    ).then(res => res.data)
);

export const getBookingCars = (keyword, data, page, size) => (
    axios.post(`${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader() }
    ).then(res => res.data)
);
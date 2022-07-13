import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class CarService {

    static create(data) {
        return axios.post(`${Env.API_HOST}/api/create-car`, data, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static update(data) {
        return axios.put(`${Env.API_HOST}/api/update-car`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static check(id) {
        return axios.get(`${Env.API_HOST}/api/check-car/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static delete(id) {
        return axios.delete(`${Env.API_HOST}/api/delete-car/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static createImage(file) {
        const user = UserService.getCurrentUser();
        var formData = new FormData();
        formData.append('image', file);
        return axios.post(`${Env.API_HOST}/api/create-car-image`, formData,
            user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
                : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data);
    }

    static updateImage(id, file) {
        const user = UserService.getCurrentUser();
        var formData = new FormData();
        formData.append('image', file);
        return axios.post(`${Env.API_HOST}/api/update-car-image/${encodeURIComponent(id)}`, formData,
            user && user.accessToken ? { headers: { 'x-access-token': user.accessToken, 'Content-Type': 'multipart/form-data' } }
                : { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.status);
    }

    static deleteImage(id) {
        return axios.post(`${Env.API_HOST}/api/delete-car-image/${encodeURIComponent(id)}`, null, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static deleteTempImage(avatar) {
        return axios.post(`${Env.API_HOST}/api/delete-temp-car-image/${encodeURIComponent(avatar)}`, null, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static getCar(id) {
        const language = UserService.getLanguage();
        return axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${language}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getCars(keyword, data, page, size) {
        return axios.post(`${Env.API_HOST}/api/cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader() }
        ).then(res => res.data);
    }

    static getBookingCars(keyword, data, page, size) {
        return axios.post(`${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader() }
        ).then(res => res.data);
    }

}
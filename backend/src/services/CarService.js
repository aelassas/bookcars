import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class CarService {

    static create(data) {
        return axios.post(`${Env.API_HOST}/api/create-car`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static update(data) {
        return axios.put(`${Env.API_HOST}/api/update-car`, data, { headers: UserService.authHeader() }).then(res => res.status);
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

    static getCar(id) {
        return axios.get(`${Env.API_HOST}/api/get-car/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getCars(keyword, data, page, size) {
        return axios.post(`${Env.API_HOST}/api/get-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader(), }
        ).then(res => res.data);
    }

}
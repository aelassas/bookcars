import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class LocationService {

    static validate(data) {
        return axios.post(`${Env.API_HOST}/api/validate-location`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static create(data) {
        return axios.post(`${Env.API_HOST}/api/create-location`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static update(data) {
        return axios.put(`${Env.API_HOST}/api/update-location`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static delete(id) {
        return axios.delete(`${Env.API_HOST}/api/delete-location/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static getLocation(id) {
        return axios.get(`${Env.API_HOST}/api/get-location/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getLocations(keyword, page, size) {
        return axios.get(`${Env.API_HOST}/api/get-locations/${page}/${size}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static check(id) {
        return axios.get(`${Env.API_HOST}/api/check-location/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

}
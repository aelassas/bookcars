import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class ExtraService {

    static validate(data) {
        return axios.post(`${Env.API_HOST}/api/validate-extra`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static create(data) {
        return axios.post(`${Env.API_HOST}/api/create-extra`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static update(data) {
        return axios.put(`${Env.API_HOST}/api/update-extra`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static delete(id) {
        return axios.delete(`${Env.API_HOST}/api/delete-extra/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static getExtra(id) {
        return axios.get(`${Env.API_HOST}/api/get-extra/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getExtras(keyword, page, size) {
        return axios.get(`${Env.API_HOST}/api/get-extras/${page}/${size}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

}
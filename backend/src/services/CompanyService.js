import axios from 'axios';
import Env from '../config/env.config';

export default class CompanyService {

    static validate(data) {
        return axios.post(`${Env.API_HOST}/api/validate-company`, data).then(res => res.status);
    }

    static update(data) {
        return axios.post(`${Env.API_HOST}/api/update-company`, data).then(res => res.status);
    }

    static delete(id) {
        return axios.delete(`${Env.API_HOST}/api/delete-company/${encodeURIComponent(id)}`).then(res => res.status);
    }

    static getCompany(id) {
        return axios.get(`${Env.API_HOST}/api/get-company/${encodeURIComponent(id)}`).then(res => res.data);
    }

    static getCompanies(keyword, page, size) {
        return axios.get(`${Env.API_HOST}/api/get-companies/${page}/${size}/?s=${encodeURIComponent(keyword)}`).then(res => res.data);
    }

}
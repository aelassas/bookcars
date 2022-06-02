import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class CompanyService {

    static getAllCompanies() {
        return axios.get(`${Env.API_HOST}/api/all-companies`).then(res => res.data);
    }

    static getCompanies(keyword, page, size) {
        return axios.get(`${Env.API_HOST}/api/companies/${page}/${size}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

}
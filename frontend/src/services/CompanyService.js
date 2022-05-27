import axios from 'axios';
import Env from '../config/env.config';

export default class CompanyService {

    static getAllCompanies() {
        return axios.get(`${Env.API_HOST}/api/all-companies`).then(res => res.data);
    }
}
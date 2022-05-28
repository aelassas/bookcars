import axios from 'axios';
import Env from '../config/env.config';

export default class CarService {

    static getCars(data, page, size) {
        return axios.post(`${Env.API_HOST}/api/frontend-cars/${page}/${size}}`, data).then(res => res.data);
    }

    static getCar(id) {
        return axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}`).then(res => res.data);
    }

}
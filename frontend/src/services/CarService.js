import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class CarService {

    static getCars(data, page, size) {
        return axios.post(`${Env.API_HOST}/api/frontend-cars/${page}/${size}}`, data).then(res => res.data);
    }

    static getCar(id) {
        const language = UserService.getLanguage();
        return axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${language}`).then(res => res.data);
    }

    static getBookingCars(keyword, data, page, size) {
        return axios.post(`${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: UserService.authHeader() }
        ).then(res => res.data);
    }

}
import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class CarService {

    static getCars(data, page, size) {
        return axios.post(`${Env.API_HOST}/api/frontend-cars/${page}/${size}}`, data).then(res => res.data);
    }

    static getCar(id) {
        return axios.get(`${Env.API_HOST}/api/car/${encodeURIComponent(id)}`).then(res => res.data);
    }

    static async getBookingCars(keyword, data, page, size) {
        const authHeader = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`, data, { headers: authHeader }
        ).then(res => res.data);
    }

}
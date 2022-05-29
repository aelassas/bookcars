import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class BookingService {

    static book(data) {
        return axios.post(`${Env.API_HOST}/api/book`, data).then(res => res.status);
    }

    static getBookings(payload, page, size) {
        return axios.post(`${Env.API_HOST}/api/bookings/${page}/${size}}`, payload, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getBooking(id) {
        return axios.get(`${Env.API_HOST}/api/booking/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

}
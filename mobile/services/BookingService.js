import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class BookingService {

    static book(data) {
        return axios.post(`${Env.API_HOST}/api/book`, data).then(res => res.status);
    }

    static async getBookings(payload, page, size) {
        const headers = await UserService.authHeader();
        return axios.post(`${Env.API_HOST}/api/bookings/${page}/${size}}`, payload, { headers }).then(res => res.data);
    }

    static async getBooking(id) {
        const headers = await UserService.authHeader();
        return axios.get(`${Env.API_HOST}/api/booking/${encodeURIComponent(id)}`, { headers }).then(res => res.data);
    }

}
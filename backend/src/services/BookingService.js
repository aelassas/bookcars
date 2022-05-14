import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class BookingService {

    static create(data) {
        return axios.post(`${Env.API_HOST}/api/create-booking`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static update(data) {
        return axios.put(`${Env.API_HOST}/api/update-booking`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static updateStatus(data) {
        return axios.post(`${Env.API_HOST}/api/update-booking-status`, data, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static delete(ids) {
        return axios.post(`${Env.API_HOST}/api/delete-bookings`, ids, { headers: UserService.authHeader() }).then(res => res.status);
    }

    static getBooking(id) {
        return axios.get(`${Env.API_HOST}/api/get-booking/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.data);
    }

    static getBookings(companies, statuses, filter, page, size) {
        return axios.post(`${Env.API_HOST}/api/get-bookings/${page}/${size}}`, { companies, statuses, filter }, { headers: UserService.authHeader() }).then(res => res.data);
    }

}
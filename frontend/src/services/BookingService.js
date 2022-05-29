import axios from 'axios';
import Env from '../config/env.config';

export default class BookingService {

    static book(data) {
        return axios.post(`${Env.API_HOST}/api/book`, data).then(res => res.status);
    }

}
import axios from 'axios';
import Env from '../config/env.config';

export default class LocationService {

    static getLocations(keyword, page, size) {
        return axios.get(`${Env.API_HOST}/api/locations/${page}/${size}/?s=${encodeURIComponent(keyword)}`).then(res => res.data);
    }

    static getLocation(id) {
        return axios.get(`${Env.API_HOST}/api/location/${encodeURIComponent(id)}`).then(res => res.data);
    }

}
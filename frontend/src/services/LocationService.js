import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class LocationService {

    static getLocations(keyword, page, size) {
        const language = UserService.getLanguage();
        return axios.get(`${Env.API_HOST}/api/locations/${page}/${size}/${language}/?s=${encodeURIComponent(keyword)}`).then(res => res.data);
    }

    static getLocation(id) {
        const language = UserService.getLanguage();
        return axios.get(`${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${language}`).then(res => res.data);
    }

}
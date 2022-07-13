import axios from 'axios';
import Env from '../config/env.config';
import UserService from './UserService';

export default class LocationService {

    static async getLocations(keyword, page, size) {
        const language = await UserService.getLanguage();
        return axios.get(`${Env.API_HOST}/api/locations/${page}/${size}/${language}/?s=${encodeURIComponent(keyword)}`).then(res => res.data);
    }

    static async getLocation(id) {
        const language = await UserService.getLanguage();
        return axios.get(`${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${language}`).then(res => res.data);
    }

}
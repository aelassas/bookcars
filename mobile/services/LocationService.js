import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const getLocations = async (keyword, page, size) => {
    const language = await UserService.getLanguage();
    return axios.get(`${Env.API_HOST}/api/locations/${page}/${size}/${language}/?s=${encodeURIComponent(keyword)}`).then(res => res.data);
};

export const getLocation = async (id) => {
    const language = await UserService.getLanguage();
    return axios.get(`${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${language}`).then(res => res.data);
};
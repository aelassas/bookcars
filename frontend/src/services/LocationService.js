import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const getLocations = (keyword, page, size) => (
    axios.get(`${Env.API_HOST}/api/locations/${page}/${size}/${UserService.getLanguage()}/?s=${encodeURIComponent(keyword)}`).then(res => res.data)
);

export const getLocation = (id) => (
    axios.get(`${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${UserService.getLanguage()}`).then(res => res.data)
);
import axios from 'axios';
import Env from '../config/env.config';
import * as UserService from './UserService';

export const validate = (data) => (
    axios.post(`${Env.API_HOST}/api/validate-location`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const create = (data) => (
    axios.post(`${Env.API_HOST}/api/create-location`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const update = (id, data) => (
    axios.put(`${Env.API_HOST}/api/update-location/${id}`, data, { headers: UserService.authHeader() }).then(res => res.status)
);

export const deleteLocation = (id) => (
    axios.delete(`${Env.API_HOST}/api/delete-location/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status)
);

export const getLocation = (id) => (
    axios.get(`${Env.API_HOST}/api/location/${encodeURIComponent(id)}/${UserService.getLanguage()}`, { headers: UserService.authHeader() }).then(res => res.data)
);

export const getLocations = (keyword, page, size) => (
    axios.get(`${Env.API_HOST}/api/locations/${page}/${size}/${UserService.getLanguage()}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then(res => res.data)
);

export const check = (id) => (
    axios.get(`${Env.API_HOST}/api/check-location/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status)
);
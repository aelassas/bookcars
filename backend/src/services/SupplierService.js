import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'

export const validate = (data) => (
    axios.post(`${Env.API_HOST}/api/validate-supplier`, data, { headers: UserService.authHeader() }).then(res => res.status)
)

export const update = (data) => (
    axios.put(`${Env.API_HOST}/api/update-supplier`, data, { headers: UserService.authHeader() }).then(res => res.status)
)

export const deleteCompany = (id) => (
    axios.delete(`${Env.API_HOST}/api/delete-supplier/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.status)
)

export const getCompany = (id) => (
    axios.get(`${Env.API_HOST}/api/supplier/${encodeURIComponent(id)}`, { headers: UserService.authHeader() }).then(res => res.data)
)

export const getCompanies = (keyword, page, size) => (
    axios.get(`${Env.API_HOST}/api/suppliers/${page}/${size}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then(res => res.data)
)

export const getAllCompanies = () => (
    axios.get(`${Env.API_HOST}/api/all-suppliers`, { headers: UserService.authHeader() }).then(res => res.data)
)
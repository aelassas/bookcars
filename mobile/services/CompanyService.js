import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'

AxiosHelper.init(axios)

export const getAllCompanies = () => (
    axios.get(`${Env.API_HOST}/api/all-companies`).then(res => res.data)
)

export const getCompanies = (keyword, page, size) => (
    axios.get(`${Env.API_HOST}/api/companies/${page}/${size}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then(res => res.data)
)
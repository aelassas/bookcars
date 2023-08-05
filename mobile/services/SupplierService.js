import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'

AxiosHelper.init(axios)

export const getAllSuppliers = () => axios.get(`${Env.API_HOST}/api/all-suppliers`).then((res) => res.data)

export const getSuppliers = (keyword, page, size) =>
  axios.get(`${Env.API_HOST}/api/suppliers/${page}/${size}/?s=${encodeURIComponent(keyword)}`, { headers: UserService.authHeader() }).then((res) => res.data)

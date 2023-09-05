import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as bookcarsTypes from 'bookcars-types'

export const validate = (data: bookcarsTypes.ValidateSupplierPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/validate-supplier`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const update = (data: bookcarsTypes.UpdateSupplierPayload): Promise<number> =>
  axios
    .put(
      `${Env.API_HOST}/api/update-supplier`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const deleteCompany = (id: string): Promise<number> =>
  axios
    .delete(
      `${Env.API_HOST}/api/delete-supplier/${encodeURIComponent(id)}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const getCompany = (id: string): Promise<bookcarsTypes.User> =>
  axios
    .get(
      `${Env.API_HOST}/api/supplier/${encodeURIComponent(id)}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

export const getCompanies = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.User>> =>
  axios
    .get(
      `${Env.API_HOST}/api/suppliers/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

export const getAllCompanies = (): Promise<bookcarsTypes.User[]> =>
  axios
    .get(
      `${Env.API_HOST}/api/all-suppliers`,
      { headers: UserService.authHeader() })
    .then((res) => res.data)

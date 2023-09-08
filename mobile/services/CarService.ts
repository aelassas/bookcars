import axios from 'axios'
import * as Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from  '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

export const getCars = async (data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> =>
  axios
    .post(
      `${Env.API_HOST}/api/frontend-cars/${page}/${size}}`,
      data
    )
    .then((res) => res.data)

export const getCar = async (id: string): Promise<bookcarsTypes.Car> => {
  const language = await UserService.getLanguage()
  return axios
    .get(
      `${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${language}`
    )
    .then((res) => res.data)
}

export const getBookingCars = async (keyword: string, data: bookcarsTypes.GetBookingCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> => {
  const authHeader = await UserService.authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { headers: authHeader }
    )
    .then((res) => res.data)
}

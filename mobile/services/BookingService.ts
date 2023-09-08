import axios from 'axios'
import * as Env from '../config/env.config'
import * as UserService from './UserService'
import * as AxiosHelper from '../common/AxiosHelper'
import * as bookcarsTypes from  '../miscellaneous/bookcarsTypes'

AxiosHelper.init(axios)

export const book = (data: bookcarsTypes.BookPayload): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/book`,
      data
    )
    .then((res) => res.status)

export const getBookings = async (payload: bookcarsTypes.GetBookingsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Booking>> => {
  const headers = await UserService.authHeader()
  const language = await UserService.getLanguage()
  return axios
    .post(
      `${Env.API_HOST}/api/bookings/${page}/${size}/${language}`,
      payload,
      { headers }
    )
    .then((res) => res.data)
}

export const getBooking = async (id: string): Promise<bookcarsTypes.Booking> => {
  const headers = await UserService.authHeader()
  const language = await UserService.getLanguage()
  return axios
    .get(`${Env.API_HOST}/api/booking/${encodeURIComponent(id)}/${language}`,
      { headers }
    )
    .then((res) => res.data)
}

export const hasBookings = async (driver: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axios
    .get(
      `${Env.API_HOST}/api/has-bookings/${encodeURIComponent(driver)}`,
      { headers }
    )
    .then((res) => res.status)
}

export const cancel = async (id: string): Promise<number> => {
  const headers = await UserService.authHeader()
  return axios
    .post(
      `${Env.API_HOST}/api/cancel-booking/${encodeURIComponent(id)}`,
      null,
      { headers }
    ).then((res) => res.status)
}

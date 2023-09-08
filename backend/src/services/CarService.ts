import axios from 'axios'
import Env from '../config/env.config'
import * as UserService from './UserService'
import * as bookcarsTypes from 'bookcars-types'

export const create = (data: bookcarsTypes.CreateCarPayload): Promise<bookcarsTypes.Car> =>
  axios
    .post(
      `${Env.API_HOST}/api/create-car`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

export const update = (data: bookcarsTypes.UpdateCarPayload): Promise<number> =>
  axios
    .put(
      `${Env.API_HOST}/api/update-car`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const check = (id: string): Promise<number> =>
  axios
    .get(
      `${Env.API_HOST}/api/check-car/${encodeURIComponent(id)}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const deleteCar = (id: string): Promise<number> =>
  axios
    .delete(
      `${Env.API_HOST}/api/delete-car/${encodeURIComponent(id)}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const createImage = (file: Blob): Promise<string> => {
  const user = UserService.getCurrentUser()
  const formData = new FormData()
  formData.append('image', file)

  return axios
    .post(
      `${Env.API_HOST}/api/create-car-image`,
      formData,
      user && user.accessToken
        ? {
          headers: {
            'x-access-token': user.accessToken,
            'Content-Type': 'multipart/form-data',
          },
        }
        : { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    .then((res) => res.data)
}

export const updateImage = (id: string, file: Blob): Promise<number> => {
  const user = UserService.getCurrentUser()
  const formData = new FormData()
  formData.append('image', file)

  return axios
    .post(
      `${Env.API_HOST}/api/update-car-image/${encodeURIComponent(id)}`,
      formData,
      user && user.accessToken
        ? {
          headers: {
            'x-access-token': user.accessToken,
            'Content-Type': 'multipart/form-data',
          },
        }
        : { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    .then((res) => res.status)
}

export const deleteImage = (id: string): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/delete-car-image/${encodeURIComponent(id)}`,
      null,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const deleteTempImage = (image: string): Promise<number> =>
  axios
    .post(
      `${Env.API_HOST}/api/delete-temp-car-image/${encodeURIComponent(image)}`,
      null,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.status)

export const getCar = (id: string): Promise<bookcarsTypes.Car> =>
  axios
    .get(
      `${Env.API_HOST}/api/car/${encodeURIComponent(id)}/${UserService.getLanguage()}`,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

export const getCars = (keyword: string, data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> =>
  axios
    .post(
      `${Env.API_HOST}/api/cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

export const getBookingCars = (keyword: string, data: bookcarsTypes.GetBookingCarsPayload, page: number, size: number): Promise<bookcarsTypes.Car[]> =>
  axios
    .post(
      `${Env.API_HOST}/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { headers: UserService.authHeader() }
    )
    .then((res) => res.data)

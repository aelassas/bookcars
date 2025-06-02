import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'

/**
 * Create a Dress.
 *
 * @param {bookcarsTypes.CreateDressPayload} data
 * @returns {Promise<bookcarsTypes.Dress>}
 */
export const create = (data: bookcarsTypes.CreateDressPayload): Promise<bookcarsTypes.Dress> =>
  axiosInstance
    .post(
      '/api/create-dress',
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Update a Dress.
 *
 * @param {bookcarsTypes.UpdateDressPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpdateDressPayload): Promise<number> =>
  axiosInstance
    .put(
      '/api/update-dress',
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Dress.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteDress = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-dress/${id}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Dress by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Dress>}
 */
export const getDress = (id: string): Promise<bookcarsTypes.Dress> =>
  axiosInstance
    .get(
      `/api/dress/${id}/${UserService.getLanguage()}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Dresses.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetDressesPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Dress>>}
 */
export const getDresses = (keyword: string, data: bookcarsTypes.GetDressesPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Dress>> =>
  axiosInstance
    .post(
      `/api/dresses/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Check if a Dress is related to a booking.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const check = (id: string): Promise<number> =>
  axiosInstance
    .get(
      `/api/check-dress/${id}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Create a Dress image.
 *
 * @param {Blob} file
 * @returns {Promise<string>}
 */
export const createImage = (file: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('image', file)

  return axiosInstance
    .post(
      '/api/create-dress-image',
      formData,
      { withCredentials: true }
    )
    .then((res) => res.data)
}

/**
 * Update a Dress image.
 *
 * @param {string} id
 * @param {Blob} file
 * @returns {Promise<number>}
 */
export const updateImage = (id: string, file: Blob): Promise<number> => {
  const formData = new FormData()
  formData.append('image', file)

  return axiosInstance
    .put(
      `/api/update-dress-image/${id}`,
      formData,
      { withCredentials: true }
    )
    .then((res) => res.status)
}

/**
 * Delete a Dress image.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteImage = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-dress-image/${id}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a temporary Dress image.
 *
 * @param {string} image
 * @returns {Promise<number>}
 */
export const deleteTempImage = (image: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/delete-temp-dress-image/${encodeURIComponent(image)}`,
      null,
      { withCredentials: true }
    )
    .then((res) => res.status)

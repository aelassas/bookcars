import axios from 'axios'
import * as env from '../config/env.config'
import { Dress } from ':bookcars-types'

/**
 * Get all dresses with pagination.
 * 
 * @param {number} page - Page number
 * @param {number} size - Page size
 * @returns {Promise<any>}
 */
export const getDresses = (page: number, size: number) => {
  return axios.get(`${env.API_HOST}/api/dresses/${page}/${size}`)
}

/**
 * Get a dress by ID.
 * 
 * @param {string} id - Dress ID
 * @returns {Promise<any>}
 */
export const getDress = (id: string) => {
  return axios.get(`${env.API_HOST}/api/dress/${id}`)
}

/**
 * Create a new dress.
 * 
 * @param {Dress} data - Dress data
 * @returns {Promise<any>}
 */
export const createDress = (data: Dress) => {
  return axios.post(`${env.API_HOST}/api/dress`, data)
}

/**
 * Update a dress.
 * 
 * @param {string} id - Dress ID
 * @param {Dress} data - Updated dress data
 * @returns {Promise<any>}
 */
export const updateDress = (id: string, data: Dress) => {
  return axios.put(`${env.API_HOST}/api/dress/${id}`, data)
}

/**
 * Delete a dress.
 * 
 * @param {string} id - Dress ID
 * @returns {Promise<any>}
 */
export const deleteDress = (id: string) => {
  return axios.delete(`${env.API_HOST}/api/dress/${id}`)
}

/**
 * Get available dresses for a specific location and date range.
 * 
 * @param {string} from - Start date
 * @param {string} to - End date
 * @param {string} locationId - Location ID
 * @returns {Promise<any>}
 */
export const getAvailableDresses = (from: string, to: string, locationId: string) => {
  return axios.get(`${env.API_HOST}/api/available-dresses/${from}/${to}/${locationId}`)
}

/**
 * Upload dress image.
 * 
 * @param {FormData} data - Form data with image
 * @returns {Promise<any>}
 */
export const uploadDressImage = (data: FormData) => {
  return axios.post(`${env.API_HOST}/api/upload-dress-image`, data)
}

/**
 * Delete dress image.
 * 
 * @param {string} id - Dress ID
 * @returns {Promise<any>}
 */
export const deleteDressImage = (id: string) => {
  return axios.post(`${env.API_HOST}/api/delete-dress-image/${id}`)
}
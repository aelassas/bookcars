import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'

/**
 * Create a Car.
 *
 * @param {bookcarsTypes.CreateCarPayload} data
 * @returns {Promise<bookcarsTypes.Car>}
 */
export const create = (data: bookcarsTypes.CreateCarPayload): Promise<bookcarsTypes.Car> => {
  // Debug logging
  console.log('Creating car with data:', data)
  console.log('Locations:', data.locations)
  console.log('Location coordinates:', data.locationCoordinates)
  
  // If we have locationCoordinates but no valid locations, add a placeholder location
  if (data.locationCoordinates && data.locationCoordinates.length > 0) {
    // Make sure we have at least one location ID
    if (!data.locations || !Array.isArray(data.locations) || data.locations.length === 0) {
      // Use the placeholder ID that MongoDB will accept
      data.locations = ['000000000000000000000000']
      console.log('Added placeholder location ID for validation')
    }
  }
  
  // Filter out any custom location IDs (those that don't match MongoDB ObjectID format)
  // MongoDB ObjectIDs are 24-character hex strings
  if (data.locations && Array.isArray(data.locations)) {
    data.locations = data.locations.filter(id => 
      typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
    )
    
    // If we filtered out all locations but have coordinates, ensure we have a placeholder
    if (data.locations.length === 0 && data.locationCoordinates && data.locationCoordinates.length > 0) {
      data.locations = ['000000000000000000000000']
      console.log('Added placeholder location ID after filtering')
    }
  }
  
  return axiosInstance
    .post(
      '/api/create-car',
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)
}

/**
 * Update a Car.
 *
 * @param {bookcarsTypes.UpdateCarPayload} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.UpdateCarPayload): Promise<number> => {
  // Debug logging
  console.log('Updating car with data:', data)
  console.log('Locations:', data.locations)
  console.log('Location coordinates:', data.locationCoordinates)
  
  // If we have locationCoordinates but no valid locations, add a placeholder location
  if (data.locationCoordinates && data.locationCoordinates.length > 0) {
    // Make sure we have at least one location ID
    if (!data.locations || !Array.isArray(data.locations) || data.locations.length === 0) {
      // Use the placeholder ID that MongoDB will accept
      data.locations = ['000000000000000000000000']
      console.log('Added placeholder location ID for validation')
    }
  }
  
  // Filter out any custom location IDs (those that don't match MongoDB ObjectID format)
  // MongoDB ObjectIDs are 24-character hex strings
  if (data.locations && Array.isArray(data.locations)) {
    data.locations = data.locations.filter(id => 
      typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
    )
    
    // If we filtered out all locations but have coordinates, ensure we have a placeholder
    if (data.locations.length === 0 && data.locationCoordinates && data.locationCoordinates.length > 0) {
      data.locations = ['000000000000000000000000']
      console.log('Added placeholder location ID after filtering')
    }
  }
  
  return axiosInstance
    .put(
      '/api/update-car',
      data,
      { withCredentials: true }
    )
    .then((res) => res.status)
}

/**
 * Check if a Car is related to a booking.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const check = (id: string): Promise<number> =>
  axiosInstance
    .get(
      `/api/check-car/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a Car.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteCar = (id: string): Promise<number> =>
  axiosInstance
    .delete(
      `/api/delete-car/${encodeURIComponent(id)}`,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Create a temporary Car image.
 *
 * @param {Blob} file
 * @returns {Promise<string>}
 */
export const createImage = (file: Blob): Promise<string> => {
  const formData = new FormData()
  formData.append('image', file)

  return axiosInstance
    .post(
      '/api/create-car-image',
      formData,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      },
    )
    .then((res) => res.data)
}

/**
 * Update a Car image.
 *
 * @param {string} id
 * @param {Blob} file
 * @returns {Promise<number>}
 */
export const updateImage = (id: string, file: Blob): Promise<number> => {
  const formData = new FormData()
  formData.append('image', file)

  return axiosInstance
    .post(
      `/api/update-car-image/${encodeURIComponent(id)}`,
      formData,
      {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      },
    )
    .then((res) => res.status)
}

/**
 * Delete a Car image.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteImage = (id: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/delete-car-image/${encodeURIComponent(id)}`,
      null,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Delete a temporary Car image.
 *
 * @param {string} image
 * @returns {Promise<number>}
 */
export const deleteTempImage = (image: string): Promise<number> =>
  axiosInstance
    .post(
      `/api/delete-temp-car-image/${encodeURIComponent(image)}`,
      null,
      { withCredentials: true }
    )
    .then((res) => res.status)

/**
 * Get a Car by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Car>}
 */
export const getCar = (id: string): Promise<bookcarsTypes.Car> =>
  axiosInstance
    .get(
      `/api/car/${encodeURIComponent(id)}/${UserService.getLanguage()}`,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Cars.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Car>>}
 */
export const getCars = (keyword: string, data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> =>
  axiosInstance
    .post(
      `/api/cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

/**
 * Get Cars by supplier and location.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetBookingCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Car[]>}
 */
export const getBookingCars = (keyword: string, data: bookcarsTypes.GetBookingCarsPayload, page: number, size: number): Promise<bookcarsTypes.Car[]> =>
  axiosInstance
    .post(
      `/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)

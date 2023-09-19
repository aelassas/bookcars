import {
  BC_APP_TYPE,
  BC_API_HOST,
  BC_DEFAULT_LANGUAGE,
  BC_PAGE_SIZE,
  BC_CARS_PAGE_SIZE,
  BC_BOOKINGS_PAGE_SIZE,
  BC_CDN_USERS,
  BC_CDN_CARS,
  BC_COMPANY_IMAGE_WIDTH,
  BC_COMPANY_IMAGE_HEIGHT,
  BC_CAR_IMAGE_WIDTH,
  BC_CAR_IMAGE_HEIGHT,
  BC_MINIMUM_AGE,
} from '@env'

const EN = 'en' // English ISO 639-1 language code
const FR = 'fr' // French ISO 639-1 language code

export const APP_TYPE: string = BC_APP_TYPE || 'frontend'
export const API_HOST: string = BC_API_HOST
export const AXIOS_RETRIES: number = 3
export const AXIOS_RETRIES_INTERVAL: number = 500  // in milliseconds
export const LANGUAGES: string[] = [EN, FR]
export const DEFAULT_LANGUAGE: string = BC_DEFAULT_LANGUAGE || EN
export const LANGUAGE: { EN: 'en', FR: 'fr' } = { EN, FR }
export const AXIOS_TIMEOUT: number = 5000 // in milliseconds
export const PAGE_SIZE: number = Number.parseInt(BC_PAGE_SIZE) || 20
export const CARS_PAGE_SIZE: number = Number.parseInt(BC_CARS_PAGE_SIZE) || 8
export const BOOKINGS_PAGE_SIZE: number = Number.parseInt(BC_BOOKINGS_PAGE_SIZE) || 8
export const CDN_USERS: string = BC_CDN_USERS
export const CDN_CARS: string = BC_CDN_CARS
export const PAGE_OFFSET: number = 200
export const COMPANY_IMAGE_WIDTH: number = Number.parseInt(BC_COMPANY_IMAGE_WIDTH) || 60
export const COMPANY_IMAGE_HEIGHT: number = Number.parseInt(BC_COMPANY_IMAGE_HEIGHT) || 30
export const CAR_IMAGE_WIDTH: number = Number.parseInt(BC_CAR_IMAGE_WIDTH) || 300
export const CAR_IMAGE_HEIGHT: number = Number.parseInt(BC_CAR_IMAGE_HEIGHT) || 200
export const CAR_OPTION_IMAGE_HEIGHT: number = 85
export const SELECTED_CAR_OPTION_IMAGE_HEIGHT: number = 30
export const MINIMUM_AGE: number = Number.parseInt(BC_MINIMUM_AGE) || 21

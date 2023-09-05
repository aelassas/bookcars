import process from 'node:process'
import { Document, Types } from 'mongoose'
import * as bookcarsTypes from 'bookcars-types'
import * as helper from '../common/helper'

const __env__ = (name: string, required?: boolean, defaultValue?: string): string => {
    const value = process.env[name]
    if (required && !value) {
        throw new Error(`'${name} not found`)
    }
    if (!value) {
        return defaultValue || ''
    }
    return String(value)
}

export const PORT = Number.parseInt(__env__('BC_PORT', false, '4003'), 10)
export const HTTPS = helper.StringToBoolean(__env__('BC_HTTPS'))
export const PRIVATE_KEY = __env__('BC_PRIVATE_KEY', HTTPS)
export const CERTIFICATE = __env__('BC_CERTIFICATE', HTTPS)

export const DB_URI = __env__('BC_DB_URI', false, 'mongodb://127.0.0.1:27017/bookcars?authSource=admin&appName=bookcars')
export const DB_SSL = helper.StringToBoolean(__env__('BC_DB_SSL', false, 'false'))
export const DB_SSL_CERT = __env__('BC_DB_SSL_CERT', DB_SSL)
export const DB_SSL_CA = __env__('BC_DB_SSL_CA', DB_SSL)
export const DB_DEBUG = helper.StringToBoolean(__env__('BC_DB_DEBUG', false, 'false'))

export const JWT_SECRET = __env__('BC_JWT_SECRET', false, 'BookCars')
export const JWT_EXPIRE_AT = Number.parseInt(__env__('BC_JWT_EXPIRE_AT', false, '86400'), 10) // in seconds (default: 1d)
export const TOKEN_EXPIRE_AT = Number.parseInt(__env__('BC_TOKEN_EXPIRE_AT', false, '86400'), 10) // in seconds (default: 1d)

export const SMTP_HOST = __env__('BC_SMTP_HOST', true)
export const SMTP_PORT = Number.parseInt(__env__('BC_SMTP_PORT', true), 10)
export const SMTP_USER = __env__('BC_SMTP_USER', true)
export const SMTP_PASS = __env__('BC_SMTP_PASS', true)
export const SMTP_FROM = __env__('BC_SMTP_FROM', true)

export const CDN_USERS = __env__('BC_CDN_USERS', true)
export const CDN_TEMP_USERS = __env__('BC_CDN_TEMP_USERS', true)
export const CDN_CARS = __env__('BC_CDN_CARS', true)
export const CDN_TEMP_CARS = __env__('BC_CDN_TEMP_CARS', true)

export const BACKEND_HOST = __env__('BC_BACKEND_HOST', true)
export const FRONTEND_HOST = __env__('BC_FRONTEND_HOST', true)

export const DEFAULT_LANGUAGE = __env__('BC_DEFAULT_LANGUAGE', false, 'en')
export const MINIMUM_AGE = Number.parseInt(__env__('BC_MINIMUM_AGE', false, '21'), 10)
export const EXPO_ACCESS_TOKEN = __env__('BC_EXPO_ACCESS_TOKEN', false)

export interface AdditionalDriver {
    fullName: string
    email: string
    phone: string
    birthDate: Date
}

export interface Booking extends Document {
    _id: Types.ObjectId
    company: Types.ObjectId
    car: Types.ObjectId
    driver: Types.ObjectId
    pickupLocation: Types.ObjectId
    dropOffLocation: Types.ObjectId
    from: Date
    to: Date
    status: bookcarsTypes.BookingStatus
    cancellation?: boolean
    amendments?: boolean
    theftProtection?: boolean
    collisionDamageWaiver?: boolean
    fullInsurance?: boolean
    additionalDriver?: boolean
    _additionalDriver?: Types.ObjectId
    cancelRequest?: boolean
    price: number
}

export interface BookingInfo {
    _id?: Types.ObjectId
    company: UserInfo
    car: Car
    driver: UserInfo
    pickupLocation: Types.ObjectId
    dropOffLocation: Types.ObjectId
    from: Date
    to: Date
    status: bookcarsTypes.BookingStatus
    cancellation?: boolean
    amendments?: boolean
    theftProtection?: boolean
    collisionDamageWaiver?: boolean
    fullInsurance?: boolean
    additionalDriver?: boolean
    _additionalDriver?: Types.ObjectId
    cancelRequest?: boolean
    price: number
}

export interface Car extends Document {
    name: string
    company: Types.ObjectId
    minimumAge: number
    locations: Types.ObjectId[]
    price: number
    deposit: number
    available: boolean
    type: bookcarsTypes.CarType
    gearbox: bookcarsTypes.GearboxType
    aircon: boolean
    image: string | null
    seats: number
    doors: number
    fuelPolicy: bookcarsTypes.FuelPolicy
    mileage: number
    cancellation: number
    amendments: number
    theftProtection: number
    collisionDamageWaiver: number
    fullInsurance: number
    additionalDriver: number
}

export interface CarInfo {
    _id?: Types.ObjectId
    name: string
    company: UserInfo
    minimumAge: number
    locations: Types.ObjectId[]
    price: number
    deposit: number
    available: boolean
    type: bookcarsTypes.CarType
    gearbox: bookcarsTypes.GearboxType
    aircon: boolean
    image?: string
    seats: number
    doors: number
    fuelPolicy: bookcarsTypes.FuelPolicy
    mileage: number
    cancellation: number
    amendments: number
    theftProtection: number
    collisionDamageWaiver: number
    fullInsurance: number
    additionalDriver: number
}

export interface Location extends Document {
    values: Types.ObjectId[]
    name?: string
}

export interface LocationValue extends Document {
    language: string
    value: string
}

export interface LocationInfo {
    _id?: Types.ObjectId
    name?: string
    values: LocationValue[]
}


export interface Notification extends Document {
    user: Types.ObjectId
    message: string
    booking: Types.ObjectId
    isRead?: boolean
}

export interface NotificationCounter extends Document {
    user: Types.ObjectId
    count?: number
}

export interface User extends Document {
    company?: Types.ObjectId
    fullName: string
    email: string
    phone?: string
    password?: string
    birthDate?: Date
    verified?: boolean
    verifiedAt?: Date
    active?: boolean
    language: string
    enableEmailNotifications?: boolean
    avatar?: string
    bio?: string
    location?: string
    type?: bookcarsTypes.UserType
    blacklisted?: boolean
    payLater?: boolean
}

export interface UserInfo {
    _id?: Types.ObjectId
    company?: Types.ObjectId
    fullName: string
    email?: string
    phone?: string
    password?: string
    birthDate?: Date
    verified?: boolean
    verifiedAt?: Date
    active?: boolean
    language?: string
    enableEmailNotifications?: boolean
    avatar?: string
    bio?: string
    location?: string
    type?: string
    blacklisted?: boolean
    payLater?: boolean
}

export interface PushNotification extends Document {
    user: Types.ObjectId
    token: string
}

export interface Token extends Document {
    user: Types.ObjectId
    token: string
    expireAt?: Date
}

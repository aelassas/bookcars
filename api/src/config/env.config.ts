import process from 'node:process'
import { Document, Types } from 'mongoose'
import * as bookcarsTypes from 'bookcars-types'

export const DEFAULT_LANGUAGE = String(process.env.BC_DEFAULT_LANGUAGE)

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

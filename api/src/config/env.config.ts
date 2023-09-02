import process from 'node:process'
import { Document, Types } from 'mongoose'

export const DEFAULT_LANGUAGE = String(process.env.BC_DEFAULT_LANGUAGE)

export enum UserType {
    Admin = 'admin',
    Company = 'company',
    User = 'user',
}

export enum AppType {
    Backend = 'backend',
    Frontend = 'frontend',
}

export enum CarType {
    Diesel = 'diesel',
    Gasoline = 'gasoline'
}

export enum GearboxType {
    Manual = 'manual',
    Automatic = 'automatic'
}

export enum FuelPolicy {
    LikeForlike = 'likeForlike',
    FreeTank = 'freeTank'
}

export enum BookingStatus {
    Void = 'void',
    Pending = 'pending',
    Deposit = 'deposit',
    Paid = 'paid',
    Reserved = 'reserved',
    Cancelled = 'cancelled'
}

export enum Mileage {
    Limited = 'limited',
    Unlimited = 'unlimited'
}

export enum Availablity {
    Available = 'available',
    Unavailable = 'unavailable'
}

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
    status: BookingStatus
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
    status: BookingStatus
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
    type: CarType
    gearbox: GearboxType
    aircon: boolean
    image: string | null
    seats: number
    doors: number
    fuelPolicy: FuelPolicy
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
    type: CarType
    gearbox: GearboxType
    aircon: boolean
    image?: string
    seats: number
    doors: number
    fuelPolicy: FuelPolicy
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
    type?: UserType
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

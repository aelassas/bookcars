export interface Driver {
    email: string
    phone: string
    fullName: string
    birthDate: string
    language: string
    verified: boolean
    blacklisted: boolean
}

export interface Booking {
    company: string
    car: string
    driver: string
    pickupLocation: string
    dropOffLocation: string
    from: Date
    to: Date
    status: string
    cancellation?: boolean
    amendments?: boolean
    theftProtection?: boolean
    collisionDamageWaiver?: boolean
    fullInsurance?: boolean
    additionalDriver?: boolean
    _additionalDriver?: string
    cancelRequest?: boolean
    price: number
}

export interface BookPayload {
    driver: Driver
    booking: Booking
}

export interface Filter {
    from: Date
    to: Date
    keyword?: string
    pickupLocation?: string
    dropOffLocation?: string
}

export interface GetBookingsPayload {
    companies: string[]
    statuses: string[]
    user?: string
    car?: string
    filter?: Filter
}


export interface AdditionalDriver {
    fullName: string
    email: string
    phone: string
    birthDate: Date
}


export interface CreateBookingPayload {
    booking: Booking
    additionalDriver?: AdditionalDriver
}

export interface UpdateBookingPayload extends CreateBookingPayload {
    _id: string
}

export interface LocationName {
    language: string
    name: string
}

export interface UpdateSupplierPayload {
    _id: string
    fullName: string
    phone: string
    location: string
    bio: string
    payLater: boolean
}

export interface CreateCarPayload {
    name: string
    company: string
    minimumAge: number
    locations: string[]
    price: number
    deposit: number
    available: boolean
    type: string
    gearbox: string
    aircon: boolean
    image: string
    seats: number
    doors: number
    fuelPolicy: string
    mileage: number
    cancellation: number
    amendments: number
    theftProtection: number
    collisionDamageWaiver: number
    fullInsurance: number
    additionalDriver: number
}

export interface UpdateCarPayload extends CreateCarPayload {
    _id: string
}

export interface GetCarsPayload {
    companies: string[]
    fuel: string[]
    gearbox: string[]
    mileage: string[]
    deposit: number
    availability: string[]
    pickupLocation?: string
}

export interface BackendSignUpPayload {
    email: string
    password: string
    fullName: string
    language: string
    active?: boolean
    verified?: boolean
    blacklisted?: boolean
    type?: string
    avatar?: string
}

export interface FrontendSignUpPayload extends BackendSignUpPayload {
    birthDate: number | Date
}

export interface CreateUserPayload {
    email: string
    phone: string
    location: string
    bio: string
    fullName: string
    type: string
    avatar: string
    birthDate: number | Date
    language: string
    agency: string
    password?: string
    verified?: boolean
    blacklisted?: boolean
}

export interface UpdateUserPayload extends CreateUserPayload {
    _id: string
    enableEmailNotifications: boolean
    payLater: boolean
}

export interface changePasswordPayload {
    _id: string
    password: string
    newPassword: string
    strict: boolean
}

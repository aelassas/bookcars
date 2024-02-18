export declare enum UserType {
    Admin = "admin",
    Company = "company",
    User = "user"
}
export declare enum AppType {
    Backend = "backend",
    Frontend = "frontend"
}
export declare enum CarType {
    Diesel = "diesel",
    Gasoline = "gasoline"
}
export declare enum GearboxType {
    Manual = "manual",
    Automatic = "automatic"
}
export declare enum FuelPolicy {
    LikeForlike = "likeForlike",
    FreeTank = "freeTank"
}
export declare enum BookingStatus {
    Void = "void",
    Pending = "pending",
    Deposit = "deposit",
    Paid = "paid",
    Reserved = "reserved",
    Cancelled = "cancelled"
}
export declare enum Mileage {
    Limited = "limited",
    Unlimited = "unlimited"
}
export declare enum Availablity {
    Available = "available",
    Unavailable = "unavailable"
}
export declare enum RecordType {
    Admin = "admin",
    Company = "company",
    User = "user",
    Car = "car",
    Location = "location"
}
export interface Booking {
    _id?: string;
    company: string | User;
    car: string | Car;
    driver?: string | User;
    pickupLocation: string | Location;
    dropOffLocation: string | Location;
    from: Date;
    to: Date;
    status: BookingStatus;
    cancellation?: boolean;
    amendments?: boolean;
    theftProtection?: boolean;
    collisionDamageWaiver?: boolean;
    fullInsurance?: boolean;
    additionalDriver?: boolean;
    _additionalDriver?: string | AdditionalDriver;
    cancelRequest?: boolean;
    price?: number;
}
export interface CheckoutPayload {
    driver?: User;
    booking?: Booking;
    additionalDriver?: AdditionalDriver;
    payLater?: boolean;
}
export interface Filter {
    from?: Date;
    to?: Date;
    keyword?: string;
    pickupLocation?: string;
    dropOffLocation?: string;
}
export interface GetBookingsPayload {
    companies: string[];
    statuses: string[];
    user?: string;
    car?: string;
    filter?: Filter;
}
export interface AdditionalDriver {
    fullName: string;
    email: string;
    phone: string;
    birthDate: Date;
}
export interface UpsertBookingPayload {
    booking: Booking;
    additionalDriver?: AdditionalDriver;
}
export interface LocationName {
    language: string;
    name: string;
}
export interface UpdateSupplierPayload {
    _id: string;
    fullName: string;
    phone: string;
    location: string;
    bio: string;
    payLater: boolean;
}
export interface CreateCarPayload {
    name: string;
    company: string;
    minimumAge: number;
    locations: string[];
    price: number;
    deposit: number;
    available: boolean;
    type: string;
    gearbox: string;
    aircon: boolean;
    image?: string;
    seats: number;
    doors: number;
    fuelPolicy: string;
    mileage: number;
    cancellation: number;
    amendments: number;
    theftProtection: number;
    collisionDamageWaiver: number;
    fullInsurance: number;
    additionalDriver: number;
}
export interface UpdateCarPayload extends CreateCarPayload {
    _id: string;
}
export interface GetCarsPayload {
    companies: string[];
    fuel?: string[];
    gearbox?: string[];
    mileage?: string[];
    deposit?: number;
    availability?: string[];
    pickupLocation?: string;
}
export interface SignUpPayload {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    language: string;
    active?: boolean;
    verified?: boolean;
    blacklisted?: boolean;
    type?: string;
    avatar?: string;
    birthDate?: number | Date;
}
export interface CreateUserPayload {
    email?: string;
    phone: string;
    location: string;
    bio: string;
    fullName: string;
    type?: string;
    avatar?: string;
    birthDate?: number | Date;
    language?: string;
    password?: string;
    verified?: boolean;
    blacklisted?: boolean;
    payLater?: boolean;
    company?: string;
}
export interface UpdateUserPayload extends CreateUserPayload {
    _id: string;
    enableEmailNotifications?: boolean;
    payLater?: boolean;
}
export interface ChangePasswordPayload {
    _id: string;
    password: string;
    newPassword: string;
    strict: boolean;
}
export interface ActivatePayload {
    userId: string;
    token: string;
    password: string;
}
export interface ValidateEmailPayload {
    email: string;
}
export interface SignInPayload {
    email: string;
    password?: string;
    stayConnected?: boolean;
    mobile?: boolean;
}
export interface ResendLinkPayload {
    email?: string;
}
export interface UpdateEmailNotificationsPayload {
    _id: string;
    enableEmailNotifications: boolean;
}
export interface UpdateLanguagePayload {
    id: string;
    language: string;
}
export interface ValidateSupplierPayload {
    fullName: string;
}
export interface ValidateLocationPayload {
    language: string;
    name: string;
}
export interface UpdateStatusPayload {
    ids: string[];
    status: string;
}
export interface User {
    _id?: string;
    company?: User | string;
    fullName: string;
    email?: string;
    phone?: string;
    password?: string;
    birthDate?: Date;
    verified?: boolean;
    verifiedAt?: Date;
    active?: boolean;
    language?: string;
    enableEmailNotifications?: boolean;
    avatar?: string;
    bio?: string;
    location?: string;
    type?: string;
    blacklisted?: boolean;
    payLater?: boolean;
    accessToken?: string;
    checked?: boolean;
}
export interface Option {
    _id: string;
    name?: string;
    image?: string;
}
export interface LocationValue {
    language: string;
    value?: string;
    name?: string;
}
export interface Location {
    _id: string;
    name?: string;
    values?: LocationValue[];
}
export interface Car {
    _id: string;
    name: string;
    company: User;
    minimumAge: number;
    locations: Location[];
    price: number;
    deposit: number;
    available: boolean;
    type: CarType;
    gearbox: GearboxType;
    aircon: boolean;
    image?: string;
    seats: number;
    doors: number;
    fuelPolicy: FuelPolicy;
    mileage: number;
    cancellation: number;
    amendments: number;
    theftProtection: number;
    collisionDamageWaiver: number;
    fullInsurance: number;
    additionalDriver: number;
    [propKey: string]: any;
}
export interface Data<T> {
    rows: T[];
    rowCount: number;
}
export interface GetBookingCarsPayload {
    company: string;
    pickupLocation: string;
}
export interface Notification {
    _id: string;
    user: string;
    message: string;
    booking?: string;
    isRead?: boolean;
    checked?: boolean;
    createdAt?: Date;
}
export interface NotificationCounter {
    _id: string;
    user: string;
    count: number;
}
export interface ResultData<T> {
    pageInfo: {
        totalRecords: number;
    };
    resultData: T[];
}
export type Result<T> = [ResultData<T>] | [] | undefined | null;
export interface GetUsersBody {
    user: string;
    types: UserType[];
}
export type DataEvent<T> = (data?: Data<T>) => void;
export interface StatusFilterItem {
    label: string;
    value: BookingStatus;
    checked?: boolean;
}
export interface CarFilter {
    pickupLocation: Location;
    dropOffLocation: Location;
    from: Date;
    to: Date;
}
export type CarFilterSubmitEvent = (filter: CarFilter) => void;
export interface CarOptions {
    cancellation?: boolean;
    amendments?: boolean;
    theftProtection?: boolean;
    collisionDamageWaiver?: boolean;
    fullInsurance?: boolean;
    additionalDriver?: boolean;
}

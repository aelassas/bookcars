import request from 'supertest'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcrypt'
import * as bookcarsTypes from 'bookcars-types'
import { v1 as uuid } from 'uuid'
import mongoose from 'mongoose'
import app from '../src/app'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import LocationValue from '../src/models/LocationValue'
import Location from '../src/models/Location'
import Notification from '../src/models/Notification'
import NotificationCounter from '../src/models/NotificationCounter'

export function getName(prefix: string) {
    expect(prefix.length).toBeGreaterThan(1)
    return `${prefix}.${uuid()}`
}

export function getSupplierName() {
    return getName('supplier')
}

const ADMIN_EMAIL = `${getName('admin')}@test.bookcars.ma`
const USER_EMAIL = `${getName('user')}@test.bookcars.ma`
export const USER_FULL_NAME = 'user'
export const PASSWORD = 'Un1tTest5'
export const LANGUAGE = 'en'
export const PAGE = 1
export const SIZE = 30

let ADMIN_USER_ID: string
let USER_ID: string

export async function initialize() {
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(PASSWORD, salt)
    const body = {
        fullName: 'admin',
        email: ADMIN_EMAIL,
        language: LANGUAGE,
        password: passwordHash,
        type: bookcarsTypes.UserType.Admin,
    }
    // admin
    let user = new User(body)
    await user.save()
    expect(user.id).toBeDefined()
    ADMIN_USER_ID = user.id

    // user
    user = new User({ ...body, fullName: USER_FULL_NAME, email: USER_EMAIL, type: bookcarsTypes.UserType.User })
    await user.save()
    expect(user.id).toBeDefined()
    USER_ID = user.id

    console.error = () => { }
}

export function getAdminUserId() {
    return ADMIN_USER_ID
}

export function getUserId() {
    return USER_ID
}

export async function close() {
    const res = await User.deleteMany({ email: { $in: [ADMIN_EMAIL, USER_EMAIL] } })
    expect(res.deletedCount).toBe(2)
    await Notification.deleteMany({ user: { $in: [ADMIN_USER_ID, USER_ID] } })
    await NotificationCounter.deleteMany({ user: { $in: [ADMIN_USER_ID, USER_ID] } })
}

export function getToken(cookie: string) {
    const signedCookie = decodeURIComponent(cookie)
    const token = cookieParser.signedCookie((signedCookie.match(`${env.X_ACCESS_TOKEN}=(s:.*?);`) ?? [])[1], env.COOKIE_SECRET) as string
    return token
}

const signin = async (appType: bookcarsTypes.AppType, email: string) => {
    const payload: bookcarsTypes.SignInPayload = {
        email,
        password: PASSWORD,
    }

    const res = await request(app)
        .post(`/api/sign-in/${appType}`)
        .send(payload)

    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBeGreaterThan(1)
    const token = getToken(cookies[1])
    expect(token).toBeDefined()
    return token
}

export async function signinAsAdmin() {
    return signin(bookcarsTypes.AppType.Backend, ADMIN_EMAIL)
}

export async function signinAsUser() {
    return signin(bookcarsTypes.AppType.Frontend, USER_EMAIL)
}

export async function signout(token: string) {
    const res = await request(app)
        .post('/api/sign-out')
        .set('Cookie', [`${env.X_ACCESS_TOKEN}=${token};`])
    expect(res.statusCode).toBe(200)

    const cookies = res.headers['set-cookie'] as unknown as string[]
    expect(cookies.length).toBe(1)
    expect(cookies[0]).toContain(`${env.X_ACCESS_TOKEN}=;`)
}

export async function createSupplier(email: string, fullName: string) {
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(PASSWORD, salt)
    const body = {
        email,
        fullName,
        language: LANGUAGE,
        password: passwordHash,
        type: bookcarsTypes.UserType.Company,
    }
    const supplier = new User(body)
    await supplier.save()
    expect(supplier.id).toBeDefined()
    return supplier.id as string
}

export async function deleteSupplier(id: string) {
    const res = await User.deleteOne({ _id: id })
    expect(res.deletedCount).toBe(1)

    await Notification.deleteMany({ user: id })
    await NotificationCounter.deleteMany({ user: id })
}

export async function deleteLocation(id: string) {
    const location = await Location.findById(id)
    expect(location).toBeDefined()

    const valuesRes = await LocationValue.deleteMany({ _id: { $in: location?.values } })
    expect(valuesRes.deletedCount).toBeGreaterThan(1)

    const res = await Location.deleteOne({ _id: id })
    expect(res.deletedCount).toBe(1)
}

export async function createLocation(nameEN: string, nameFR: string) {
    const locationValueBodyEN = {
        language: 'en',
        value: nameEN,
    }
    const locationValueEN = new LocationValue(locationValueBodyEN)
    await locationValueEN.save()

    const locationValueBodyFR = {
        language: 'fr',
        value: nameFR,
    }
    const locationValueFR = new LocationValue(locationValueBodyFR)
    await locationValueFR.save()

    const values = [locationValueEN._id, locationValueFR._id]
    const location = new Location({ values })
    await location.save()
    expect(location.id).toBeDefined()
    return location.id as string
}

export function GetRandomEmail() {
    return `random.${uuid()}@test.bookcars.ma`
}

export function GetRandromObjectId() {
    return new mongoose.Types.ObjectId()
}

export function GetRandromObjectIdAsString() {
    return GetRandromObjectId().toString()
}

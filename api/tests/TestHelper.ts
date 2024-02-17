import request from 'supertest'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcrypt'
import * as bookcarsTypes from 'bookcars-types'
import app from '../src/app'
import * as env from '../src/config/env.config'
import User from '../src/models/User'
import LocationValue from '../src/models/LocationValue'
import Location from '../src/models/Location'

const ADMIN_EMAIL = 'admin@test.bookcars.ma'
export const PASSWORD = 'Un1tTest5'
export const LANGUAGE = 'en'
export const PAGE = 1
export const SIZE = 1

export async function initializeDatabase() {
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(PASSWORD, salt)
    const body = {
        fullName: 'admin',
        email: ADMIN_EMAIL,
        language: LANGUAGE,
        password: passwordHash,
        type: bookcarsTypes.UserType.Admin,
    }
    const user = new User(body)
    await user.save()
    expect(user.id).toBeDefined()
}

export async function clearDatabase() {
    const res = await User.deleteOne({ email: ADMIN_EMAIL })
    expect(res.deletedCount).toBe(1)
}

export async function signinAsAdmin() {
    const APP_TYPE = 'backend'

    const signinRequest = await request(app)
        .post(`/api/sign-in/${APP_TYPE}`)
        .send({
            email: ADMIN_EMAIL,
            password: PASSWORD,
        })

    expect(signinRequest.statusCode).toBe(200)
    const cookies = signinRequest.headers['set-cookie'] as unknown as string[]
    const signedCookie = decodeURIComponent(cookies[1])
    const token = cookieParser.signedCookie((signedCookie.match(`${env.X_ACCESS_TOKEN}=(s:.*?);`) ?? [])[1], env.COOKIE_SECRET) as string
    expect(token).toBeDefined()
    return token
}

export async function signout(token: string) {
    const signoutRequest = await request(app)
        .post('/api/sign-out')
        .set(env.X_ACCESS_TOKEN, token)
    expect(signoutRequest.statusCode).toBe(200)
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

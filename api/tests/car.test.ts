import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from 'bookcars-types'
import url from 'url'
import path from 'path'
import fs from 'node:fs/promises'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import app from '../src/app'
import * as env from '../src/config/env.config'
import * as TestHelper from './TestHelper'
import * as Helper from '../src/common/Helper'
import Car from '../src/models/Car'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const IMAGE1 = 'bmw-x1.jpg'
const IMAGE1_PATH = path.resolve(__dirname, `./img/${IMAGE1}`)
const IMAGE2 = 'bmw-x5.jpg'
const IMAGE2_PATH = path.resolve(__dirname, `./img/${IMAGE2}`)
let SUPPLIER1_ID: string
let SUPPLIER2_ID: string
let LOCATION1_ID: string
let LOCATION2_ID: string
let CAR_ID: string

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()

        // create two suppliers
        const supplier1Name = TestHelper.getSupplierName()
        const supplier2Name = TestHelper.getSupplierName()
        SUPPLIER1_ID = await TestHelper.createSupplier(`${supplier1Name}@test.bookcars.ma`, supplier1Name)
        SUPPLIER2_ID = await TestHelper.createSupplier(`${supplier2Name}@test.bookcars.ma`, supplier2Name)

        // create two locations
        LOCATION1_ID = await TestHelper.createLocation('Location 1 EN', 'Location 1 FR')
        LOCATION2_ID = await TestHelper.createLocation('Location 2 EN', 'Location 2 FR')
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.clearDatabase()

    // delete suppliers
    await TestHelper.deleteSupplier(SUPPLIER1_ID)
    await TestHelper.deleteSupplier(SUPPLIER2_ID)

    // delete locations
    await TestHelper.deleteLocation(LOCATION1_ID)
    await TestHelper.deleteLocation(LOCATION2_ID)

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('POST /api/create-car', () => {
    it('should create a car', async () => {
        const token = await TestHelper.signinAsAdmin()

        const tempImage = path.join(env.CDN_TEMP_CARS, IMAGE1)
        if (!await Helper.exists(tempImage)) {
            fs.copyFile(IMAGE1_PATH, tempImage)
        }

        const res = await request(app)
            .post('/api/create-car')
            .set(env.X_ACCESS_TOKEN, token)
            .send({
                name: 'BMW X1',
                company: SUPPLIER1_ID,
                minimumAge: 21,
                locations: [LOCATION1_ID],
                price: 780,
                deposit: 9500,
                available: false,
                type: bookcarsTypes.CarType.Diesel,
                gearbox: bookcarsTypes.GearboxType.Automatic,
                aircon: true,
                image: IMAGE1,
                seats: 5,
                doors: 4,
                fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
                mileage: -1,
                cancellation: 0,
                amendments: 0,
                theftProtection: 90,
                collisionDamageWaiver: 120,
                fullInsurance: 200,
                additionalDriver: 200,
            })

        expect(res.statusCode).toBe(200)
        CAR_ID = res.body._id

        await TestHelper.signout(token)
    })
})

describe('PUT /api/update-car', () => {
    it('should update a car', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .put('/api/update-car')
            .set(env.X_ACCESS_TOKEN, token)
            .send({
                _id: CAR_ID,
                name: 'BMW X5',
                company: SUPPLIER2_ID,
                minimumAge: 23,
                locations: [LOCATION2_ID],
                price: 980,
                deposit: 10500,
                available: true,
                type: bookcarsTypes.CarType.Gasoline,
                gearbox: bookcarsTypes.GearboxType.Manual,
                aircon: false,
                seats: 4,
                doors: 5,
                fuelPolicy: bookcarsTypes.FuelPolicy.LikeForlike,
                mileage: 30000,
                cancellation: 70,
                amendments: 30,
                theftProtection: 100,
                collisionDamageWaiver: 130,
                fullInsurance: 210,
                additionalDriver: 220,
            })

        expect(res.statusCode).toBe(200)

        const car = res.body
        expect(car.name).toBe('BMW X5')
        expect(car.company).toBe(SUPPLIER2_ID)
        expect(car.minimumAge).toBe(23)
        expect(car.locations).toStrictEqual([LOCATION2_ID])
        expect(car.price).toBe(980)
        expect(car.deposit).toBe(10500)
        expect(car.available).toBeTruthy()
        expect(car.type).toBe(bookcarsTypes.CarType.Gasoline)
        expect(car.gearbox).toBe(bookcarsTypes.GearboxType.Manual)
        expect(car.aircon).toBe(false)
        expect(car.seats).toBe(4)
        expect(car.doors).toBe(5)
        expect(car.fuelPolicy).toBe(bookcarsTypes.FuelPolicy.LikeForlike)
        expect(car.mileage).toBe(30000)
        expect(car.cancellation).toBe(70)
        expect(car.amendments).toBe(30)
        expect(car.theftProtection).toBe(100)
        expect(car.collisionDamageWaiver).toBe(130)
        expect(car.fullInsurance).toBe(210)
        expect(car.additionalDriver).toBe(220)

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-car-image/:id', () => {
    it('should delete a car image', async () => {
        const token = await TestHelper.signinAsAdmin()

        const car = await Car.findById(CAR_ID)
        const image = path.join(env.CDN_CARS, car?.image as string)
        let imageExists = await Helper.exists(image)
        expect(imageExists).toBeTruthy()

        const res = await request(app)
            .post(`/api/delete-car-image/${CAR_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        imageExists = await Helper.exists(image)
        expect(imageExists).toBeFalsy()

        await TestHelper.signout(token)
    })
})

describe('POST /api/create-car-image', () => {
    it('should create a car image', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .post('/api/create-car-image')
            .set(env.X_ACCESS_TOKEN, token)
            .attach('image', IMAGE1_PATH)

        expect(res.statusCode).toBe(200)
        const filename = res.body as string
        const imageExists = await Helper.exists(path.resolve(env.CDN_TEMP_CARS, filename))
        expect(imageExists).toBeTruthy()

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-car-image/:id', () => {
    it('should update a car image', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .post(`/api/update-car-image/${CAR_ID}`)
            .set(env.X_ACCESS_TOKEN, token)
            .attach('image', IMAGE2_PATH)

        expect(res.statusCode).toBe(200)
        const filename = res.body as string
        const imageExists = await Helper.exists(path.resolve(env.CDN_CARS, filename))
        expect(imageExists).toBeTruthy()

        await TestHelper.signout(token)
    })
})

describe('POST /api/delete-temp-car-image/:image', () => {
    it('should delete a temporary car image', async () => {
        const token = await TestHelper.signinAsAdmin()

        const tempImage = path.join(env.CDN_TEMP_CARS, IMAGE1)
        if (!await Helper.exists(tempImage)) {
            fs.copyFile(IMAGE1_PATH, tempImage)
        }

        const res = await request(app)
            .post(`/api/delete-temp-car-image/${IMAGE1}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        const tempImageExists = await Helper.exists(tempImage)
        expect(tempImageExists).toBeFalsy()

        await TestHelper.signout(token)
    })
})

describe('GET /api/car/:id/:language', () => {
    it('should return a car', async () => {
        const res = await request(app)
            .get(`/api/car/${CAR_ID}/${TestHelper.LANGUAGE}`)

        expect(res.statusCode).toBe(200)
        expect(res.body.name).toBe('BMW X5')
    })
})

describe('POST /api/cars/:page/:size', () => {
    it('should return cars', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .post(`/api/cars/${TestHelper.PAGE}/${TestHelper.SIZE}`)
            .set(env.X_ACCESS_TOKEN, token)
            .send(
                {
                    companies: [SUPPLIER2_ID],
                    fuel: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
                    gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
                    mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
                    availability: [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable],
                    deposit: -1,
                },
            )

        expect(res.statusCode).toBe(200)
        expect(res.body[0].resultData.length).toBeGreaterThan(0)

        await TestHelper.signout(token)
    })
})

describe('POST /api/booking-cars/:page/:size', () => {
    it('should return booking cars', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .post(`/api/booking-cars/${TestHelper.PAGE}/${TestHelper.SIZE}`)
            .set(env.X_ACCESS_TOKEN, token)
            .send(
                {
                    company: SUPPLIER2_ID,
                    pickupLocation: LOCATION2_ID,
                },
            )

        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBeGreaterThan(0)
        await TestHelper.signout(token)
    })
})

describe('POST /api/frontend-cars/:page/:size', () => {
    it('should return frontend cars', async () => {
        const res = await request(app)
            .post(`/api/frontend-cars/${TestHelper.PAGE}/${TestHelper.SIZE}`)
            .send(
                {
                    companies: [SUPPLIER2_ID],
                    pickupLocation: LOCATION2_ID,
                    fuel: [bookcarsTypes.CarType.Diesel, bookcarsTypes.CarType.Gasoline],
                    gearbox: [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic],
                    mileage: [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited],
                    deposit: -1,
                },
            )

        expect(res.statusCode).toBe(200)
        expect(res.body[0].resultData.length).toBeGreaterThan(0)
    })
})

describe('GET /api/check-car/:id', () => {
    it('should check a car', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/check-car/${CAR_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(204)

        await TestHelper.signout(token)
    })
})

describe('DELETE /api/delete-car/:id', () => {
    it('should delete a car', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .delete(`/api/delete-car/${CAR_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        await TestHelper.signout(token)
    })
})

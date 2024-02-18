import 'dotenv/config'
import request from 'supertest'
import * as bookcarsTypes from 'bookcars-types'
import app from '../src/app'
import * as DatabaseHelper from '../src/common/DatabaseHelper'
import * as TestHelper from './TestHelper'
import Car from '../src/models/Car'
import Booking from '../src/models/Booking'
import AdditionalDriver from '../src/models/AdditionalDriver'
import * as env from '../src/config/env.config'

let SUPPLIER_ID: string
let USER_ID: string
let LOCATION_ID: string
let CAR1_ID: string
let CAR2_ID: string
let BOOKING_ID: string
let ADDITIONAL_DRIVER_ID: string

const ADDITIONAL_DRIVER_EMAIL: string = 'addtional.driver@test.bookcars.ma'
const ADDITIONAL_DRIVER: bookcarsTypes.AdditionalDriver = {
    email: ADDITIONAL_DRIVER_EMAIL,
    fullName: 'Additional Driver 1',
    birthDate: new Date(1990, 5, 20),
    phone: '0102010101',
}

//
// Connecting and initializing the database before running the test suite
//
beforeAll(async () => {
    if (await DatabaseHelper.Connect(false)) {
        await TestHelper.initializeDatabase()

        // create a supplier
        const supplierName = TestHelper.getSupplierName()
        SUPPLIER_ID = await TestHelper.createSupplier(`${supplierName}@test.bookcars.ma`, supplierName)

        // get user id
        USER_ID = TestHelper.getUserId()

        // create a location
        LOCATION_ID = await TestHelper.createLocation('Location 1 EN', 'Location 1 FR')

        // create car
        const payload: bookcarsTypes.CreateCarPayload = {
            name: 'BMW X1',
            company: SUPPLIER_ID,
            minimumAge: 21,
            locations: [LOCATION_ID],
            price: 780,
            deposit: 9500,
            available: false,
            type: bookcarsTypes.CarType.Diesel,
            gearbox: bookcarsTypes.GearboxType.Automatic,
            aircon: true,
            // image: IMAGE1,
            seats: 5,
            doors: 4,
            fuelPolicy: bookcarsTypes.FuelPolicy.FreeTank,
            mileage: -1,
            cancellation: 0,
            amendments: 0,
            theftProtection: 90,
            collisionDamageWaiver: 120,
            fullInsurance: 200,
            additionalDriver: 0,
        }

        // car 1
        let car = new Car(payload)
        await car.save()
        CAR1_ID = car.id

        // car 2
        car = new Car({ ...payload, name: 'BMW X5', price: 880 })
        await car.save()
        CAR2_ID = car.id
    }
})

//
// Closing and cleaning the database connection after running the test suite
//
afterAll(async () => {
    await TestHelper.clearDatabase()

    // delete the supplier
    await TestHelper.deleteSupplier(SUPPLIER_ID)

    // delete the location
    await TestHelper.deleteLocation(LOCATION_ID)

    // delete the car
    await Car.deleteMany({ _id: { $in: [CAR1_ID, CAR2_ID] } })

    await DatabaseHelper.Close(false)
})

//
// Unit tests
//

describe('POST /api/create-booking', () => {
    it('should create a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: bookcarsTypes.UpsertBookingPayload = {
            booking: {
                company: SUPPLIER_ID,
                car: CAR1_ID,
                driver: USER_ID,
                pickupLocation: LOCATION_ID,
                dropOffLocation: LOCATION_ID,
                from: new Date(2024, 2, 1),
                to: new Date(1990, 2, 4),
                status: bookcarsTypes.BookingStatus.Pending,
                cancellation: true,
                amendments: true,
                theftProtection: false,
                collisionDamageWaiver: false,
                fullInsurance: false,
                price: 3120,
                additionalDriver: true,
            },
            additionalDriver: ADDITIONAL_DRIVER,
        }

        const res = await request(app)
            .post('/api/create-booking')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)
        BOOKING_ID = res.body._id

        const additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
        expect(additionalDriver).not.toBeNull()
        ADDITIONAL_DRIVER_ID = additionalDriver?.id

        await TestHelper.signout(token)
    })
})

describe('POST /api/checkout', () => {
    it('should checkout', async () => {
        let bookings = await Booking.find({ driver: USER_ID })
        expect(bookings.length).toBe(1)

        const payload: bookcarsTypes.CheckoutPayload = {
            booking: {
                company: SUPPLIER_ID,
                car: CAR1_ID,
                driver: USER_ID,
                pickupLocation: LOCATION_ID,
                dropOffLocation: LOCATION_ID,
                from: new Date(2024, 3, 1),
                to: new Date(1990, 3, 4),
                status: bookcarsTypes.BookingStatus.Pending,
                cancellation: true,
                amendments: true,
                theftProtection: false,
                collisionDamageWaiver: false,
                fullInsurance: false,
                price: 3120,
                additionalDriver: true,
            },
            payLater: true,
        }

        const res = await request(app)
            .post('/api/checkout')
            .send(payload)

        expect(res.statusCode).toBe(200)

        bookings = await Booking.find({ driver: USER_ID })
        expect(bookings.length).toBeGreaterThan(1)
    })
})

describe('POST /api/update-booking', () => {
    it('should update a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        ADDITIONAL_DRIVER.fullName = 'Additional Driver 2'

        const payload: bookcarsTypes.UpsertBookingPayload = {
            booking: {
                _id: BOOKING_ID,
                company: SUPPLIER_ID,
                car: CAR2_ID,
                driver: USER_ID,
                pickupLocation: LOCATION_ID,
                dropOffLocation: LOCATION_ID,
                from: new Date(2024, 2, 1),
                to: new Date(1990, 2, 4),
                status: bookcarsTypes.BookingStatus.Paid,
                cancellation: true,
                amendments: true,
                theftProtection: false,
                collisionDamageWaiver: false,
                fullInsurance: false,
                price: 3520,
                additionalDriver: true,
                _additionalDriver: ADDITIONAL_DRIVER_ID,
            },
            additionalDriver: ADDITIONAL_DRIVER,
        }

        const res = await request(app)
            .put('/api/update-booking')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body.car).toBe(CAR2_ID)
        expect(res.body.price).toBe(3520)
        expect(res.body.status).toBe(bookcarsTypes.BookingStatus.Paid)

        const additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
        expect(additionalDriver).not.toBeNull()
        expect(additionalDriver?.fullName).toBe(ADDITIONAL_DRIVER.fullName)

        await TestHelper.signout(token)
    })
})

describe('POST /api/update-booking-status', () => {
    it('should update booking status', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: bookcarsTypes.UpdateStatusPayload = {
            ids: [BOOKING_ID],
            status: bookcarsTypes.BookingStatus.Reserved,
        }

        const res = await request(app)
            .post('/api/update-booking-status')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        const booking = await Booking.findById(BOOKING_ID)
        expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)

        expect(res.statusCode).toBe(200)

        await TestHelper.signout(token)
    })
})

describe('GET /api/booking/:id/:language', () => {
    it('should get a booking', async () => {
        const token = await TestHelper.signinAsAdmin()

        const res = await request(app)
            .get(`/api/booking/${BOOKING_ID}/${TestHelper.LANGUAGE}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)
        expect(res.body.car._id).toBe(CAR2_ID)

        await TestHelper.signout(token)
    })
})

describe('POST /api/bookings/:page/:size/:language', () => {
    it('should get bookings', async () => {
        const token = await TestHelper.signinAsAdmin()

        const payload: bookcarsTypes.GetBookingsPayload = {
            companies: [SUPPLIER_ID],
            statuses: [bookcarsTypes.BookingStatus.Reserved],
        }

        const res = await request(app)
            .post(`/api/bookings/${TestHelper.PAGE}/${TestHelper.SIZE}/${TestHelper.LANGUAGE}`)
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)
        expect(res.body[0].resultData.length).toBeGreaterThan(0)

        await TestHelper.signout(token)
    })
})

describe('GET /api/has-bookings/:driver', () => {
    it("should check driver's bookings", async () => {
        const token = await TestHelper.signinAsAdmin()

        let res = await request(app)
            .get(`/api/has-bookings/${USER_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        res = await request(app)
            .get(`/api/has-bookings/${SUPPLIER_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(204)

        const booking = await Booking.findById(BOOKING_ID)
        expect(booking?.status).toBe(bookcarsTypes.BookingStatus.Reserved)

        await TestHelper.signout(token)
    })
})

describe('POST /api/cancel-booking/:id', () => {
    it('should cancel a booking', async () => {
        const token = await TestHelper.signinAsUser()

        let booking = await Booking.findById(BOOKING_ID)
        expect(booking?.cancelRequest).toBeFalsy()

        const res = await request(app)
            .post(`/api/cancel-booking/${BOOKING_ID}`)
            .set(env.X_ACCESS_TOKEN, token)

        expect(res.statusCode).toBe(200)

        booking = await Booking.findById(BOOKING_ID)
        expect(booking?.cancelRequest).toBeTruthy()

        await TestHelper.signout(token)
    })
})

describe('DELETE /api/delete-bookings', () => {
    it('should delete bookings', async () => {
        const token = await TestHelper.signinAsAdmin()

        let bookings = await Booking.find({ driver: USER_ID })
        expect(bookings.length).toBe(2)

        const payload: string[] = bookings.map((u) => u.id)

        const res = await request(app)
            .post('/api/delete-bookings')
            .set(env.X_ACCESS_TOKEN, token)
            .send(payload)

        expect(res.statusCode).toBe(200)

        bookings = await Booking.find({ renter: USER_ID })
        expect(bookings.length).toBe(0)

        const additionalDriver = await AdditionalDriver.findOne({ email: ADDITIONAL_DRIVER_EMAIL })
        expect(additionalDriver).toBeNull()

        await TestHelper.signout(token)
    })
})

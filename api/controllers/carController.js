import Env from '../config/env.config.js'
import strings from '../config/app.config.js'
import Car from '../models/Car.js'
import Booking from '../models/Booking.js'
import fs from 'fs/promises'
import path from 'path'
import { v1 as uuid } from 'uuid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import * as Helper from '../common/Helper.js'

const CDN = process.env.BC_CDN_CARS
const CDN_TEMP = process.env.BC_CDN_TEMP_CARS

export const create = async (req, res) => {
    const { body } = req

    try {
        if (!body.image) {
            console.error(`[car.create] ${strings.CAR_IMAGE_REQUIRED} ${body}`)
            return res.status(400).send(strings.CAR_IMAGE_REQUIRED)
        }

        const car = new Car(body)
        await car.save()

        if (car.image) {
            const image = path.join(CDN_TEMP, body.image)

            if (await Helper.exists(image)) {
                const filename = `${car._id}_${Date.now()}${path.extname(body.image)}`
                const newPath = path.join(CDN, filename)

                await fs.rename(image, newPath)
                car.image = filename
                await car.save()
            } else {
                await Car.deleteOne({ _id: car._id })
                console.error(strings.CAR_IMAGE_NOT_FOUND, body)
                return res.status(400).send(strings.CAR_IMAGE_NOT_FOUND)
            }
        }

        return res.json(car)
    } catch (err) {
        console.error(`[car.create] ${strings.DB_ERROR} ${body}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const update = async (req, res) => {
    const { _id } = req.body

    try {
        const car = await Car.findById(_id)

        if (car) {
            const {
                company,
                name,
                minimumAge,
                available,
                type,
                locations,
                price,
                deposit,
                seats,
                doors,
                aircon,
                gearbox,
                fuelPolicy,
                mileage,
                cancellation,
                amendments,
                theftProtection,
                collisionDamageWaiver,
                fullInsurance,
                additionalDriver
            } = req.body

            car.company = company._id
            car.minimumAge = minimumAge
            car.locations = locations
            car.name = name
            car.available = available
            car.type = type
            car.price = price
            car.deposit = deposit
            car.seats = seats
            car.doors = doors
            car.aircon = aircon
            car.gearbox = gearbox
            car.fuelPolicy = fuelPolicy
            car.mileage = mileage
            car.cancellation = cancellation
            car.amendments = amendments
            car.theftProtection = theftProtection
            car.collisionDamageWaiver = collisionDamageWaiver
            car.fullInsurance = fullInsurance
            car.additionalDriver = additionalDriver

            await car.save()
            return res.sendStatus(200)
        } else {
            console.error('[car.update] Car not found:', _id)
            return res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[car.update] ${strings.DB_ERROR} ${_id}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const checkCar = async (req, res) => {
    const { id } = req.params

    try {
        const _id = new mongoose.Types.ObjectId(id)
        const count = await Booking.find({ car: _id }).limit(1).count()

        if (count === 1) {
            return res.sendStatus(200)
        }
        return res.sendStatus(204)
    } catch (err) {
        console.error(`[car.check] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const deleteCar = async (req, res) => {
    const { id } = req.params

    try {
        const car = await Car.findByIdAndDelete(id)
        if (car) {
            if (car.image) {
                const image = path.join(CDN, car.image)
                if (await Helper.exists(image)) {
                    await fs.unlink(image)
                }
            }
            await Booking.deleteMany({ car: car._id })
        } else {
            return res.sendStatus(404)
        }
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[car.delete] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const createImage = async (req, res) => {
    try {
        if (!await Helper.exists(CDN_TEMP)) {
            await fs.mkdir(CDN_TEMP, { recursive: true })
        }

        const filename = `${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`
        const filepath = path.join(CDN_TEMP, filename)

        await fs.writeFile(filepath, req.file.buffer)
        return res.json(filename)
    } catch (err) {
        console.error(`[car.createImage] ${strings.DB_ERROR}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const updateImage = async (req, res) => {
    const { id } = req.params
    const { file } = req

    try {
        const car = await Car.findById(id)

        if (car) {
            if (!await Helper.exists(CDN)) {
                await fs.mkdir(CDN, { recursive: true })
            }

            if (car.image) {
                const image = path.join(CDN, car.image)
                if (await Helper.exists(image)) {
                    await fs.unlink(image)
                }
            }

            const filename = `${car._id}_${Date.now()}${path.extname(file.originalname)}`
            const filepath = path.join(CDN, filename)

            await fs.writeFile(filepath, file.buffer)
            car.image = filename
            await car.save()
            return res.sendStatus(200)
        } else {
            console.error('[car.updateImage] Car not found:', id)
            return res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[car.updateImage] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteImage = async (req, res) => {
    const { id } = req.params

    try {
        const car = await Car.findById(id)

        if (car) {
            if (car.image) {
                const image = path.join(CDN, car.image)
                if (await Helper.exists(image)) {
                    await fs.unlink(image)
                }
            }
            car.image = null

            await car.save()
            return res.sendStatus(200)
        } else {
            console.error('[car.deleteImage] Car not found:', id)
            res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[car.deleteImage] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteTempImage = async (req, res) => {
    const { image } = req.params

    try {
        const imageFile = path.join(CDN_TEMP, image)
        if (await Helper.exists(imageFile)) {
            await fs.unlink(imageFile)
        }
        res.sendStatus(200)
    } catch (err) {
        console.error(`[car.deleteTempImage] ${strings.DB_ERROR} ${image}`, err)
        res.status(400).send(strings.ERROR + err)
    }
}

export const getCar = async (req, res) => {
    const { id, language } = req.params

    try {
        const car = await Car.findById(id)
            .populate('company')
            .populate({
                path: 'locations',
                populate: {
                    path: 'values',
                    model: 'LocationValue',
                }
            })
            .lean()

        if (car) {
            if (car.company) {
                const { _id, fullName, avatar, payLater } = car.company
                car.company = { _id, fullName, avatar, payLater }
            }

            for (let i = 0; i < car.locations.length; i++) {
                const location = car.locations[i]
                location.name = location.values.filter(value => value.language === language)[0].value
            }

            return res.json(car)
        } else {
            console.error('[car.getCar] Car not found:', id)
            return res.sendStatus(204)
        }
    } catch (err) {
        console.error(`[car.getCar] ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.ERROR + err)
    }
}

export const getCars = async (req, res) => {
    try {

        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const companies = req.body.companies.map(id => new mongoose.Types.ObjectId(id))
        const fuel = req.body.fuel
        const gearbox = req.body.gearbox
        const mileage = req.body.mileage
        const deposit = req.body.deposit
        const availability = req.body.availability
        const keyword = escapeStringRegexp(req.query.s || '')
        const options = 'i'

        const $match = {
            $and: [
                { name: { $regex: keyword, $options: options } },
                { company: { $in: companies } }
            ]
        }

        if (fuel) {
            $match.$and.push({ type: { $in: fuel } })
        }

        if (gearbox) {
            $match.$and.push({ gearbox: { $in: gearbox } })
        }

        if (mileage) {
            if (mileage.length === 1 && mileage[0] === Env.MILEAGE.LIMITED) {
                $match.$and.push({ mileage: { $gt: -1 } })
            } else if (mileage.length === 1 && mileage[0] === Env.MILEAGE.UNLIMITED) {
                $match.$and.push({ mileage: -1 })
            } else if (mileage.length === 0) {
                return res.json([{ resultData: [], pageInfo: [] }])
            }
        }

        if (deposit && deposit > -1) {
            $match.$and.push({ deposit: { $lte: deposit } })
        }

        if (availability) {
            if (availability.length === 1 && availability[0] === Env.AVAILABILITY.AVAILABLE) {
                $match.$and.push({ available: true })
            } else if (availability.length === 1 && availability[0] === Env.AVAILABILITY.UNAVAILABLE) {
                $match.$and.push({ available: false })
            } else if (availability.length === 0) {
                return res.json([{ resultData: [], pageInfo: [] }])
            }
        }

        const data = await Car.aggregate([
            { $match },
            {
                $lookup: {
                    from: 'User',
                    let: { userId: '$company' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$userId'] }
                            }
                        }
                    ],
                    as: 'company'
                }
            },
            { $unwind: { path: '$company', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'Location',
                    let: { locations: '$locations' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ['$_id', '$$locations'] }
                            }
                        }
                    ],
                    as: 'locations'
                }
            },
            {
                $facet: {
                    resultData: [
                        { $sort: { name: 1 } },
                        { $skip: ((page - 1) * size) },
                        { $limit: size },
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } })

        if (data.length > 0) {
            data[0].resultData.forEach(car => {
                if (car.company) {
                    const { _id, fullName, avatar } = car.company
                    car.company = { _id, fullName, avatar }
                }
            })
        }

        return res.json(data)
    } catch (err) {
        console.error(`[car.getCars] ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getBookingCars = async (req, res) => {
    try {
        const company = new mongoose.Types.ObjectId(req.body.company)
        const pickupLocation = new mongoose.Types.ObjectId(req.body.pickupLocation)
        const keyword = escapeStringRegexp(req.query.s || '')
        const options = 'i'
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)

        const cars = await Car.aggregate([
            {
                $match: {
                    $and: [
                        { company: { $eq: company } },
                        { locations: pickupLocation },
                        { available: true },
                        { name: { $regex: keyword, $options: options } }
                    ]
                }
            },
            { $sort: { name: 1 } },
            { $skip: ((page - 1) * size) },
            { $limit: size }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } })

        return res.json(cars)
    } catch (err) {
        console.error(`[car.getBookingCars] ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getFrontendCars = async (req, res) => {
    try {
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const companies = req.body.companies.map(id => new mongoose.Types.ObjectId(id))
        const pickupLocation = new mongoose.Types.ObjectId(req.body.pickupLocation)
        const fuel = req.body.fuel
        const gearbox = req.body.gearbox
        const mileage = req.body.mileage
        const deposit = req.body.deposit

        const $match = {
            $and: [
                { company: { $in: companies } },
                { locations: pickupLocation },
                { available: true },
                { type: { $in: fuel } },
                { gearbox: { $in: gearbox } }
            ]
        }

        if (mileage) {
            if (mileage.length === 1 && mileage[0] === Env.MILEAGE.LIMITED) {
                $match.$and.push({ mileage: { $gt: -1 } })
            } else if (mileage.length === 1 && mileage[0] === Env.MILEAGE.UNLIMITED) {
                $match.$and.push({ mileage: -1 })
            } else if (mileage.length === 0) {
                return res.json([{ resultData: [], pageInfo: [] }])
            }
        }

        if (deposit > -1) {
            $match.$and.push({ deposit: { $lte: deposit } })
        }

        const data = await Car.aggregate([
            { $match },
            {
                $lookup: {
                    from: 'User',
                    let: { userId: '$company' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$userId'] }
                            }
                        }
                    ],
                    as: 'company'
                }
            },
            { $unwind: { path: '$company', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'Location',
                    let: { locations: '$locations' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $in: ['$_id', '$$locations'] }
                            }
                        }
                    ],
                    as: 'locations'
                }
            },
            {
                $facet: {
                    resultData: [
                        { $sort: { name: 1 } },
                        { $skip: ((page - 1) * size) },
                        { $limit: size },
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } })

        if (data.length > 0) {
            data[0].resultData.forEach(car => {
                if (car.company) {
                    const { _id, fullName, avatar } = car.company
                    car.company = { _id, fullName, avatar }
                }
            })
        }

        return res.json(data)
    } catch (err) {
        console.error(`[car.getCars] ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

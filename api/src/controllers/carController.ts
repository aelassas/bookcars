import Env from '../config/env.config'
import strings from '../config/app.config'
import Car from '../models/Car'
import Booking from '../models/Booking'
import path from 'path'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'

import {Request, Response} from "express";
import {uid} from "uid";
import assert from "node:assert";
import {put} from "../storage/s3";

export const create = async (req: Request, res: Response) => {
    try {
        const {body} = req
        assert(body.image, strings.CAR_IMAGE_REQUIRED);

        const carModel = new Car(req.body)

        const car = await carModel.save()

        car.image = body.image
        await car.save()

        return res.json(car)

    } catch (err) {
        console.error(`[car.create]  ${strings.DB_ERROR} ${req.body}`, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const update = (req: Request, res: Response) => {
    Car.findById(req.body._id)
        .then(car => {
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

                car.save()
                    .then(() => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[car.update]  ${strings.DB_ERROR} ${req.body}`, err)
                        res.status(400).send(strings.DB_ERROR + err)
                    })
            } else {
                console.error('[car.update] Car not found:', req.body._id)
                res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(`[car.update]  ${strings.DB_ERROR} ${req.body}`, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const checkCar = (req: Request, res: Response) => {
    const id = new mongoose.Types.ObjectId(req.params.id)

    Booking.find({car: id})
        .limit(1)
        .count()
        .then(count => {
            if (count === 1) {
                return res.sendStatus(200)
            }
            return res.sendStatus(204)
        })
        .catch(err => {
            console.error(`[car.checkCar]  ${strings.DB_ERROR} ${id}`, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const deleteCar = async (req: Request, res: Response) => {
    const id = req.params.id

    try {
        const car = await Car.findByIdAndDelete(id)
        if (car) {
            await Booking.deleteMany({car: car._id})
        } else {
            return res.sendStatus(404)
        }
        return res.sendStatus(200)
    } catch (err) {
        console.error(`[car.delete]  ${strings.DB_ERROR} ${id}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const createImage = async (req: Request, res: Response) => {
    console.log(1);
    try {
        assert(req.file, 'No file in request');

        console.log(2);

        const url = await put({
            Key: `${uid()}_${Date.now()}${path.extname(req.file.originalname)}`,
            Body: req.file?.buffer
        })

        console.log("url", url);
        assert(url, 'Problem with uploading');

        return res.json(url)
    } catch (err) {
        console.error(strings.ERROR, err)
        res.status(400).send(strings.ERROR + err)
    }
}

export const updateImage = async (req: Request, res: Response) => {
    try {
        const car = await Car.findById(req.params.id)
        assert(car, `Car with id ${req.params.id} not found`);
        assert(req.file, 'No file in request');

        const url = await put({
            Key: `${car._id}_${Date.now()}_${uid()}${path.extname(req.file.originalname)}`,
            Body: req.file?.buffer
        })
        assert(url, 'Problem with uploading');

        car.image = url
        await car.save()
        return res.sendStatus(200)
    } catch (err) {
        console.error(strings.DB_ERROR, err)
        res.status(400).send(strings.DB_ERROR + err)
    }
}

export const deleteImage = (req: Request, res: Response) => {

    Car.findById(req.params.id)
        .then(car => {
            if (car) {
                car.image = undefined

                car.save()
                    .then(() => {
                        res.sendStatus(200)
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err)
                        res.status(400).send(strings.DB_ERROR + err)
                    })
            } else {
                console.error('[car.deleteImage] Car not found:', req.params.id)
                res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const deleteTempImage = (req: Request, res: Response) => {
    try {
        res.sendStatus(200)
    } catch (err) {
        console.error(strings.ERROR, err)
        res.status(400).send(strings.ERROR + err)
    }
}

export const getCar = (req: Request, res: Response) => {
    Car.findById(req.params.id)
        .populate('company')
        .populate({
            path: 'locations',
            populate: {
                path: 'values',
                model: 'LocationValue',
            }
        })
        .lean()
        .then(car => {
            if (car) {
                if (car.company) {
                    //@ts-ignore
                    const {_id, fullName, avatar, payLater} = car.company
                    //@ts-ignore
                    car.company = {_id, fullName, avatar, payLater}
                }

                for (let i = 0; i < car.locations.length; i++) {
                    const location = car.locations[i]
                    //@ts-ignore
                    location.name = location.values.filter(value => value.language === req.params.language)[0].value
                }

                res.json(car)
            } else {
                console.error('[car.getCar] Car not found:', req.params.id)
                res.sendStatus(204)
            }
        })
        .catch(err => {
            console.error(`[car.getCar] ${strings.DB_ERROR} ${req.params.id}`, err)
            res.status(400).send(strings.DB_ERROR + err)
        })
}

export const getCars = async (req: Request, res: Response) => {
    try {

        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const companies = req.body.companies.map((id: unknown) => new mongoose.Types.ObjectId(String(id)))
        const fuel = req.body.fuel
        const gearbox = req.body.gearbox
        const mileage = req.body.mileage
        const deposit = req.body.deposit
        const availability = req.body.availability
        const keyword = escapeStringRegexp(String(req.query.s) || '')
        const options = 'i'

        const $match = {
            $and: [
                {name: {$regex: keyword, $options: options}},
                {company: {$in: companies}}
            ]
        }

        if (fuel) {
            //@ts-ignore
            $match.$and.push({type: {$in: fuel}})
        }

        if (gearbox) {
            //@ts-ignore
            $match.$and.push({gearbox: {$in: gearbox}})
        }

        if (mileage) {
            if (mileage.length === 1 && mileage[0] === Env.MILEAGE.LIMITED) {
                //@ts-ignore
                $match.$and.push({mileage: {$gt: -1}})
            } else if (mileage.length === 1 && mileage[0] === Env.MILEAGE.UNLIMITED) {
//@ts-ignore
                $match.$and.push({mileage: -1})
            } else if (mileage.length === 0) {
                return res.json([{resultData: [], pageInfo: []}])
            }
        }

        if (deposit && deposit > -1) {
            //@ts-ignore
            $match.$and.push({deposit: {$lte: deposit}})
        }

        if (availability) {
            if (availability.length === 1 && availability[0] === Env.AVAILABILITY.AVAILABLE) {
                //@ts-ignore
                $match.$and.push({available: true})
            } else if (availability.length === 1 && availability[0] === Env.AVAILABILITY.UNAVAILABLE) {
//@ts-ignore
                $match.$and.push({available: false})
            } else if (availability.length === 0) {
                return res.json([{resultData: [], pageInfo: []}])
            }
        }

        const cars = await Car.aggregate([
            {$match},
            {
                $lookup: {
                    from: 'User',
                    let: {userId: '$company'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {$eq: ['$_id', '$$userId']}
                            }
                        }
                    ],
                    as: 'company'
                }
            },
            {$unwind: {path: '$company', preserveNullAndEmptyArrays: false}},
            {
                $lookup: {
                    from: 'Location',
                    let: {locations: '$locations'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {$in: ['$_id', '$$locations']}
                            }
                        }
                    ],
                    as: 'locations'
                }
            },
            {
                $facet: {
                    resultData: [
                        {$sort: {name: 1}},
                        {$skip: ((page - 1) * size)},
                        {$limit: size},
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], {collation: {locale: Env.DEFAULT_LANGUAGE, strength: 2}})

        cars.forEach(car => {
            if (car.company) {
                const {_id, fullName, avatar} = car.company
                car.company = {_id, fullName, avatar}
            }
        })

        return res.json(cars)
    } catch (err) {
        console.error(`[car.getCars]  ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getBookingCars = async (req: Request, res: Response) => {
    try {
        const company = new mongoose.Types.ObjectId(req.body.company)
        const pickupLocation = new mongoose.Types.ObjectId(req.body.pickupLocation)
        const keyword = escapeStringRegexp(String(req.query.s) || '')
        const options = 'i'
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)

        const cars = await Car.aggregate([
            {
                $match: {
                    $and: [
                        {company: {$eq: company}},
                        {locations: pickupLocation},
                        {available: true},
                        {name: {$regex: keyword, $options: options}}
                    ]
                }
            },
            {$sort: {name: 1}},
            {$skip: ((page - 1) * size)},
            {$limit: size}
        ], {collation: {locale: Env.DEFAULT_LANGUAGE, strength: 2}})

        return res.json(cars)
    } catch (err) {
        console.error(`[car.getBookingCars]  ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

export const getFrontendCars = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.params.page)
        const size = parseInt(req.params.size)
        const companies = req.body.companies.map((id: unknown) => new mongoose.Types.ObjectId(String((id))))
        const pickupLocation = new mongoose.Types.ObjectId(req.body.pickupLocation)
        const fuel = req.body.fuel
        const gearbox = req.body.gearbox
        const mileage = req.body.mileage
        const deposit = req.body.deposit

        const $match = {
            $and: [
                {company: {$in: companies}},
                {locations: pickupLocation},
                {available: true},
                {type: {$in: fuel}},
                {gearbox: {$in: gearbox}}
            ]
        }

        if (mileage) {
            if (mileage.length === 1 && mileage[0] === Env.MILEAGE.LIMITED) {
                //@ts-ignore
                $match.$and.push({mileage: {$gt: -1}})
            } else if (mileage.length === 1 && mileage[0] === Env.MILEAGE.UNLIMITED) {
                //@ts-ignore
                $match.$and.push({mileage: -1})
            } else if (mileage.length === 0) {
                return res.json([{resultData: [], pageInfo: []}])
            }
        }

        if (deposit > -1) {
            //@ts-ignore
            $match.$and.push({deposit: {$lte: deposit}})
        }

        const cars = await Car.aggregate([
            {$match},
            {
                $lookup: {
                    from: 'User',
                    let: {userId: '$company'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {$eq: ['$_id', '$$userId']}
                            }
                        }
                    ],
                    as: 'company'
                }
            },
            {$unwind: {path: '$company', preserveNullAndEmptyArrays: false}},
            {
                $lookup: {
                    from: 'Location',
                    let: {locations: '$locations'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {$in: ['$_id', '$$locations']}
                            }
                        }
                    ],
                    as: 'locations'
                }
            },
            {
                $facet: {
                    resultData: [
                        {$sort: {name: 1}},
                        {$skip: ((page - 1) * size)},
                        {$limit: size},
                    ],
                    pageInfo: [
                        {
                            $count: 'totalRecords'
                        }
                    ]
                }
            }
        ], {collation: {locale: Env.DEFAULT_LANGUAGE, strength: 2}})

        cars.forEach(car => {
            if (car.company) {
                const {_id, fullName, avatar} = car.company
                car.company = {_id, fullName, avatar}
            }
        })

        return res.json(cars)
    } catch (err) {
        console.error(`[car.getCars]  ${strings.DB_ERROR} ${req.query.s}`, err)
        return res.status(400).send(strings.DB_ERROR + err)
    }
}

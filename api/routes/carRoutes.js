import express from 'express';
import routeNames from '../config/carRoutes.config.js';
import Env from '../config/env.config.js';
import strings from '../config/app.config.js';
import authJwt from '../middlewares/authJwt.js';
import Car from '../schema/Car.js';
import Booking from '../schema/Booking.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v1 as uuid } from 'uuid';
import escapeStringRegexp from 'escape-string-regexp';
import mongoose from 'mongoose';

const CDN = process.env.BC_CDN_CARS;
const CDN_TEMP = process.env.BC_CDN_TEMP_CARS;

const routes = express.Router();

routes.route(routeNames.create).post(authJwt.verifyToken, (req, res) => {
    const { body } = req;

    if (!body.image) {
        console.error(`[car.create]  ${strings.CAR_IMAGE_REQUIRED} ${req.body}`);
        res.status(400).send(strings.CAR_IMAGE_REQUIRED + err);
        return;
    }

    const car = new Car(req.body);

    car.save()
        .then(async car => {

            if (car.image) {
                const image = path.join(CDN_TEMP, body.image);
                if (fs.existsSync(image)) {
                    const filename = `${car._id}_${Date.now()}${path.extname(body.image)}`;
                    const newPath = path.join(CDN, filename);

                    try {
                        fs.renameSync(image, newPath);
                        car.image = filename;
                        try {
                            await car.save();
                        } catch (err) {
                            console.error(strings.DB_ERROR, err);
                            res.status(400).send(strings.DB_ERROR + err);
                        }
                    } catch (err) {
                        console.error(strings.ERROR, err);
                        res.status(400).send(strings.ERROR + err);
                    }
                } else {
                    console.error(strings.CAR_IMAGE_NOT_FOUND, body);

                    try {
                        await Car.deleteOne({ _id: car._id });
                    } catch (err) {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    }
                    finally {
                        res.status(400).send(strings.CAR_IMAGE_NOT_FOUND + body);
                    }

                    return;
                }
            }

            res.json(car);
        })
        .catch(err => {
            console.error(`[car.create]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.update).put(authJwt.verifyToken, (req, res) => {
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
                } = req.body;

                car.company = company._id;
                car.minimumAge = minimumAge;
                car.locations = locations;
                car.name = name;
                car.available = available;
                car.type = type;
                car.price = price;
                car.deposit = deposit;
                car.seats = seats;
                car.doors = doors;
                car.aircon = aircon;
                car.gearbox = gearbox;
                car.fuelPolicy = fuelPolicy;
                car.mileage = mileage;
                car.cancellation = cancellation;
                car.amendments = amendments;
                car.theftProtection = theftProtection;
                car.collisionDamageWaiver = collisionDamageWaiver;
                car.fullInsurance = fullInsurance;
                car.additionalDriver = additionalDriver;

                car.save()
                    .then(() => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[car.update]  ${strings.DB_ERROR} ${req.body}`, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[car.update] Car not found:', req.body._id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[car.update]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.checkCar).get(authJwt.verifyToken, (req, res) => {
    const id = mongoose.Types.ObjectId(req.params.id);

    Booking.find({ car: id })
        .limit(1)
        .count()
        .then(count => {
            if (count === 1) {
                return res.sendStatus(200);
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[car.checkCar]  ${strings.DB_ERROR} ${id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.delete).delete(authJwt.verifyToken, async (req, res) => {
    const id = req.params.id;

    try {
        const car = await Car.findByIdAndDelete(id);
        if (car) {
            if (car.image) {
                const image = path.join(CDN, car.image);
                if (fs.existsSync(image)) {
                    fs.unlinkSync(image);
                }
            }
            await Booking.deleteMany({ car: car._id });
        } else {
            return res.sendStatus(404);
        }
        return res.sendStatus(200);
    } catch (err) {
        console.error(`[car.delete]  ${strings.DB_ERROR} ${id}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
});

routes.route(routeNames.createImage).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], (req, res) => {
    try {
        if (!fs.existsSync(CDN_TEMP)) {
            fs.mkdirSync(CDN_TEMP, { recursive: true });
        }

        const filename = `${uuid()}_${Date.now()}${path.extname(req.file.originalname)}`;
        const filepath = path.join(CDN_TEMP, filename);

        fs.writeFileSync(filepath, req.file.buffer);
        res.json(filename);
    } catch (err) {
        console.error(strings.ERROR, err);
        res.status(400).send(strings.ERROR + err);
    }
});

routes.route(routeNames.updateImage).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], (req, res) => {

    Car.findById(req.params.id)
        .then(car => {
            if (car) {
                if (!fs.existsSync(CDN)) {
                    fs.mkdirSync(CDN, { recursive: true });
                }

                if (car.image) {
                    const image = path.join(CDN, car.image);
                    if (fs.existsSync(image)) {
                        fs.unlinkSync(image);
                    }
                }

                const filename = `${car._id}_${Date.now()}${path.extname(req.file.originalname)}`;
                const filepath = path.join(CDN, filename);

                fs.writeFileSync(filepath, req.file.buffer);
                car.image = filename;
                car.save()
                    .then(usr => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[car.updateImage] Car not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.deleteImage).post(authJwt.verifyToken, (req, res) => {

    Car.findById(req.params.id)
        .then(car => {
            if (car) {
                if (car.image) {
                    const image = path.join(CDN, car.image);
                    if (fs.existsSync(image)) {
                        fs.unlinkSync(image);
                    }
                }
                car.image = null;

                car.save()
                    .then(() => {
                        res.sendStatus(200);
                    })
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[car.deleteImage] Car not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.deleteTempImage).post(authJwt.verifyToken, (req, res) => {
    try {
        const image = path.join(CDN_TEMP, req.params.image);
        if (fs.existsSync(image)) {
            fs.unlinkSync(image);
        }
        res.sendStatus(200);
    } catch (err) {
        console.error(strings.ERROR, err);
        res.status(400).send(strings.ERROR + err);
    }
});

// routes.route(routeNames.getCar).get(authJwt.verifyToken, (req, res) => {
routes.route(routeNames.getCar).get((req, res) => {
    Car.findById(req.params.id)
        .populate('company')
        .populate('locations')
        .lean()
        .then(car => {
            if (car) {
                if (car.company) {
                    const { _id, fullName, avatar } = car.company;
                    car.company = { _id, fullName, avatar };
                }
                res.json(car);
            } else {
                console.error('[car.getCar] Car not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[car.getCar] ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getCars).post(authJwt.verifyToken, async (req, res) => {
    try {

        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const companies = req.body.companies.map(id => mongoose.Types.ObjectId(id));
        const fuel = req.body.fuel;
        const gearbox = req.body.gearbox;
        const mileage = req.body.mileage;
        const deposit = req.body.deposit;
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';

        const $match = {
            $and: [
                { name: { $regex: keyword, $options: options } },
                { company: { $in: companies } },
                { type: { $in: fuel } },
                { gearbox: { $in: gearbox } }
            ]
        };

        if (mileage.length === 1 && mileage[0] === Env.MILEAGE.LIMITED) {
            $match.$and.push({ mileage: { $gt: -1 } });
        } else if (mileage.length === 1 && mileage[0] === Env.MILEAGE.UNLIMITED) {
            $match.$and.push({ mileage: -1 });
        }

        if (deposit > -1) {
            $match.$and.push({ deposit: { $lte: deposit } });
        }

        const cars = await Car.aggregate([
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
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        cars.forEach(car => {
            if (car.company) {
                const { _id, fullName, avatar } = car.company;
                car.company = { _id, fullName, avatar };
            }
        });

        res.json(cars);
    } catch (err) {
        console.error(`[car.getCars]  ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
});

routes.route(routeNames.getBookingCars).post(authJwt.verifyToken, async (req, res) => {
    try {
        const company = mongoose.Types.ObjectId(req.body.company);
        const pickupLocation = mongoose.Types.ObjectId(req.body.pickupLocation);
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);

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
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        res.json(cars);
    } catch (err) {
        console.error(`[car.getBookingCars]  ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
});

routes.route(routeNames.getFrontendCars).post(async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const companies = req.body.companies.map(id => mongoose.Types.ObjectId(id));
        const pickupLocation = mongoose.Types.ObjectId(req.body.pickupLocation);
        const fuel = req.body.fuel;
        const gearbox = req.body.gearbox;
        const mileage = req.body.mileage;
        const deposit = req.body.deposit;

        const $match = {
            $and: [
                { company: { $in: companies } },
                { locations: pickupLocation },
                { available: true },
                { type: { $in: fuel } },
                { gearbox: { $in: gearbox } }
            ]
        };

        if (mileage.length === 1 && mileage[0] === Env.MILEAGE.LIMITED) {
            $match.$and.push({ mileage: { $gt: -1 } });
        } else if (mileage.length === 1 && mileage[0] === Env.MILEAGE.UNLIMITED) {
            $match.$and.push({ mileage: -1 });
        }

        if (deposit > -1) {
            $match.$and.push({ deposit: { $lte: deposit } });
        }

        const cars = await Car.aggregate([
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
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        cars.forEach(car => {
            if (car.company) {
                const { _id, fullName, avatar } = car.company;
                car.company = { _id, fullName, avatar };
            }
        });

        res.json(cars);
    } catch (err) {
        console.error(`[car.getCars]  ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
});

export default routes;
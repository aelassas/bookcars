import express from 'express';
import routeNames from '../config/carRoutes.config.js';
import Env from '../config/env.config.js';
import strings from '../config/app.config.js';
import authJwt from '../middlewares/authJwt.js';
import Car from '../schema/Car.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { v1 as uuid } from 'uuid';
import escapeStringRegexp from 'escape-string-regexp';

const CDN = process.env.BC_CDN_CARS;
const CDN_TEMP = process.env.BC_CDN_TEMP_CARS;

const routes = express.Router();

routes.route(routeNames.create).post(authJwt.verifyToken, (req, res) => {
    const { body } = req;

    if (!body.image) {
        console.error(`[car.create]  ${strings.CAR_IMAGE_ERROR} ${req.body}`);
        res.status(400).send(strings.CAR_IMAGE_ERROR + err);
        return;
    }

    const car = new Car(req.body);

    car.save()
        .then(async car => {

            const image = path.join(CDN_TEMP, body.image);
            if (fs.existsSync(image)) {
                const filename = `${car._id}_${Date.now()}${path.extname(body.image)}`;
                const newPath = path.join(CDN, filename);

                try {
                    fs.renameSync(image, newPath);
                    car.iamge = filename;
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

            res.sendStatus(200);
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
                    isAvailable,
                    type,
                    locations,
                    price,
                    seats,
                    doors,
                    aircon,
                    gearbox,
                    fuelPolicy,
                    cancellation,
                    amendments,
                    theftProtection,
                    collisionDamageWaiver,
                    fullInsurance,
                    addionaldriver
                } = req.body;

                car.company = company;
                car.locations = locations;
                car.name = name;
                car.isAvailaibe = isAvailable;
                car.type = type;
                car.price = price;
                car.seats = seats;
                car.doors = doors;
                car.aircon = aircon;
                car.gearbox = gearbox;
                car.fuelPolicy = fuelPolicy;
                car.cancellation = cancellation;
                car.amendments = amendments;
                car.theftProtection = theftProtection;
                car.collisionDamageWaiver = collisionDamageWaiver;
                car.fullInsurance = fullInsurance;
                car.addionaldriver = addionaldriver;

                car.save()
                    .then(_ => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[car.update]  ${strings.DB_ERROR} ${req.body}`, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.err('[car.update] Car not found:', req.body);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[car.update]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.delete).delete(authJwt.verifyToken, (req, res) => {
    const id = req.params.id;
    // TODO
    res.sendStatus(200);
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
                    const image = path.join(CDN, car.iamge);
                    if (fs.existsSync(image)) {
                        fs.unlinkSync(image);
                    }
                }

                const filename = `${car._id}_${Date.now()}${path.extname(req.file.originalname)}`;
                const filepath = path.join(CDN, filename);

                fs.writeFileSync(filepath, req.file.buffer);
                car.iamge = filename;
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
                if (car.iamge) {
                    const image = path.join(CDN, car.image);
                    if (fs.existsSync(image)) {
                        fs.unlinkSync(image);
                    }
                }
                car.iamge = null;

                car.save()
                    .then(_ => {
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

routes.route(routeNames.getCar).get(authJwt.verifyToken, (req, res) => {
    Car.findById(req.params.id)
        .then(car => {
            if (car) {
                res.json(car);
            } else {
                console.err('[car.getCar] Car not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[car.getCar]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getCars).get(authJwt.verifyToken, (req, res) => {
    const getCars = (keyword, page, size) => {
        const cars = [];
        for (let _id = (page - 1) * size; _id < page * size; _id++) {
            // const name = `Car ${_id}`;
            const name = _id % 2 === 0 ? 'Toyota Yaris' : 'Dacia Logan Auto';
            if (!keyword || keyword === '' || name.includes(keyword)) {
                cars.push({
                    _id,
                    company: '626e92c69acb065aa8e00459',
                    name,
                    type: _id % 2 === 0 ? Env.CAR_TYPE.DIESEL : Env.CAR_TYPE.GASOLINE,
                    image: '5266dac8680298fa6ae8c747_1651663694739.jpg',
                    locations: ['6273e2f9f036f83c05e47b0d', '6273e2d9f036f83c05e47b05'],
                    price: 848.78,
                    seats: 5,
                    doors: 4,
                    aircon: true,
                    gearbox: _id % 2 === 0 ? Env.GEARBOX_TYPE.MANUAL : Env.GEARBOX_TYPE.AUTOMATIC,
                    mileage: _id % 2 === 0 ? -1 : 150,
                    fuelPolicy: _id % 2 === 0 ? Env.FUEL_POLICY.LIKE_TO_LIKE : Env.FUEL_POLICY.FREE_TANK,
                    cancellation: _id % 2 === 0 ? 80 : _id % 3 === 0 ? 0 : -1,
                    amendments: _id % 2 === 0 ? 120 : _id % 3 === 0 ? 0 : -1,
                    theftProtection: _id % 2 === 0 ? 100 : _id % 3 === 0 ? 0 : -1,
                    collisionDamageWaiver: _id % 2 === 0 ? 110 : _id % 3 === 0 ? 0 : -1,
                    fullInsurance: _id % 2 === 0 ? 170 : _id % 3 === 0 ? 0 : -1,
                    addionaldriver: _id % 2 === 0 ? 150 : _id % 3 === 0 ? 0 : -1
                });
            }
        }
        return cars;
    };
    const cars = getCars(req.query.s, req.params.page, req.params.size);
    res.json(cars);
});


export default routes;
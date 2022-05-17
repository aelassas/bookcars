import express from 'express';
import strings from '../config/app.config.js';
import routeNames from '../config/bookingRoutes.config.js';
import Booking from '../schema/Booking.js';
import authJwt from '../middlewares/authJwt.js';
import Env from '../config/env.config.js';
import mongoose from 'mongoose';

const routes = express.Router();

routes.route(routeNames.create).post(authJwt.verifyToken, (req, res) => {
    const booking = new Booking(req.body);

    booking.save()
        .then((booking) => res.json(booking))
        .catch(err => {
            console.error(`[booking.create]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.update).put(authJwt.verifyToken, (req, res) => {

    Booking.findById(req.body._id)
        .then(booking => {
            if (booking) {
                const {
                    company,
                    car,
                    driver,
                    pickupLocation,
                    dropOffLocation,
                    from,
                    to,
                    status,
                    cancellation,
                    amendments,
                    theftProtection,
                    collisionDamageWaiver,
                    fullInsurance,
                    additionalDriver,
                    price
                } = req.body;

                booking.company = company;
                booking.car = car;
                booking.driver = driver;
                booking.pickupLocation = pickupLocation;
                booking.dropOffLocation = dropOffLocation;
                booking.from = from;
                booking.to = to;
                booking.status = status;
                booking.cancellation = cancellation;
                booking.amendments = amendments;
                booking.theftProtection = theftProtection;
                booking.collisionDamageWaiver = collisionDamageWaiver;
                booking.fullInsurance = fullInsurance;
                booking.additionalDriver = additionalDriver;
                booking.price = price;

                booking.save()
                    .then(() => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[booking.update]  ${strings.DB_ERROR} ${req.body}`, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[booking.update] Booking not found:', req.body._id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[booking.update]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.updateStatus).post(authJwt.verifyToken, (req, res) => {
    try {
        const { ids: _ids, status } = req.body, ids = _ids.map(id => mongoose.Types.ObjectId(id));
        const bulk = Booking.collection.initializeOrderedBulkOp();

        bulk.find({ _id: { $in: ids } }).update({ $set: { status: status } });
        bulk.execute((err, response) => {
            if (err) {
                console.error(`[booking.updateStatus]  ${strings.DB_ERROR} ${req.body}`, err);
                return res.status(400).send(strings.DB_ERROR + err);
            }

            return res.sendStatus(200);
        });
    } catch (err) {
        console.error(`[booking.updateStatus]  ${strings.DB_ERROR} ${req.body}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
});

routes.route(routeNames.delete).post(authJwt.verifyToken, (req, res) => {
    try {
        const ids = req.body.map(id => mongoose.Types.ObjectId(id));

        Booking.deleteMany({ _id: { $in: ids } }, (err, response) => {
            if (err) {
                console.error(strings.DB_ERROR + err);
                return res.status(400).send(strings.DB_ERROR + err);
            }

            return res.sendStatus(200);
        });

    } catch (err) {
        console.error(`[booking.delete]  ${strings.DB_ERROR} ${req.body}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
});

routes.route(routeNames.getBooking).get(authJwt.verifyToken, (req, res) => {
    Booking.findById(req.params.id)
        .populate('company')
        .populate({
            path: 'car',
            populate: {
                path: 'company',
                model: 'User'
            }
        })
        .populate({
            path: 'car',
            populate: {
                path: 'locations',
                model: 'Location'
            }
        })
        .populate('driver')
        .populate('pickupLocation')
        .populate('dropOffLocation')
        .lean()
        .then(booking => {
            if (booking) {
                if (booking.company) {
                    const { _id, fullName, avatar } = booking.company;
                    booking.company = { _id, fullName, avatar };
                }
                if (booking.car.company) {
                    const { _id, fullName, avatar } = booking.car.company;
                    booking.car.company = { _id, fullName, avatar };
                }
                res.json(booking);
            } else {
                console.error('[booking.getBooking] Car not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[booking.getBooking] ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getBookings).post(authJwt.verifyToken, async (req, res) => {
    try {
        const page = parseInt(req.params.page) + 1;
        const size = parseInt(req.params.size);
        const companies = req.body.companies.map(id => mongoose.Types.ObjectId(id));
        const statuses = req.body.statuses;
        const user = req.body.user;
        const car = req.body.car;
        const from = (req.body.filter && req.body.filter.from && new Date(req.body.filter.from)) || null;
        const to = (req.body.filter && req.body.filter.to && new Date(req.body.filter.to)) || null;
        const pickupLocation = (req.body.filter && req.body.filter.pickupLocation) || null;
        const dropOffLocation = (req.body.filter && req.body.filter.dropOffLocation) || null;

        const $match = {
            $and: [
                { $expr: { $in: ['$company', companies] } },
                { $expr: { $in: ['$status', statuses] } },
            ]
        };
        if (user) $match.$and.push({ $expr: { $eq: ['$driver', mongoose.Types.ObjectId(user)] } });
        if (car) $match.$and.push({ $expr: { $eq: ['$car', mongoose.Types.ObjectId(car)] } });
        if (from) $match.$and.push({ $expr: { $gte: ['$from', from] } }); // $from > from
        if (to) $match.$and.push({ $expr: { $lte: ['$to', to] } }); // $to < to
        if (pickupLocation) $match.$and.push({ $expr: { $eq: ['$pickupLocation', mongoose.Types.ObjectId(pickupLocation)] } });
        if (dropOffLocation) $match.$and.push({ $expr: { $eq: ['$dropOffLocation', mongoose.Types.ObjectId(dropOffLocation)] } });

        // for (let i = 0; i < 79; i++) {
        //     const booking = new Booking({
        //         company: i % 2 === 0 ? '62794b5121c117948f2a9b2e' : i % 3 === 0 ? '62756aae039367a61924c447' : '626e92c69acb065aa8e00459',
        //         car: i % 2 === 0 ? '627b577c8392253f86eb25a5' : i % 3 === 0 ? '627d296374bea00da87fa67f' : '627fce9e664271c94428aafd',
        //         driver: '6280f28a864c93af021f397d',
        //         pickupLocation: i % 2 === 0 ? '6273e2f9f036f83c05e47b0d' : i % 3 === 0 ? '6273e2d9f036f83c05e47b05' : '6273e2e4f036f83c05e47b09',
        //         dropOffLocation: i % 2 === 0 ? '6273e2f9f036f83c05e47b0d' : i % 3 === 0 ? '6273e2d9f036f83c05e47b05' : '6273e2e4f036f83c05e47b09',
        //         from: '2022-05-15T23:00:00.000Z',
        //         to: '2022-05-17T23:00:00.000Z',
        //         status: i % 2 === 0 ? 'pending' : i % 3 === 0 ? 'paid' : 'reserved',
        //         cancellation: false,
        //         amendments: false,
        //         theftProtection: false,
        //         collisionDamageWaiver: false,
        //         fullInsurance: false,
        //         additionalDriver: false,
        //         price: 1777
        //     });
        //     await booking.save();
        // }

        // Booking.deleteMany({ price: 1777 }, (err, response) => {
        //     if (err) {
        //         console.error(strings.DB_ERROR + err);
        //     }
        // });

        const data = await Booking.aggregate([
            {
                $match
            },
            {
                $lookup: {
                    from: 'User',
                    let: { companyId: '$company' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$companyId'] }
                            }
                        }
                    ],
                    as: 'company'
                }
            },
            { $unwind: { path: '$company', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'Car',
                    let: { carId: '$car' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$carId'] }
                            }
                        }
                    ],
                    as: 'car'
                }
            },
            { $unwind: { path: '$car', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'User',
                    let: { driverId: '$driver' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$driverId'] }
                            }
                        }
                    ],
                    as: 'driver'
                }
            },
            { $unwind: { path: '$driver', preserveNullAndEmptyArrays: false } },
            {
                $facet: {
                    resultData: [
                        { $sort: { createdAt: -1 } },
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
        ]);

        if (data.length > 0) {
            const bookings = data[0].resultData;

            for (const booking of bookings) {
                const { _id, fullName, avatar } = booking.company;
                booking.company = { _id, fullName, avatar };
            }
        }

        return res.json(data);
    }
    catch (err) {
        console.error(`[booking.getBookings] ${strings.DB_ERROR} ${req.body}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
});

export default routes;
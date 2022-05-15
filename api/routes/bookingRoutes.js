import express from 'express';
import strings from '../config/app.config.js';
import routeNames from '../config/bookingRoutes.config.js';
import Booking from '../schema/Booking.js';
import authJwt from '../middlewares/authJwt.js';
import Env from '../config/env.config.js';

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
    const { ids, status } = req.body;

    // TODO
    return res.sendStatus(200);
});

routes.route(routeNames.delete).post(authJwt.verifyToken, (req, res) => {
    const ids = req.body;

    // TODO
    return res.sendStatus(200);
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
            console.error(`[cbookingar.getBooking] ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getBookings).post(authJwt.verifyToken, (req, res) => {
    const page = parseInt(req.params.page) + 1;
    const size = parseInt(req.params.size);
    const companies = req.body.companies;
    const statuses = req.body.statuses;
    const from = (req.body.filter && req.body.filter.from) || null;
    const to = (req.body.filter && req.body.filter.to) || null;
    const pickupLocation = (req.body.filter && req.body.filter.pickupLocation) || null;
    const dropOffLocation = (req.body.filter && req.body.filter.dropOffLocation) || null;

    const now = new Date();

    const getDate = (date) => {
        return new Date(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
    };

    const addDays = (date, days) => {
        const d = new Date(date.valueOf());
        d.setDate(d.getDate() + days);
        return d;
    };

    const getBookings = (page, size) => {
        const bookings = [];
        for (let i = (page - 1) * size; i < page * size; i++) {
            const booking = {
                _id: i,
                company: i % 2 === 0 ?
                    {
                        _id: '62794b5121c117948f2a9b2e',
                        fullName: 'dollar',
                        avatar: '62794b5121c117948f2a9b2e_1652116388565.png'
                    } :
                    {
                        _id: '626e92c69acb065aa8e00459',
                        fullName: 'Hertz',
                        avatar: '626e92c69acb065aa8e00459_1652270308783.png'
                    },
                car: i % 2 === 0 ?
                    {
                        _id: '627b577c8392253f86eb25a5',
                        name: 'Ford Fiesta'
                    } :
                    {
                        _id: '627d296374bea00da87fa67f',
                        name: 'Dacia Logan'
                    },
                driver: { _id: '6266dcd1680298fa6ae8c75c', fullName: 'Akram El Assas' },
                pickupLocation: i % 2 === 0 ?
                    {
                        _id: '6273e2d9f036f83c05e47b05',
                        name: 'Rabat'
                    } :
                    {
                        _id: '6273e2f9f036f83c05e47b0d',
                        name: 'Casablanca'
                    },
                dropOffLocation: i % 2 === 0 ?
                    {
                        _id: '6273e2d9f036f83c05e47b05',
                        name: 'Rabat'
                    } :
                    {
                        _id: '6273e2f9f036f83c05e47b0d',
                        name: 'Casablanca'
                    },
                from: i % 2 === 0 ? getDate(now) : getDate(addDays(now, 3)),
                to: i % 2 === 0 ? getDate(addDays(now, 5)) : getDate(addDays(now, 19)),
                status: i % 2 === 0 ? Env.BOOKING_STATUS.PAID : Env.BOOKING_STATUS.RESERVED,
                cancellation: i % 2 === 0 ? -1 : 1,
                amendments: i % 2 === 0 ? -1 : 2,
                theftProtection: i % 2 === 0 ? -1 : 3,
                collisionDamageWaiver: i % 2 === 0 ? -1 : 4,
                fullInsurance: i % 2 === 0 ? -1 : 5,
                additionalDriver: i % 2 === 0 ? -1 : 6,
                price: i % 2 === 0 ? 1500 : 1000
            };

            bookings.push(booking);
        }
        return bookings;
    };

    const rows = getBookings(page, size);
    return res.json({ rows, count: 100 });
});

export default routes;
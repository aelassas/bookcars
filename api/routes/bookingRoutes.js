import express from 'express';
import strings from '../config/app.config.js';
import routeNames from '../config/bookingRoutes.config.js';
import Booking from '../schema/Booking.js';
import User from '../schema/User.js';
import Token from '../schema/Token.js';
import Car from '../schema/Car.js';
import Location from '../schema/Location.js';
import authJwt from '../middlewares/authJwt.js';
import mongoose from 'mongoose';
import escapeStringRegexp from 'escape-string-regexp';
import nodemailer from 'nodemailer';
import { v1 as uuid } from 'uuid';
import Helper from '../common/Helper.js';

const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;
const FRONTEND_HOST = process.env.BC_FRONTEND_HOST;

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

routes.route(routeNames.book).post(async (req, res) => {
    try {
        let user;
        const driver = req.body.driver;

        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });

        if (driver) {
            driver.verified = false;
            driver.blacklisted = false;

            user = new User(driver);
            await user.save();

            const token = new Token({ user: user._id, token: uuid() });
            await token.save();

            strings.setLanguage(user.language);

            const mailOptions = {
                from: SMTP_FROM,
                to: user.email,
                subject: strings.ACCOUNT_ACTIVATION_SUBJECT,
                html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'
                    + strings.ACCOUNT_ACTIVATION_LINK + '<br><br>'

                    + Helper.joinURL(FRONTEND_HOST, 'activate')
                    + '/?u=' + encodeURIComponent(user._id)
                    + '&e=' + encodeURIComponent(user.email)
                    + '&t=' + encodeURIComponent(token.token)
                    + '<br><br>'

                    + strings.REGARDS + '<br>'
                    + '</p>'
            };
            await transporter.sendMail(mailOptions);

            req.body.booking.driver = user._id;
        } else {
            user = await User.findById(req.body.booking.driver);
            strings.setLanguage(user.language);
        }

        const booking = new Booking(req.body.booking);

        await booking.save();

        const locale = user.language === 'fr' ? 'fr-FR' : 'en-US';
        const options = { weekday: 'long', month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const from = booking.from.toLocaleString(locale, options);
        const to = booking.to.toLocaleString(locale, options);
        const car = await Car.findById(booking.car).populate('company');
        const pickupLocation = await Location.findById(booking.pickupLocation);
        const dropOffLocation = await Location.findById(booking.dropOffLocation);

        const mailOptions = {
            from: SMTP_FROM,
            to: user.email,
            subject: `${strings.BOOKING_CONFIRMED_SUBJECT_PART1} ${booking._id} ${strings.BOOKING_CONFIRMED_SUBJECT_PART2}`,
            html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'

                + `${strings.BOOKING_CONFIRMED_PART1} ${booking._id} ${strings.BOOKING_CONFIRMED_PART2}` + '<br><br>'

                + `${strings.BOOKING_CONFIRMED_PART3}${car.company.fullName}${strings.BOOKING_CONFIRMED_PART4}${pickupLocation.name}${strings.BOOKING_CONFIRMED_PART5}`
                + `${from} ${strings.BOOKING_CONFIRMED_PART6}`
                + `${car.name}${strings.BOOKING_CONFIRMED_PART7}` + '<br><br>'

                + strings.BOOKING_CONFIRMED_PART8 + '<br><br>'

                + `${strings.BOOKING_CONFIRMED_PART9}${car.company.fullName}${strings.BOOKING_CONFIRMED_PART10}${dropOffLocation.name}${strings.BOOKING_CONFIRMED_PART11}`
                + `${to} ${strings.BOOKING_CONFIRMED_PART12}` + '<br><br>'

                + strings.BOOKING_CONFIRMED_PART13 + '<br><br>'

                + strings.BOOKING_CONFIRMED_PART14 + FRONTEND_HOST + '<br><br>'

                + strings.REGARDS + '<br>'
                + '</p>'
        };
        await transporter.sendMail(mailOptions);

        return res.sendStatus(200);
    }
    catch (err) {
        console.error(`[booking.book]  ${strings.ERROR}`, err);
        return res.status(400).send(strings.ERROR + err);
    }
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
        const keyword = escapeStringRegexp((req.body.filter && req.body.filter.keyword) || '');
        const options = 'i';

        const $match = {
            $and: [
                { 'company._id': { $in: companies } },
                { 'status': { $in: statuses } }
            ]
        };
        if (user) $match.$and.push({ 'driver._id': { $eq: mongoose.Types.ObjectId(user) } });
        if (car) $match.$and.push({ 'car._id': { $eq: mongoose.Types.ObjectId(car) } });
        if (from) $match.$and.push({ 'from': { $gte: from } }); // $from > from
        if (to) $match.$and.push({ 'to': { $lte: to } }); // $to < to
        if (pickupLocation) $match.$and.push({ 'pickupLocation': { $eq: mongoose.Types.ObjectId(pickupLocation) } });
        if (dropOffLocation) $match.$and.push({ 'dropOffLocation': { $eq: mongoose.Types.ObjectId(dropOffLocation) } });
        if (keyword) {
            $match.$and.push({
                $or: [
                    { 'company.fullName': { $regex: keyword, $options: options } },
                    { 'driver.fullName': { $regex: keyword, $options: options } },
                    { 'car.name': { $regex: keyword, $options: options } }
                ]
            });
        }

        // for (let i = 0; i < 25; i++) {
        //     const booking = new Booking({
        //         company: '628a5297572a010c6b5d1ac8',
        //         car: '628bcafd07188687127f3c13',
        //         driver: '629f2b7bbf8f826e4973ac8b',
        //         pickupLocation: '628a5459572a010c6b5d1b2d',
        //         dropOffLocation: '628a5459572a010c6b5d1b2d',
        //         from: '2022-06-15T23:00:00.000Z',
        //         to: '2022-06-20T23:00:00.000Z',
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

        // await Booking.deleteMany({ price: 1777 });

        const data = await Booking.aggregate([
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
                $lookup: {
                    from: 'Location',
                    let: { pickupLocationId: '$pickupLocation' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$pickupLocationId'] }
                            }
                        }
                    ],
                    as: 'pickupLocation'
                }
            },
            { $unwind: { path: '$pickupLocation', preserveNullAndEmptyArrays: false } },
            {
                $lookup: {
                    from: 'Location',
                    let: { dropOffLocationId: '$dropOffLocation' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$_id', '$$dropOffLocationId'] }
                            }
                        }
                    ],
                    as: 'dropOffLocation'
                }
            },
            { $unwind: { path: '$dropOffLocation', preserveNullAndEmptyArrays: false } },
            {
                $match
            },
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
            },
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
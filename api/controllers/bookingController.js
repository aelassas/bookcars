
import strings from '../config/app.config.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Token from '../models/Token.js';
import Car from '../models/Car.js';
import Location from '../models/Location.js';
import Notification from '../models/Notification.js';
import NotificationCounter from '../models/NotificationCounter.js';
import PushNotification from '../models/PushNotification.js';
import AdditionalDriver from '../models/AdditionalDriver.js';
import mongoose from 'mongoose';
import escapeStringRegexp from 'escape-string-regexp';
import nodemailer from 'nodemailer';
import { v1 as uuid } from 'uuid';
import { Expo } from 'expo-server-sdk';
import * as Helper from '../common/Helper.js';

const SMTP_HOST = process.env.BC_SMTP_HOST;
const SMTP_PORT = process.env.BC_SMTP_PORT;
const SMTP_USER = process.env.BC_SMTP_USER;
const SMTP_PASS = process.env.BC_SMTP_PASS;
const SMTP_FROM = process.env.BC_SMTP_FROM;
const BACKEND_HOST = process.env.BC_BACKEND_HOST;
const FRONTEND_HOST = process.env.BC_FRONTEND_HOST;
const EXPO_ACCESS_TOKEN = process.env.BC_EXPO_ACCESS_TOKEN;

export const create = async (req, res) => {

    if (req.body.booking.additionalDriver) {
        const additionalDriver = new AdditionalDriver(req.body.additionalDriver);
        await additionalDriver.save();
        req.body.booking._additionalDriver = additionalDriver._id;
    }

    const booking = new Booking(req.body.booking);

    booking.save()
        .then((booking) => res.json(booking))
        .catch(err => {
            console.error(`[booking.create]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

const notifyCompany = async (user, booking, company, notificationMessage) => {

    // notification
    const message = `${user.fullName} ${notificationMessage} ${booking._id}.`;
    const notification = new Notification({ user: company._id, message, booking: booking._id });

    await notification.save();
    let counter = await NotificationCounter.findOne({ user: company._id });
    if (counter) {
        counter.count++;
        await counter.save();
    } else {
        counter = new NotificationCounter({ user: company._id, count: 1 });
        await counter.save();
    }

    // mail
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    strings.setLanguage(company.language);

    const mailOptions = {
        from: SMTP_FROM,
        to: company.email,
        subject: message,
        html: '<p>' + strings.HELLO + company.fullName + ',<br><br>'
            + message + '<br><br>'

            + Helper.joinURL(BACKEND_HOST, `booking?b=${booking._id}`)
            + '<br><br>'

            + strings.REGARDS + '<br>'
            + '</p>'
    };
    await transporter.sendMail(mailOptions);
};

export const book = async (req, res) => {
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

        // additionalDriver
        if (req.body.booking.additionalDriver && req.body.additionalDriver) {
            const additionalDriver = new AdditionalDriver(req.body.additionalDriver);
            await additionalDriver.save();
            req.body.booking._additionalDriver = additionalDriver._id;
        }

        const booking = new Booking(req.body.booking);

        await booking.save();

        const locale = user.language === 'fr' ? 'fr-FR' : 'en-US';
        const options = { weekday: 'long', month: 'long', year: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        const from = booking.from.toLocaleString(locale, options);
        const to = booking.to.toLocaleString(locale, options);
        const car = await Car.findById(booking.car).populate('company');
        const pickupLocation = await Location.findById(booking.pickupLocation).populate('values');
        pickupLocation.name = pickupLocation.values.filter(value => value.language === user.language)[0].value;
        const dropOffLocation = await Location.findById(booking.dropOffLocation).populate('values');
        dropOffLocation.name = dropOffLocation.values.filter(value => value.language === user.language)[0].value;
        console.log('req.body.payLater', req.body.payLater)
        const mailOptions = {
            from: SMTP_FROM,
            to: user.email,
            subject: `${strings.BOOKING_CONFIRMED_SUBJECT_PART1} ${booking._id} ${strings.BOOKING_CONFIRMED_SUBJECT_PART2}`,
            html: '<p>' + strings.HELLO + user.fullName + ',<br><br>'

                + (!req.body.payLater ? (`${strings.BOOKING_CONFIRMED_PART1} ${booking._id} ${strings.BOOKING_CONFIRMED_PART2}` + '<br><br>') : '')

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

        // Notify company
        const company = await User.findById(booking.company);
        strings.setLanguage(company.language);
        await notifyCompany(user, booking, company, strings.BOOKING_NOTIFICATION);

        return res.sendStatus(200);
    }
    catch (err) {
        console.error(`[booking.book]  ${strings.ERROR}`, err);
        return res.status(400).send(strings.ERROR + err);
    }
};

const notifyDriver = async (booking) => {
    const driver = await User.findById(booking.driver);
    strings.setLanguage(driver.language);

    const message = `${strings.BOOKING_UPDATED_NOTIFICATION_PART1} ${booking._id} ${strings.BOOKING_UPDATED_NOTIFICATION_PART2}`;
    const notification = new Notification({ user: driver._id, message, booking: booking._id });
    await notification.save();
    let counter = await NotificationCounter.findOne({ user: driver._id });
    if (counter) {
        counter.count++;
        await counter.save();
    } else {
        counter = new NotificationCounter({ user: driver._id, count: 1 });
        await counter.save();
    }

    // mail
    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });

    const mailOptions = {
        from: SMTP_FROM,
        to: driver.email,
        subject: message,
        html: '<p>' + strings.HELLO + driver.fullName + ',<br><br>'
            + message + '<br><br>'

            + Helper.joinURL(FRONTEND_HOST, `booking?b=${booking._id}`)
            + '<br><br>'

            + strings.REGARDS + '<br>'
            + '</p>'
    };
    await transporter.sendMail(mailOptions);

    // push notification
    const pushNotification = await PushNotification.findOne({ user: driver._id });
    if (pushNotification) {
        const pushToken = pushNotification.token;
        let expo = new Expo({ accessToken: EXPO_ACCESS_TOKEN });

        if (!Expo.isExpoPushToken(pushToken)) {
            console.log(`Push token ${pushToken} is not a valid Expo push token.`);
            return;
        }

        const messages = [{
            to: pushToken,
            sound: 'default',
            body: message,
            data: { user: driver._id, notification: notification._id, booking: booking._id },
        }];

        // The Expo push notification service accepts batches of notifications so
        // that you don't need to send 1000 requests to send 1000 notifications. We
        // recommend you batch your notifications to reduce the number of requests
        // and to compress them (notifications with similar content will get
        // compressed).
        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];
        (async () => {
            // Send the chunks to the Expo push notification service. There are
            // different strategies you could use. A simple one is to send one chunk at a
            // time, which nicely spreads the load out over time:
            for (let chunk of chunks) {
                try {
                    let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    console.log(ticketChunk);
                    tickets.push(...ticketChunk);
                    // NOTE: If a ticket contains an error code in ticket.details.error, you
                    // must handle it appropriately. The error codes are listed in the Expo
                    // documentation:
                    // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                } catch (error) {
                    console.error(error);
                }
            }
        })();

    }
};

export const update = async (req, res) => {
    try {
        const booking = await Booking.findById(req.body.booking._id);

        if (booking) {

            if (!req.body.booking.additionalDriver && booking._additionalDriver) {
                await AdditionalDriver.deleteOne({ _id: booking._additionalDriver });
            }

            if (req.body.additionalDriver) {
                const { fullName, email, phone, birthDate } = req.body.additionalDriver;

                if (booking._additionalDriver) {
                    const additionalDriver = await AdditionalDriver.findOne({ _id: booking._additionalDriver });
                    additionalDriver.fullName = fullName;
                    additionalDriver.email = email;
                    additionalDriver.phone = phone;
                    additionalDriver.birthDate = birthDate;
                    await additionalDriver.save();
                } else {
                    const additionalDriver = new AdditionalDriver({
                        fullName: fullName,
                        email: email,
                        phone: phone,
                        birthDate: birthDate,
                    });

                    await additionalDriver.save();
                    booking._additionalDriver = additionalDriver._id;
                }
            }

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
            } = req.body.booking;

            const previousStatus = booking.status;

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

            if (!additionalDriver && booking._additionalDriver) {
                booking._additionalDriver = null;
            }

            await booking.save();

            if (previousStatus !== status) { // notify driver
                await notifyDriver(booking);
            }

            res.sendStatus(200);
        } else {
            console.error('[booking.update] Booking not found:', req.body._id);
            res.sendStatus(204);
        }
    }
    catch (err) {
        console.error(`[booking.update]  ${strings.DB_ERROR} ${req.body}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

export const updateStatus = async (req, res) => {
    try {
        const { ids: _ids, status } = req.body, ids = _ids.map(id => mongoose.Types.ObjectId(id));
        const bulk = Booking.collection.initializeOrderedBulkOp();
        const bookings = await Booking.find({ _id: { $in: ids } });

        bulk.find({ _id: { $in: ids } }).update({ $set: { status: status } });
        bulk.execute((err, response) => {
            if (err) {
                console.error(`[booking.updateStatus]  ${strings.DB_ERROR} ${req.body}`, err);
                return res.status(400).send(strings.DB_ERROR + err);
            }

            bookings.forEach(async (booking) => {
                if (booking.status !== status) {
                    await notifyDriver(booking);
                }
            });

            return res.sendStatus(200);
        });
    } catch (err) {
        console.error(`[booking.updateStatus]  ${strings.DB_ERROR} ${req.body}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};

export const deleteBookings = async (req, res) => {
    try {
        const ids = req.body.map(id => mongoose.Types.ObjectId(id));

        const bookings = await Booking.find({ _id: { $in: ids }, additionalDriver: true, _additionalDriver: { $ne: null } });

        Booking.deleteMany({ _id: { $in: ids } }, async (err, response) => {
            if (err) {
                console.error(strings.DB_ERROR + err);
                return res.status(400).send(strings.DB_ERROR + err);
            }

            const additionalDivers = bookings.map(booking => mongoose.Types.ObjectId(booking._additionalDriver));
            await AdditionalDriver.deleteMany({ _id: { $in: additionalDivers } });

            return res.sendStatus(200);
        });

    } catch (err) {
        console.error(`[booking.delete]  ${strings.DB_ERROR} ${req.body}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};

export const getBooking = (req, res) => {
    Booking.findById(req.params.id)
        .populate('company')
        .populate({
            path: 'car',
            populate: {
                path: 'company',
                model: 'User'
            }
        })
        .populate('driver')
        .populate({
            path: 'pickupLocation',
            populate: {
                path: 'values',
                model: 'LocationValue',
            }
        })
        .populate({
            path: 'dropOffLocation',
            populate: {
                path: 'values',
                model: 'LocationValue',
            }
        })
        .populate('_additionalDriver')
        .lean()
        .then(booking => {
            if (booking) {
                const language = req.params.language;

                if (booking.company) {
                    const { _id, fullName, avatar, payLater } = booking.company;
                    booking.company = { _id, fullName, avatar, payLater };
                }
                if (booking.car.company) {
                    const { _id, fullName, avatar, payLater } = booking.car.company;
                    booking.car.company = { _id, fullName, avatar, payLater };
                }

                booking.pickupLocation.name = booking.pickupLocation.values.filter(value => value.language === language)[0].value;
                booking.dropOffLocation.name = booking.dropOffLocation.values.filter(value => value.language === language)[0].value;

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
};

export const getBookings = async (req, res) => {
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
        let keyword = (req.body.filter && req.body.filter.keyword) || '';
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
        if (pickupLocation) $match.$and.push({ 'pickupLocation._id': { $eq: mongoose.Types.ObjectId(pickupLocation) } });
        if (dropOffLocation) $match.$and.push({ 'dropOffLocation._id': { $eq: mongoose.Types.ObjectId(dropOffLocation) } });
        if (keyword) {
            const isObjectId = mongoose.isValidObjectId(keyword);
            if (isObjectId) {
                $match.$and.push({ '_id': { $eq: mongoose.Types.ObjectId(keyword) } });
            } else {
                keyword = escapeStringRegexp(keyword);
                $match.$and.push({
                    $or: [
                        { 'company.fullName': { $regex: keyword, $options: options } },
                        { 'driver.fullName': { $regex: keyword, $options: options } },
                        { 'car.name': { $regex: keyword, $options: options } }
                    ]
                });
            }
        }

        const language = req.params.language;

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
                        },
                        {
                            $lookup: {
                                from: 'LocationValue',
                                let: { values: '$values' },
                                pipeline: [
                                    {
                                        $match: {
                                            $and: [
                                                { $expr: { $in: ['$_id', '$$values'] } },
                                                { $expr: { $eq: ['$language', language] } }
                                            ]
                                        }
                                    }
                                ],
                                as: 'value'
                            }
                        },
                        {
                            $addFields: { name: '$value.value' }
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
                        },
                        {
                            $lookup: {
                                from: 'LocationValue',
                                let: { values: '$values' },
                                pipeline: [
                                    {
                                        $match: {
                                            $and: [
                                                { $expr: { $in: ['$_id', '$$values'] } },
                                                { $expr: { $eq: ['$language', language] } }
                                            ]
                                        }
                                    }
                                ],
                                as: 'value'
                            }
                        },
                        {
                            $addFields: { name: '$value.value' }
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
};

export const hasBookings = (req, res) => {
    Booking.find({ driver: mongoose.Types.ObjectId(req.params.driver) })
        .limit(1)
        .count()
        .then(count => {
            if (count === 1) {
                return res.sendStatus(200);
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[booking.hasBookings] ${strings.DB_ERROR} ${req.params.driver}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const bookingsMinDate = (req, res) => {
    Booking.findOne({ driver: mongoose.Types.ObjectId(req.params.driver) }, { from: 1 })
        .sort({ from: 1 })
        .then(booking => {
            if (booking) {
                return res.json((new Date(booking.from).getTime()));
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[booking.bookingsMinDate] ${strings.DB_ERROR} ${req.params.driver}`, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const bookingsMaxDate = (req, res) => {
    Booking.findOne({ driver: mongoose.Types.ObjectId(req.params.driver) }, { to: 1 })
        .sort({ to: -1 })
        .then(booking => {
            if (booking) {
                return res.json((new Date(booking.to).getTime()));
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[booking.bookingsMaxDate] ${strings.DB_ERROR} ${req.params.driver}`, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

export const cancelBooking = (req, res) => {
    Booking.findOne({ _id: mongoose.Types.ObjectId(req.params.id) })
        .populate('company')
        .populate('driver')
        .then(async booking => {
            if (booking && booking.cancellation && !booking.cancelRequest) {

                booking.cancelRequest = true;
                await booking.save();

                // Notify company
                await notifyCompany(booking.driver, booking, booking.company, strings.CANCEL_BOOKING_NOTIFICATION);

                return res.sendStatus(200);
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[booking.cancelBooking] ${strings.DB_ERROR} ${req.params.id}`, err);
            return res.status(400).send(strings.DB_ERROR + err);
        });
};

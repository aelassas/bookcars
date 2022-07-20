import strings from '../config/app.config.js';
import Env from '../config/env.config.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import AdditionalDriver from '../models/AdditionalDriver.js';
import Booking from '../models/Booking.js';
import Car from '../models/Car.js';
import escapeStringRegexp from 'escape-string-regexp';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

const CDN = process.env.BC_CDN_USERS;
const CDN_CARS = process.env.BC_CDN_CARS;

export const validate = (req, res) => {
    const keyword = escapeStringRegexp(req.body.fullName);
    const options = 'i';
    User.findOne({ type: Env.USER_TYPE.COMPANY, fullName: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(user => user ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error('[company.validateEmail] ' + strings.DB_ERROR + ' ' + req.body.fullName, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const update = (req, res) => {
    User.findById(req.body._id)
        .then(company => {
            if (company) {
                const { fullName, phone, location, bio, payLater } = req.body;
                company.fullName = fullName;
                company.phone = phone;
                company.location = location;
                company.bio = bio;
                company.payLater = payLater;

                company.save()
                    .then(() => res.sendStatus(200))
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[company.update] Location not found:', req.body);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const deleteCompany = async (req, res) => {
    const id = req.params.id;

    try {
        const company = await User.findByIdAndDelete(id);
        if (company) {
            if (company.avatar) {
                const avatar = path.join(CDN, company.avatar);
                if (fs.existsSync(avatar)) {
                    fs.unlinkSync(avatar);
                }
                await Notification.deleteMany({ user: id });
                const _additionalDrivers = await Booking.find({ company: id, _additionalDriver: { $ne: null } }, { _additionalDriver: 1 });
                const additionalDrivers = _additionalDrivers.map(b => new mongoose.Types.ObjectId(b._additionalDriver));
                await AdditionalDriver.deleteMany({ _id: { $in: additionalDrivers } });
                await Booking.deleteMany({ company: id });
                const cars = await Car.find({ company: id });
                await Car.deleteMany({ company: id });
                cars.forEach(car => {
                    const image = path.join(CDN_CARS, car.image);
                    if (fs.existsSync(image)) {
                        fs.unlinkSync(image);
                    }
                });
            }
        } else {
            return res.sendStatus(404);
        }
        return res.sendStatus(200);
    } catch (err) {
        console.error(`[company.delete]  ${strings.DB_ERROR} ${id}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
};

export const getCompany = (req, res) => {
    User.findById(req.params.id)
        .lean()
        .then(user => {
            if (!user) {
                console.error('[company.getCompany] Company not found:', req.params);
                res.sendStatus(204);
            } else {
                const { _id, email, fullName, avatar, phone, location, bio, payLater } = user;
                res.json({ _id, email, fullName, avatar, phone, location, bio, payLater });
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
};

export const getCompanies = async (req, res) => {
    try {
        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';

        const data = await User.aggregate([
            { $match: { type: Env.USER_TYPE.COMPANY, fullName: { $regex: keyword, $options: options } } },
            {
                $facet: {
                    resultData: [
                        { $sort: { fullName: 1 } },
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

        if (data.length > 0) {
            data[0].resultData = data[0].resultData.map(company => {
                const { _id, fullName, avatar } = company;
                return { _id, fullName, avatar };
            });
        }

        res.json(data);
    } catch (err) {
        console.error(`[company.getCompanies] ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

export const getAllCompanies = async (req, res) => {
    try {
        let data = await User.aggregate([
            { $match: { type: Env.USER_TYPE.COMPANY } },
            { $sort: { fullName: 1 } }
        ], { collation: { locale: Env.DEFAULT_LANGUAGE, strength: 2 } });

        if (data.length > 0) {
            data = data.map(company => {
                const { _id, fullName, avatar } = company;
                return { _id, fullName, avatar };
            });
        }

        res.json(data);
    } catch (err) {
        console.error(`[company.getAllCompanies] ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }
};

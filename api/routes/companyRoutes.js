import express from 'express';
import routeNames from '../config/companyRoutes.config.js';
import authJwt from '../middlewares/authJwt.js';
import strings from '../config/app.config.js';
import Env from '../config/env.config.js';
import User from '../schema/User.js';
import escapeStringRegexp from 'escape-string-regexp';
import path from 'path';
import fs from 'fs';

const CDN = process.env.BC_CDN_USERS;

const routes = express.Router();

// Company validation Router
routes.route(routeNames.validate).post(authJwt.verifyToken, (req, res) => {
    const keyword = escapeStringRegexp(req.body.fullName);
    const options = 'i';
    User.findOne({ type: Env.USER_TYPE.COMPANY, fullName: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(user => user ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error('[company.validateEmail] ' + strings.DB_ERROR + ' ' + req.body.fullName, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Update Company Router
routes.route(routeNames.update).put(authJwt.verifyToken, (req, res) => {
    User.findById(req.body._id)
        .then(company => {
            if (company) {
                const { fullName, phone, location, bio } = req.body;
                company.fullName = fullName;
                company.phone = phone;
                company.location = location;
                company.bio = bio;

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
});

// Delete Company Router
routes.route(routeNames.delete).delete(authJwt.verifyToken, async (req, res) => {
    const id = req.params.id;

    try {
        const company = await User.findByIdAndDelete(id);
        if (company) {
            if (company.avatar) {
                const avatar = path.join(CDN, company.avatar);
                if (fs.existsSync(avatar)) {
                    fs.unlinkSync(avatar);
                }
            }
        } else {
            return res.sendStatus(404);
        }
        return res.sendStatus(200);
    } catch (err) {
        console.error(`[company.delete]  ${strings.DB_ERROR} ${id}`, err);
        return res.status(400).send(strings.DB_ERROR + err);
    }
});

// Get Company Router
routes.route(routeNames.getCompany).get(authJwt.verifyToken, (req, res) => {
    User.findById(req.params.id)
        .lean()
        .then(user => {
            if (!user) {
                console.error('[company.getCompany] Company not found:', req.params);
                res.sendStatus(204);
            } else {
                const { _id, email, fullName, avatar, phone, location, bio } = user;
                res.json({ _id, email, fullName, avatar, phone, location, bio });
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Get Companies Router
routes.route(routeNames.getCompanies).get(authJwt.verifyToken, async (req, res) => {
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
});

// Get All Companies Router
// routes.route(routeNames.getAllCompanies).get(authJwt.verifyToken, async (req, res) => {
routes.route(routeNames.getAllCompanies).get(async (req, res) => {
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
});

export default routes;

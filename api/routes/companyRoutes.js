import express from 'express';
import routeNames from '../config/companyRoutes.config.js';
import authJwt from '../middlewares/authJwt.js';
import strings from '../config/app.config.js';
import Env from '../config/env.config.js';
import User from '../schema/User.js';
import escapeStringRegexp from 'escape-string-regexp';

const routes = express.Router();

// Company validation Router
routes.route(routeNames.validate).post(authJwt.verifyToken, (req, res) => {
    const keyword = escapeStringRegexp(req.body.fullName);
    const options = 'i';
    User.findOne({ fullName: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(user => user && user.type === Env.USER_TYPE.COMPANY ? res.sendStatus(204) : res.sendStatus(200))
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
                    .then(_ => res.sendStatus(200))
                    .catch(err => {
                        console.error(strings.DB_ERROR, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.err('[company.update] Location not found:', req.body);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Delete Company Router
routes.route(routeNames.delete).delete(authJwt.verifyToken, (req, res) => {
    const id = req.params.id;
    res.sendStatus(200);
});

// Get Company Router
routes.route(routeNames.getCompany).get(authJwt.verifyToken, (req, res) => {
    User.findById(req.params.id)
        .then(user => {
            if (!user) {
                console.error('[company.getCompany] Company not found:', req.params);
                res.sendStatus(204);
            } else {
                res.json(user);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Get Companies Router
routes.route(routeNames.getCompanies).get(authJwt.verifyToken, (req, res) => {
    const keyword = escapeStringRegexp(req.query.s || '');
    const options = 'i';
    User.find({ type: Env.USER_TYPE.COMPANY, fullName: { $regex: keyword, $options: options } })
        .then(companies => res.json(companies))
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});


export default routes;

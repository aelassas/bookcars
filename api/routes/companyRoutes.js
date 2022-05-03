import express from 'express';
import routeNames from '../config/companyRoutes.config.js';
import strings from '../config/app.config.js';
import Env from '../config/env.config.js';
import User from '../schema/User.js';
import escapeStringRegexp from 'escape-string-regexp';

const routes = express.Router();

// Company validation Router
routes.route(routeNames.validate).post((req, res) => {
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
routes.route(routeNames.update).post((req, res) => {
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
                console.err('[company.update] Conference not found:', req.params);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(strings.DB_ERROR, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

// Delete Company Router
routes.route(routeNames.delete).delete((req, res) => {
    const id = req.params.id;
    res.sendStatus(200);
});

// Get Company Router
routes.route(routeNames.getCompany).get((req, res) => {
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
routes.route(routeNames.getCompanies).get((req, res) => {
    const getCompanies = (keyword, page, size) => {
        const companies = [];
        for (let _id = (page - 1) * size; _id < page * size; _id++) {
            const fullName = `Company ${_id}`;
            if (!keyword || keyword === '' || fullName.includes(keyword)) {
                companies.push({ _id, fullName });
            }
        }
        return companies;
    };
    const companies = getCompanies(req.query.s, req.params.page, req.params.size);
    res.json(companies);
});


export default routes;

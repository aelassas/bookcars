import express from 'express';
import Env from '../config/env.config.js';
import routeNames from '../config/locationRoutes.config.js';
import strings from '../config/app.config.js';
import authJwt from '../middlewares/authJwt.js';
import Location from '../schema/Location.js';
import Car from '../schema/Car.js';
import escapeStringRegexp from 'escape-string-regexp';
import mongoose from 'mongoose';

const routes = express.Router();

routes.route(routeNames.validate).post(authJwt.verifyToken, (req, res) => {
    const keyword = escapeStringRegexp(req.body.name);
    const options = 'i';

    Location.findOne({ name: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(location => location ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error(`[location.validate]  ${strings.DB_ERROR} ${req.body.name}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.create).post(authJwt.verifyToken, (req, res) => {
    const location = new Location(req.body);

    location.save()
        .then(() => res.sendStatus(200))
        .catch(err => {
            console.error(`[location.create]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.update).put(authJwt.verifyToken, (req, res) => {
    Location.findById(req.body._id)
        .then(location => {
            if (location) {
                const { name } = req.body;
                location.name = name;

                location.save()
                    .then(() => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[location.update]  ${strings.DB_ERROR} ${req.body}`, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.error('[location.update] Location not found:', req.body);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[location.update]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.delete).delete(authJwt.verifyToken, (req, res) => {
    const id = req.params.id;

    Location.deleteOne({ _id: id }, (err, response) => {
        if (err) {
            console.error(`[location.delete]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        } else {
            res.sendStatus(200);
        }
    });
});

routes.route(routeNames.getLocation).get(authJwt.verifyToken, (req, res) => {
    Location.findById(req.params.id)
        .lean()
        .then(location => {
            if (location) {
                res.json(location);
            } else {
                console.error('[location.getLocation] Location not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[location.getLocation]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getLocations).get(authJwt.verifyToken, async (req, res) => {
    try {
        // for (let i = 1; i < 60; i++) {
        //     const name = `Location ${i}`;
        //     await new Location({ name }).save();
        // }

        // await Location.deleteMany({ name: { $regex: 'location', $options: 'i' } });

        const page = parseInt(req.params.page);
        const size = parseInt(req.params.size);
        const keyword = escapeStringRegexp(req.query.s || '');
        const options = 'i';

        const locations = await Location.aggregate([
            { $match: { name: { $regex: keyword, $options: options } } },
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

        res.json(locations);
    } catch (err) {
        console.error(`[location.getLocations]  ${strings.DB_ERROR} ${req.query.s}`, err);
        res.status(400).send(strings.DB_ERROR + err);
    }

});


routes.route(routeNames.checkLocation).get(authJwt.verifyToken, (req, res) => {
    const id = mongoose.Types.ObjectId(req.params.id);

    Car.find({ locations: id })
        .limit(1)
        .count()
        .then(count => {
            if (count === 1) {
                return res.sendStatus(200);
            }
            return res.sendStatus(204);
        })
        .catch(err => {
            console.error(`[location.checkLocation]  ${strings.DB_ERROR} ${id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

export default routes;
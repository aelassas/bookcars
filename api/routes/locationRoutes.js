import express from 'express';
import routeNames from '../config/locationRoutes.config.js';
import strings from '../config/app.config.js';
import authJwt from '../middlewares/authJwt.js';
import Location from '../schema/Location.js';
import escapeStringRegexp from 'escape-string-regexp';

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
        .then(_ => res.sendStatus(200))
        .catch(err => {
            console.error(`[location.create]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        })
});

routes.route(routeNames.update).put(authJwt.verifyToken, (req, res) => {
    Location.findById(req.body._id)
        .then(location => {
            if (location) {
                const { name } = req.body;
                location.name = name;

                location.save()
                    .then(_ => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[location.update]  ${strings.DB_ERROR} ${req.body}`, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.err('[location.update] Location not found:', req.body);
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
    res.sendStatus(200);
});

routes.route(routeNames.getLocation).get(authJwt.verifyToken, (req, res) => {
    Location.findById(req.params.id)
        .then(location => {
            if (location) {
                res.json(location);
            } else {
                console.err('[location.getLocation] Location not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[location.getLocation]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getLocations).get(authJwt.verifyToken, (req, res) => {
    const getLocations = (keyword, page, size) => {
        const locations = [];
        for (let _id = (page - 1) * size; _id < page * size; _id++) {
            const name = `Location ${_id}`;
            if (!keyword || keyword === '' || name.includes(keyword)) {
                locations.push({ _id, name });
            }
        }
        return locations;
    };
    const locations = getLocations(req.query.s, req.params.page, req.params.size);
    res.json(locations);
});


export default routes;
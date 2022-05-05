import express from 'express';
import routeNames from '../config/extraRoutes.config.js';
import strings from '../config/app.config.js';
import authJwt from '../middlewares/authJwt.js';
import Extra from '../schema/Extra.js';
import escapeStringRegexp from 'escape-string-regexp';

const routes = express.Router();

routes.route(routeNames.validate).post(authJwt.verifyToken, (req, res) => {
    const keyword = escapeStringRegexp(req.body.name);
    const options = 'i';

    Extra.findOne({ name: { $regex: new RegExp(`^${keyword}$`), $options: options } })
        .then(extra => extra ? res.sendStatus(204) : res.sendStatus(200))
        .catch(err => {
            console.error(`[extra.validate]  ${strings.DB_ERROR} ${req.body.name}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.create).post(authJwt.verifyToken, (req, res) => {
    const extra = new Extra(req.body);

    extra.save()
        .then(_ => res.sendStatus(200))
        .catch(err => {
            console.error(`[extra.create]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        })
});

routes.route(routeNames.update).put(authJwt.verifyToken, (req, res) => {
    Extra.findById(req.body._id)
        .then(extra => {
            if (extra) {
                const { name } = req.body;
                extra.name = name;

                extra.save()
                    .then(_ => res.sendStatus(200))
                    .catch(err => {
                        console.error(`[extra.update]  ${strings.DB_ERROR} ${req.body}`, err);
                        res.status(400).send(strings.DB_ERROR + err);
                    });
            } else {
                console.err('[extra.update] Extra not found:', req.body);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[extra.update]  ${strings.DB_ERROR} ${req.body}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.delete).delete(authJwt.verifyToken, (req, res) => {
    const id = req.params.id;
    res.sendStatus(200);
});

routes.route(routeNames.getExtra).get(authJwt.verifyToken, (req, res) => {
    Extra.findById(req.params.id)
        .then(extra => {
            if (extra) {
                res.json(extra);
            } else {
                console.err('[extra.getExtra] Extra not found:', req.params.id);
                res.sendStatus(204);
            }
        })
        .catch(err => {
            console.error(`[extra.getExtra]  ${strings.DB_ERROR} ${req.params.id}`, err);
            res.status(400).send(strings.DB_ERROR + err);
        });
});

routes.route(routeNames.getExtras).get(authJwt.verifyToken, (req, res) => {
    const getExtras = (keyword, page, size) => {
        const extras = [];
        for (let _id = (page - 1) * size; _id < page * size; _id++) {
            const name = `Extra ${_id}`;
            if (!keyword || keyword === '' || name.includes(keyword)) {
                extras.push({ _id, name });
            }
        }
        return extras;
    };
    const extras = getExtras(req.query.s, req.params.page, req.params.size);
    res.json(extras);
});


export default routes;
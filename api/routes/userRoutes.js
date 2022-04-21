import express from 'express';
import routeNames from '../config/userRoutes.config.js';

const routes = express.Router();

routes.route(routeNames.hello).get((req, res) =>{
    res.status(200).send('hello!');
});

export default routes;
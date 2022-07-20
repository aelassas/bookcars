import express from 'express';
import routeNames from '../config/bookingRoutes.config.js';
import authJwt from '../middlewares/authJwt.js';
import * as bookingController from '../controllers/bookingController.js';

const routes = express.Router();

routes.route(routeNames.create).post(authJwt.verifyToken, bookingController.create);
routes.route(routeNames.book).post(bookingController.book);
routes.route(routeNames.update).put(authJwt.verifyToken, bookingController.update);
routes.route(routeNames.updateStatus).post(authJwt.verifyToken, bookingController.updateStatus);
routes.route(routeNames.delete).post(authJwt.verifyToken, bookingController.deleteBookings);
routes.route(routeNames.getBooking).get(authJwt.verifyToken, bookingController.getBooking);
routes.route(routeNames.getBookings).post(authJwt.verifyToken, bookingController.getBookings);
routes.route(routeNames.hasBookings).get(authJwt.verifyToken, bookingController.hasBookings);
routes.route(routeNames.bookingsMinDate).get(authJwt.verifyToken, bookingController.bookingsMinDate);
routes.route(routeNames.bookingsMaxDate).get(authJwt.verifyToken, bookingController.bookingsMaxDate);
routes.route(routeNames.cancelBooking).post(authJwt.verifyToken, bookingController.cancelBooking);

export default routes;
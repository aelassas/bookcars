import express from 'express'
import multer from 'multer'
import routeNames from '../config/carRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as carController from '../controllers/carController'

const routes = express.Router()

routes.route(routeNames.create).post(authJwt.verifyToken, carController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, carController.update)
routes.route(routeNames.checkCar).get(authJwt.verifyToken, carController.checkCar)
routes.route(routeNames.validateLicensePlate).get(authJwt.verifyToken, carController.validateLicensePlate)
routes.route(routeNames.delete).delete(authJwt.verifyToken, carController.deleteCar)
routes.route(routeNames.createImage).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], carController.createImage)
routes.route(routeNames.updateImage).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], carController.updateImage)
routes.route(routeNames.deleteImage).post(authJwt.verifyToken, carController.deleteImage)
routes.route(routeNames.deleteTempImage).post(authJwt.verifyToken, carController.deleteTempImage)
routes.route(routeNames.getCar).get(carController.getCar)
routes.route(routeNames.getCars).post(authJwt.verifyToken, carController.getCars)
routes.route(routeNames.getBookingCars).post(authJwt.verifyToken, carController.getBookingCars)
routes.route(routeNames.getFrontendCars).post(carController.getFrontendCars)

export default routes

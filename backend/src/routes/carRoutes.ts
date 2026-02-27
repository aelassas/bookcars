import express from 'express'
import multer from 'multer'
import routeNames from '../config/carRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as carController from '../controllers/carController'

const routes = express.Router()

routes.route(routeNames.create).post(authJwt.verifyToken, authJwt.authSupplier, carController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, authJwt.authSupplier, carController.update)
routes.route(routeNames.checkCar).get(authJwt.verifyToken, authJwt.authSupplier, carController.checkCar)
routes.route(routeNames.validateLicensePlate).get(authJwt.verifyToken, authJwt.authSupplier, carController.validateLicensePlate)
routes.route(routeNames.validateCarLicensePlate).get(authJwt.verifyToken, authJwt.authSupplier, carController.validateCarLicensePlate)
routes.route(routeNames.delete).delete(authJwt.verifyToken, authJwt.authSupplier, carController.deleteCar)
routes.route(routeNames.createImage).post([authJwt.verifyToken, authJwt.authSupplier, multer({ storage: multer.memoryStorage() }).single('image')], carController.createImage)
routes.route(routeNames.updateImage).post([authJwt.verifyToken, authJwt.authSupplier, multer({ storage: multer.memoryStorage() }).single('image')], carController.updateImage)
routes.route(routeNames.deleteImage).post(authJwt.verifyToken, authJwt.authSupplier, carController.deleteImage)
routes.route(routeNames.deleteTempImage).post(authJwt.verifyToken, authJwt.authSupplier, carController.deleteTempImage)
routes.route(routeNames.getCar).get(carController.getCar)
routes.route(routeNames.getCars).post(authJwt.verifyToken, authJwt.authSupplier, carController.getCars)
routes.route(routeNames.getBookingCars).post(authJwt.verifyToken, authJwt.authSupplier, carController.getBookingCars)
routes.route(routeNames.getFrontendCars).post(carController.getFrontendCars)

export default routes

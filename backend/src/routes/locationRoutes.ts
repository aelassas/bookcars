import express from 'express'
import multer from 'multer'
import routeNames from '../config/locationRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as locationController from '../controllers/locationController'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, authJwt.authSupplier, locationController.validate)
routes.route(routeNames.create).post(authJwt.verifyToken, authJwt.authSupplier, locationController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, authJwt.authSupplier, locationController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, authJwt.authSupplier, locationController.deleteLocation)
routes.route(routeNames.getLocation).get(locationController.getLocation)
routes.route(routeNames.getLocations).get(locationController.getLocations)
routes.route(routeNames.getLocationsWithPosition).get(locationController.getLocationsWithPosition)
routes.route(routeNames.checkLocation).get(authJwt.verifyToken, authJwt.authSupplier, locationController.checkLocation)
routes.route(routeNames.getLocationId).get(locationController.getLocationId)
routes.route(routeNames.createImage).post([authJwt.verifyToken, authJwt.authSupplier, multer({ storage: multer.memoryStorage() }).single('image')], locationController.createImage)
routes.route(routeNames.updateImage).post([authJwt.verifyToken, authJwt.authSupplier, multer({ storage: multer.memoryStorage() }).single('image')], locationController.updateImage)
routes.route(routeNames.deleteImage).post(authJwt.verifyToken, authJwt.authSupplier, locationController.deleteImage)
routes.route(routeNames.deleteTempImage).post(authJwt.verifyToken, authJwt.authSupplier, locationController.deleteTempImage)

export default routes

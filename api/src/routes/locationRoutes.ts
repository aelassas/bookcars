import express from 'express'
import routeNames from '../config/locationRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as locationController from '../controllers/locationController'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, locationController.validate)
routes.route(routeNames.create).post(authJwt.verifyToken, locationController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, locationController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, locationController.deleteLocation)
routes.route(routeNames.getLocation).get(locationController.getLocation)
routes.route(routeNames.getLocations).get(locationController.getLocations)
routes.route(routeNames.checkLocation).get(authJwt.verifyToken, locationController.checkLocation)

export default routes

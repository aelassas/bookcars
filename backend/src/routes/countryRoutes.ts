import express from 'express'
import routeNames from '../config/countryRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as countryController from '../controllers/countryController'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, authJwt.authSupplier, countryController.validate)
routes.route(routeNames.create).post(authJwt.verifyToken, authJwt.authSupplier, countryController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, authJwt.authSupplier, countryController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, authJwt.authSupplier, countryController.deleteCountry)
routes.route(routeNames.getCountry).get(authJwt.verifyToken, authJwt.authSupplier, countryController.getCountry)
routes.route(routeNames.getCountries).get(authJwt.verifyToken, authJwt.authSupplier, countryController.getCountries)
routes.route(routeNames.getCountriesWithLocations).get(countryController.getCountriesWithLocations)
routes.route(routeNames.checkCountry).get(authJwt.verifyToken, authJwt.authSupplier, countryController.checkCountry)
routes.route(routeNames.getCountryId).get(authJwt.verifyToken, authJwt.authSupplier, countryController.getCountryId)

export default routes

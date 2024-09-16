import express from 'express'
import routeNames from '../config/countryRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as countryController from '../controllers/countryController'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, countryController.validate)
routes.route(routeNames.create).post(authJwt.verifyToken, countryController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, countryController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, countryController.deleteCountry)
routes.route(routeNames.getCountry).get(authJwt.verifyToken, countryController.getCountry)
routes.route(routeNames.getCountries).get(authJwt.verifyToken, countryController.getCountries)
routes.route(routeNames.getCountriesWithLocations).get(countryController.getCountriesWithLocations)
routes.route(routeNames.checkCountry).get(authJwt.verifyToken, countryController.checkCountry)
routes.route(routeNames.getCountryId).get(authJwt.verifyToken, countryController.getCountryId)

export default routes

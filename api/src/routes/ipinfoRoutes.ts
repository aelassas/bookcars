import express from 'express'
import routeNames from '../config/ipinfoRoutes.config'
import * as ipinfoController from '../controllers/ipinfoController'

const routes = express.Router()

routes.route(routeNames.getCountryCode).get(ipinfoController.getCountryCode)

export default routes

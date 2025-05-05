import express from 'express'
import routeNames from '../config/paypalRoutes.config'
import * as paypalController from '../controllers/paypalController'

const routes = express.Router()

routes.route(routeNames.createPayPalOrder).post(paypalController.createPayPalOrder)
routes.route(routeNames.checkPayPalOrder).post(paypalController.checkPayPalOrder)

export default routes

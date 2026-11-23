import express from 'express'
import routeNames from '../config/paypalRoutes.config'
import * as paypalController from '../controllers/paypalController'
import authJwt from '../middlewares/authJwt'

const routes = express.Router()

routes.route(routeNames.createPayPalOrder).post(authJwt.verifyTokenOptional, paypalController.createPayPalOrder)
routes.route(routeNames.checkPayPalOrder).post(authJwt.verifyTokenOptional, paypalController.checkPayPalOrder)

export default routes

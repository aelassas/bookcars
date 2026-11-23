import express from 'express'
import routeNames from '../config/stripeRoutes.config'
import * as stripeController from '../controllers/stripeController'
import authJwt from '../middlewares/authJwt'

const routes = express.Router()

routes.route(routeNames.createCheckoutSession).post(authJwt.verifyTokenOptional, stripeController.createCheckoutSession)
routes.route(routeNames.checkCheckoutSession).post(authJwt.verifyTokenOptional, stripeController.checkCheckoutSession)
routes.route(routeNames.createPaymentIntent).post(authJwt.verifyTokenOptional, stripeController.createPaymentIntent)

export default routes

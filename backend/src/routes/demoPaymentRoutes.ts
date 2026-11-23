import express from 'express'
import rateLimiter from '../middlewares/rateLimiter'
import authJwt from '../middlewares/authJwt'
import routeNames from '../config/demoPaymentRoutes.config'
import * as demoPaymentController from '../controllers/demoPaymentController'

const routes = express.Router()

routes.route(routeNames.simulate).post(rateLimiter, authJwt.verifyToken, demoPaymentController.simulate)
routes.post('/api/payments/demo-confirm', rateLimiter, authJwt.verifyToken, demoPaymentController.confirm)

export default routes

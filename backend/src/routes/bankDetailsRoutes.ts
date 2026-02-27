import express from 'express'
import authJwt from '../middlewares/authJwt'
import routeNames from '../config/bankDetailsRoutes.config'
import * as bankDetailsController from '../controllers/bankDetailsController'

const routes = express.Router()

routes.route(routeNames.upsert).post(authJwt.verifyToken, authJwt.authAdmin, bankDetailsController.upsert)
routes.route(routeNames.get).get(authJwt.verifyToken, authJwt.authSupplier, bankDetailsController.get)

export default routes

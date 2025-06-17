import express from 'express'
import authJwt from '../middlewares/authJwt'
import routeNames from '../config/bankDetailsRoutes.config'
import * as bankDetailsController from '../controllers/bankDetailsController'

const routes = express.Router()

routes.route(routeNames.upsert).post(authJwt.verifyToken, bankDetailsController.upsert)
routes.route(routeNames.get).get(authJwt.verifyToken, bankDetailsController.get)

export default routes

import express from 'express'
import routeNames from '../config/supplierRoutes.config.js'
import authJwt from '../middlewares/authJwt.js'
import * as supplierController from '../controllers/supplierController.js'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, supplierController.validate)
routes.route(routeNames.update).put(authJwt.verifyToken, supplierController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, supplierController.deleteCompany)
routes.route(routeNames.getCompany).get(authJwt.verifyToken, supplierController.getCompany)
routes.route(routeNames.getCompanies).get(authJwt.verifyToken, supplierController.getCompanies)
routes.route(routeNames.getAllCompanies).get(supplierController.getAllCompanies)

export default routes

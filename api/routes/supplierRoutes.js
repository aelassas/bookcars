import express from 'express'
import routeNames from '../config/supplierRoutes.config.js'
import authJwt from '../middlewares/authJwt.js'
import * as supplierController from '../controllers/supplierController.js'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, supplierController.validate)
routes.route(routeNames.update).put(authJwt.verifyToken, supplierController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, supplierController.deleteSupplier)
routes.route(routeNames.getSupplier).get(authJwt.verifyToken, supplierController.getSupplier)
routes.route(routeNames.getSuppliers).get(authJwt.verifyToken, supplierController.getSuppliers)
routes.route(routeNames.getAllSuppliers).get(supplierController.getAllSuppliers)

export default routes

import express from 'express'
import routeNames from '../config/supplierRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as supplierController from '../controllers/supplierController'

const routes = express.Router()

routes.route(routeNames.validate).post(authJwt.verifyToken, supplierController.validate)
routes.route(routeNames.update).put(authJwt.verifyToken, supplierController.update)
routes.route(routeNames.delete).delete(authJwt.verifyToken, supplierController.deleteSupplier)
routes.route(routeNames.getSupplier).get(authJwt.verifyToken, supplierController.getSupplier)
routes.route(routeNames.getSuppliers).get(authJwt.verifyToken, supplierController.getSuppliers)
routes.route(routeNames.getAllSuppliers).get(supplierController.getAllSuppliers)
routes.route(routeNames.getFrontendSuppliers).post(supplierController.getFrontendSuppliers)
routes.route(routeNames.getBackendSuppliers).post(authJwt.verifyToken, supplierController.getBackendSuppliers)

export default routes

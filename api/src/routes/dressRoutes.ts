import express from 'express'
import multer from 'multer'
import routeNames from '../config/dressRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as dressController from '../controllers/dressController'

const routes = express.Router()

routes.route(routeNames.create).post(authJwt.verifyToken, dressController.create)
routes.route(routeNames.update).put(authJwt.verifyToken, dressController.update)
routes.route(routeNames.checkDress).get(authJwt.verifyToken, dressController.checkDress)
routes.route(routeNames.delete).delete(authJwt.verifyToken, dressController.deleteDress)
routes.route(routeNames.createImage).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], dressController.createImage)
routes.route(routeNames.updateImage).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], dressController.updateImage)
routes.route(routeNames.deleteImage).post(authJwt.verifyToken, dressController.deleteImage)
routes.route(routeNames.deleteTempImage).post(authJwt.verifyToken, dressController.deleteTempImage)
routes.route(routeNames.getDress).get(dressController.getDress)
routes.route(routeNames.getDresses).post(authJwt.verifyToken, dressController.getDresses)
routes.route(routeNames.getBookingDresses).post(authJwt.verifyToken, dressController.getBookingDresses)
routes.route(routeNames.getFrontendDresses).post(dressController.getFrontendDresses)

export default routes

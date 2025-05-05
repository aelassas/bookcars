import express from 'express'
import routeNames from '../config/notificationRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as notificationController from '../controllers/notificationController'

const routes = express.Router()

routes.route(routeNames.notificationCounter).get(authJwt.verifyToken, notificationController.notificationCounter)
routes.route(routeNames.getNotifications).get(authJwt.verifyToken, notificationController.getNotifications)
routes.route(routeNames.markAsRead).post(authJwt.verifyToken, notificationController.markAsRead)
routes.route(routeNames.markAsUnRead).post(authJwt.verifyToken, notificationController.markAsUnRead)
routes.route(routeNames.delete).post(authJwt.verifyToken, notificationController.deleteNotifications)

export default routes

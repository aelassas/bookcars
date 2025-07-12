import express from 'express'
import routeNames from '../config/settingRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as settingController from '../controllers/settingController'

const routes = express.Router()

routes.route(routeNames.getSettings).get(settingController.getSettings)
routes.route(routeNames.updateSettings).put(authJwt.verifyToken, settingController.updateSettings)

export default routes

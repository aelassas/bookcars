import express from 'express'
import multer from 'multer'
import routeNames from '../config/userRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as userController from '../controllers/userController'

const routes = express.Router()

routes.route(routeNames.signup).post(userController.signup)
// adminSignup route is replaced by src/setup/setup.ts and src/setup/reset.ts
// routes.route(routeNames.adminSignup).post(userController.adminSignup)
routes.route(routeNames.create).post(authJwt.verifyToken, authJwt.authSupplier, userController.create)
routes.route(routeNames.checkToken).get(userController.checkToken)
routes.route(routeNames.deleteTokens).delete(userController.deleteTokens)
routes.route(routeNames.resend).post(userController.resend)
routes.route(routeNames.activate).post(userController.activate)
routes.route(routeNames.signin).post(userController.signin)
routes.route(routeNames.socialSignin).post(userController.socialSignin)
routes.route(routeNames.signout).post(userController.signout)
routes.route(routeNames.getPushToken).get(authJwt.verifyToken, userController.getPushToken)
routes.route(routeNames.createPushToken).post(authJwt.verifyToken, userController.createPushToken)
routes.route(routeNames.deletePushToken).post(authJwt.verifyToken, userController.deletePushToken)
routes.route(routeNames.validateEmail).post(userController.validateEmail)
routes.route(routeNames.validateAccessToken).post(authJwt.verifyToken, userController.validateAccessToken)
routes.route(routeNames.confirmEmail).get(userController.confirmEmail)
routes.route(routeNames.resendLink).post(authJwt.verifyToken, userController.resendLink)
routes.route(routeNames.update).post(authJwt.verifyToken, userController.update)
routes.route(routeNames.updateEmailNotifications).post(authJwt.verifyToken, userController.updateEmailNotifications)
routes.route(routeNames.updateLanguage).post(authJwt.verifyToken, userController.updateLanguage)
routes.route(routeNames.getUser).get(authJwt.verifyToken, userController.getUser)
routes.route(routeNames.createAvatar).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], userController.createAvatar)
routes.route(routeNames.updateAvatar).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('image')], userController.updateAvatar)
routes.route(routeNames.deleteAvatar).post(authJwt.verifyToken, userController.deleteAvatar)
routes.route(routeNames.deleteTempAvatar).post(authJwt.verifyToken, userController.deleteTempAvatar)
routes.route(routeNames.changePassword).post(authJwt.verifyToken, userController.changePassword)
routes.route(routeNames.checkPassword).get(authJwt.verifyToken, userController.checkPassword)
routes.route(routeNames.getUsers).post(authJwt.verifyToken, authJwt.authSupplier, userController.getUsers)
routes.route(routeNames.delete).post(authJwt.verifyToken, authJwt.authSupplier, userController.deleteUsers)
routes.route(routeNames.verifyRecaptcha).post(userController.verifyRecaptcha)
routes.route(routeNames.sendEmail).post(userController.sendEmail)
routes.route(routeNames.hasPassword).get(authJwt.verifyToken, userController.hasPassword)
routes.route(routeNames.createLicense).post([multer({ storage: multer.memoryStorage() }).single('file')], userController.createLicense)
routes.route(routeNames.updateLicense).post([authJwt.verifyToken, multer({ storage: multer.memoryStorage() }).single('file')], userController.updateLicense)
routes.route(routeNames.deleteLicense).post(authJwt.verifyToken, userController.deleteLicense)
routes.route(routeNames.deleteTempLicense).post(userController.deleteTempLicense)

export default routes

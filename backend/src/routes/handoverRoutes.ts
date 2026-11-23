import express from 'express'
import authJwt from '../middlewares/authJwt'
import * as handoverController from '../controllers/handoverController'
import multer from 'multer'

const routes = express.Router()
routes.put('/api/handover', authJwt.verifyToken, authJwt.authSupplier, handoverController.upsert)
routes.post('/api/handover/photos', [
  authJwt.verifyToken,
  authJwt.authSupplier,
  multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 12 } }).array('photos', 12),
], handoverController.uploadPhotos)
routes.get('/api/handover/:booking', authJwt.verifyToken, handoverController.getByBooking)

export default routes
